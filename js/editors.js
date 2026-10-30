(function (root) {
  'use strict';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function copy(value) { return JSON.parse(JSON.stringify(value)); }

  class EditorUI {
    constructor(app) {
      this.app = app;
      this.tab = 'level';
      this.levelTool = 'building';
      this.currentMap = root.MechItems.emptyMap('未命名区域');
      this.undoStack = [];
      this.mechDraft = copy(app.profile.mech);
      this.ui = {};
      document.querySelectorAll('[id]').forEach(function (node) { this.ui[node.id] = node; }, this);
      this.levelCtx = this.ui['level-canvas'].getContext('2d');
      this.mechCtx = this.ui['mech-editor-canvas'].getContext('2d');
      this.unitCtx = this.ui['unit-editor-canvas'].getContext('2d');
      this.bind();
      this.populateItemEditor();
      this.renderChassisOptions();
      this.renderPaintOptions();
      this.refreshUnitPalette();
      this.renderLevelList();
      this.renderCustomItems();
      this.renderUnitList();
      this.newUnit();
    }

    bind() {
      document.querySelectorAll('[data-editor-tab]').forEach(function (button) {
        button.addEventListener('click', function () { this.show(button.dataset.editorTab); }.bind(this));
      }, this);
      this.ui['level-palette'].addEventListener('click', function (event) {
        const button = event.target.closest('[data-level-tool]');
        if (!button) return;
        this.levelTool = button.dataset.levelTool;
        this.ui['level-palette'].querySelectorAll('button').forEach(function (entry) { entry.classList.toggle('active', entry === button); });
        const unit = this.app.profile.customUnits.find(function (entry) { return entry.id === this.levelTool; }, this);
        this.ui['level-tool-label'].textContent = '当前：' + (unit ? unit.name : button.textContent);
      }.bind(this));
      this.ui['level-canvas'].addEventListener('pointerdown', this.paintLevel.bind(this));
      this.ui['level-name'].addEventListener('input', function () { this.currentMap.name = this.ui['level-name'].value.slice(0, 24); }.bind(this));
      this.ui['level-undo'].addEventListener('click', function () {
        if (!this.undoStack.length) return;
        this.currentMap = this.undoStack.pop(); this.renderLevel();
      }.bind(this));
      this.ui['level-new'].addEventListener('click', function () {
        this.snapshot(); this.currentMap = root.MechItems.emptyMap('未命名区域'); this.ui['level-name'].value = this.currentMap.name; this.renderLevel();
      }.bind(this));
      this.ui['level-save'].addEventListener('click', function () { this.saveLevel(true); }.bind(this));
      this.ui['level-test'].addEventListener('click', function () {
        const map = this.saveLevel(false); this.app.startRaid(map.seed, map);
      }.bind(this));
      this.ui['level-export'].addEventListener('click', this.exportLevel.bind(this));
      this.ui['level-import'].addEventListener('click', function () { this.ui['level-file'].click(); }.bind(this));
      this.ui['level-file'].addEventListener('change', this.importLevel.bind(this));
      this.ui['mech-save'].addEventListener('click', function () {
        this.mechDraft.name = this.ui['mech-editor-name'].value.trim().slice(0, 16) || '灰犀';
        this.mechDraft.paint = this.ui['mech-paint'].value;
        this.app.profile.mech = copy(this.mechDraft); this.app.saveProfile(); this.app.renderLoadout();
        this.app.toast('机体配置已保存');
      }.bind(this));
      this.ui['mech-editor-name'].addEventListener('input', function () { this.mechDraft.name = this.ui['mech-editor-name'].value; this.renderMechPreview(); }.bind(this));
      this.ui['mech-paint'].addEventListener('input', function () { this.mechDraft.paint = this.ui['mech-paint'].value; this.renderMechPreview(); this.renderPaintOptions(); this.renderChassisOptions(); }.bind(this));
      this.ui['item-new'].addEventListener('click', this.newItem.bind(this));
      this.ui['item-save'].addEventListener('click', this.saveItem.bind(this));
      this.ui['unit-new'].addEventListener('click', this.newUnit.bind(this));
      this.ui['unit-save'].addEventListener('click', this.saveUnit.bind(this));
      ['unit-name', 'unit-model', 'unit-color', 'unit-hp', 'unit-speed', 'unit-damage', 'unit-range', 'unit-rate', 'unit-scale'].forEach(function (id) {
        this.ui[id].addEventListener('input', this.renderUnitPreview.bind(this));
      }, this);
    }

    show(tab) {
      this.tab = tab || 'level';
      document.querySelectorAll('[data-editor-tab]').forEach(function (button) { button.classList.toggle('active', button.dataset.editorTab === this.tab); }, this);
      ['level', 'mech', 'item', 'unit'].forEach(function (name) { this.ui['editor-' + name].classList.toggle('hidden', name !== this.tab); }, this);
      if (this.tab === 'level') { this.renderLevel(); this.renderLevelList(); }
      if (this.tab === 'mech') {
        this.mechDraft = copy(this.app.profile.mech);
        this.ui['mech-editor-name'].value = this.mechDraft.name; this.ui['mech-paint'].value = this.mechDraft.paint;
        this.renderChassisOptions(); this.renderPaintOptions(); this.renderMechPreview();
      }
      if (this.tab === 'item') this.renderCustomItems();
      if (this.tab === 'unit') { this.renderUnitList(); this.renderUnitPreview(); }
    }

    snapshot() {
      this.undoStack.push(copy(this.currentMap));
      if (this.undoStack.length > 40) this.undoStack.shift();
    }

    rebuildMap() {
      this.currentMap = root.MechItems.normalizeMap(this.currentMap);
      this.renderLevel();
    }

    paintLevel(event) {
      const canvas = this.ui['level-canvas'];
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width * this.currentMap.width;
      const y = (event.clientY - rect.top) / rect.height * this.currentMap.height;
      const gx = Math.max(40, Math.min(this.currentMap.width - 40, Math.round(x / 40) * 40));
      const gy = Math.max(40, Math.min(this.currentMap.height - 40, Math.round(y / 40) * 40));
      this.snapshot();
      const tool = this.levelTool;
      if (tool === 'building') {
        if (this.currentMap.buildings.length >= 60) { this.app.toast('建筑数量已达上限', true); return; }
        this.currentMap.buildings.push(root.MechCore.createBuilding(gx - 170, gy - 150, 340, 300, this.currentMap.buildings.length, root.MechCore.randomFrom(Date.now() + ':building')));
      } else if (tool === 'obstacle') {
        this.currentMap.obstacles.push({ x: gx - 45, y: gy - 25, w: 90, h: 50, kind: 'barrier' });
      } else if (tool === 'rock') {
        this.currentMap.obstacles.push({ x: gx - 60, y: gy - 35, w: 120, h: 70, kind: 'rock' });
      } else if (tool === 'crate') {
        this.currentMap.crates.push({ id: root.MechItems.newId('crate'), x: gx, y: gy, opened: false, progress: 0 });
      } else if (tool === 'spawn') {
        this.currentMap.spawn = { x: gx, y: gy };
      } else if (tool === 'extraction') {
        this.currentMap.extraction = { x: gx, y: gy, radius: 105 };
      } else if (tool === 'erase') {
        if (!this.eraseAt(gx, gy)) { this.undoStack.pop(); return; }
      } else {
        this.currentMap.enemies.push({ x: gx, y: gy, type: tool });
      }
      this.rebuildMap();
    }

    eraseAt(x, y) {
      const point = { x, y };
      const crateIndex = this.currentMap.crates.findIndex(function (crate) { return root.MechCore.distance(point, crate) < 65; });
      if (crateIndex >= 0) { this.currentMap.crates.splice(crateIndex, 1); return true; }
      const enemyIndex = this.currentMap.enemies.findIndex(function (enemy) { return root.MechCore.distance(point, enemy) < 65; });
      if (enemyIndex >= 0) { this.currentMap.enemies.splice(enemyIndex, 1); return true; }
      const obstacleIndex = this.currentMap.obstacles.findIndex(function (o) { return root.MechCore.pointRect(x, y, { x: o.x - 25, y: o.y - 25, w: o.w + 50, h: o.h + 50 }); });
      if (obstacleIndex >= 0) { this.currentMap.obstacles.splice(obstacleIndex, 1); return true; }
      const buildingIndex = this.currentMap.buildings.findIndex(function (b) { return root.MechCore.pointRect(x, y, { x: b.x - 25, y: b.y - 25, w: b.w + 50, h: b.h + 50 }); });
      if (buildingIndex >= 0) { this.currentMap.buildings.splice(buildingIndex, 1); return true; }
      return false;
    }

    renderLevel() {
      const ctx = this.levelCtx;
      const canvas = this.ui['level-canvas'];
      const map = this.currentMap;
      const sx = canvas.width / map.width; const sy = canvas.height / map.height;
      ctx.fillStyle = '#142123'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#202e2f'; ctx.fillRect(0, 790 * sy, canvas.width, 220 * sy);
      ctx.strokeStyle = 'rgba(117,157,149,.12)'; ctx.lineWidth = 1;
      for (let x = 0; x < map.width; x += 80) { ctx.beginPath(); ctx.moveTo(x * sx, 0); ctx.lineTo(x * sx, canvas.height); ctx.stroke(); }
      for (let y = 0; y < map.height; y += 80) { ctx.beginPath(); ctx.moveTo(0, y * sy); ctx.lineTo(canvas.width, y * sy); ctx.stroke(); }
      map.buildings.forEach(function (b) {
        ctx.fillStyle = b.tint || '#304447'; ctx.fillRect(b.x * sx, b.y * sy, b.w * sx, b.h * sy);
        ctx.strokeStyle = '#73877e'; ctx.strokeRect(b.x * sx, b.y * sy, b.w * sx, b.h * sy);
        ctx.fillStyle = '#98aaa1'; ctx.font = '9px sans-serif'; ctx.fillText(b.label || '建筑', b.x * sx + 5, b.y * sy + 13);
      });
      map.obstacles.forEach(function (o) { ctx.fillStyle = o.kind === 'rock' ? '#77705b' : '#596158'; ctx.fillRect(o.x * sx, o.y * sy, o.w * sx, o.h * sy); });
      map.crates.forEach(function (crate) { ctx.fillStyle = '#e5bd68'; ctx.fillRect(crate.x * sx - 3, crate.y * sy - 3, 6, 6); });
      map.enemies.forEach(function (enemy) {
        const unit = root.MechItems.unitDefinition(enemy.type, this.app.profile);
        ctx.fillStyle = unit.color; ctx.beginPath(); ctx.arc(enemy.x * sx, enemy.y * sy, 4 * unit.scale, 0, Math.PI * 2); ctx.fill();
      }, this);
      ctx.fillStyle = '#82e6d8'; ctx.beginPath(); ctx.arc(map.spawn.x * sx, map.spawn.y * sy, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#09211f'; ctx.font = 'bold 8px monospace'; ctx.fillText('S', map.spawn.x * sx - 3, map.spawn.y * sy + 3);
      ctx.strokeStyle = '#9be38d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(map.extraction.x * sx, map.extraction.y * sy, map.extraction.radius * sx, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#9be38d'; ctx.fillText('EXFIL', map.extraction.x * sx - 13, map.extraction.y * sy + 3);
      this.ui['level-count'].textContent = this.app.profile.customMaps.length;
    }

    saveLevel(notify) {
      this.currentMap.name = this.ui['level-name'].value.trim().slice(0, 24) || '未命名区域';
      this.currentMap = root.MechItems.normalizeMap(this.currentMap);
      const index = this.app.profile.customMaps.findIndex(function (map) { return map.id === this.currentMap.id; }, this);
      if (index >= 0) this.app.profile.customMaps[index] = copy(this.currentMap);
      else this.app.profile.customMaps.push(copy(this.currentMap));
      this.app.saveProfile(); this.renderLevelList(); this.renderLevel();
      if (notify) this.app.toast('关卡已保存：' + this.currentMap.name);
      return this.currentMap;
    }

    renderLevelList() {
      const list = this.ui['level-list']; list.innerHTML = '';
      this.app.profile.customMaps.forEach(function (map) {
        const entry = el('div', 'saved-entry');
        entry.append(el('b', '', map.name), el('small', '', map.buildings.length + ' 建筑 · ' + map.enemies.length + ' 敌人 · ' + map.crates.length + ' 物资'));
        const actions = el('div', 'saved-actions');
        const load = el('button', '', '编辑');
        load.addEventListener('click', function () { this.currentMap = root.MechItems.normalizeMap(copy(map)); this.ui['level-name'].value = this.currentMap.name; this.undoStack = []; this.renderLevel(); }.bind(this));
        const play = el('button', '', '出击');
        play.addEventListener('click', function () { const normalized = root.MechItems.normalizeMap(copy(map)); this.app.startRaid(normalized.seed, normalized); }.bind(this));
        const remove = el('button', '', '删除');
        remove.addEventListener('click', function () {
          this.app.profile.customMaps = this.app.profile.customMaps.filter(function (entryMap) { return entryMap.id !== map.id; });
          this.app.saveProfile(); this.renderLevelList(); this.renderLevel();
        }.bind(this));
        actions.append(load, play, remove); entry.appendChild(actions); list.appendChild(entry);
      }, this);
      if (!this.app.profile.customMaps.length) list.append(el('small', '', '尚未保存自定义关卡'));
    }

    exportLevel() {
      const blob = new Blob([JSON.stringify(this.currentMap, null, 2)], { type: 'application/json' });
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
      link.download = (this.currentMap.name || 'custom-map') + '.json'; link.click();
      setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    }

    importLevel(event) {
      const file = event.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const raw = JSON.parse(reader.result);
          raw.id = root.MechItems.newId('map'); raw.seed = 'CUSTOM:' + raw.id; raw.custom = true;
          this.currentMap = root.MechItems.normalizeMap(raw); this.ui['level-name'].value = this.currentMap.name;
          this.undoStack = []; this.renderLevel(); this.app.toast('关卡导入成功');
        } catch (error) { this.app.toast('导入失败：不是有效的关卡 JSON', true); }
      }.bind(this);
      reader.readAsText(file); event.target.value = '';
    }

    renderChassisOptions() {
      const container = this.ui['chassis-options']; container.innerHTML = '';
      Object.entries(root.MechItems.chassis).forEach(function (entry) {
        const key = entry[0]; const frame = entry[1];
        if (key === 'scout') container.appendChild(el('div', 'chassis-group', '原创机体 / ORIGINAL'));
        if (key === 'redDragon') container.appendChild(el('div', 'chassis-group', '燃烧战车2 · 致敬重制 / 10 辆'));
        const button = el('button', 'chassis-option' + (this.mechDraft.chassis === key ? ' active' : '') + (frame.remake ? ' remake' : ''));
        button.append(el('b', '', frame.name), el('span', '', frame.role), el('small', '', frame.description));
        const thumbnail = el('canvas', 'chassis-thumbnail'); thumbnail.width = 92; thumbnail.height = 96;
        const thumbnailCtx = thumbnail.getContext('2d'); thumbnailCtx.fillStyle = '#0a1619'; thumbnailCtx.fillRect(0, 0, 92, 96);
        const renderer = this.app.renderer; const previous = renderer.ctx; renderer.ctx = thumbnailCtx;
        renderer.drawHangarMech(46, 91, .2, this.mechDraft.paint, 1, frame.model); renderer.ctx = previous;
        button.appendChild(thumbnail);
        button.addEventListener('click', function () { this.mechDraft.chassis = key; this.renderChassisOptions(); this.renderMechPreview(); }.bind(this));
        container.appendChild(button);
      }, this);
    }

    renderPaintOptions() {
      const container = this.ui['paint-options']; container.innerHTML = '';
      ['#698a82', '#8b6f5c', '#5e728d', '#777d68', '#725d78', '#a3a79b', '#3f5054'].forEach(function (color) {
        const button = el('button', this.mechDraft.paint.toLowerCase() === color ? 'active' : '');
        button.style.setProperty('--paint', color); button.title = color;
        button.addEventListener('click', function () { this.mechDraft.paint = color; this.ui['mech-paint'].value = color; this.renderPaintOptions(); this.renderMechPreview(); this.renderChassisOptions(); }.bind(this));
        container.appendChild(button);
      }, this);
    }

    renderMechPreview() {
      const ctx = this.mechCtx; const canvas = this.ui['mech-editor-canvas'];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(130,190,180,.1)';
      for (let x = 0; x < canvas.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
      for (let y = 0; y < canvas.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
      const frame = root.MechItems.chassis[this.mechDraft.chassis];
      const renderer = this.app.renderer; const previous = renderer.ctx; renderer.ctx = ctx;
      renderer.drawHangarMech(280, 500, 1.2 * frame.scale, this.mechDraft.paint, 1, frame.model); renderer.ctx = previous;
      this.ui['mech-preview-name'].textContent = frame.name.replace(/「.*」/, '「' + (this.mechDraft.name || '未命名') + '」');
      const profileCopy = copy(this.app.profile); profileCopy.mech = copy(this.mechDraft);
      const stats = root.MechCore.computeStats(profileCopy);
      const systems = root.MechCore.computeMechSystems(profileCopy);
      this.ui['mech-editor-stats'].innerHTML = '';
      [['出力', systems.powerOutput + ' kW'], ['功耗', systems.powerUsed + ' kW'], ['负重', systems.weightUsed + '/' + systems.weightCapacity + ' t'], ['实际速度', systems.speed], ['转向', systems.turnRate + '°/s'], ['耐久', stats.mechHp], ['伤害倍率', stats.mechDamage.toFixed(2)], ['爆炸范围', Math.round(stats.blast * 100) + '%'], ['散热', Math.round(systems.cooling * 100) + '%'], ['暴击率', Math.round(stats.critChance * 100) + '%']].forEach(function (entry) {
        const row = el('div', 'paperdoll-stat'); row.append(el('span', '', entry[0]), el('b', '', entry[1])); this.ui['mech-editor-stats'].appendChild(row);
      }, this);
      const warnings = [];
      if (systems.overloaded) warnings.push('超载：速度与转向下降');
      if (systems.powerShortage) warnings.push('供电不足：速度、转向与散热下降');
      this.ui['mech-system-warning'].textContent = warnings.length ? warnings.join(' · ') : '配置正常 · 剩余出力 ' + systems.powerFree + ' kW · 剩余负重 ' + systems.weightFree + ' t';
      this.ui['mech-system-warning'].className = 'mech-system-warning' + (warnings.length ? ' warning' : '');
      const partList = this.ui['mech-part-list']; partList.innerHTML = '';
      Object.values(systems.parts).forEach(function (part) {
        const row = el('div', 'mech-part-row');
        row.append(el('span', '', part.name), el('b', '', '护甲 ' + part.armor), el('small', '', '耐久 ' + part.maxHp));
        partList.appendChild(row);
      });
    }

    populateItemEditor() {
      const slotSelect = this.ui['item-slot'];
      Object.keys(root.MechItems.slots).forEach(function (slot) {
        const option = el('option', '', root.MechItems.slots[slot].name); option.value = slot; slotSelect.appendChild(option);
      });
      Object.keys(root.MechItems.rarities).forEach(function (rarity) {
        const option = el('option', '', root.MechItems.rarities[rarity].name); option.value = rarity; this.ui['item-rarity'].appendChild(option);
      }, this);
      this.ui['item-rarity'].value = 'rare';
      const container = this.ui['item-affix-editor'];
      for (let i = 0; i < 4; i += 1) {
        const row = el('div', 'affix-edit-row'); const select = el('select'); select.id = 'item-stat-' + i;
        const blank = el('option', '', '空词缀'); blank.value = ''; select.appendChild(blank);
        Object.keys(root.MechItems.affixes).forEach(function (key) {
          const option = el('option', '', root.MechItems.affixes[key].name); option.value = key; select.appendChild(option);
        });
        const input = el('input'); input.id = 'item-stat-value-' + i; input.type = 'number'; input.step = '.01'; input.value = '0';
        this.ui[select.id] = select; this.ui[input.id] = input;
        row.append(select, input); container.appendChild(row);
      }
    }

    newItem() {
      this.ui['item-edit-id'].value = ''; this.ui['item-name'].value = '自定义装备';
      this.ui['item-slot'].value = 'infArmor'; this.ui['item-rarity'].value = 'rare'; this.ui['item-price'].value = 500;
      this.ui['item-color'].value = '#e7ca68';
      for (let i = 0; i < 4; i += 1) { this.ui['item-stat-' + i].value = ''; this.ui['item-stat-value-' + i].value = 0; }
    }

    loadItem(item) {
      this.show('item'); this.ui['item-edit-id'].value = item.id; this.ui['item-name'].value = item.name;
      this.ui['item-slot'].value = item.slot; this.ui['item-rarity'].value = item.rarity;
      this.ui['item-price'].value = item.value; this.ui['item-color'].value = item.color || root.MechItems.rarities[item.rarity].color;
      const entries = Object.entries(item.affixes || {});
      for (let i = 0; i < 4; i += 1) {
        this.ui['item-stat-' + i].value = entries[i] ? entries[i][0] : '';
        this.ui['item-stat-value-' + i].value = entries[i] ? entries[i][1] : 0;
      }
    }

    saveItem() {
      if (this.app.profile.inventory.length >= this.app.profile.inventoryCapacity) { this.app.toast('背包已满，请先清理空间', true); return; }
      const id = this.ui['item-edit-id'].value || root.MechItems.newId('custom-item');
      const slot = this.ui['item-slot'].value; const rarity = this.ui['item-rarity'].value;
      const affixes = {};
      for (let i = 0; i < 4; i += 1) {
        const key = this.ui['item-stat-' + i].value; if (!key) continue;
        const definition = root.MechItems.affixes[key];
        let value = Number(this.ui['item-stat-value-' + i].value) || 0;
        value = definition.flat ? Math.round(Math.max(-10000, Math.min(10000, value))) : Math.max(-.9, Math.min(10, value));
        affixes[key] = value;
      }
      const item = {
        id, baseId: 'custom', slot, kind: root.MechItems.slots[slot].kind,
        name: this.ui['item-name'].value.trim().slice(0, 28) || '自定义装备', rarity,
        level: this.app.profile.character.level, affixes,
        value: Math.max(1, Math.min(999999, Number(this.ui['item-price'].value) || 500)),
        color: this.ui['item-color'].value, custom: true
      };
      const index = this.app.profile.customItems.findIndex(function (entry) { return entry.id === id; });
      if (index >= 0) this.app.profile.customItems[index] = copy(item); else this.app.profile.customItems.push(copy(item));
      const inventoryItem = copy(item); inventoryItem.id = root.MechItems.newId('gear'); this.app.profile.inventory.push(inventoryItem);
      this.ui['item-edit-id'].value = id; this.app.saveProfile(); this.renderCustomItems();
      this.app.toast('物品已保存并放入背包');
    }

    renderCustomItems() {
      const list = this.ui['custom-item-list']; list.innerHTML = '';
      this.app.profile.customItems.forEach(function (item) {
        const entry = el('div', 'saved-entry'); entry.style.borderLeftColor = item.color;
        entry.append(el('b', '', item.name), el('small', '', root.MechItems.slots[item.slot].name + ' · ' + Object.keys(item.affixes || {}).length + ' 词缀 · ' + item.value + ' 信用点'));
        const actions = el('div', 'saved-actions'); const edit = el('button', '', '编辑'); const clone = el('button', '', '复制到背包'); const remove = el('button', '', '删除');
        edit.addEventListener('click', function () { this.loadItem(item); }.bind(this));
        clone.addEventListener('click', function () {
          if (this.app.profile.inventory.length >= this.app.profile.inventoryCapacity) { this.app.toast('背包已满', true); return; }
          const cloned = copy(item); cloned.id = root.MechItems.newId('gear'); this.app.profile.inventory.push(cloned); this.app.saveProfile(); this.app.toast('已复制到背包');
        }.bind(this));
        remove.addEventListener('click', function () { this.app.profile.customItems = this.app.profile.customItems.filter(function (entryItem) { return entryItem.id !== item.id; }); this.app.saveProfile(); this.renderCustomItems(); }.bind(this));
        actions.append(edit, clone, remove); entry.appendChild(actions); list.appendChild(entry);
      }, this);
      if (!this.app.profile.customItems.length) list.append(el('small', '', '尚未创建自定义物品'));
    }

    newUnit() {
      this.ui['unit-edit-id'].value = ''; this.ui['unit-name'].value = '自定义敌人'; this.ui['unit-model'].value = 'raider';
      this.ui['unit-color'].value = '#b56958'; this.ui['unit-hp'].value = 150; this.ui['unit-speed'].value = 120;
      this.ui['unit-damage'].value = 12; this.ui['unit-range'].value = 400; this.ui['unit-rate'].value = .65; this.ui['unit-scale'].value = 1;
      this.renderUnitPreview();
    }

    readUnitForm() {
      const candidate = {
        id: this.ui['unit-edit-id'].value || root.MechItems.newId('unit'), name: this.ui['unit-name'].value.trim().slice(0, 20) || '自定义敌人',
        model: this.ui['unit-model'].value, color: this.ui['unit-color'].value,
        hp: Number(this.ui['unit-hp'].value), speed: Number(this.ui['unit-speed'].value), damage: Number(this.ui['unit-damage'].value),
        range: Number(this.ui['unit-range'].value), fireRate: Number(this.ui['unit-rate'].value), scale: Number(this.ui['unit-scale'].value),
        xp: this.ui['unit-model'].value === 'drone' ? 35 : 20, custom: true
      };
      return root.MechItems.unitDefinition(candidate.id, { customUnits: [candidate] });
    }

    saveUnit() {
      const unit = this.readUnitForm();
      const index = this.app.profile.customUnits.findIndex(function (entry) { return entry.id === unit.id; });
      if (index >= 0) this.app.profile.customUnits[index] = unit; else this.app.profile.customUnits.push(unit);
      this.ui['unit-edit-id'].value = unit.id; this.app.saveProfile(); this.renderUnitList(); this.refreshUnitPalette();
      this.app.toast('单位已保存，可在关卡编辑器中使用');
    }

    loadUnit(unit) {
      this.show('unit'); this.ui['unit-edit-id'].value = unit.custom ? unit.id : '';
      this.ui['unit-name'].value = unit.custom ? unit.name : unit.name + ' 改造型'; this.ui['unit-model'].value = unit.model;
      this.ui['unit-color'].value = unit.color; this.ui['unit-hp'].value = unit.hp; this.ui['unit-speed'].value = unit.speed;
      this.ui['unit-damage'].value = unit.damage; this.ui['unit-range'].value = unit.range; this.ui['unit-rate'].value = unit.fireRate; this.ui['unit-scale'].value = unit.scale;
      this.renderUnitPreview();
    }

    renderUnitPreview() {
      const ctx = this.unitCtx; const canvas = this.ui['unit-editor-canvas']; const unit = this.readUnitForm();
      ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.strokeStyle = 'rgba(130,190,180,.12)';
      for (let r = 40; r < 160; r += 40) { ctx.beginPath(); ctx.arc(180, 150, r, 0, Math.PI * 2); ctx.stroke(); }
      const renderer = this.app.renderer; const previous = renderer.ctx; renderer.ctx = ctx;
      if (unit.model === 'drone') renderer.drawDrone({ x: 180, y: 150, angle: -.3, color: unit.color, scale: unit.scale * 2 }, 1);
      else renderer.drawInfantryUnit(180, 150, -.3, unit.color, unit.scale * 3, true);
      renderer.ctx = previous;
      ctx.fillStyle = unit.color; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(unit.name, 180, 270); ctx.textAlign = 'left';
    }

    renderUnitList() {
      const list = this.ui['unit-list']; list.innerHTML = '';
      Object.values(root.MechItems.units).concat(this.app.profile.customUnits).forEach(function (unit) {
        const entry = el('div', 'saved-entry'); entry.style.borderLeftColor = unit.color;
        entry.append(el('b', '', unit.name + (unit.custom ? '' : '（内置）')), el('small', '', unit.model + ' · 耐久 ' + unit.hp + ' · 伤害 ' + unit.damage + ' · 射程 ' + unit.range));
        const actions = el('div', 'saved-actions'); const edit = el('button', '', unit.custom ? '编辑' : '复制修改');
        edit.addEventListener('click', function () { this.loadUnit(unit); }.bind(this)); actions.appendChild(edit);
        if (unit.custom) {
          const remove = el('button', '', '删除'); remove.addEventListener('click', function () {
            this.app.profile.customUnits = this.app.profile.customUnits.filter(function (entryUnit) { return entryUnit.id !== unit.id; });
            this.app.saveProfile(); this.renderUnitList(); this.refreshUnitPalette();
          }.bind(this)); actions.appendChild(remove);
        }
        entry.appendChild(actions); list.appendChild(entry);
      }, this);
    }

    refreshUnitPalette() {
      this.ui['level-palette'].querySelectorAll('[data-custom-unit]').forEach(function (node) { node.remove(); });
      this.app.profile.customUnits.forEach(function (unit) {
        const button = el('button', '', unit.name); button.dataset.levelTool = unit.id; button.dataset.customUnit = 'true';
        this.ui['level-palette'].appendChild(button);
      }, this);
    }
  }

  root.MechEditorUI = EditorUI;
})(typeof window !== 'undefined' ? window : globalThis);
