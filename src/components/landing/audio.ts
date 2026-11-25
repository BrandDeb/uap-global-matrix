/**
 * src/components/landing/audio.ts
 * ---------------------------------------------------------------------------
 * "Xeno Lounge", an original, fully generative soundtrack synthesized in the
 * browser with the Web Audio API (no audio files, nothing licensed).
 *
 *   pad       detuned saw chord through a breathing low-pass filter
 *   arp       plucky pentatonic arpeggio with ping-pong-ish delay
 *   theremin  wobbly sine lead playing a goofy B-movie melody
 *   pulse     soft sub thump on the beat
 *   sfx       blip (hover), boop (saucer click), moo (cow), whoosh, chime
 *
 * Browsers only allow audio after a user gesture, so nothing plays until
 * `start()` is called from a click. `level()` returns a smoothed 0..1 loudness
 * for audio-reactive visuals. `setIntensity(0..1)` (scroll depth) opens the
 * filter and brings the arp in.
 * ---------------------------------------------------------------------------
 */

type Ctx = AudioContext;

const BPM = 96;
const BEAT = 60 / BPM;
// A minor pentatonic + a sneaky lydian #4 for alien flavor (Hz, A2 = 110).
const SCALE = [0, 3, 5, 6, 7, 10, 12, 15, 17, 19];
const ROOT = 110;
const hz = (semi: number, oct = 0) => ROOT * Math.pow(2, semi / 12 + oct);

// Theremin melody: [scale step, beats]
const MELODY: ReadonlyArray<[number | null, number]> = [
  [7, 1.5], [8, 0.5], [9, 1], [7, 1], [5, 2], [null, 1], [4, 0.5], [5, 0.5],
  [7, 2], [6, 1], [4, 1], [3, 3], [null, 1],
  [5, 1], [7, 1], [9, 1.5], [8, 0.5], [7, 2], [null, 1], [3, 0.5], [4, 0.5],
  [5, 1.5], [4, 0.5], [2, 1], [3, 1], [0, 3], [null, 1],
];
const CHORDS: ReadonlyArray<number[]> = [
  [0, 7, 15, 19],
  [5, 12, 17, 22],
  [3, 10, 15, 22],
  [6, 13, 18, 22],
];

class XenoAudio {
  private ctx: Ctx | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private padFilter!: BiquadFilterNode;
  private arpGain!: GainNode;
  private delay!: DelayNode;
  private analyser!: AnalyserNode;
  private data!: Uint8Array<ArrayBuffer>;
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private melodyIdx = 0;
  private melodyAt = 0;
  private padVoices: OscillatorNode[] = [];
  private smoothed = 0;
  private intensity = 0;
  playing = false;

  private ensure(): Ctx {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.data = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    this.master.connect(comp).connect(this.analyser).connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.8;
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);

    // Shared echo.
    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = BEAT * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const dTone = ctx.createBiquadFilter();
    dTone.type = 'lowpass';
    dTone.frequency.value = 2200;
    this.delay.connect(dTone).connect(fb).connect(this.delay);
    dTone.connect(this.musicBus);

    // Pad filter with a slow LFO "breath".
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 600;
    this.padFilter.Q.value = 6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 350;
    lfo.connect(lfoAmt).connect(this.padFilter.frequency);
    lfo.start();
    const padGain = ctx.createGain();
    padGain.gain.value = 0.11;
    this.padFilter.connect(padGain).connect(this.musicBus);

    this.arpGain = ctx.createGain();
    this.arpGain.gain.value = 0.0;
    this.arpGain.connect(this.musicBus);
    this.arpGain.connect(this.delay);
    return ctx;
  }

  /** Must be called from a user gesture (click / keypress). */
  async start(): Promise<void> {
    const ctx = this.ensure();
    if (ctx.state === 'suspended') await ctx.resume();
    if (this.playing) return;
    this.playing = true;
    const now = ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0.9, now, 0.8);
    this.nextTime = now + 0.1;
    this.melodyAt = this.nextTime + BEAT * 4;
    this.step = 0;
    this.setChord(0, now);
    this.timer = window.setInterval(() => this.schedule(), 50);
    this.chime();
  }

  stop(): void {
    if (!this.ctx || !this.playing) return;
    this.playing = false;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(0, now, 0.25);
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    const voices = this.padVoices;
    this.padVoices = [];
    window.setTimeout(() => voices.forEach((v) => v.stop()), 1500);
  }

  toggle(): Promise<void> | void {
    return this.playing ? this.stop() : this.start();
  }

  /** 0..1, scroll depth: opens the pad filter and fades the arp in. */
  setIntensity(v: number): void {
    this.intensity = Math.max(0, Math.min(1, v));
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.padFilter.frequency.setTargetAtTime(500 + this.intensity * 1600, now, 0.4);
    this.arpGain.gain.setTargetAtTime(0.03 + this.intensity * 0.09, now, 0.4);
  }

  /** Smoothed loudness 0..1 for audio-reactive visuals. */
  level(): number {
    if (!this.ctx || !this.playing) {
      this.smoothed *= 0.9;
      return this.smoothed;
    }
    this.analyser.getByteFrequencyData(this.data);
    let sum = 0;
    for (let i = 2; i < 40; i++) sum += this.data[i];
    const v = Math.min(1, sum / (38 * 170));
    this.smoothed += (v - this.smoothed) * 0.25;
    return this.smoothed;
  }

  /* --- sequencer ---------------------------------------------------------- */

  private schedule() {
    const ctx = this.ctx;
    if (!ctx) return;
    while (this.nextTime < ctx.currentTime + 0.2) {
      const t = this.nextTime;
      const sixteenth = this.step % 16;
      const bar = Math.floor(this.step / 16);
      if (sixteenth === 0 && bar % 2 === 0) this.setChord((bar / 2) % CHORDS.length, t);
      if (sixteenth % 4 === 0) this.thump(t, sixteenth === 0 ? 1 : 0.55);
      if (sixteenth % 2 === 0) {
        const chord = CHORDS[Math.floor(bar / 2) % CHORDS.length];
        const n = chord[(this.step / 2) % chord.length | 0] + (sixteenth % 8 === 6 ? 12 : 0);
        this.pluck(t, hz(n, 1));
      }
      while (this.melodyAt <= t) {
        const [deg, beats] = MELODY[this.melodyIdx];
        if (deg !== null) this.theremin(this.melodyAt, hz(SCALE[deg], 1), beats * BEAT);
        this.melodyAt += beats * BEAT;
        this.melodyIdx = (this.melodyIdx + 1) % MELODY.length;
      }
      this.nextTime += BEAT / 4;
      this.step++;
    }
  }

  private setChord(i: number, t: number) {
    const ctx = this.ctx!;
    const old = this.padVoices;
    old.forEach((o) => {
      try {
        o.stop(t + 2.5);
      } catch {
        /* already stopped */
      }
    });
    this.padVoices = [];
    CHORDS[i].forEach((semi, k) => {
      for (const det of [-9, 9]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = hz(semi, k > 1 ? 0 : -1);
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.25, t + 2);
        o.connect(g).connect(this.padFilter);
        o.start(t);
        this.padVoices.push(o);
      }
    });
  }

  private pluck(t: number, f: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(this.arpGain);
    o.start(t);
    o.stop(t + 0.3);
  }

  private thump(t: number, amt: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35 * amt * (0.4 + this.intensity * 0.6), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.32);
  }

  private theremin(t: number, f: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 0.97, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.12); // portamento scoop
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.5;
    const vibAmt = ctx.createGain();
    vibAmt.gain.setValueAtTime(0, t);
    vibAmt.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.4, dur * 0.6));
    vib.connect(vibAmt).connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.08);
    g.gain.setTargetAtTime(0.0001, t + dur * 0.85, 0.08);
    o.connect(g);
    g.connect(this.musicBus);
    g.connect(this.delay);
    o.start(t);
    vib.start(t);
    o.stop(t + dur + 0.4);
    vib.stop(t + dur + 0.4);
  }

  /* --- sound effects ------------------------------------------------------- */

  private sfxReady(): Ctx | null {
    return this.playing && this.ctx ? this.ctx : null;
  }

  /** Tiny pitched blip for hovers; `pitch` 0..1. */
  blip(pitch = 0.5): void {
    const ctx = this.sfxReady();
    if (!ctx) return;
    const t = ctx.currentTime;
    const deg = SCALE[Math.round(pitch * (SCALE.length - 1))];
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = hz(deg, 2);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(f).connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + 0.1);
  }

  /** Pitched note for the crop-circle canvas. */
  note(pitch: number, length = 0.35): void {
    const ctx = this.sfxReady();
    if (!ctx) return;
    const t = ctx.currentTime;
    const deg = SCALE[Math.max(0, Math.min(SCALE.length - 1, Math.round(pitch * (SCALE.length - 1))))];
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz(deg, 2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    o.connect(g);
    g.connect(this.sfxBus);
    g.connect(this.delay);
    o.start(t);
    o.stop(t + length + 0.05);
  }

  /** Classic flying-saucer "boooOOP" (pitch-bending sine with vibrato). */
  boop(): void {
    const ctx = this.sfxReady();
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(1320, t + 0.35);
    o.frequency.exponentialRampToValueAtTime(330, t + 0.7);
    const vib = ctx.createOscillator();
    vib.frequency.value = 18;
    const va = ctx.createGain();
    va.gain.value = 40;
    vib.connect(va).connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    o.connect(g);
    g.connect(this.sfxBus);
    g.connect(this.delay);
    o.start(t);
    vib.start(t);
    o.stop(t + 0.8);
    vib.stop(t + 0.8);
  }

  /** A deeply confused synthesized cow. */
  moo(): void {
    const ctx = this.sfxReady();
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(150, t);
    o.frequency.linearRampToValueAtTime(175, t + 0.25);
    o.frequency.linearRampToValueAtTime(115, t + 1.1);
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.Q.value = 5;
    f1.frequency.setValueAtTime(500, t);
    f1.frequency.linearRampToValueAtTime(900, t + 0.3); // "mm" → "oo"
    f1.frequency.linearRampToValueAtTime(450, t + 1.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.12);
    g.gain.setTargetAtTime(0.0001, t + 0.9, 0.12);
    o.connect(f1).connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + 1.5);
  }

  /** Filtered-noise whoosh (section transitions). */
  whoosh(): void {
    const ctx = this.sfxReady();
    if (!ctx) return;
    const t = ctx.currentTime;
    const len = 0.6;
    const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.5;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(3000, t + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t);
  }

  /** Three-note arrival chime. */
  chime(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    [0, 4, 7].forEach((step, i) => {
      const t = ctx.currentTime + 0.25 + i * 0.12;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = hz(SCALE[step], 2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g);
      g.connect(this.sfxBus);
      g.connect(this.delay);
      o.start(t);
      o.stop(t + 1);
    });
  }
}

/** Single shared instance (client only). */
export const xenoAudio = typeof window === 'undefined' ? (null as unknown as XenoAudio) : new XenoAudio();
