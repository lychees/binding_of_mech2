(function (root) {
  'use strict';

  const slots = {
    infHelmet: { name: '头盔', kind: 'infantry', icon: '盔' },
    infArmor: { name: '护甲', kind: 'infantry', icon: '甲' },
    infGloves: { name: '手套', kind: 'infantry', icon: '套' },
    infBoots: { name: '战靴', kind: 'infantry', icon: '靴' },
    infCharm: { name: '战术核心', kind: 'infantry', icon: '核' },
    mechHead: { name: '机甲头部', kind: 'mech', icon: '头' },
    mechTorso: { name: '机甲躯干', kind: 'mech', icon: '躯' },
    mechArms: { name: '机甲手臂', kind: 'mech', icon: '臂' },
    mechLegs: { name: '机甲腿部', kind: 'mech', icon: '腿' },
    mechReactor: { name: '反应堆', kind: 'mech', icon: '炉' },
    mechArmor: { name: '外挂装甲', kind: 'mech', icon: '盾' }
  };

  const rarities = {
    common: { name: '普通', color: '#aab8b4', affixes: 0, multiplier: 1, score: 0 },
    magic: { name: '魔法', color: '#72aef5', affixes: 1, multiplier: 1.25, score: 1 },
    rare: { name: '稀有', color: '#e7ca68', affixes: 2, multiplier: 1.55, score: 2 },
    epic: { name: '史诗', color: '#c98af0', affixes: 3, multiplier: 1.95, score: 3 },
    legendary: { name: '传说', color: '#ff9b58', affixes: 4, multiplier: 2.5, score: 4 }
  };

  const affixes = {
    infHp: { name: '单兵耐久', flat: true, min: 8, max: 28 },
    infSpeed: { name: '单兵移速', min: .02, max: .07 },
    infDamage: { name: '单兵伤害', min: .025, max: .09 },
    mechHp: { name: '机甲耐久', flat: true, min: 15, max: 65 },
    mechSpeed: { name: '机甲移速', min: .015, max: .055 },
    mechDamage: { name: '机甲伤害', min: .025, max: .085 },
    cooling: { name: '散热效率', min: .04, max: .16 },
    heatGain: { name: '热量降低', min: -.11, max: -.035 },
    reload: { name: '装填加速', min: -.09, max: -.025 },
    magazine: { name: '弹匣容量', min: .04, max: .14 },
    spread: { name: '散布降低', min: -.12, max: -.04 },
    fireRate: { name: '射击速度', min: -.07, max: -.025 },
    dash: { name: '冲刺冷却', min: -.1, max: -.035 },
    swapHeal: { name: '换乘恢复', flat: true, min: 5, max: 22 },
    mechArmor: { name: '机甲减伤', min: .015, max: .055 },
    infArmor: { name: '单兵减伤', min: .015, max: .06 },
    critChance: { name: '暴击几率', min: .015, max: .055 },
    critDamage: { name: '暴击伤害', min: .06, max: .22 },
    lootLuck: { name: '战利品幸运', flat: true, min: 1, max: 5 },
    powerOutput: { name: '反应堆出力', flat: true, min: 30, max: 120 },
    weightCapacity: { name: '负重上限', flat: true, min: 1, max: 4 },
    partArmor: { name: '部件护甲', flat: true, min: 3, max: 12 },
    partDurability: { name: '部件耐久', flat: true, min: 15, max: 55 }
  };

  const bases = [
    { id: 'scout_helmet', slot: 'infHelmet', name: '侦察头盔', stats: { critChance: .01 } },
    { id: 'assault_helmet', slot: 'infHelmet', name: '突击头盔', stats: { infHp: 6 } },
    { id: 'ballistic_vest', slot: 'infArmor', name: '防弹背心', stats: { infArmor: .015, infHp: 5 } },
    { id: 'exo_rig', slot: 'infArmor', name: '外骨骼胸架', stats: { infHp: 10 } },
    { id: 'trigger_gloves', slot: 'infGloves', name: '扳机手套', stats: { fireRate: -.015 } },
    { id: 'surgeon_gloves', slot: 'infGloves', name: '精密手套', stats: { spread: -.025 } },
    { id: 'runner_boots', slot: 'infBoots', name: '疾行战靴', stats: { infSpeed: .018 } },
    { id: 'shock_boots', slot: 'infBoots', name: '减震战靴', stats: { infHp: 5, dash: -.015 } },
    { id: 'tactical_chip', slot: 'infCharm', name: '战术芯片', stats: { lootLuck: 1 } },
    { id: 'targeting_core', slot: 'infCharm', name: '瞄准核心', stats: { infDamage: .018 } },
    { id: 'sensor_head', slot: 'mechHead', name: '阵列传感头', stats: { critChance: .012 } },
    { id: 'armored_head', slot: 'mechHead', name: '重甲驾驶舱', stats: { mechHp: 18 } },
    { id: 'siege_torso', slot: 'mechTorso', name: '攻坚躯干', stats: { mechHp: 24, mechArmor: .01 } },
    { id: 'light_torso', slot: 'mechTorso', name: '轻量化躯干', stats: { mechSpeed: .015 } },
    { id: 'gunner_arms', slot: 'mechArms', name: '炮手机械臂', stats: { mechDamage: .02 } },
    { id: 'loader_arms', slot: 'mechArms', name: '装填机械臂', stats: { reload: -.02 } },
    { id: 'stride_legs', slot: 'mechLegs', name: '阔步步行机', stats: { mechSpeed: .018 } },
    { id: 'stabilizer_legs', slot: 'mechLegs', name: '稳定器腿组', stats: { spread: -.025, mechHp: 12 } },
    { id: 'fusion_reactor', slot: 'mechReactor', name: '聚变反应堆', stats: { cooling: .04 } },
    { id: 'burst_reactor', slot: 'mechReactor', name: '脉冲反应堆', stats: { dash: -.025, heatGain: -.015 } },
    { id: 'ceramic_plate', slot: 'mechArmor', name: '陶瓷装甲板', stats: { mechArmor: .018, mechHp: 15 } },
    { id: 'reactive_plate', slot: 'mechArmor', name: '反应装甲板', stats: { mechArmor: .025 } }
  ];

  const chassis = {
    scout: { name: 'S-18「蜂鸟」', role: '轻型 / 高速侦察', model: 'scout', hp: .82, speed: 1.2, damage: .95, cooling: 1.1, scale: .88, power: 780, capacity: 13, weight: 5.2, draw: 450, turn: 190, description: '高机动轻型底盘，耐久较低。' },
    assault: { name: 'MX-04「灰犀」', role: '中型 / 多用途', model: 'assault', hp: 1, speed: 1, damage: 1, scale: 1, power: 1000, capacity: 19, weight: 8, draw: 580, turn: 135, description: '平衡的标准步行作战平台。' },
    bastion: { name: 'B-09「堡垒」', role: '重型 / 火力攻坚', model: 'bastion', hp: 1.38, speed: .84, damage: 1.09, armor: .08, cooling: .95, scale: 1.14, power: 1380, capacity: 28, weight: 12.5, draw: 760, turn: 85, description: '重型装甲与火力底盘，移动较慢。' },
    ronin: { name: 'R-77「浪人」', role: '突击 / 暴击近战', model: 'ronin', hp: .94, speed: 1.14, damage: 1.12, crit: .06, scale: 1.02, power: 1120, capacity: 20, weight: 8.6, draw: 650, turn: 155, description: '搭载高频振动刀的高速突击机体。' },
    artillery: { name: 'M-12「雷瓮」', role: '重型 / 导弹压制', model: 'artillery', hp: 1.16, speed: .88, damage: 1.18, heatGain: 1.12, cooling: .9, scale: 1.1, power: 1500, capacity: 30, weight: 13.2, draw: 900, turn: 78, description: '双肩导弹舱提供火力，热量压力较高。' },
    aegis: { name: 'A-01「铁壁」', role: '防御 / 区域坚守', model: 'aegis', hp: 1.5, speed: .78, damage: .96, armor: .12, scale: 1.18, power: 1650, capacity: 34, weight: 15.5, draw: 920, turn: 65, description: '装备重型盾墙的超耐久防御平台。' },
    spectre: { name: 'N-06「幽魂」', role: '渗透 / 精确暴击', model: 'spectre', hp: .78, speed: 1.24, damage: 1.02, crit: .1, heatGain: .85, scale: .94, power: 900, capacity: 15, weight: 6.1, draw: 530, turn: 180, description: '狭长隐身轮廓，强调速度与弱点打击。' },
    mantis: { name: 'K-33「螳螂」', role: '多足 / 灵活机动', model: 'mantis', hp: 1.08, speed: 1.1, damage: 1.04, dash: .75, scale: 1.06, power: 1250, capacity: 24, weight: 10.2, draw: 680, turn: 145, description: '多足稳定结构显著缩短冲刺冷却。' },
    longbow: { name: 'L-40「长弓」', role: '狙击 / 远程精确', model: 'longbow', hp: .9, speed: .92, damage: 1.22, crit: .08, spread: .8, scale: 1.03, power: 1300, capacity: 23, weight: 9.8, draw: 740, turn: 105, description: '长管磁轨炮与瞄准阵列专精远程杀伤。' },
    redDragon: { name: '红龙', role: '突击 / 高攻低防', model: 'redDragon', remake: true, hp: .84, speed: 1.2, damage: 1.28, blast: 1.2, scale: 1.05, power: 1280, capacity: 22, weight: 9.2, draw: 760, turn: 155, description: '龙翼装甲与广域导弹，强调高速强攻。' },
    ironGolem: { name: '铁金刚', role: '节能 / 快速转向', model: 'ironGolem', remake: true, hp: 1.12, speed: 1.14, damage: 1.03, cooling: 1.25, scale: .98, power: 1200, capacity: 23, weight: 10.8, draw: 520, turn: 220, description: '圆形重甲舱体，低功耗与快速行动见长。' },
    bebeDragon: { name: '贝贝龙', role: '核弹 / 地形破坏', model: 'bebeDragon', remake: true, hp: .86, speed: .96, damage: 1.3, blast: 1.35, scale: 1.1, power: 1400, capacity: 26, weight: 11.5, draw: 850, turn: 110, description: '重型导弹平台，牺牲防护换取爆炸杀伤。' },
    fierceFire: { name: '烈火', role: '均衡 / 导弹齐射', model: 'fierceFire', remake: true, hp: 1.05, speed: 1.05, damage: 1.08, blast: 1.1, scale: 1, power: 1100, capacity: 22, weight: 9, draw: 640, turn: 145, description: '攻防机动均衡，适配多种导弹武器。' },
    toxicSpider: { name: '毒蜘蛛', role: '四足 / 高防持久战', model: 'toxicSpider', remake: true, hp: 1.35, speed: 1.08, damage: .88, armor: .1, scale: 1.13, power: 1420, capacity: 29, weight: 13.5, draw: 720, turn: 170, description: '四足重甲结构，转向灵活但火力偏弱。' },
    whirlwind: { name: '旋风', role: '悬浮 / 极限机动', model: 'whirlwind', remake: true, hp: .68, speed: 1.45, damage: 1, cooling: 1.15, scale: .9, power: 980, capacity: 16, weight: 6.4, draw: 600, turn: 210, description: '悬浮高速机体，拥有全阵容最高移速。' },
    thor: { name: '托尔', role: '重甲 / 近距散射', model: 'thor', remake: true, hp: 1.45, speed: .82, damage: 1.12, armor: .14, spread: 1.22, scale: 1.16, power: 1580, capacity: 32, weight: 14.2, draw: 880, turn: 95, description: '近距散发导弹重甲平台，远程散布较大。' },
    redFlame: { name: '赤焰', role: '火焰 / 广域爆发', model: 'redFlame', remake: true, hp: .78, speed: 1.22, damage: 1.24, blast: 1.4, heatGain: 1.15, scale: 1, power: 1180, capacity: 20, weight: 8.4, draw: 720, turn: 165, description: '高机动火焰机体，爆炸范围大但耐久较低。' },
    landen: { name: '兰登', role: '光束 / 重火力', model: 'landen', remake: true, hp: 1.2, speed: .76, damage: 1.3, armor: .08, spread: .85, scale: 1.12, power: 1520, capacity: 29, weight: 13.8, draw: 940, turn: 80, description: '双光束重炮平台，攻防出色但移动缓慢。' },
    odin: { name: '奥丁', role: '离子 / 高能机动', model: 'odin', remake: true, hp: 1.1, speed: 1.2, damage: 1.1, armor: .05, cooling: 1.2, dash: .85, scale: 1.04, power: 1350, capacity: 24, weight: 9.6, draw: 680, turn: 165, description: '双离子炮与高效能源系统，攻防机动均衡。' }
  };

  const units = {
    raider: { id: 'raider', name: '掠夺者', model: 'raider', hp: 90, speed: 118, damage: 9, range: 365, fireRate: .57, color: '#b56958', scale: 1.05, xp: 20 },
    drone: { id: 'drone', name: '猎杀无人机', model: 'drone', hp: 145, speed: 105, damage: 14, range: 460, fireRate: .88, color: '#b56d58', scale: 1, xp: 35 }
  };

  function newId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e7).toString(36);
  }

  function normalizeProfile(profile) {
    profile.inventory = Array.isArray(profile.inventory) ? profile.inventory.filter(function (item) { return item && slots[item.slot]; }).slice(0, 60) : [];
    profile.inventoryCapacity = 36;
    profile.equipped = profile.equipped && typeof profile.equipped === 'object' ? profile.equipped : {};
    Object.keys(slots).forEach(function (slot) {
      const item = profile.equipped[slot];
      if (!item || item.slot !== slot) profile.equipped[slot] = null;
    });
    profile.character = profile.character || {};
    profile.character.level = Math.max(1, Math.floor(Number(profile.character.level) || 1));
    profile.character.xp = Math.max(0, Math.floor(Number(profile.character.xp) || 0));
    profile.character.points = Math.max(0, Math.floor(Number(profile.character.points) || 0));
    profile.character.attributes = Object.assign({ might: 0, agility: 0, fortitude: 0, interface: 0 }, profile.character.attributes || {});
    Object.keys(profile.character.attributes).forEach(function (key) {
      profile.character.attributes[key] = Math.max(0, Math.floor(Number(profile.character.attributes[key]) || 0));
    });
    profile.mech = Object.assign({ chassis: 'assault', paint: '#698a82', name: '灰犀' }, profile.mech || {});
    if (!chassis[profile.mech.chassis]) profile.mech.chassis = 'assault';
    profile.mech.name = String(profile.mech.name || '灰犀').slice(0, 16);
    profile.mech.paint = /^#[0-9a-f]{6}$/i.test(profile.mech.paint) ? profile.mech.paint : '#698a82';
    profile.customUnits = Array.isArray(profile.customUnits) ? profile.customUnits : [];
    profile.customItems = Array.isArray(profile.customItems) ? profile.customItems : [];
    profile.customMaps = Array.isArray(profile.customMaps) ? profile.customMaps : [];
    if (!profile.gearInitialized) {
      ['starter-armor', 'starter-legs'].forEach(function (seed, index) {
        const item = generateItem(seed, 1, 0, index === 0 ? 'ballistic_vest' : 'stride_legs');
        item.rarity = 'common'; item.affixes = Object.assign({}, bases.find(function (b) { return b.id === item.baseId; }).stats);
        item.name = index === 0 ? '旧式防弹背心' : '标准步行机腿组';
        profile.inventory.push(item);
      });
      profile.gearInitialized = true;
    }
    return profile;
  }

  function rollRarity(rand, luck) {
    const value = rand() * 100 - Math.min(25, (luck || 0) * 1.5);
    if (value < 2) return 'legendary';
    if (value < 8) return 'epic';
    if (value < 25) return 'rare';
    if (value < 55) return 'magic';
    return 'common';
  }

  function generateItem(seed, level, luck, forcedBase, forcedRarity) {
    const rand = root.MechCore.randomFrom(seed);
    const base = forcedBase ? bases.find(function (entry) { return entry.id === forcedBase; }) : bases[Math.floor(rand() * bases.length)];
    const rarity = forcedRarity || rollRarity(rand, luck);
    const itemLevel = Math.max(1, Math.floor(level || 1));
    const stats = Object.assign({}, base.stats);
    const available = Object.keys(affixes).filter(function (key) {
      const infantry = slots[base.slot].kind === 'infantry';
      if (key.indexOf('inf') === 0) return infantry;
      if (key.indexOf('mech') === 0) return !infantry;
      if (['powerOutput', 'weightCapacity', 'partArmor', 'partDurability'].indexOf(key) >= 0) return !infantry;
      return true;
    });
    for (let i = 0; i < rarities[rarity].affixes; i += 1) {
      const key = available.splice(Math.floor(rand() * available.length), 1)[0];
      if (!key) break;
      const definition = affixes[key];
      const scale = (1 + (itemLevel - 1) * .07) * (1 + rarities[rarity].score * .08);
      let value = (definition.min + rand() * (definition.max - definition.min)) * scale;
      value = definition.flat ? Math.round(value) : Math.round(value * 1000) / 1000;
      stats[key] = Math.round(((stats[key] || 0) + value) * 1000) / 1000;
    }
    const prefixes = ['磨损的', '校准的', '军规', '蚀刻', '先行者', '不朽的'];
    const suffixes = ['之灰', '毒蛇', '壁垒', '夜行者', '雷暴', '君王'];
    const prefix = rarity === 'common' ? '' : prefixes[Math.floor(rand() * prefixes.length)];
    const suffix = rarities[rarity].score >= 2 ? '·' + suffixes[Math.floor(rand() * suffixes.length)] : '';
    return {
      id: newId('gear'), baseId: base.id, slot: base.slot, kind: slots[base.slot].kind,
      name: prefix + base.name + suffix, rarity, level: itemLevel, affixes: stats,
      value: Math.round((70 + itemLevel * 18 + Object.keys(stats).length * 45) * rarities[rarity].multiplier),
      color: rarities[rarity].color, custom: false
    };
  }

  function affixLabel(key, value) {
    const definition = affixes[key];
    if (!definition) return key + ' ' + value;
    const number = definition.flat ? Math.round(value) : Math.round(Math.abs(value) * 1000) / 10 + '%';
    const sign = definition.flat || value >= 0 ? '+' : '-';
    return sign + number + ' ' + definition.name;
  }

  function addExperience(profile, amount) {
    const character = profile.character;
    let levels = 0;
    character.xp += Math.max(0, Math.round(amount || 0));
    let needed = character.level * 500;
    while (character.xp >= needed) {
      character.xp -= needed; character.level += 1; character.points += 3; levels += 1;
      needed = character.level * 500;
    }
    return { levels, xp: character.xp, needed };
  }

  function recoverGear(profile, gear) {
    const recovered = [];
    let overflowValue = 0;
    (gear || []).forEach(function (item) {
      if (profile.inventory.length < profile.inventoryCapacity) recovered.push(item);
      else overflowValue += Math.round(item.value * .35);
    });
    profile.inventory.push.apply(profile.inventory, recovered);
    profile.credits += overflowValue;
    return { recovered, overflowValue };
  }

  function unitDefinition(id, profile) {
    const custom = (profile.customUnits || []).find(function (unit) { return unit.id === id; });
    const definition = custom || units[id] || units.raider;
    return Object.assign({}, definition, {
      hp: Math.max(1, Math.min(100000, Number(definition.hp) || 90)),
      speed: Math.max(0, Math.min(600, Number(definition.speed) || 100)),
      damage: Math.max(0, Math.min(10000, Number(definition.damage) || 9)),
      range: Math.max(50, Math.min(1500, Number(definition.range) || 365)),
      fireRate: Math.max(.05, Math.min(10, Number(definition.fireRate) || .6)),
      color: /^#[0-9a-f]{6}$/i.test(definition.color) ? definition.color : '#b56958',
      scale: Math.max(.5, Math.min(3, Number(definition.scale) || 1)),
      model: definition.model === 'drone' ? 'drone' : 'raider'
    });
  }

  function emptyMap(name) {
    const seed = newId('map');
    const rand = root.MechCore.randomFrom(seed);
    const map = {
      id: seed, seed: 'CUSTOM:' + seed, custom: true, name: String(name || '未命名区域').slice(0, 24),
      width: 2600, height: 1800, spawn: { x: 150, y: 900 },
      extraction: { x: 2420, y: 900, radius: 105 }, buildings: [], walls: [], obstacles: [],
      crates: [], enemies: [], decals: []
    };
    for (let i = 0; i < 180; i += 1) map.decals.push({ x: rand() * map.width, y: rand() * map.height, r: 2 + rand() * 10, tone: rand() });
    return map;
  }

  function normalizeMap(raw) {
    const map = Object.assign(emptyMap(raw && raw.name), raw || {});
    map.width = 2600; map.height = 1800;
    ['buildings', 'obstacles', 'crates', 'enemies', 'decals'].forEach(function (key) { if (!Array.isArray(map[key])) map[key] = []; });
    map.buildings = map.buildings.slice(0, 60).map(function (building, index) {
      const w = Math.max(180, Math.min(700, Number(building.w) || 340));
      const h = Math.max(180, Math.min(600, Number(building.h) || 300));
      const x = Math.max(30, Math.min(map.width - w - 30, Number(building.x) || 100));
      const y = Math.max(30, Math.min(map.height - h - 30, Number(building.y) || 100));
      const generated = root.MechCore.createBuilding(x, y, w, h, index, root.MechCore.randomFrom(map.seed + ':b:' + index));
      return Object.assign(generated, building, { id: index, x, y, w, h, walls: generated.walls });
    });
    map.walls = [];
    map.buildings.forEach(function (building) { map.walls.push.apply(map.walls, building.walls); });
    map.crates = map.crates.slice(0, 200).map(function (crate, index) {
      const building = root.MechCore.buildingAt(map, crate.x, crate.y);
      return Object.assign({}, crate, { id: crate.id || 'custom-crate-' + index, opened: false, progress: 0, indoors: !!building, building: building ? building.id : -1 });
    });
    map.enemies = map.enemies.slice(0, 150).map(function (enemy) {
      const building = root.MechCore.buildingAt(map, enemy.x, enemy.y);
      return Object.assign({}, enemy, { indoors: !!building, building: building ? building.id : -1 });
    });
    map.spawn = Object.assign({ x: 150, y: 900 }, map.spawn || {});
    map.extraction = Object.assign({ x: 2420, y: 900, radius: 105 }, map.extraction || {});
    if (root.MechCore.blocked(map, map.spawn.x, map.spawn.y, 34, false)) map.spawn = { x: 150, y: 900 };
    if (root.MechCore.blocked(map, map.extraction.x, map.extraction.y, 34, false)) map.extraction = { x: 2420, y: 900, radius: 105 };
    return map;
  }

  root.MechItems = {
    slots, rarities, affixes, bases, chassis, units,
    normalizeProfile, generateItem, affixLabel, addExperience, recoverGear,
    unitDefinition, emptyMap, normalizeMap, newId
  };
})(typeof window !== 'undefined' ? window : globalThis);
