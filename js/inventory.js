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
      ['inventory-capacity', 'character-portrait', 'pilot-select', 'pilot-perk', 'character-level', 'character-xp', 'character-xp-fill', 'equipment-slots',
        'paperdoll-stats', 'inventory-grid', 'inventory-overflow', 'item-detail', 'attribute-points', 'character-attributes',
        'inventory-sort', 'inventory-sell-common'].forEach(function (id) {
          const key = id.replace(/-([a-z])/g, function (_, letter) { return letter.toUpperCase(); });
          this.ui[key] = document.getElementById(id);
        }, this);
      document.querySelectorAll('[data-inventory-tab]').forEach(function (button) {
        button.addEventListener('click', function () { this.tab = button.dataset.inventoryTab; this.render(); }.bind(this));
      }, this);
      Object.entries(root.MechPilots).forEach(function (entry) {
        const option = element('option', '', entry[1].name); option.value = entry[0]; this.ui.pilotSelect.appendChild(option);
      }, this);
      this.ui.pilotSelect.addEventListener('change', function () {
        this.app.profile.pilot = this.ui.pilotSelect.value; this.app.saveProfile(); this.app.renderLoadout(); this.render();
      }.bind(this));
      this.ui.inventorySort.addEventListener('click', this.sort.bind(this));
      this.ui.inventorySellCommon.addEventListener('click', this.sellCommons.bind(this));
      this.dragged = null;
      this.ui.inventoryGrid.addEventListener('dragover', this.handleGridDragOver.bind(this));
      this.ui.inventoryGrid.addEventListener('drop', this.handleGridDrop.bind(this));
      this.ui.inventoryGrid.addEventListener('dragleave', this.clearDropTargets.bind(this));
      document.addEventListener('dragend', this.clearDragState.bind(this));
    }

    items() { return this.tab === 'mech' ? this.app.profile.mechInventory : this.app.profile.inventory; }
    setItems(items) { this.app.profile[this.tab === 'mech' ? 'mechInventory' : 'inventory'] = items; }
    overflow() { return this.app.profile[this.tab === 'mech' ? 'mechInventoryOverflow' : 'inventoryOverflow']; }
    setOverflow(items) { this.app.profile[this.tab === 'mech' ? 'mechInventoryOverflow' : 'inventoryOverflow'] = items; }
    capacity() { return this.tab === 'mech' ? this.app.profile.mechInventoryCapacity : this.app.profile.inventoryCapacity; }
    width() { return this.tab === 'mech' ? this.app.profile.mechInventoryWidth : this.app.profile.inventoryWidth; }
    height() { return this.tab === 'mech' ? this.app.profile.mechInventoryHeight : this.app.profile.inventoryHeight; }
    compact() { return this.tab === 'mech' ? root.MechItems.compactMechInventory(this.app.profile) : root.MechItems.compactInventory(this.app.profile); }
    canAdd(item) { return this.tab === 'mech' ? root.MechItems.canAddMechItem(this.app.profile, item) : root.MechItems.canAddItem(this.app.profile, item); }

    startDrag(event, source, slot, id) {
      this.dragged = { source, slot, id };
      event.currentTarget.classList.add('dragging');
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', id);
      }
    }

    cellFromEvent(event) {
      const rect = this.ui.inventoryGrid.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(this.width() - 1, Math.floor((event.clientX - rect.left) / (rect.width / this.width())))),
        y: Math.max(0, Math.min(this.height() - 1, Math.floor((event.clientY - rect.top) / 61)))
      };
    }

    handleGridDragOver(event) {
      if (!this.dragged) return;
      event.preventDefault();
      const cell = this.cellFromEvent(event);
      this.clearDropTargets();
      const target = Array.from(this.ui.inventoryGrid.children).find(function (node) { return node.dataset.cell === cell.x + ',' + cell.y; });
      if (target) target.classList.add('drop-target');
    }

    handleGridDrop(event) {
      if (!this.dragged) return;
      event.preventDefault();
      const cell = this.cellFromEvent(event);
      if (this.dragged.source === 'equipped') this.unequip(this.dragged.slot);
      else this.moveItem(this.dragged.id, cell.x, cell.y);
      this.clearDragState();
    }

    handleEquipmentDrop(slot) {
      if (!this.dragged) return;
      if (this.dragged.source === 'inventory' && this.dragged.slot === slot) this.equip(this.dragged.id);
      else if (this.dragged.source === 'equipped' && this.dragged.slot === slot) this.unequip(slot);
      else this.app.toast('该物品与装备槽不匹配', true);
      this.clearDragState();
    }

    moveItem(id, x, y) {
      const item = this.items().find(function (entry) { return entry.id === id; });
      if (!item) return;
      const remaining = this.items().filter(function (entry) { return entry.id !== id; });
      if (!root.MechItems.canPlaceAt(remaining, item, x, y, this.width(), this.height())) {
        this.app.toast('空间不足或与其他物品重叠', true);
        return;
      }
      item.x = x; item.y = y;
      remaining.push(item); this.setItems(remaining); this.selectedId = id;
      this.app.saveProfile(); this.render();
    }

    clearDropTargets() {
      this.ui.inventoryGrid.querySelectorAll('.drop-target').forEach(function (node) { node.classList.remove('drop-target'); });
      this.ui.equipmentSlots.querySelectorAll('.drag-over').forEach(function (node) { node.classList.remove('drag-over'); });
    }

    clearDragState() {
      this.clearDropTargets();
      this.ui.inventoryGrid.querySelectorAll('.dragging').forEach(function (node) { node.classList.remove('dragging'); });
      this.ui.equipmentSlots.querySelectorAll('.dragging').forEach(function (node) { node.classList.remove('dragging'); });
      this.dragged = null;
    }

    render() {
      const profile = this.app.profile;
      const pilot = root.MechPilots[profile.pilot];
      this.ui.characterPortrait.innerHTML = '';
      this.ui.characterPortrait.appendChild(root.MechAssets.portrait(profile.pilot, pilot.name));
      this.ui.pilotSelect.value = profile.pilot;
      this.ui.pilotPerk.textContent = pilot.role + ' · ' + pilot.perk;
      document.querySelectorAll('[data-inventory-tab]').forEach(function (button) { button.classList.toggle('active', button.dataset.inventoryTab === this.tab); }, this);
      this.ui.inventoryCapacity.textContent = root.MechItems.inventoryUsed(this.items()) + ' / ' + this.capacity() + ' 格';
      const character = profile.character;
      const needed = character.level * 500;
      this.ui.characterLevel.textContent = character.level;
      this.ui.characterXp.textContent = character.xp + ' / ' + needed + ' XP';
      this.ui.characterXpFill.style.width = Math.min(100, character.xp / needed * 100) + '%';
      this.renderEquipment();
      this.renderStats();
      this.renderGrid();
      this.renderOverflow();
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
        button.draggable = !!item;
        if (item) button.addEventListener('dragstart', function (event) { this.startDrag(event, 'equipped', slot, item.id); }.bind(this));
        button.addEventListener('dragover', function (event) { event.preventDefault(); button.classList.add('drag-over'); });
        button.addEventListener('dragleave', function () { button.classList.remove('drag-over'); });
        button.addEventListener('drop', function (event) { event.preventDefault(); this.handleEquipmentDrop(slot); }.bind(this));
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
      grid.style.gridTemplateColumns = 'repeat(' + this.width() + ', minmax(38px, 1fr))';
      for (let y = 0; y < this.height(); y += 1) for (let x = 0; x < this.width(); x += 1) {
        const empty = element('div', 'inventory-empty');
        empty.dataset.cell = x + ',' + y;
        empty.style.gridColumn = String(x + 1); empty.style.gridRow = String(y + 1);
        grid.appendChild(empty);
      }
      this.items().forEach(function (item) {
        const size = root.MechItems.itemSize(item);
        const rarity = root.MechItems.rarities[item.rarity] || root.MechItems.rarities.common;
        const button = element('button', 'inventory-item' + (item.id === this.selectedId ? ' selected' : ''));
        button.style.setProperty('--item-color', item.color || rarity.color);
        button.style.gridColumn = (item.x + 1) + ' / span ' + size.w;
        button.style.gridRow = (item.y + 1) + ' / span ' + size.h;
        button.title = item.name + ' · ' + size.w + '×' + size.h + ' 格';
        button.append(root.MechAssets.equipment(item.slot, item.name));
        button.append(element('span', 'item-level', item.level || 1));
        button.append(element('span', 'item-slot-name', root.MechItems.slots[item.slot].name + ' ' + size.w + '×' + size.h));
        button.append(element('span', 'item-affix-count', '◆' + Object.keys(item.affixes || {}).length));
        button.draggable = true;
        button.addEventListener('dragstart', function (event) { this.startDrag(event, 'inventory', item.slot, item.id); }.bind(this));
        button.addEventListener('click', function () { this.selectedId = item.id; this.renderGrid(); this.renderDetail(); }.bind(this));
        button.addEventListener('dblclick', function () { this.equip(item.id); }.bind(this));
        grid.appendChild(button);
      }, this);
    }

    renderOverflow() {
      const container = this.ui.inventoryOverflow; container.innerHTML = '';
      const overflow = this.overflow() || [];
      if (!overflow.length) return;
      container.append(element('span', '', '溢出存储 ' + overflow.length + ' 件 · ' + root.MechItems.inventoryUsed(overflow) + ' 格'));
      const compact = element('button', '', '重新装箱');
      compact.addEventListener('click', function () { this.compact(); this.app.saveProfile(); this.render(); }.bind(this));
      const sell = element('button', '', '出售溢出');
      sell.addEventListener('click', function () {
        const value = overflow.reduce(function (sum, item) { return sum + Math.round(item.value * .35); }, 0);
        this.app.profile.credits += value; this.setOverflow([]);
        this.app.renderProfile(); this.render(); this.app.toast('溢出物品已出售 +' + value);
      }.bind(this));
      container.append(compact, sell);
    }

    findItem(id) {
      const inventoryIndex = this.items().findIndex(function (item) { return item.id === id; });
      if (inventoryIndex >= 0) return { item: this.items()[inventoryIndex], location: 'inventory', index: inventoryIndex };
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
      const size = root.MechItems.itemSize(item);
      container.append(element('div', 'item-meta', root.MechItems.slots[item.slot].name + ' · 等级 ' + (item.level || 1) + ' · ' + size.w + '×' + size.h + ' / ' + root.MechItems.itemVolume(item) + ' 格'));
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
      const index = this.items().findIndex(function (item) { return item.id === id; });
      if (index < 0) return;
      const item = this.items()[index];
      this.items().splice(index, 1);
      const previous = this.app.profile.equipped[item.slot];
      if (previous) this.items().push(previous);
      this.app.profile.equipped[item.slot] = item;
      this.tab = root.MechItems.slots[item.slot].kind;
      this.compact();
      this.app.saveProfile(); this.app.renderLoadout(); this.render();
      this.app.toast('已装备 ' + item.name);
    }

    unequip(slot) {
      const item = this.app.profile.equipped[slot];
      if (!item) return;
      this.app.profile.equipped[slot] = null;
      if (this.canAdd(item)) this.items().push(item);
      else { this.overflow().push(item); this.app.toast('无连续空位，已放入溢出存储', true); }
      this.compact();
      this.app.saveProfile(); this.app.renderLoadout(); this.render();
    }

    sell(id) {
      const index = this.items().findIndex(function (item) { return item.id === id; });
      if (index < 0) return;
      const item = this.items()[index];
      const value = Math.round(item.value * .35);
      this.items().splice(index, 1); this.app.profile.credits += value;
      this.compact();
      this.selectedId = null; this.app.renderProfile(); this.render(); this.app.toast('出售 ' + item.name + '，获得 ' + value);
    }

    sort() {
      this.compact();
      this.app.saveProfile(); this.render();
    }

    sellCommons() {
      const commons = this.items().filter(function (item) { return item.rarity === 'common'; });
      if (!commons.length) { this.app.toast('背包中没有普通物品'); return; }
      const value = commons.reduce(function (sum, item) { return sum + Math.round(item.value * .35); }, 0);
      this.setItems(this.items().filter(function (item) { return item.rarity !== 'common'; }));
      this.app.profile.credits += value; this.selectedId = null;
      this.compact();
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
