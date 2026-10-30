(function (root) {
  'use strict';

  const Core = root.MechCore;
  const Data = root.MechData;
  const STORAGE_KEY = 'iron-extraction-profile-v1';

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(Data.defaults));
  }

  function loadProfile() {
    const profile = cloneDefaults();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        Object.keys(saved).forEach(function (key) {
          if (key !== 'loadout' && saved[key] !== undefined) profile[key] = saved[key];
        });
        profile.loadout = Object.assign(profile.loadout, saved.loadout || {});
      }
    } catch (error) {
      console.warn('存档读取失败，已使用新档案。', error);
    }
    profile.callsign = String(profile.callsign || Data.defaults.callsign).slice(0, 24);
    profile.credits = Math.max(0, Number(profile.credits) || 0);
    profile.unlocked = Array.isArray(profile.unlocked) ? profile.unlocked.filter(function (id) { return Data.weapons[id]; }) : cloneDefaults().unlocked;
    Data.defaults.unlocked.forEach(function (id) { if (profile.unlocked.indexOf(id) < 0) profile.unlocked.push(id); });
    ['mechPrimary', 'mechSecondary', 'infPrimary', 'infSecondary'].forEach(function (key) {
      if (!Data.weapons[profile.loadout[key]]) profile.loadout[key] = cloneDefaults().loadout[key];
    });
    ['mechMods', 'infMods'].forEach(function (key) {
      if (!Array.isArray(profile.loadout[key])) profile.loadout[key] = cloneDefaults().loadout[key];
      profile.loadout[key] = profile.loadout[key].filter(function (id, index, list) {
        return Data.mods[id] && list.indexOf(id) === index;
      }).slice(0, 2);
    });
    return root.MechItems.normalizeProfile(profile);
  }

  function cacheUi() {
    const ids = [
      'credits', 'net-dot', 'net-label', 'workspace-nav', 'nav-hangar', 'nav-inventory', 'nav-editor',
      'inventory-screen', 'editor-screen', 'hangar', 'region-name', 'seed-input', 'reroll-button',
      'map-preview', 'player-count', 'player-list', 'chat-log', 'chat-form', 'chat-input',
      'callsign-label', 'mech-title', 'mech-subtitle', 'hangar-mode-label', 'unit-stats',
      'weapon-slots', 'weapon-options', 'mod-options', 'raid-count', 'success-count', 'best-run',
      'deploy-map-name', 'deploy-button', 'mission-hud', 'mission-seed', 'mission-region',
      'health-fill', 'health-label', 'form-label', 'heat-row', 'heat-fill', 'heat-label', 'systems-status', 'part-status',
      'objective-text', 'objective-sub', 'mission-time', 'kill-feed', 'weapon-index', 'weapon-kind',
      'weapon-name', 'reload-label', 'ammo-label', 'carry-value', 'carry-items', 'dash-hud',
      'interact-prompt', 'debrief', 'debrief-title', 'debrief-reason', 'debrief-stats', 'debrief-loot',
      'return-button', 'help-modal', 'help-button', 'close-help', 'damage-vignette', 'toast-container'
    ];
    const ui = {};
    ids.forEach(function (id) {
      const key = id.replace(/-([a-z])/g, function (_, letter) { return letter.toUpperCase(); });
      ui[key] = document.getElementById(id);
    });
    return ui;
  }

  class HangarNetwork {
    constructor(app) {
      this.app = app;
      this.socket = null;
      this.connected = false;
      this.reconnectTimer = null;
    }

    connect() {
      if (!/^https?:$/.test(location.protocol) || typeof WebSocket === 'undefined') {
        this.app.setNetworkStatus('离线模式 · 请用 server.rb 启动联机', 'offline');
        return;
      }
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      try {
        this.socket = new WebSocket(protocol + '//' + location.host + '/ws');
      } catch (error) {
        this.app.setNetworkStatus('离线模式', 'offline');
        return;
      }
      this.socket.addEventListener('open', function () {
        this.connected = true;
        this.app.setNetworkStatus('格纳库已连接', 'online');
        this.send({ type: 'hello', name: this.app.profile.callsign, color: this.app.color, loadout: this.app.profile.loadout });
      }.bind(this));
      this.socket.addEventListener('message', function (event) {
        try { this.app.handleNetworkMessage(JSON.parse(event.data)); }
        catch (error) { console.warn('无效网络消息', error); }
      }.bind(this));
      this.socket.addEventListener('close', function () {
        this.connected = false;
        this.app.setNetworkStatus('连接中断 · 正在重连', 'offline');
        this.app.localId = null;
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(this.connect.bind(this), 3500);
      }.bind(this));
      this.socket.addEventListener('error', function () {
        this.app.setNetworkStatus('联机不可用 · 可离线游玩', 'offline');
      }.bind(this));
    }

    send(message) {
      if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
      this.socket.send(JSON.stringify(message));
      return true;
    }
  }

  const app = {
    profile: loadProfile(),
    ui: cacheUi(),
    renderer: new root.MechRenderer(document.getElementById('game'), document.getElementById('minimap')),
    input: { keys: new Set(), pressed: new Set(), mouse: { x: innerWidth / 2, y: innerHeight / 2, down: false } },
    screen: 'hangar', activeTab: 'mech', selectedSlot: 0,
    raid: null, localId: null, lobby: [], helpOpen: false,
    lastFrame: performance.now(), networkClock: 0, damageLevel: 0,
    color: '#82e6d8',

    init() {
      const colors = ['#82e6d8', '#efb76d', '#a5b8f3', '#d99adf', '#a6d98a', '#e88f7d'];
      this.color = colors[Core.hashSeed(this.profile.callsign) % colors.length];
      this.network = new HangarNetwork(this);
      this.inventoryUI = new root.MechInventoryUI(this);
      this.editorUI = new root.MechEditorUI(this);
      this.bindEvents();
      this.ui.seedInput.value = this.makeSeed();
      this.renderMapBrief();
      this.renderProfile();
      this.renderLoadout();
      this.renderLobby();
      this.network.connect();
      requestAnimationFrame(this.frame.bind(this));
    },

    saveProfile() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile)); }
      catch (error) { console.warn('无法写入本地存档', error); }
    },

    makeSeed() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let text = '';
      for (let i = 0; i < 6; i += 1) text += chars[Math.floor(Math.random() * chars.length)];
      return text;
    },

    bindEvents() {
      this.ui.navHangar.addEventListener('click', function () { this.showWorkspace('hangar'); }.bind(this));
      this.ui.navInventory.addEventListener('click', function () { this.showWorkspace('inventory'); }.bind(this));
      this.ui.navEditor.addEventListener('click', function () { this.showWorkspace('editor'); }.bind(this));
      window.addEventListener('resize', function () {
        this.renderer.resize();
        if (this.raid) this.raid.updateCamera();
      }.bind(this));
      window.addEventListener('keydown', function (event) {
        if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(event.target.tagName) >= 0) {
          if (event.code === 'Escape') event.target.blur();
          return;
        }
        if (event.code === 'KeyH' && !event.repeat) {
          this.toggleHelp(); event.preventDefault(); return;
        }
        if (event.code === 'Escape' && this.helpOpen) { this.toggleHelp(); return; }
        if (this.screen !== 'raid') return;
        if (!event.repeat) this.input.pressed.add(event.code);
        this.input.keys.add(event.code);
        if (['Space', 'Digit1', 'Digit2', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].indexOf(event.code) >= 0) event.preventDefault();
      }.bind(this));
      window.addEventListener('keyup', function (event) { this.input.keys.delete(event.code); }.bind(this));
      window.addEventListener('blur', function () { this.input.keys.clear(); this.input.mouse.down = false; }.bind(this));
      window.addEventListener('mousemove', function (event) { this.input.mouse.x = event.clientX; this.input.mouse.y = event.clientY; }.bind(this));
      window.addEventListener('mousedown', function (event) {
        if (event.button === 0 && this.screen === 'raid' && !this.helpOpen && event.target === this.renderer.canvas) this.input.mouse.down = true;
      }.bind(this));
      window.addEventListener('mouseup', function (event) { if (event.button === 0) this.input.mouse.down = false; }.bind(this));
      this.renderer.canvas.addEventListener('contextmenu', function (event) { event.preventDefault(); });

      document.querySelectorAll('[data-tab]').forEach(function (button) {
        button.addEventListener('click', function () {
          this.activeTab = button.dataset.tab; this.selectedSlot = 0; this.renderLoadout();
        }.bind(this));
      }.bind(this));
      this.ui.rerollButton.addEventListener('click', function () { this.ui.seedInput.value = this.makeSeed(); this.renderMapBrief(); }.bind(this));
      this.ui.seedInput.addEventListener('change', this.renderMapBrief.bind(this));
      this.ui.deployButton.addEventListener('click', function () {
        const seed = this.ui.seedInput.value.trim() || this.makeSeed();
        this.ui.seedInput.value = seed;
        if (!this.network.send({ type: 'deploy', seed })) this.startRaid(seed);
      }.bind(this));
      this.ui.returnButton.addEventListener('click', this.returnToHangar.bind(this));
      this.ui.helpButton.addEventListener('click', this.toggleHelp.bind(this));
      this.ui.closeHelp.addEventListener('click', this.toggleHelp.bind(this));
      this.ui.helpModal.addEventListener('click', function (event) { if (event.target === this.ui.helpModal) this.toggleHelp(); }.bind(this));
      this.ui.chatForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const text = this.ui.chatInput.value.trim();
        if (!text) return;
        if (this.network.send({ type: 'chat', text })) this.ui.chatInput.value = '';
        else this.toast('离线模式下无法发送联机消息', true);
      }.bind(this));
    },

    showWorkspace(view) {
      if (this.screen === 'raid' || this.screen === 'debrief') return;
      this.screen = view;
      this.ui.hangar.classList.toggle('hidden', view !== 'hangar');
      this.ui.inventoryScreen.classList.toggle('hidden', view !== 'inventory');
      this.ui.editorScreen.classList.toggle('hidden', view !== 'editor');
      this.ui.navHangar.classList.toggle('active', view === 'hangar');
      this.ui.navInventory.classList.toggle('active', view === 'inventory');
      this.ui.navEditor.classList.toggle('active', view === 'editor');
      if (view === 'inventory') this.inventoryUI.render();
      if (view === 'editor') this.editorUI.show(this.editorUI.tab);
      if (view === 'hangar') { this.renderProfile(); this.renderLoadout(); }
    },

    renderProfile() {
      const p = this.profile;
      this.ui.credits.textContent = Math.round(p.credits).toLocaleString();
      this.ui.callsignLabel.textContent = p.callsign;
      this.ui.raidCount.textContent = p.raids || 0;
      this.ui.successCount.textContent = p.successfulRaids || 0;
      this.ui.bestRun.textContent = Math.round(p.bestRun || 0).toLocaleString();
      this.saveProfile();
    },

    renderMapBrief() {
      const seed = this.ui.seedInput.value.trim() || 'UNKNOWN';
      const map = Core.generateMap(seed);
      this.ui.regionName.textContent = map.name;
      this.ui.deployMapName.textContent = map.name;
      this.ui.mapPreview.querySelector('b').textContent = String(map.buildings.length).padStart(2, '0');
      this.ui.mapPreview.querySelector('small').textContent = map.enemies.length + ' 个威胁信号';
    },

    renderLoadout() {
      const tab = this.activeTab;
      const isMech = tab === 'mech';
      const kind = isMech ? 'mech' : 'infantry';
      const stats = Core.computeStats(this.profile);
      const systems = isMech ? Core.computeMechSystems(this.profile) : null;
      document.querySelectorAll('[data-tab]').forEach(function (button) { button.classList.toggle('active', button.dataset.tab === tab); });
      const frame = root.MechItems.chassis[this.profile.mech.chassis];
      this.ui.hangarModeLabel.textContent = isMech ? frame.role : 'P-12 单兵作战系统';
      this.ui.mechTitle.textContent = isMech ? frame.name.split('「')[0] + '「' + this.profile.mech.name + '」' : 'P-12「游隼」';
      this.ui.mechSubtitle.textContent = isMech ? frame.description : '轻量化室内渗透作战装备';
      const statData = isMech ? [
        ['反应堆出力', systems.powerOutput + ' kW'], ['负重', systems.weightUsed + '/' + systems.weightCapacity + ' t'],
        ['转向速率', systems.turnRate + '°/s'], ['结构耐久', stats.mechHp],
        ['实际速度', systems.speed], ['散热效率', Math.round(systems.cooling * 100) + '%']
      ] : [
        ['单兵耐久', stats.infHp], ['机动速度', Math.round(stats.infSpeed)], ['行动背包', '12 件']
      ];
      this.ui.unitStats.innerHTML = '';
      statData.forEach(function (entry) {
        const div = document.createElement('div'); div.className = 'unit-stat';
        const label = document.createElement('span'); label.textContent = entry[0];
        const value = document.createElement('b'); value.textContent = entry[1];
        div.append(label, value); this.ui.unitStats.appendChild(div);
      }, this);

      const keys = isMech ? ['mechPrimary', 'mechSecondary'] : ['infPrimary', 'infSecondary'];
      this.ui.weaponSlots.innerHTML = '';
      keys.forEach(function (key, index) {
        const button = document.createElement('button');
        button.className = 'weapon-slot' + (index === this.selectedSlot ? ' active' : '');
        const small = document.createElement('small'); small.textContent = index === 0 ? '01 / 主武器' : '02 / 副武器';
        const name = document.createElement('b'); name.textContent = Data.weapons[this.profile.loadout[key]].name;
        button.append(small, name);
        button.addEventListener('click', function () { this.selectedSlot = index; this.renderLoadout(); }.bind(this));
        this.ui.weaponSlots.appendChild(button);
      }, this);

      this.ui.weaponOptions.innerHTML = '';
      Object.values(Data.weapons).filter(function (weapon) { return weapon.kind === kind; }).forEach(function (weapon) {
        const unlocked = this.profile.unlocked.indexOf(weapon.id) >= 0;
        const equippedHere = this.profile.loadout[keys[this.selectedSlot]] === weapon.id;
        const equippedOther = this.profile.loadout[keys[1 - this.selectedSlot]] === weapon.id;
        const button = document.createElement('button');
        button.className = 'weapon-option' + (equippedHere ? ' equipped' : '') + (!unlocked ? ' locked' : '');
        button.disabled = equippedOther;
        const line = document.createElement('div'); line.className = 'weapon-line';
        const name = document.createElement('b'); name.textContent = weapon.name;
        const price = document.createElement('em'); price.textContent = equippedHere ? '已装备' : (unlocked ? weapon.tag : weapon.price.toLocaleString() + ' 解锁');
        line.append(name, price);
        const desc = document.createElement('p'); desc.textContent = weapon.description;
        const statsLine = document.createElement('small'); statsLine.textContent = '伤害 ' + weapon.damage + ' · 弹匣 ' + weapon.mag + ' · ' + weapon.tag;
        button.append(root.MechAssets.weapon(weapon.id, weapon.name), line, statsLine, desc);
        button.addEventListener('click', function () { this.selectWeapon(weapon, keys[this.selectedSlot]); }.bind(this));
        this.ui.weaponOptions.appendChild(button);
      }, this);

      const modKey = isMech ? 'mechMods' : 'infMods';
      this.ui.modOptions.innerHTML = '';
      Object.values(Data.mods).filter(function (mod) { return mod.kind === kind; }).forEach(function (mod) {
        const equipped = this.profile.loadout[modKey].indexOf(mod.id) >= 0;
        const button = document.createElement('button'); button.className = 'mod-option' + (equipped ? ' equipped' : '');
        const name = document.createElement('b'); name.textContent = (equipped ? '✓ ' : '') + mod.name;
        const stat = document.createElement('small'); stat.textContent = mod.stat;
        button.append(name, stat);
        button.addEventListener('click', function () {
          const list = this.profile.loadout[modKey];
          const index = list.indexOf(mod.id);
          if (index >= 0) list.splice(index, 1);
          else if (list.length >= 2) { this.toast('最多安装两项，请先卸下一项改装', true); return; }
          else list.push(mod.id);
          this.renderLoadout(); this.renderProfile(); this.network.send({ type: 'loadout', loadout: this.profile.loadout });
        }.bind(this));
        this.ui.modOptions.appendChild(button);
      }, this);
    },

    selectWeapon(weapon, slotKey) {
      if (this.profile.unlocked.indexOf(weapon.id) < 0) {
        if (this.profile.credits < weapon.price) { this.toast('信用点不足，需要 ' + weapon.price.toLocaleString(), true); return; }
        this.profile.credits -= weapon.price;
        this.profile.unlocked.push(weapon.id);
        this.toast('已解锁 ' + weapon.name);
      }
      this.profile.loadout[slotKey] = weapon.id;
      this.renderLoadout(); this.renderProfile();
      this.network.send({ type: 'loadout', loadout: this.profile.loadout });
    },

    setNetworkStatus(text, status) {
      this.ui.netLabel.textContent = text;
      this.ui.netDot.className = status || '';
    },

    handleNetworkMessage(message) {
      if (message.type === 'welcome') {
        this.localId = message.id;
      } else if (message.type === 'lobby') {
        const previous = this.lobby;
        this.lobby = (message.players || []).map(function (player) {
          const old = previous.find(function (entry) { return entry.id === player.id; });
          return Object.assign({}, old || {}, player, { local: player.id === this.localId, state: old ? old.state : {} });
        }.bind(this));
        this.renderLobby();
      } else if (message.type === 'state') {
        const player = this.lobby.find(function (entry) { return entry.id === message.id; });
        if (player) player.state = Object.assign({}, player.state, message.state || {});
      } else if (message.type === 'leave') {
        this.lobby = this.lobby.filter(function (entry) { return entry.id !== message.id; });
        this.renderLobby();
      } else if (message.type === 'chat') {
        this.appendChat(message.name || '驾驶员', message.text || '');
      } else if (message.type === 'deploy') {
        if (this.screen === 'hangar') {
          if (message.id !== this.localId) this.toast('联机行动开始 · 地图序列 ' + message.seed);
          this.startRaid(message.seed);
        }
      } else if (message.type === 'fx' && this.raid && message.fx && message.fx.seed === this.raid.map.seed) {
        const fx = message.fx;
        if (fx.kind === 'shot') this.raid.burst(fx.x + Math.cos(fx.angle) * 32, fx.y + Math.sin(fx.angle) * 32, fx.color || '#fff', 2, 40);
      }
    },

    renderLobby() {
      const players = this.lobby.slice();
      if (!players.some(function (p) { return p.local; })) players.unshift({ id: 'local', name: this.profile.callsign, color: this.color, local: true, state: { status: 'hangar' } });
      this.ui.playerCount.textContent = players.length + '/8';
      this.ui.playerList.innerHTML = '';
      players.forEach(function (player) {
        const row = document.createElement('div'); row.className = 'player-item'; row.style.setProperty('--player-color', player.color || '#82e6d8');
        const portrait = root.MechAssets.portrait(String(player.id) + player.name, player.name); portrait.classList.add('roster-art');
        const name = document.createElement('span'); name.textContent = player.name + (player.local ? '（你）' : '');
        const status = document.createElement('small'); status.textContent = player.state && player.state.status === 'raid' ? '行动中' : '整备中';
        row.append(portrait, name, status); this.ui.playerList.appendChild(row);
      }, this);
    },

    appendChat(name, text) {
      const line = document.createElement('p');
      const sender = document.createElement('span'); sender.textContent = String(name).slice(0, 24);
      line.appendChild(sender); line.appendChild(document.createTextNode(' ' + String(text).slice(0, 120)));
      this.ui.chatLog.appendChild(line);
      while (this.ui.chatLog.children.length > 20) this.ui.chatLog.firstChild.remove();
      this.ui.chatLog.scrollTop = this.ui.chatLog.scrollHeight;
    },

    startRaid(seed, customMap) {
      this.helpOpen = false; this.ui.helpModal.classList.add('hidden');
      this.profile.raids = (Number(this.profile.raids) || 0) + 1;
      this.renderProfile();
      this.raid = new root.MechRaid(this, String(seed), customMap || null);
      this.screen = 'raid';
      this.ui.hangar.classList.add('hidden'); this.ui.inventoryScreen.classList.add('hidden'); this.ui.editorScreen.classList.add('hidden');
      this.ui.workspaceNav.classList.add('hidden'); this.ui.debrief.classList.add('hidden'); this.ui.missionHud.classList.remove('hidden');
      this.ui.missionSeed.textContent = 'SEED / ' + seed;
      this.ui.missionRegion.textContent = this.raid.map.name;
      this.input.keys.clear(); this.input.pressed.clear(); this.input.mouse.down = false;
      this.raid.updateHud();
    },

    endRaid(raid, success, reason) {
      this.screen = 'debrief'; this.input.mouse.down = false; this.input.keys.clear();
      this.profile.totalKills = (Number(this.profile.totalKills) || 0) + raid.kills;
      let recovered = { recovered: [], overflowValue: 0 };
      if (success) {
        recovered = root.MechItems.recoverGear(this.profile, raid.gear);
        this.profile.credits += raid.carryValue;
        this.profile.successfulRaids = (Number(this.profile.successfulRaids) || 0) + 1;
        this.profile.bestRun = Math.max(Number(this.profile.bestRun) || 0, raid.carryValue);
      }
      const xpGain = raid.xp + (success ? 100 : 0);
      const progression = root.MechItems.addExperience(this.profile, xpGain);
      raid.recovered = recovered; raid.progression = progression;
      this.renderProfile();
      this.ui.missionHud.classList.add('hidden'); this.ui.debrief.classList.remove('hidden');
      this.ui.debrief.querySelector('.debrief-card').classList.toggle('failed', !success);
      this.ui.debriefTitle.textContent = success ? '撤离成功' : '行动失败';
      this.ui.debriefReason.textContent = reason + ' · 经验 +' + xpGain + (progression.levels ? ' · 连升 ' + progression.levels + ' 级' : '');
      const values = [
        [success ? '物资入账' : '遗失物资', raid.carryValue.toLocaleString()],
        ['装备 / 威胁', raid.gear.length + ' / ' + raid.kills],
        ['行动用时', Math.floor(raid.elapsed / 60) + ':' + String(Math.floor(raid.elapsed % 60)).padStart(2, '0')]
      ];
      this.ui.debriefStats.innerHTML = '';
      values.forEach(function (entry) {
        const div = document.createElement('div'); div.className = 'debrief-stat';
        const label = document.createElement('span'); label.textContent = entry[0];
        const value = document.createElement('b'); value.textContent = entry[1];
        div.append(label, value); this.ui.debriefStats.appendChild(div);
      }, this);
      this.ui.debriefLoot.innerHTML = '';
      raid.gear.forEach(function (item) {
        const line = document.createElement('p'); const name = document.createElement('span');
        const icon = root.MechAssets.equipment(item.slot, item.name); icon.classList.add('debrief-art');
        name.textContent = '装备 · ' + item.name; name.style.color = item.color;
        const value = document.createElement('b'); value.textContent = success ? (recovered.recovered.indexOf(item) >= 0 ? '已入库' : '已出售') : '已遗失';
        line.append(icon, name, value); this.ui.debriefLoot.appendChild(line);
      }, this);
      raid.carried.forEach(function (item) {
        const line = document.createElement('p'); const name = document.createElement('span'); name.textContent = item.name;
        const value = document.createElement('b'); value.textContent = (success ? '+' : '-') + item.value;
        line.append(root.MechAssets.loot(item.name), name, value); this.ui.debriefLoot.appendChild(line);
      }, this);
      if (recovered.overflowValue) {
        const overflow = document.createElement('p'); overflow.textContent = '背包已满，溢出装备自动出售 +' + recovered.overflowValue;
        this.ui.debriefLoot.appendChild(overflow);
      }
      if (!raid.carried.length && !raid.gear.length) {
        const empty = document.createElement('p'); empty.textContent = raid.salvage ? '仅回收敌方合金 ' + raid.salvage : '本次没有搜获物资或装备';
        this.ui.debriefLoot.appendChild(empty);
      }
    },

    returnToHangar() {
      this.raid = null; this.screen = 'hangar';
      this.ui.debrief.classList.add('hidden'); this.ui.missionHud.classList.add('hidden'); this.ui.workspaceNav.classList.remove('hidden');
      this.ui.seedInput.value = this.makeSeed(); this.renderMapBrief(); this.renderLobby(); this.showWorkspace('hangar');
    },

    toggleHelp() {
      this.helpOpen = !this.helpOpen;
      this.ui.helpModal.classList.toggle('hidden', !this.helpOpen);
      this.input.mouse.down = false; this.input.keys.clear();
    },

    sendFx(fx) { this.network.send({ type: 'fx', fx }); },
    isPointerOverUi() { return false; },

    feed(html, loot) {
      const line = document.createElement('div'); line.className = 'feed-item' + (loot ? ' loot' : ''); line.innerHTML = html;
      this.ui.killFeed.appendChild(line);
      while (this.ui.killFeed.children.length > 6) this.ui.killFeed.firstChild.remove();
      setTimeout(function () { if (line.parentNode) line.remove(); }, 6500);
    },

    clearFeed() { this.ui.killFeed.innerHTML = ''; },

    toast(text, warning) {
      const toast = document.createElement('div'); toast.className = 'toast' + (warning ? ' warning' : ''); toast.textContent = text;
      this.ui.toastContainer.appendChild(toast);
      setTimeout(function () { toast.remove(); }, 2800);
    },

    damageFlash() {
      this.damageLevel = .65;
      this.ui.damageVignette.style.opacity = this.damageLevel;
    },

    frame(now) {
      const dt = Math.min(.05, Math.max(0, (now - this.lastFrame) / 1000));
      this.lastFrame = now;
      if (this.screen === 'raid' && this.raid) {
        if (!this.helpOpen) this.raid.update(dt);
        if (this.raid) this.renderer.drawMission(this.raid, this.lobby.filter(function (p) { return !p.local; }), now / 1000);
      } else if (['hangar', 'inventory', 'editor'].indexOf(this.screen) >= 0) {
        this.renderer.drawHangar(this.profile, this.activeTab, this.lobby, now / 1000);
      } else if (this.raid) {
        this.renderer.drawMission(this.raid, this.lobby.filter(function (p) { return !p.local; }), now / 1000);
      }
      this.input.pressed.clear();
      this.damageLevel = Math.max(0, this.damageLevel - dt * 1.8);
      this.ui.damageVignette.style.opacity = this.damageLevel;
      this.networkClock += dt;
      if (this.networkClock >= .1) {
        this.networkClock = 0;
        const activeRaid = this.raid && (this.screen === 'raid' || this.screen === 'debrief');
        this.network.send({ type: 'state', state: activeRaid ? {
          status: 'raid', seed: this.raid.map.seed, x: Math.round(this.raid.player.x * 10) / 10,
          y: Math.round(this.raid.player.y * 10) / 10, angle: this.raid.player.angle, mode: this.raid.player.mode
        } : { status: 'hangar', seed: '', x: 0, y: 0, angle: 0, mode: 'mech' } });
      }
      requestAnimationFrame(this.frame.bind(this));
    }
  };

  root.IronApp = app;
  app.init();
})(typeof window !== 'undefined' ? window : globalThis);
