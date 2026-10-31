(function (root) {
  'use strict';

  root.MechPilots = {
    ralph: { name: '拉尔夫·卡尔森', english: 'Ralph Karlsson', role: '时间旅人', asset: 'ralph', perk: '每次击杀额外获得 2 XP' },
    camila: { name: '卡米拉·维拉', english: 'Camila Vera', role: '环境抗性', asset: 'camila', perk: '腿部损毁造成的速度惩罚减半' },
    isaac: { name: '艾萨克·琼斯', english: 'Isaac Jones', role: '回合重置', asset: 'isaac', perk: '每次出击获得一次免费紧急修复（V）' },
    harold: { name: '哈罗德·施密特', english: 'Harold Schmidt', role: '维修专家', asset: 'harold', perk: '登机时修复机甲耐久与全部部件' },
    gana: { name: '加娜', english: 'Gana', role: '部署打击', asset: 'gana', perk: '离机时释放部署冲击波，伤害附近敌人' },
    chen: { name: '陈荣', english: 'Chen Rong', role: '攻击后机动', asset: 'chen', perk: '每次射击缩短冲刺冷却 0.25 秒' }
  };
})(typeof window !== 'undefined' ? window : globalThis);
