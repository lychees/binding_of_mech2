(function (root) {
  'use strict';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  class CampaignEditorUI {
    constructor(editor) {
      this.editor = editor; this.app = editor.app; this.selectedStage = -1;
      this.ui = {};
      ['campaign-name', 'campaign-description', 'campaign-stage-title', 'campaign-stage-briefing',
        'campaign-map-mode', 'campaign-map-seed', 'campaign-map-id', 'campaign-objective', 'campaign-target',
        'campaign-reward-credits', 'campaign-reward-gear', 'campaign-stage-list', 'custom-campaign-list',
        'campaign-new', 'campaign-add-stage', 'campaign-save', 'campaign-test-stage', 'campaign-delete'].forEach(function (id) {
          const key = id.replace(/-([a-z])/g, function (_, letter) { return letter.toUpperCase(); });
          this.ui[key] = document.getElementById(id);
        }, this);
      this.ui.campaignNew.addEventListener('click', this.newCampaign.bind(this));
      this.ui.campaignAddStage.addEventListener('click', this.addStage.bind(this));
      this.ui.campaignSave.addEventListener('click', this.saveCampaign.bind(this));
      this.ui.campaignTestStage.addEventListener('click', this.testStage.bind(this));
      this.ui.campaignDelete.addEventListener('click', this.deleteCampaign.bind(this));
      this.newCampaign();
    }

    newCampaign() {
      this.draft = { id: root.MechItems.newId('campaign'), name: '自定义战役', description: '自定义剧情战役', stages: [] };
      this.selectedStage = -1;
      this.ui.campaignName.value = this.draft.name; this.ui.campaignDescription.value = this.draft.description;
      this.ui.campaignStageTitle.value = '第一章：新的行动';
      this.ui.campaignStageBriefing.value = '完成目标并安全撤离。';
      this.ui.campaignMapMode.value = 'seed'; this.ui.campaignMapSeed.value = 'CUSTOM-01';
      this.ui.campaignTarget.value = 2; this.ui.campaignRewardCredits.value = 500; this.ui.campaignRewardGear.value = 1;
      this.render();
    }

    readMeta() {
      this.draft.name = this.ui.campaignName.value.trim().slice(0, 28) || '自定义战役';
      this.draft.description = this.ui.campaignDescription.value.trim().slice(0, 100) || '自定义剧情战役';
    }

    readStage() {
      const custom = this.ui.campaignMapMode.value === 'custom';
      return {
        title: this.ui.campaignStageTitle.value.trim().slice(0, 36) || '未命名章节',
        briefing: this.ui.campaignStageBriefing.value.trim().slice(0, 140) || '完成目标并安全撤离。',
        mapSeed: custom ? '' : (this.ui.campaignMapSeed.value.trim() || 'CUSTOM-01'),
        mapId: custom ? this.ui.campaignMapId.value : '',
        requirements: [{ type: this.ui.campaignObjective.value, target: Math.max(1, Math.min(99, Number(this.ui.campaignTarget.value) || 1)) }],
        rewardCredits: Math.max(0, Math.min(1000000, Number(this.ui.campaignRewardCredits.value) || 0)),
        rewardGear: Math.max(0, Math.min(6, Number(this.ui.campaignRewardGear.value) || 0))
      };
    }

    addStage() {
      const stage = this.readStage();
      if (this.ui.campaignMapMode.value === 'custom' && !stage.mapId) { this.app.toast('请选择自定义关卡，或改用地图种子', true); return; }
      if (this.selectedStage >= 0 && this.draft.stages[this.selectedStage]) this.draft.stages[this.selectedStage] = stage;
      else this.draft.stages.push(stage);
      this.selectedStage = this.draft.stages.length - 1;
      this.render();
    }

    saveCampaign() {
      this.readMeta();
      if (!this.draft.stages.length) { this.app.toast('请至少添加一个章节', true); return; }
      const index = this.app.profile.campaign.custom.findIndex(function (campaign) { return campaign.id === this.draft.id; }, this);
      if (index >= 0) this.app.profile.campaign.custom[index] = clone(this.draft);
      else this.app.profile.campaign.custom.push(clone(this.draft));
      this.app.saveProfile(); this.renderSaved(); this.app.toast('战役已保存，可在战役模式中出击');
    }

    deleteCampaign() {
      this.app.profile.campaign.custom = this.app.profile.campaign.custom.filter(function (campaign) { return campaign.id !== this.draft.id; }, this);
      this.app.saveProfile(); this.newCampaign(); this.app.toast('自定义战役已删除');
    }

    testStage() {
      if (this.selectedStage < 0 || !this.draft.stages[this.selectedStage]) { this.app.toast('请先选择要测试的章节', true); return; }
      this.app.startCampaignStage(this.draft, this.selectedStage, true);
    }

    render() {
      this.populateMapOptions(); this.renderStages(); this.renderSaved();
    }

    populateMapOptions() {
      const select = this.ui.campaignMapId; const current = select.value; select.innerHTML = '';
      const empty = el('option', '', '不使用'); empty.value = ''; select.appendChild(empty);
      this.app.profile.customMaps.forEach(function (map) {
        const option = el('option', '', map.name); option.value = map.id; select.appendChild(option);
      });
      select.value = current;
    }

    renderStages() {
      const list = this.ui.campaignStageList; list.innerHTML = '';
      this.draft.stages.forEach(function (stage, index) {
        const entry = el('div', 'saved-entry');
        entry.append(el('b', '', (index + 1) + '. ' + stage.title), el('small', '', stage.requirements.map(root.MechCampaignData.describe).join(' · ') + ' · 奖励 ' + stage.rewardCredits + ' / 装备 ' + stage.rewardGear));
        const actions = el('div', 'saved-actions'); const edit = el('button', '', '编辑'); const test = el('button', '', '测试'); const remove = el('button', '', '删除');
        edit.addEventListener('click', function () { this.selectedStage = index; this.fillStageForm(stage); this.renderStages(); }.bind(this));
        test.addEventListener('click', function () { this.selectedStage = index; this.testStage(); }.bind(this));
        remove.addEventListener('click', function () { this.draft.stages.splice(index, 1); this.selectedStage = -1; this.render(); }.bind(this));
        actions.append(edit, test, remove); entry.appendChild(actions);
        if (index === this.selectedStage) entry.classList.add('selected');
        list.appendChild(entry);
      }, this);
      if (!this.draft.stages.length) list.append(el('small', '', '尚未添加章节'));
    }

    fillStageForm(stage) {
      this.ui.campaignStageTitle.value = stage.title; this.ui.campaignStageBriefing.value = stage.briefing;
      this.ui.campaignMapMode.value = stage.mapId ? 'custom' : 'seed';
      this.ui.campaignMapSeed.value = stage.mapSeed || 'CUSTOM-01'; this.ui.campaignMapId.value = stage.mapId || '';
      this.ui.campaignObjective.value = stage.requirements[0].type; this.ui.campaignTarget.value = stage.requirements[0].target;
      this.ui.campaignRewardCredits.value = stage.rewardCredits; this.ui.campaignRewardGear.value = stage.rewardGear;
    }

    renderSaved() {
      const list = this.ui.customCampaignList; list.innerHTML = '';
      root.MechCampaignData.campaigns.forEach(function (campaign) {
        const entry = el('div', 'saved-entry'); entry.append(el('b', '', campaign.name + '（内置）'), el('small', '', campaign.stages.length + ' 章 · 可复制编辑'));
        const button = el('button', '', '复制编辑');
        button.addEventListener('click', function () {
          this.draft = clone(campaign); this.draft.id = root.MechItems.newId('campaign'); this.draft.name += ' 重制'; this.selectedStage = 0;
          this.ui.campaignName.value = this.draft.name; this.ui.campaignDescription.value = this.draft.description;
          this.fillStageForm(this.draft.stages[0]); this.render();
        }.bind(this)); entry.appendChild(button); list.appendChild(entry);
      }, this);
      this.app.profile.campaign.custom.forEach(function (campaign) {
        const entry = el('div', 'saved-entry'); entry.append(el('b', '', campaign.name), el('small', '', campaign.stages.length + ' 章'));
        const edit = el('button', '', '编辑');
        edit.addEventListener('click', function () {
          this.draft = clone(campaign); this.selectedStage = this.draft.stages.length ? 0 : -1;
          this.ui.campaignName.value = this.draft.name; this.ui.campaignDescription.value = this.draft.description;
          if (this.selectedStage >= 0) this.fillStageForm(this.draft.stages[0]); this.render();
        }.bind(this)); entry.appendChild(edit); list.appendChild(entry);
      }, this);
    }
  }

  root.MechCampaignEditorUI = CampaignEditorUI;
})(typeof window !== 'undefined' ? window : globalThis);
