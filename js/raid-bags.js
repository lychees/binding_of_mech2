(function (root) {
  'use strict';

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  class RaidBagUI {
    constructor(app) {
      this.app = app;
      this.selected = null;
      this.ui = {};
      ['raid-inventory', 'raid-pilot-items', 'raid-mech-items', 'raid-pilot-volume', 'raid-mech-volume',
        'raid-selected', 'raid-sort', 'raid-transfer', 'raid-drop', 'raid-close'].forEach(function (id) {
          const key = id.replace(/-([a-z])/g, function (_, letter) { return letter.toUpperCase(); });
          this.ui[key] = document.getElementById(id);
        }, this);
      this.ui.raidSort.addEventListener('click', this.sort.bind(this));
      this.ui.raidTransfer.addEventListener('click', this.transfer.bind(this));
      this.ui.raidDrop.addEventListener('click', this.drop.bind(this));
      this.ui.raidClose.addEventListener('click', this.hide.bind(this));
    }

    show() {
      if (!this.app.raid || this.app.screen !== 'raid') return;
      this.app.raidInventoryOpen = true;
      this.app.input.keys.clear(); this.app.input.mouse.down = false;
      this.ui.raidInventory.classList.remove('hidden');
      this.render();
    }

    hide() {
      this.app.raidInventoryOpen = false;
      this.ui.raidInventory.classList.add('hidden');
      this.selected = null;
    }

    toggle() {
      if (this.app.raidInventoryOpen) this.hide(); else this.show();
    }

    render() {
      const raid = this.app.raid;
      if (!raid) return;
      this.ui.raidPilotVolume.textContent = raid.carriedVolume('pilot') + ' / ' + raid.capacities.pilot + ' 格';
      this.ui.raidMechVolume.textContent = raid.carriedVolume('mech') + ' / ' + raid.capacities.mech + ' 格';
      this.renderBag('pilot', this.ui.raidPilotItems);
      this.renderBag('mech', this.ui.raidMechItems);
      if (this.selected) {
        const item = this.selected.item;
        this.ui.raidSelected.textContent = item.name + ' · ' + (this.selected.kind === 'gear' ? root.MechItems.itemVolume(item) : 1) + ' 格 · ' + (item.bag === 'mech' ? '机甲背包' : '单兵背包');
        this.ui.raidTransfer.textContent = item.bag === 'mech' ? '转移到单兵' : '转移到机甲';
      } else {
        this.ui.raidSelected.textContent = '选择一件物品进行整理';
        this.ui.raidTransfer.textContent = '转移物品';
      }
      this.ui.raidSort.textContent = '整理' + (raid.bagType() === 'mech' ? '机甲' : '单兵') + '背包';
      this.ui.raidTransfer.disabled = !this.selected;
      this.ui.raidDrop.disabled = !this.selected;
    }

    renderBag(bag, container) {
      container.innerHTML = '';
      const raid = this.app.raid;
      const kind = bag === 'mech' ? 'mech' : 'infantry';
      const equipped = Object.values(this.app.profile.equipped).filter(function (item) { return item && item.kind === kind; }).map(function (item) { return { item, kind: 'equipped' }; });
      const stored = (bag === 'mech' ? this.app.profile.mechInventory : this.app.profile.inventory).map(function (item) { return { item, kind: 'stored' }; });
      const materials = raid.carried.filter(function (item) { return (item.bag || 'pilot') === bag; }).map(function (item) { return { item, kind: 'material' }; });
      const gear = raid.gear.filter(function (item) { return (item.bag || 'pilot') === bag; }).map(function (item) { return { item, kind: 'gear' }; });
      const entries = equipped.concat(stored, materials, gear);
      if (!entries.length) {
        container.appendChild(node('div', 'raid-bag-empty', '空背包'));
        return;
      }
      entries.forEach(function (entry) {
        const item = entry.item;
        const selected = this.selected && this.selected.item === item;
        const readonly = entry.kind === 'equipped' || entry.kind === 'stored';
        const button = node('button', 'raid-bag-item' + (selected ? ' selected' : '') + (readonly ? ' readonly' : ''));
        button.disabled = readonly;
        if (entry.kind !== 'material') button.style.setProperty('--item-color', item.color || '#82e6d8');
        const icon = entry.kind === 'material' ? root.MechAssets.loot(item.name) : root.MechAssets.equipment(item.slot, item.name);
        const prefix = { equipped: '装备', stored: '仓库', material: '物资', gear: '战利' }[entry.kind];
        const name = node('span', '', prefix + ' · ' + item.name);
        const volume = node('small', '', (entry.kind === 'material' ? 1 : root.MechItems.itemVolume(item)) + ' 格');
        button.append(icon, name, volume);
        if (!readonly) button.addEventListener('click', function () { this.selected = entry; this.render(); }.bind(this));
        container.appendChild(button);
      }, this);
    }

    sort() {
      const raid = this.app.raid; if (!raid) return;
      const bag = raid.bagType();
      const compare = function (a, b) {
        const rarityA = a.rarity ? root.MechItems.rarities[a.rarity].score : -1;
        const rarityB = b.rarity ? root.MechItems.rarities[b.rarity].score : -1;
        return rarityB - rarityA || root.MechItems.itemVolume(b) - root.MechItems.itemVolume(a) || a.name.localeCompare(b.name);
      };
      const materials = raid.carried.filter(function (item) { return (item.bag || 'pilot') !== bag; });
      const gear = raid.gear.filter(function (item) { return (item.bag || 'pilot') !== bag; });
      raid.carried = materials.concat(raid.carried.filter(function (item) { return (item.bag || 'pilot') === bag; }).sort(compare));
      raid.gear = gear.concat(raid.gear.filter(function (item) { return (item.bag || 'pilot') === bag; }).sort(compare));
      this.render();
    }

    transfer() {
      if (!this.selected) return;
      const item = this.selected.item;
      const target = item.bag === 'mech' ? 'pilot' : 'mech';
      if (!this.app.raid.canCarry(item, target)) { this.app.toast('目标背包空间不足', true); return; }
      item.bag = target;
      this.app.toast('已转移到' + (target === 'mech' ? '机甲背包' : '单兵背包'));
      this.render();
    }

    drop() {
      if (!this.selected) return;
      const raid = this.app.raid; const item = this.selected.item; const kind = this.selected.kind;
      const list = kind === 'gear' ? raid.gear : raid.carried;
      const index = list.indexOf(item);
      if (index >= 0) list.splice(index, 1);
      if (kind === 'material') raid.carryValue = Math.max(0, raid.carryValue - (item.value || 0));
      this.app.toast('已丢弃 ' + item.name, true);
      this.selected = null; this.render();
    }
  }

  root.MechRaidBagUI = RaidBagUI;
})(typeof window !== 'undefined' ? window : globalThis);
