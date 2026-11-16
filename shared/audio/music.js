// Background music. Currently a procedural loop (a calm 'walking' pattern and a 'combat'
// groove); this file is the home for the full per-floor soundtrack planned later.
import { getAudio, onAudioReady, tone, noise } from './sfx.js';

let musicMode = 'off', step = 0, nextTime = 0, ctx = null, musicBus = null;
onAudioReady(() => { const a = getAudio(); ctx = a.ctx; musicBus = a.musicBus; setInterval(schedule, 25); });

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
