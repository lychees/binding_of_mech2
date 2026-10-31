(function (root) {
  'use strict';

  class AudioDirector {
    constructor(app) {
      this.app = app;
      this.context = null;
      this.master = null;
      this.musicBus = null;
      this.sfxBus = null;
      this.noiseBuffer = null;
      this.running = false;
      this.timer = null;
      this.nextBeat = 0;
      this.beat = 0;
      this.lastPlayed = {};
    }

    ensure() {
      if (this.context) return true;
      const Context = root.AudioContext || root.webkitAudioContext;
      if (!Context) return false;
      this.context = new Context();
      this.master = this.context.createGain();
      this.musicBus = this.context.createGain();
      this.sfxBus = this.context.createGain();
      this.musicBus.connect(this.master); this.sfxBus.connect(this.master);
      this.master.connect(this.context.destination);
      const length = this.context.sampleRate;
      this.noiseBuffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      return true;
    }

    start() {
      if (!this.ensure()) return false;
      if (this.context.state === 'suspended') this.context.resume();
      if (!this.running) {
        this.running = true;
        this.nextBeat = this.context.currentTime + .05;
        this.timer = setInterval(this.schedule.bind(this), 250);
      }
      return true;
    }

    applyVolumes() {
      if (!this.master) return;
      const settings = this.app.profile.audio;
      this.master.gain.value = settings.muted ? 0 : 1;
      this.musicBus.gain.value = .12 * settings.music;
      this.sfxBus.gain.value = .42 * settings.sfx;
      this.updateButton();
    }

    updateButton() {
      if (!this.app.ui.audioButton) return;
      this.app.ui.audioButton.textContent = this.app.profile.audio.muted ? '音频 关' : '音频 开';
      this.app.ui.audioButton.classList.toggle('active', !this.app.profile.audio.muted);
    }

    toggleMute() {
      this.app.profile.audio.muted = !this.app.profile.audio.muted;
      this.app.saveProfile(); this.applyVolumes();
    }

    setVolume(type, value) {
      this.app.profile.audio[type] = Math.max(0, Math.min(1, value));
      this.app.saveProfile(); this.applyVolumes();
    }

    schedule() {
      if (!this.running || this.app.profile.audio.muted || !this.context) return;
      const now = this.context.currentTime;
      if (this.nextBeat < now - 1) this.nextBeat = now;
      while (this.nextBeat < now + .3) {
        this.scheduleBeat(this.nextBeat, this.beat);
        this.nextBeat += .3; this.beat += 1;
      }
    }

    scheduleBeat(time, beat) {
      const raid = this.app.screen === 'raid';
      const roots = raid ? [55, 55, 65.41, 49] : [55, 65.41, 73.42, 65.41];
      const root = roots[Math.floor(beat / 16) % roots.length];
      if (beat % 4 === 0) this.tone(root, time, raid ? .55 : 1.1, 'sine', raid ? .09 : .06, this.musicBus);
      if (beat % 8 === 2) {
        const notes = raid ? [2, 3, 4, 6] : [2, 4, 3, 5];
        this.tone(root * notes[Math.floor(beat / 8) % notes.length] * 2, time, raid ? .24 : .65, 'triangle', raid ? .045 : .025, this.musicBus);
      }
      if (beat % 32 === 0) {
        this.tone(root * 2, time, 3.5, 'sine', .035, this.musicBus);
        this.tone(root * 3, time, 3.5, 'sine', .018, this.musicBus);
      }
      if (raid && beat % 2 === 0) this.noise(time, .035, .018, 650, this.musicBus);
    }

    tone(frequency, start, duration, type, volume, destination, endFrequency) {
      if (!this.context) return;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type || 'sine';
      oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0001, volume), start + Math.min(.025, duration * .2));
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      oscillator.connect(gain); gain.connect(destination || this.sfxBus);
      oscillator.start(start); oscillator.stop(start + duration + .02);
    }

    noise(start, duration, volume, frequency, destination) {
      if (!this.context || !this.noiseBuffer) return;
      const source = this.context.createBufferSource(); source.buffer = this.noiseBuffer;
      const filter = this.context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = frequency || 1000;
      const gain = this.context.createGain();
      gain.gain.setValueAtTime(Math.max(.0001, volume), start);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      source.connect(filter); filter.connect(gain); gain.connect(destination || this.sfxBus);
      source.start(start); source.stop(start + duration + .02);
    }

    play(name, variant) {
      if (this.app.profile.audio.muted || !this.start()) return;
      const now = this.context.currentTime;
      const key = name + (variant || '');
      const minimum = { shot: .035, hit: .12, enemyDown: .07, destroy: .1, ui: .035 }[name] || .015;
      if (this.lastPlayed[key] && now - this.lastPlayed[key] < minimum) return;
      this.lastPlayed[key] = now;
      const bus = this.sfxBus;
      if (name === 'ui') {
        this.tone(620, now, .045, 'sine', .08, bus); this.tone(880, now + .035, .06, 'sine', .05, bus);
      } else if (name === 'deploy') {
        this.tone(65, now, .55, 'sawtooth', .12, bus, 145); this.noise(now + .18, .18, .07, 800, bus);
      } else if (name === 'shot') {
        if (['laser', 'burstBeam', 'beam'].indexOf(variant) >= 0) {
          this.tone(720, now, .075, 'sine', .1, bus, 1450);
        } else if (['railgun', 'artemisArtillery', 'mortar', 'rockets', 'plasma'].indexOf(variant) >= 0) {
          this.noise(now, .16, .18, 1100, bus); this.tone(105, now, .18, 'square', .1, bus, 48);
        } else if (['blade', 'titanFist', 'rammingEngines'].indexOf(variant) >= 0) {
          this.noise(now, .11, .13, 2100, bus); this.tone(210, now, .1, 'sawtooth', .07, bus, 70);
        } else {
          this.noise(now, .045, .12, 1700, bus); this.tone(145, now, .045, 'square', .07, bus, 80);
        }
      } else if (name === 'explosion' || name === 'destroy') {
        this.noise(now, name === 'destroy' ? .42 : .28, .24, 850, bus);
        this.tone(75, now, .35, 'sine', .16, bus, 28);
      } else if (name === 'enemyDown') {
        this.tone(180, now, .16, 'sawtooth', .08, bus, 65);
      } else if (name === 'hit') {
        this.noise(now, .07, .1, 1400, bus); this.tone(90, now, .09, 'square', .09, bus, 50);
      } else if (name === 'loot') {
        this.tone(740, now, .09, 'sine', .09, bus); this.tone(1100, now + .08, .14, 'sine', .08, bus);
      } else if (name === 'gear') {
        [523, 659, 880].forEach(function (frequency, index) { this.tone(frequency, now + index * .07, .15, 'triangle', .09, bus); }, this);
      } else if (name === 'equip') {
        this.noise(now, .06, .06, 2300, bus); this.tone(320, now, .09, 'square', .06, bus, 470);
      } else if (name === 'board') {
        this.tone(65, now, .45, 'sawtooth', .1, bus, 170); this.tone(260, now + .18, .22, 'sine', .05, bus, 420);
      } else if (name === 'dismount') {
        this.noise(now, .22, .1, 1200, bus); this.tone(210, now, .22, 'sawtooth', .06, bus, 65);
      } else if (name === 'extract') {
        [392, 494, 587, 784].forEach(function (frequency, index) { this.tone(frequency, now + index * .11, .28, 'triangle', .1, bus); }, this);
      } else if (name === 'fail') {
        [220, 185, 147].forEach(function (frequency, index) { this.tone(frequency, now + index * .16, .3, 'sawtooth', .09, bus); }, this);
      } else if (name === 'level') {
        [523, 659, 784, 1047].forEach(function (frequency, index) { this.tone(frequency, now + index * .08, .2, 'sine', .09, bus); }, this);
      } else if (name === 'campaign') {
        [330, 440, 554, 659, 880].forEach(function (frequency, index) { this.tone(frequency, now + index * .09, .22, 'triangle', .1, bus); }, this);
      } else if (name === 'repair') {
        this.tone(280, now, .35, 'sine', .07, bus, 620); this.tone(540, now + .15, .2, 'sine', .05, bus, 780);
      } else if (name === 'shield') {
        this.tone(880, now, .35, 'sine', .06, bus, 1320); this.tone(1100, now + .08, .3, 'sine', .04, bus, 1650);
      }
    }
  }

  root.MechAudio = AudioDirector;
})(typeof window !== 'undefined' ? window : globalThis);
