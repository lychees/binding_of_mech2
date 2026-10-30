(function (root) {
  'use strict';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  class InventoryUI {
    constructor(app) {
      this.app = app;
      this.tab = 'infantry';
      this.selectedId = null;
      this.ui = {};
      ['inventory-capacity', 'character-portrait', 'character-level', 'character-xp', 'character-xp-fill', 'equipment-slots',
        'paperdoll-stats', 'inventory-grid', 'item-detail', 'attribute-points', 'character-attributes',
        'inventory-sort', 'inventory-sell-common'].forEach(function (id) {
          const key = id.replace(/-([a-z])/g, function (_, letter) { return letter.toUpperCase(); });
          this.ui[key] = document.getElementById(id);
        }, this);
      document.querySelectorAll('[data-inventory-tab]').forEach(function (button) {
        button.addEventListener('click', function () { this.tab = button.dataset.inventoryTab; this.render(); }.bind(this));
      }, this);
      this.ui.inventorySort.addEventListener('click', this.sort.bind(this));
      this.ui.inventorySellCommon.addEventListener('click', this.sellCommons.bind(this));
    }

    render() {
      const profile = this.app.profile;
      this.ui.characterPortrait.innerHTML = '';
      this.ui.characterPortrait.appendChild(root.MechAssets.portrait(profile.callsign, profile.callsign));
      document.querySelectorAll('[data-inventory-tab]').forEach(function (button) { button.classList.toggle('active', button.dataset.inventoryTab === this.tab); }, this);
      this.ui.inventoryCapacity.textContent = profile.inventory.length + ' / ' + profile.inventoryCapacity;
      const character = profile.character;
      const needed = character.level * 500;
      this.ui.characterLevel.textContent = character.level;
      this.ui.characterXp.textContent = character.xp + ' / ' + needed + ' XP';
      this.ui.characterXpFill.style.width = Math.min(100, character.xp / needed * 100) + '%';
      this.renderEquipment();
      this.renderStats();
      this.renderGrid();
      this.renderDetail();
      this.renderAttributes();
    }

    renderEquipment() {
      const container = this.ui.equipmentSlots;
      container.innerHTML = '';
      Object.keys(root.MechItems.slots).filter(function (slot) { return root.MechItems.slots[slot].kind === this.tab; }, this).forEach(function (slot) {
        const definition = root.MechItems.slots[slot];
        const item = this.app.profile.equipped[slot];
        const button = element('button', 'equipment-slot' + (item ? ' filled' : ''));
        if (item) button.style.setProperty('--item-color', root.MechItems.rarities[item.rarity].color);
        const slotIcon = root.MechAssets.equipment(slot, definition.name); slotIcon.classList.add('slot-art');
        button.append(slotIcon, element('span', '', definition.name));
        button.append(element('b', '', item ? item.name : '空槽位'));
        button.append(element('small', '', item ? root.MechItems.rarities[item.rarity].name + ' · 等级 ' + item.level : '点击背包物品装备'));
        button.addEventListener('click', function () {
          if (item) { this.selectedId = item.id; this.renderDetail(); }
          else this.app.toast('从右侧背包选择一件对应槽位装备');
        }.bind(this));
        container.appendChild(button);
      }, this);
    }

    renderStats() {
      const stats = root.MechCore.computeStats(this.app.profile);
      const systems = this.tab === 'mech' ? root.MechCore.computeMechSystems(this.app.profile) : null;
      const infantry = this.tab === 'infantry';
      const entries = infantry ? [
        ['耐久', stats.infHp], ['移速', Math.round(stats.infSpeed)],
        ['伤害', '+' + Math.round((stats.infDamage - 1) * 100) + '%'], ['减伤', Math.round(stats.infArmor * 100) + '%'],
        ['暴击率', Math.round(stats.critChance * 100) + '%'], ['暴击伤害', '+' + Math.round(stats.critDamage * 100) + '%'],
        ['弹匣', '+' + Math.round((stats.magazine - 1) * 100) + '%'], ['幸运', stats.lootLuck]
      ] : [
        ['耐久', stats.mechHp], ['实际速度', systems.speed],
        ['出力 / 功耗', systems.powerOutput + '/' + systems.powerUsed], ['负重', systems.weightUsed + '/' + systems.weightCapacity + ' t'],
        ['转向', systems.turnRate + '°/s'], ['减伤', Math.round(stats.mechArmor * 100) + '%'],
        ['散热', Math.round(systems.cooling * 100) + '%'], ['热量', Math.round(systems.heatGain * 100) + '%'],
        ['伤害', '+' + Math.round((stats.mechDamage - 1) * 100) + '%'], ['幸运', stats.lootLuck]
      ];
      this.ui.paperdollStats.innerHTML = '';
      entries.forEach(function (entry) {
        const row = element('div', 'paperdoll-stat'); row.append(element('span', '', entry[0]), element('b', '', entry[1]));
        this.ui.paperdollStats.appendChild(row);
      }, this);
    }

    renderGrid() {
      const grid = this.ui.inventoryGrid;
      grid.innerHTML = '';
      for (let i = 0; i < this.app.profile.inventoryCapacity; i += 1) {
        const item = this.app.profile.inventory[i];
        if (!item) { grid.appendChild(element('div', 'inventory-empty')); continue; }
        const rarity = root.MechItems.rarities[item.rarity] || root.MechItems.rarities.common;
        const button = element('button', 'inventory-item' + (item.id === this.selectedId ? ' selected' : ''));
        button.style.setProperty('--item-color', item.color || rarity.color);
        button.title = item.name;
        button.append(root.MechAssets.equipment(item.slot, item.name));
        button.append(element('span', 'item-level', item.level || 1));
        button.append(element('span', 'item-slot-name', root.MechItems.slots[item.slot].name));
        button.append(element('span', 'item-affix-count', '◆' + Object.keys(item.affixes || {}).length));
        button.addEventListener('click', function () { this.selectedId = item.id; this.renderGrid(); this.renderDetail(); }.bind(this));
        button.addEventListener('dblclick', function () { this.equip(item.id); }.bind(this));
        grid.appendChild(button);
      }
    }

    findItem(id) {
      const inventoryIndex = this.app.profile.inventory.findIndex(function (item) { return item.id === id; });
      if (inventoryIndex >= 0) return { item: this.app.profile.inventory[inventoryIndex], location: 'inventory', index: inventoryIndex };
      const slot = Object.keys(this.app.profile.equipped).find(function (key) {
        return this.app.profile.equipped[key] && this.app.profile.equipped[key].id === id;
      }, this);
      if (slot) return { item: this.app.profile.equipped[slot], location: 'equipped', slot };
      return null;
    }

    renderDetail() {
      const container = this.ui.itemDetail;
      const found = this.findItem(this.selectedId);
      container.innerHTML = '';
      if (!found) {
        const empty = element('div', 'empty-detail', '选择一件装备'); empty.appendChild(element('small', '', '查看词缀、装备或出售'));
        container.appendChild(empty); return;
      }
      const item = found.item;
      const rarity = root.MechItems.rarities[item.rarity] || root.MechItems.rarities.common;
      container.style.setProperty('--item-color', item.color || rarity.color);
      container.append(element('div', 'eyebrow', rarity.name + ' / ' + (found.location === 'equipped' ? '已装备' : '背包物品')));
      const detailIcon = root.MechAssets.equipment(item.slot, item.name); detailIcon.classList.add('detail-art'); container.appendChild(detailIcon);
      container.append(element('h3', '', item.name));
      container.append(element('div', 'item-meta', root.MechItems.slots[item.slot].name + ' · 物品等级 ' + (item.level || 1)));
      const affixList = element('div', 'item-affixes');
      const entries = Object.entries(item.affixes || {});
      if (!entries.length) affixList.append(element('p', '', '无额外词缀'));
      entries.forEach(function (entry) { affixList.append(element('p', '', root.MechItems.affixLabel(entry[0], entry[1]))); });
      container.appendChild(affixList);
      container.append(element('div', 'item-value', '出售价值 ' + Math.round(item.value * .35).toLocaleString() + ' 信用点'));
      const actions = element('div', 'item-actions');
      const equipButton = element('button', '', found.location === 'equipped' ? '卸下' : '装备');
      equipButton.addEventListener('click', function () {
        if (found.location === 'equipped') this.unequip(found.slot); else this.equip(item.id);
      }.bind(this));
      actions.appendChild(equipButton);
      if (found.location === 'inventory') {
        const sell = element('button', 'sell', '出售');
        sell.addEventListener('click', function () { this.sell(item.id); }.bind(this));
        actions.appendChild(sell);
      }
      container.appendChild(actions);
    }

    equip(id) {
      const index = this.app.profile.inventory.findIndex(function (item) { return item.id === id; });
      if (index < 0) return;
      const item = this.app.profile.inventory[index];
      this.app.profile.inventory.splice(index, 1);
      const previous = this.app.profile.equipped[item.slot];
      if (previous) this.app.profile.inventory.push(previous);
      this.app.profile.equipped[item.slot] = item;
      this.tab = root.MechItems.slots[item.slot].kind;
      this.app.saveProfile(); this.app.renderLoadout(); this.render();
      this.app.toast('已装备 ' + item.name);
    }

    unequip(slot) {
      const item = this.app.profile.equipped[slot];
      if (!item) return;
      if (this.app.profile.inventory.length >= this.app.profile.inventoryCapacity) { this.app.toast('背包已满', true); return; }
      this.app.profile.equipped[slot] = null; this.app.profile.inventory.push(item);
      this.app.saveProfile(); this.app.renderLoadout(); this.render();
    }

    sell(id) {
      const index = this.app.profile.inventory.findIndex(function (item) { return item.id === id; });
      if (index < 0) return;
      const item = this.app.profile.inventory[index];
      const value = Math.round(item.value * .35);
      this.app.profile.inventory.splice(index, 1); this.app.profile.credits += value;
      this.selectedId = null; this.app.renderProfile(); this.render(); this.app.toast('出售 ' + item.name + '，获得 ' + value);
    }

    sort() {
      this.app.profile.inventory.sort(function (a, b) {
        const rarityDifference = root.MechItems.rarities[b.rarity].score - root.MechItems.rarities[a.rarity].score;
        return rarityDifference || a.slot.localeCompare(b.slot) || a.name.localeCompare(b.name);
      });
      this.app.saveProfile(); this.render();
    }

    sellCommons() {
      const commons = this.app.profile.inventory.filter(function (item) { return item.rarity === 'common'; });
      if (!commons.length) { this.app.toast('背包中没有普通物品'); return; }
      const value = commons.reduce(function (sum, item) { return sum + Math.round(item.value * .35); }, 0);
      this.app.profile.inventory = this.app.profile.inventory.filter(function (item) { return item.rarity !== 'common'; });
      this.app.profile.credits += value; this.selectedId = null;
      this.app.renderProfile(); this.render(); this.app.toast('出售 ' + commons.length + ' 件普通物品，获得 ' + value);
    }

    renderAttributes() {
      const character = this.app.profile.character;
      this.ui.attributePoints.textContent = character.points + ' 点可用';
      const definitions = [
        ['might', '力量', '每点 +2% 单兵伤害'], ['agility', '敏捷', '每点 +1.2% 移速 / +0.5% 暴击'],
        ['fortitude', '体魄', '每点 +8 单兵 / +5 机甲耐久'], ['interface', '神经接口', '每点 +2% 机甲伤害 / 散热']
      ];
      this.ui.characterAttributes.innerHTML = '';
      definitions.forEach(function (definition) {
        const row = element('div', 'attribute-row');
        const label = element('span', '', definition[1]); label.append(element('small', '', definition[2]));
        const value = element('b', '', character.attributes[definition[0]]);
        const add = element('button', '', '+'); add.disabled = character.points <= 0;
        add.addEventListener('click', function () {
          if (character.points <= 0) return;
          character.points -= 1; character.attributes[definition[0]] += 1;
          this.app.saveProfile(); this.app.renderLoadout(); this.render();
        }.bind(this));
        row.append(label, value, add); this.ui.characterAttributes.appendChild(row);
      }, this);
    }
  }

  root.MechInventoryUI = InventoryUI;
})(typeof window !== 'undefined' ? window : globalThis);
