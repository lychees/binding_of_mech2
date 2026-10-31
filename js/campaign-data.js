(function (root) {
  'use strict';

  const campaigns = [{
    id: 'ashes-protocol', name: '灰烬协议',
    description: '封锁区的前哨失去联络。带领驾驶员突入工业区，回收物资并撕开敌人的包围。',
    stages: [
      {
        title: '第一章：灰烬前哨', mapSeed: 'STORY-ASH-01',
        briefing: '先建立补给线。搜索至少两个容器，然后抵达绿色撤离信标。',
        requirements: [{ type: 'crates', target: 2 }], rewardCredits: 500, rewardGear: 1
      },
      {
        title: '第二章：断墙突入', mapSeed: 'STORY-ASH-02',
        briefing: '正门被火力封锁。摧毁三处掩体或墙体，并清除五名敌人，为后续部队打开通道。',
        requirements: [{ type: 'kills', target: 5 }, { type: 'destroyed', target: 3 }], rewardCredits: 800, rewardGear: 1
      },
      {
        title: '终章：核心撤离', mapSeed: 'STORY-ASH-03',
        briefing: '敌方增援正在抵达。清除十名敌人，回收两件装备，并带着核心物资活着离开。',
        requirements: [{ type: 'kills', target: 10 }, { type: 'gear', target: 2 }], rewardCredits: 1500, rewardGear: 2
      }
    ]
  }];

  const requirementNames = { crates: '搜索容器', kills: '清除敌人', destroyed: '破坏地形', gear: '获得装备' };

  function describe(requirement) {
    return (requirementNames[requirement.type] || requirement.type) + ' ' + requirement.target;
  }

  function all(profile) { return campaigns.concat((profile.campaign && profile.campaign.custom) || []); }

  function completed(profile, campaignId) {
    return (profile.campaign && profile.campaign.completed && profile.campaign.completed[campaignId]) || [];
  }

  function unlocked(profile, campaign, stageIndex) {
    if (stageIndex === 0) return true;
    return completed(profile, campaign.id).indexOf(stageIndex - 1) >= 0;
  }

  function completeStage(profile, campaign, stageIndex) {
    if (!profile.campaign.completed) profile.campaign.completed = {};
    const completedStages = completed(profile, campaign.id);
    if (completedStages.indexOf(stageIndex) >= 0) return false;
    completedStages.push(stageIndex);
    profile.campaign.completed[campaign.id] = completedStages;
    return true;
  }

  root.MechCampaignData = { campaigns, requirementNames, describe, all, completed, unlocked, completeStage };
})(typeof window !== 'undefined' ? window : globalThis);
