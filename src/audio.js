// Procedural Web Audio API sound synthesizer — zero external audio assets required

class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  _ready() {
    if (this.muted || !this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx.state === 'running';
  }

  _osc(type, freqStart, freqEnd, duration, volume = 0.14, delay = 0) {
    if (!this._ready()) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  _noise(duration, volume = 0.12, filterFreq = 800, delay = 0) {
    if (!this._ready()) return;
    const now = this.ctx.currentTime + delay;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  playPlant() {
    this._osc('triangle', 180, 320, 0.11, 0.15);
    this._noise(0.08, 0.08, 900, 0.01);
  }

  playShovel() {
    this._osc('sawtooth', 260, 120, 0.12, 0.08);
    this._noise(0.11, 0.09, 1200);
  }

  playSelect() {
    this._osc('sine', 520, 660, 0.06, 0.08);
  }

  playError() {
    this._osc('sawtooth', 170, 130, 0.14, 0.09);
  }

  playSunCollect() {
    this._osc('sine', 587.3, 880, 0.12, 0.12, 0);
    this._osc('triangle', 880, 1174.6, 0.16, 0.11, 0.06);
  }

  playPeaShoot(isIce = false) {
    if (isIce) {
      this._osc('sine', 620, 980, 0.09, 0.08);
      this._osc('triangle', 420, 260, 0.07, 0.06);
    } else {
      this._osc('sine', 420, 220, 0.08, 0.09);
      this._osc('triangle', 580, 320, 0.05, 0.05);
    }
  }

  playHit(armorType = null, isIce = false) {
    if (armorType === 'bucket') {
      this._osc('square', 820, 560, 0.08, 0.08);
      this._osc('triangle', 1240, 920, 0.09, 0.07);
    } else if (armorType === 'cone') {
      this._osc('triangle', 340, 190, 0.08, 0.1);
    } else {
      this._osc('sine', 210, 95, 0.08, 0.1);
      this._noise(0.05, 0.05, 700);
    }
    if (isIce) {
      this._osc('sine', 1350, 1850, 0.1, 0.05);
    }
  }

  playBite() {
    this._noise(0.07, 0.06, 650);
    this._osc('sawtooth', 150, 90, 0.07, 0.05);
  }

  playExplosion() {
    this._osc('sine', 150, 34, 0.52, 0.28);
    this._osc('sawtooth', 95, 28, 0.42, 0.16);
    this._noise(0.48, 0.25, 1100);
  }

  playMower() {
    this._osc('sawtooth', 95, 210, 0.55, 0.13);
    this._osc('square', 65, 135, 0.55, 0.08);
    this._noise(0.5, 0.1, 1400);
  }

  playWave() {
    this._osc('sawtooth', 196, 185, 0.55, 0.1, 0);
    this._osc('sawtooth', 146.8, 130.8, 0.7, 0.11, 0.25);
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      this._osc('triangle', freq, freq, 0.24, 0.14, i * 0.11);
      this._osc('sine', freq * 0.5, freq * 0.5, 0.24, 0.08, i * 0.11);
    });
  }

  playGameOver() {
    const notes = [311.13, 293.66, 277.18, 233.08];
    notes.forEach((freq, i) => {
      this._osc('sawtooth', freq, freq * 0.96, 0.34, 0.1, i * 0.22);
    });
  }
}

export const soundFX = new SoundFX();
