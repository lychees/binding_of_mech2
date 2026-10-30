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
