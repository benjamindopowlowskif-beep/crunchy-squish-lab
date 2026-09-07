// Organic procedural fallback. Optional local recordings override each category.
export class SquishAudio {
  enabled = true;
  ctx = null;
  samples = new Map();
  last = -Infinity;
  async unlock() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? .55 : 0;
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.value = -16;
        compressor.ratio.value = 5;
        this.master.connect(compressor).connect(this.ctx.destination);
        // No requests for missing files: put paths in this manifest to use recordings.
        const manifest = (await import('./samples.js')).default;
        for (const [kind, paths] of Object.entries(manifest)) {
          const buffers = await Promise.all(paths.map(async path => {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Audio ${response.status}`);
            return this.ctx.decodeAudioData(await response.arrayBuffer());
          }));
          this.samples.set(kind, buffers);
        }
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
    } catch (error) { console.warn('音频不可用，交互仍可继续。', error); }
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.ctx) this.master.gain.setTargetAtTime(this.enabled ? .55 : 0, this.ctx.currentTime, .03);
    return this.enabled;
  }
  play(strength = .4, release = false) {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - this.last < .12) return;
    this.last = now;
    const kind = release ? 'release' : strength < .35 ? 'light' : strength < .7 ? 'medium' : 'heavy';
    const recorded = this.samples.get(kind);
    if (recorded?.length) {
      const source = this.ctx.createBufferSource(), gain = this.ctx.createGain();
      source.buffer = recorded[Math.floor(Math.random() * recorded.length)];
      source.playbackRate.value = .94 + Math.random() * .12;
      gain.gain.value = .4 + strength * .3;
      source.connect(gain).connect(this.master); source.start(); return;
    }
    const duration = release ? .42 : .12 + strength * .17;
    const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * duration), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const grains = Array.from({length: release ? 2 : 4 + Math.floor(strength * 9)}, () => ({t: Math.random() * duration * .72, amp: .2 + Math.random() * .8, decay: .003 + Math.random() * .014}));
    let smooth = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / this.ctx.sampleRate;
      const white = Math.random() * 2 - 1;
      smooth = smooth * .78 + white * .22;
      let envelope = 0;
      for (const grain of grains) if (t > grain.t) envelope += grain.amp * Math.exp(-(t - grain.t) / (release ? .065 : grain.decay));
      const fade = Math.min(1, t * 300) * Math.min(1, (duration - t) * 60);
      data[i] = (smooth * .85 + white * .15) * envelope * fade * (release ? .17 : .38 + strength * .18);
    }
    const source = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter();
    source.buffer = buffer; source.playbackRate.value = .9 + Math.random() * .15;
    filter.type = 'lowpass'; filter.frequency.value = release ? 1000 : 2400 + strength * 1900;
    source.connect(filter).connect(this.master); source.start();
  }
}
