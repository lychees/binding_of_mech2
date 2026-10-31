(function (root) {
  'use strict';

  const weapons = {
    autocannon: {
      id: 'autocannon', kind: 'mech', name: '狂风·机炮', tag: '均衡 / 持续', price: 0,
      damage: 13, rate: 0.105, mag: 36, reload: 1.55, speed: 980, spread: 0.035,
      heat: 3.4, pellets: 1, color: '#ffc56e', description: '可靠的中口径机炮，适合清理巡游者。'
    },
    rockets: {
      id: 'rockets', kind: 'mech', name: '蜂群·导弹', tag: '范围 / 爆发', price: 0,
      damage: 52, rate: 0.58, mag: 8, reload: 2.7, speed: 590, spread: 0.055,
      heat: 12, pellets: 1, blast: 72, color: '#ff835c', description: '微型导弹造成范围伤害，适合敌群。'
    },
    railgun: {
      id: 'railgun', kind: 'mech', name: '长夜·磁轨炮', tag: '精确 / 高伤', price: 1450,
      damage: 92, rate: 0.86, mag: 5, reload: 2.35, speed: 1550, spread: 0.004,
      heat: 20, pellets: 1, color: '#8cf5ff', description: '超高速穿甲弹，射速慢但单发致命。'
    },
    laser: {
      id: 'laser', kind: 'mech', name: '棱镜·激光器', tag: '急速 / 控热', price: 1900,
      damage: 10, rate: 0.065, mag: 60, reload: 1.9, speed: 1800, spread: 0.014,
      heat: 2.8, pellets: 1, color: '#ef7dff', description: '高射速能量武器，持续压制能力极强。'
    },
    titanFist: {
      id: 'titanFist', kind: 'mech', name: 'Titan Fist·泰坦之拳', tag: '原作 / 近战', price: 2000,
      damage: 95, rate: 0.5, mag: 16, reload: 1.2, speed: 700, spread: 0.3,
      heat: 5, pellets: 3, range: 105, color: '#c5f5df', description: '裂隙行者战斗机甲的近战打击，短距扇形冲击。'
    },
    taurusCannon: {
      id: 'taurusCannon', kind: 'mech', name: 'Taurus Cannon·金牛炮', tag: '原作 / 直射', price: 2200,
      damage: 70, rate: 0.65, mag: 10, reload: 1.8, speed: 1050, spread: 0.012,
      heat: 10, pellets: 1, color: '#ffd09a', description: '裂隙行者加农机甲的强力直射火炮。'
    },
    artemisArtillery: {
      id: 'artemisArtillery', kind: 'mech', name: 'Artemis Artillery·月神炮', tag: '原作 / 间接炮击', price: 3000,
      damage: 80, rate: 1, mag: 5, reload: 2.8, speed: 340, spread: 0.015,
      heat: 20, pellets: 1, blast: 95, lob: true, color: '#ffb16d', description: '裂隙行者火炮机甲的远程间接炮击武器。'
    },
    burstBeam: {
      id: 'burstBeam', kind: 'mech', name: 'Burst Beam·爆裂光束', tag: '原作 / 穿透衰减', price: 2800,
      damage: 40, rate: 0.4, mag: 12, reload: 2.2, speed: 1700, spread: 0.006,
      heat: 11, pellets: 1, pierce: 4, damageFalloff: 0.12, color: '#8cf5ff', description: '天穹守卫激光机甲的穿透光束，命中后续目标时伤害递减。'
    },
    rammingEngines: {
      id: 'rammingEngines', kind: 'mech', name: 'Ramming Engines·冲撞引擎', tag: '原作 / 冲撞自伤', price: 2400,
      damage: 90, rate: 0.75, mag: 10, reload: 2, speed: 800, spread: 0.25,
      heat: 6, pellets: 3, range: 130, selfDamage: 8, color: '#ffab7a', description: '天穹守卫冲锋机甲的高速冲撞，造成伤害同时损伤自身。'
    },
    aegisShield: {
      id: 'aegisShield', kind: 'mech', name: 'Aegis Shield·防卫护盾', tag: '原作 / 护盾减伤', price: 2600,
      damage: 12, rate: 1.2, mag: 4, reload: 3, speed: 900, spread: 0.02,
      heat: 10, pellets: 1, shield: 3, color: '#a5b8f3', description: '天穹守卫防卫机甲的护盾投射器，发射后三秒内降低所受伤害。'
    },
    flak: {
      id: 'flak', kind: 'mech', name: '风暴·破片炮', tag: '散射 / 近距', price: 1600,
      damage: 9, rate: 0.55, mag: 12, reload: 2.1, speed: 760, spread: 0.19,
      heat: 9, pellets: 10, range: 420, color: '#f4c47c', description: '一次喷射十枚破片，近距离清扫敌群。'
    },
    plasma: {
      id: 'plasma', kind: 'mech', name: '烈日·等离子炮', tag: '能量 / 范围', price: 2200,
      damage: 72, rate: 0.75, mag: 7, reload: 2.6, speed: 430, spread: 0.018,
      heat: 18, pellets: 1, blast: 95, color: '#7df0c8', description: '慢速等离子团命中后产生大范围爆炸。'
    },
    arc: {
      id: 'arc', kind: 'mech', name: '雷霆·电弧炮', tag: '连锁 / 群攻', price: 2600,
      damage: 34, rate: 0.42, mag: 14, reload: 2.2, speed: 1200, spread: 0.01,
      heat: 10, pellets: 1, chain: 3, chainRange: 190, color: '#7edfff', description: '命中后向附近目标连续跳跃三次电弧。'
    },
    mortar: {
      id: 'mortar', kind: 'mech', name: '攻城·重型迫击炮', tag: '抛物线 / 重爆', price: 3000,
      damage: 96, rate: 1.15, mag: 4, reload: 3.2, speed: 330, spread: 0.012,
      heat: 24, pellets: 1, blast: 125, lob: true, color: '#ffb16d', description: '炮弹越过墙体，以抛物线落地造成重爆。'
    },
    minigun: {
      id: 'minigun', kind: 'mech', name: '火神·转管机枪', tag: '急速 / 大弹匣', price: 2100,
      damage: 8, rate: 0.045, mag: 120, reload: 3, speed: 1050, spread: 0.06,
      heat: 1.9, pellets: 1, color: '#ffd36b', description: '一百二十发弹匣与极高射速的持续火力。'
    },
    blade: {
      id: 'blade', kind: 'mech', name: '裂阵·高频刀', tag: '近战 / 扇形', price: 1800,
      damage: 105, rate: 0.62, mag: 12, reload: 1.4, speed: 700, spread: 0.45,
      heat: 8, pellets: 5, range: 110, color: '#b5fff1', description: '向前方释放短距高频刃波，形成扇形斩击。'
    },
    rifle: {
      id: 'rifle', kind: 'infantry', name: '灰隼·突击步枪', tag: '均衡 / 中距', price: 0,
      damage: 20, rate: 0.145, mag: 30, reload: 1.35, speed: 1100, spread: 0.026,
      heat: 0, pellets: 1, color: '#d7f5df', description: '单兵通用武器，室内作战稳定可靠。'
    },
    shotgun: {
      id: 'shotgun', kind: 'infantry', name: '破门者·霰弹枪', tag: '近距 / 多弹丸', price: 0,
      damage: 11, rate: 0.72, mag: 8, reload: 1.8, speed: 930, spread: 0.16,
      heat: 0, pellets: 7, color: '#ffd09a', description: '一次发射七枚弹丸，近距离极具威慑。'
    },
    smg: {
      id: 'smg', kind: 'infantry', name: '切线·冲锋枪', tag: '急速 / 近距', price: 850,
      damage: 13, rate: 0.072, mag: 42, reload: 1.55, speed: 980, spread: 0.06,
      heat: 0, pellets: 1, color: '#b5f5d3', description: '轻巧的高射速武器，适合快速清房。'
    },
    marksman: {
      id: 'marksman', kind: 'infantry', name: '寂静·射手步枪', tag: '精确 / 单发', price: 1100,
      damage: 58, rate: 0.58, mag: 12, reload: 1.75, speed: 1500, spread: 0.008,
      heat: 0, pellets: 1, color: '#b5d9ff', description: '半自动精确步枪，擅长解决远处目标。'
    },
    revolver: {
      id: 'revolver', kind: 'infantry', name: '游侠·重型左轮', tag: '暴击 / 小弹匣', price: 700,
      damage: 52, rate: 0.38, mag: 6, reload: 1.65, speed: 1250, spread: 0.018,
      heat: 0, pellets: 1, critBonus: 0.18, color: '#ffd1a0', description: '六发高伤弹巢，额外提高百分之十八暴击率。'
    },
    grenadier: {
      id: 'grenadier', kind: 'infantry', name: '破障·榴弹枪', tag: '爆炸 / 清房', price: 1200,
      damage: 46, rate: 0.78, mag: 5, reload: 2.1, speed: 480, spread: 0.025,
      heat: 0, pellets: 1, blast: 58, color: '#ff9d6d', description: '单兵榴弹造成室内范围杀伤，注意射击节奏。'
    },
    pulse: {
      id: 'pulse', kind: 'infantry', name: '脉冲·三连发步枪', tag: '三连发 / 中距', price: 1000,
      damage: 16, rate: 0.48, mag: 30, reload: 1.5, speed: 1200, spread: 0.035,
      heat: 0, pellets: 1, burst: 3, burstDelay: 0.075, color: '#7df0c8', description: '每次扣动扳机连续射出三发子弹，消耗三发弹药。'
    },
    crossbow: {
      id: 'crossbow', kind: 'infantry', name: '静默·电磁弩', tag: '穿透 / 单发', price: 1350,
      damage: 76, rate: 0.82, mag: 6, reload: 2, speed: 1450, spread: 0.006,
      heat: 0, pellets: 1, pierce: 3, color: '#b5d9ff', description: '电磁弩箭可连续穿透三个目标，适合狭长走廊。'
    },
    beam: {
      id: 'beam', kind: 'infantry', name: '棱光·能量步枪', tag: '光束 / 急速', price: 1500,
      damage: 7, rate: 0.055, mag: 80, reload: 2.1, speed: 1800, spread: 0.012,
      heat: 0, pellets: 1, color: '#e78cff', description: '轻型高频能量步枪，以密集光束持续输出。'
    },
    flamethrower: {
      id: 'flamethrower', kind: 'infantry', name: '焚风·喷火器', tag: '短距 / 火焰', price: 1100,
      damage: 5, rate: 0.06, mag: 80, reload: 2.4, speed: 520, spread: 0.19,
      heat: 0, pellets: 2, range: 165, color: '#ff9b58', description: '短距离双股火焰喷射，快速清理狭窄空间。'
    }
  };

  const mods = {
    composite: {
      id: 'composite', kind: 'mech', name: '复合装甲', stat: '+90 机甲耐久 / -8% 移速',
      description: '外挂陶瓷装甲板。', effects: { mechHp: 90, mechSpeed: -0.08 }
    },
    actuator: {
      id: 'actuator', kind: 'mech', name: '超载作动器', stat: '+16% 移速 / -25 耐久',
      description: '牺牲防护换取机动。', effects: { mechSpeed: 0.16, mechHp: -25 }
    },
    coolant: {
      id: 'coolant', kind: 'mech', name: '液氮冷却器', stat: '-32% 热量 / +18% 散热',
      description: '延长武器持续输出时间。', effects: { heatGain: -0.32, cooling: 0.18 }
    },
    accelerator: {
      id: 'accelerator', kind: 'mech', name: '弹药加速器', stat: '+16% 伤害 / +14% 热量',
      description: '提高弹丸初速与终止效能。', effects: { mechDamage: 0.16, heatGain: 0.14 }
    },
    servo: {
      id: 'servo', kind: 'mech', name: '快速装填伺服', stat: '-24% 装填时间',
      description: '自动装弹机构升级套件。', effects: { reload: -0.24 }
    },
    reactor: {
      id: 'reactor', kind: 'mech', name: '高密反应堆', stat: '-28% 冲刺冷却 / +8% 移速',
      description: '为紧急机动提供额外功率。', effects: { dash: -0.28, mechSpeed: 0.08 }
    },
    lightweight: {
      id: 'lightweight', kind: 'infantry', name: '轻量携行具', stat: '+14% 移速',
      description: '减少非必要负重。', effects: { infSpeed: 0.14 }
    },
    ballistic: {
      id: 'ballistic', kind: 'infantry', name: '防弹插板', stat: '+40 单兵耐久 / -6% 移速',
      description: '重型复合陶瓷插板。', effects: { infHp: 40, infSpeed: -0.06 }
    },
    extended: {
      id: 'extended', kind: 'infantry', name: '扩容供弹具', stat: '+40% 弹匣 / +8% 装填',
      description: '提高持续火力，略微增加重量。', effects: { magazine: 0.4, reload: 0.08 }
    },
    matchAmmo: {
      id: 'matchAmmo', kind: 'infantry', name: '竞赛级弹药', stat: '+20% 伤害 / -10% 弹匣',
      description: '精密装药的高性能弹药。', effects: { infDamage: 0.2, magazine: -0.1 }
    },
    reflex: {
      id: 'reflex', kind: 'infantry', name: '反射式瞄具', stat: '-28% 散布 / -12% 射速间隔',
      description: '更快、更稳定地获取目标。', effects: { spread: -0.28, fireRate: -0.12 }
    },
    trauma: {
      id: 'trauma', kind: 'infantry', name: '战地医疗包', stat: '登离机甲时恢复 30 耐久',
      description: '每次换乘时进行紧急处理。', effects: { swapHeal: 30 }
    }
  };

  const loot = [
    { name: '武器零件', value: 180, color: '#a8c0c5' },
    { name: '医疗凝胶', value: 240, color: '#8fe0ba' },
    { name: '工业芯片', value: 320, color: '#78dce8' },
    { name: '核燃料棒', value: 460, color: '#d5ef8b' },
    { name: '军用黑匣子', value: 620, color: '#e6a4ff' },
    { name: '旧世遗物', value: 880, color: '#ffd27d' }
  ];

  root.MechData = {
    weapons,
    mods,
    loot,
    defaults: {
      credits: 1200,
      callsign: '驾驶员-' + Math.floor(1000 + Math.random() * 9000),
      unlocked: ['autocannon', 'rockets', 'rifle', 'shotgun'],
      loadout: {
        mechPrimary: 'autocannon', mechSecondary: 'rockets',
        infPrimary: 'rifle', infSecondary: 'shotgun',
        mechMods: ['coolant', 'composite'], infMods: ['lightweight', 'reflex']
      },
      bestRun: 0,
      raids: 0,
      successfulRaids: 0,
      totalKills: 0
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
