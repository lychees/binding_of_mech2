(function (root) {
  'use strict';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  class CampaignUI {
    constructor(app) {
      this.app = app;
      this.list = document.getElementById('campaign-list');
    }

    render() {
      this.list.innerHTML = '';
      root.MechCampaignData.all(this.app.profile).forEach(function (campaign) {
        const card = element('article', 'campaign-card');
        const heading = element('div', 'campaign-card-heading');
        const title = element('div'); title.append(element('div', 'eyebrow', 'CAMPAIGN / ' + campaign.id), element('h2', '', campaign.name));
        const progress = root.MechCampaignData.completed(this.app.profile, campaign.id).length;
        heading.append(title, element('span', 'campaign-progress', progress + ' / ' + campaign.stages.length + ' 章'));
        const description = element('p', 'campaign-description', campaign.description);
        const stages = element('div', 'campaign-stages');
        campaign.stages.forEach(function (stage, index) {
          const completed = root.MechCampaignData.completed(this.app.profile, campaign.id).indexOf(index) >= 0;
          const unlocked = root.MechCampaignData.unlocked(this.app.profile, campaign, index);
          const row = element('div', 'campaign-stage' + (completed ? ' completed' : '') + (!unlocked ? ' locked' : ''));
          const info = element('div', 'campaign-stage-info');
          info.append(element('b', '', stage.title));
          info.append(element('p', '', stage.briefing));
          info.append(element('small', '', stage.requirements.map(root.MechCampaignData.describe).join(' · ') + ' · 奖励 ' + stage.rewardCredits));
          const button = element('button', unlocked ? 'campaign-start' : 'campaign-locked', completed ? '再次出击' : (unlocked ? '开始章节' : '未解锁'));
          button.disabled = !unlocked;
          button.addEventListener('click', function () { this.app.startCampaignStage(campaign, index); }.bind(this));
          row.append(info, button); stages.appendChild(row);
        }, this);
        card.append(heading, description, stages); this.list.appendChild(card);
      }, this);
    }
  }

  root.MechCampaignUI = CampaignUI;
})(typeof window !== 'undefined' ? window : globalThis);
