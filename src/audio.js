// Tiny synthesized sound kit + a procedural music loop. No audio files needed.
let ctx = null, master, sfxBus, musicBus, noiseBuf;
let muted = false;
let musicMode = 'off', musicTimer = null, step = 0, nextTime = 0;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor(); comp.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(comp);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(comp);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // fluorescent hum
  const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 60;
  const hf = ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 240;
  const hg = ctx.createGain(); hg.gain.value = 0.018;
  hum.connect(hf).connect(hg).connect(comp); hum.start();
  musicTimer = setInterval(schedule, 25);
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05);
}
export const isMuted = () => muted;

function env(g, t, a, peak, dec) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
}

function tone(type, f0, f1, dur, vol, when = 0, bus = sfxBus) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  const g = ctx.createGain(); env(g, t, 0.004, vol, dur);
  o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
}

function noise(dur, vol, fType, f0, f1, when = 0, bus = sfxBus, q = 0.8) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  s.playbackRate.value = 0.5 + Math.random() * 0.5;
  const f = ctx.createBiquadFilter(); f.type = fType; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain(); env(g, t, 0.002, vol, dur);
  s.connect(f).connect(g).connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

export const sfx = {
  pistol() { noise(0.16, 0.9, 'lowpass', 5000, 300); tone('square', 180, 40, 0.12, 0.5); },
  smg() { noise(0.09, 0.6, 'lowpass', 6000, 500); tone('square', 220, 60, 0.07, 0.35); },
  shotgun() { noise(0.42, 1.0, 'lowpass', 3500, 120); tone('sawtooth', 110, 30, 0.3, 0.6); noise(0.08, 0.3, 'bandpass', 1800, 900, 0.32); noise(0.08, 0.3, 'bandpass', 1500, 800, 0.45); },
  empty() { tone('square', 1400, 1200, 0.02, 0.2); },
  reload() { tone('square', 900, 700, 0.03, 0.2, 0.0); tone('square', 600, 500, 0.04, 0.25, 0.25); },
  hit() { tone('sine', 220, 70, 0.09, 0.6); noise(0.06, 0.3, 'bandpass', 900, 300); },
  headshot() { this.hit(); tone('square', 1320, 1320, 0.06, 0.15, 0.02); },
  metalHit() { tone('square', 900, 400, 0.05, 0.25); noise(0.05, 0.3, 'highpass', 3000, 2000); },
  death() { noise(0.45, 0.5, 'lowpass', 1400, 100); tone('sawtooth', 260, 50, 0.4, 0.3); },
  botDeath() { for (let i = 0; i < 4; i++) noise(0.08, 0.5, 'bandpass', 2400 - i * 400, 300, i * 0.06); tone('square', 600, 40, 0.5, 0.25); },
  enemyShot() { tone('square', 520, 180, 0.22, 0.16); },
  telegraph() { tone('triangle', 300, 900, 0.3, 0.08); },
  orbPop() { tone('square', 1200, 2400, 0.06, 0.18); noise(0.05, 0.2, 'highpass', 4000, 2000); },
  hurt() { tone('sawtooth', 140, 60, 0.28, 0.5); noise(0.18, 0.4, 'lowpass', 900, 200); },
  swing() { noise(0.15, 0.25, 'bandpass', 600, 2000); },
  pickup() { [523, 659, 784, 1046].forEach((f, i) => tone('square', f, f, 0.07, 0.15, i * 0.06)); },
  ding() { tone('sine', 1318, 1318, 0.9, 0.35); tone('sine', 1046, 1046, 1.2, 0.35, 0.35); },
  door() { noise(1.1, 0.25, 'bandpass', 300, 600, 0, sfxBus, 2); },
  clear() { [392, 494, 587, 784].forEach((f, i) => tone('square', f, f, 0.18, 0.12, i * 0.08)); },
  step() { noise(0.05, 0.15, 'lowpass', 400, 100); },
  unlock() { [262, 330, 392, 523, 659, 784].forEach((f, i) => tone('square', f, f, 0.1, 0.13, i * 0.07)); },
  tap() { tone('square', 660, 660, 0.04, 0.12); },
  revolver() { noise(0.28, 1.0, 'lowpass', 4000, 150); tone('square', 140, 35, 0.2, 0.6); },
  rifle() { noise(0.12, 0.75, 'lowpass', 7000, 400); tone('square', 260, 70, 0.08, 0.4); },
  sniper() { noise(0.5, 1.0, 'lowpass', 6000, 100); tone('sawtooth', 200, 30, 0.45, 0.6); noise(0.6, 0.2, 'bandpass', 800, 200, 0.1); },
  rail() { tone('sawtooth', 2400, 80, 0.5, 0.35); tone('square', 120, 40, 0.4, 0.4); noise(0.3, 0.4, 'highpass', 6000, 1000); },
  launcher() { noise(0.25, 0.6, 'lowpass', 1200, 100); tone('sine', 300, 80, 0.2, 0.5); },
  explode() { noise(0.9, 1.0, 'lowpass', 2500, 40); tone('sine', 90, 25, 0.8, 0.9); },
  zap() { tone('sawtooth', 1800, 300, 0.1, 0.18); noise(0.08, 0.3, 'highpass', 5000, 3000); },
  flame() { noise(0.1, 0.35, 'bandpass', 900, 500, 0, sfxBus, 0.5); },
  staple() { tone('square', 1100, 500, 0.04, 0.3); noise(0.04, 0.4, 'highpass', 3000, 1500); },
  chainsaw() { tone('sawtooth', 70 + Math.random() * 20, 60, 0.09, 0.3); noise(0.08, 0.25, 'bandpass', 1200, 800); },
  slash() { noise(0.16, 0.5, 'highpass', 2000, 6000); tone('triangle', 900, 300, 0.1, 0.12); },
  chop() { noise(0.18, 0.45, 'bandpass', 500, 1500); tone('sine', 160, 60, 0.12, 0.3); },
    gunPickup() { [330, 440, 660].forEach((f, i) => tone('square', f, f, 0.08, 0.15, i * 0.05)); noise(0.1, 0.2, 'bandpass', 2000, 900, 0.15); },
};

// ------------------------------------------------------------------ music
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const BASS = [40, 40, 52, 40, 43, 40, 47, 45, 40, 40, 52, 40, 50, 48, 47, 43];
const BASS2 = [38, 38, 50, 38, 41, 38, 45, 43, 36, 36, 48, 36, 43, 42, 40, 38];
const LEAD = [64, 0, 0, 67, 0, 0, 71, 0, 69, 0, 67, 0, 64, 0, 62, 0];
const CALM = [52, 0, 0, 0, 55, 0, 59, 0, 57, 0, 0, 0, 55, 0, 52, 0];

export function setMusic(mode) { musicMode = mode; }

function schedule() {
  if (!ctx || musicMode === 'off') { if (ctx) nextTime = ctx.currentTime + 0.05; return; }
  const spb = musicMode === 'combat' ? 0.115 : 0.2;
  while (nextTime < ctx.currentTime + 0.12) {
    const t = nextTime - ctx.currentTime;
    const s = step % 16, bar = Math.floor(step / 16) % 4;
    if (musicMode === 'combat') {
      const bass = bar === 2 ? BASS2 : BASS;
      tone('square', midi(bass[s]), midi(bass[s]), spb * 0.9, 0.2, t, musicBus);
      if (s % 4 === 0) { tone('sine', 150, 40, 0.16, 0.7, t, musicBus); }
      if (s % 8 === 4) noise(0.14, 0.4, 'bandpass', 2000, 800, t, musicBus);
      if (s % 2 === 1) noise(0.03, 0.14, 'highpass', 8000, 6000, t, musicBus);
      if (bar === 3 && LEAD[s]) tone('sawtooth', midi(LEAD[s]), midi(LEAD[s]), spb * 1.8, 0.07, t, musicBus);
    } else {
      if (CALM[s]) tone('triangle', midi(CALM[s] + (bar % 2 ? 0 : 5)), midi(CALM[s] + (bar % 2 ? 0 : 5)), spb * 2.5, 0.12, t, musicBus);
      if (s % 8 === 0) tone('sine', midi(40 + (bar % 2 ? 5 : 0)), midi(40 + (bar % 2 ? 5 : 0)), spb * 6, 0.15, t, musicBus);
    }
    nextTime += spb; step++;
  }
}
