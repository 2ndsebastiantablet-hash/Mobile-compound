// Cutscene sounds, synthesised like the rest of the game's audio (no sound files).
import { tone, noise, getAudio, sfx } from '../../audio/sfx.js';

const R = (a, b) => a + Math.random() * (b - a);
const mus = () => { const a = getAudio(); return a ? a.musicBus : undefined; };

export const au = {
  boom(s = 1, when = 0) {
    noise(1.2 + s * 0.6, Math.min(1.2, 0.7 + s * 0.3), 'lowpass', 1800 + s * 600, 30, when);
    tone('sine', 70 + R(-8, 8), 22, 1.1 + s * 0.5, Math.min(1, 0.6 + s * 0.3), when);
    noise(0.5, 0.35, 'bandpass', 900, 200, when + 0.05);
    for (let i = 0; i < 3; i++) noise(0.25, 0.18, 'highpass', 3000, 1200, when + 0.15 + i * R(0.08, 0.2)); // crackles
  },
  rumble(d = 2, v = 0.5, when = 0) { noise(d, v, 'lowpass', 220, 60, when, undefined, 0.5); tone('sine', 45, 32, d, v * 0.7, when); },
  glass(when = 0) {
    noise(0.5, 0.7, 'highpass', 5200, 2600, when);
    for (let i = 0; i < 9; i++) tone(i % 2 ? 'triangle' : 'sine', R(2600, 6200), R(2000, 5000), R(0.15, 0.6), 0.05, when + R(0, 0.45));
    noise(0.3, 0.3, 'bandpass', 2500, 900, when + 0.05);
  },
  beep(f = 1800, when = 0) { tone('square', f, f, 0.08, 0.14, when); },
  click(when = 0) { tone('square', 2600, 1800, 0.02, 0.18, when); noise(0.03, 0.25, 'highpass', 4000, 2500, when); },
  latch(when = 0) { tone('square', 1500, 900, 0.03, 0.2, when); noise(0.05, 0.35, 'bandpass', 2200, 1200, when); tone('sine', 300, 180, 0.06, 0.2, when); },
  klaxon(when = 0) { tone('square', 520, 680, 0.42, 0.07, when); tone('square', 680, 520, 0.42, 0.07, when + 0.45); },
  step(soft = false, when = 0) { noise(0.06, soft ? 0.1 : 0.18, 'lowpass', soft ? 500 : 900, 120, when); tone('sine', 90, 50, 0.05, soft ? 0.06 : 0.1, when); },
  heavyStep(when = 0) { noise(0.12, 0.45, 'lowpass', 400, 60, when); tone('sine', 60, 30, 0.2, 0.4, when); },
  thud(v = 0.6, when = 0) { tone('sine', 110, 40, 0.25, v, when); noise(0.12, v * 0.6, 'lowpass', 700, 100, when); },
  whoosh(when = 0, d = 0.6) { noise(d, 0.4, 'bandpass', 300, 2400, when, undefined, 1.2); },
  wind(d = 3, v = 0.25, when = 0) { noise(d, v, 'bandpass', 500, 260, when, undefined, 0.6); },
  paper(when = 0) { for (let i = 0; i < 6; i++) noise(0.18, 0.3, 'highpass', 2500, 1600, when + i * 0.05); noise(0.3, 0.5, 'lowpass', 900, 150, when); },
  bell(when = 0) { // door bell on a spring
    for (let i = 0; i < 5; i++) { tone('sine', 2093, 2093, 0.5, 0.09 / (i + 1), when + i * 0.09); tone('triangle', 3136, 3136, 0.3, 0.05 / (i + 1), when + i * 0.09 + 0.03); }
  },
  creak(when = 0) { tone('sawtooth', 140, 210, 0.6, 0.05, when); noise(0.6, 0.1, 'bandpass', 600, 900, when, undefined, 6); },
  doorShut(when = 0) { tone('sine', 120, 50, 0.2, 0.5, when); noise(0.15, 0.4, 'lowpass', 1500, 200, when); },
  carDoor(when = 0) { tone('sine', 150, 60, 0.18, 0.55, when); noise(0.12, 0.5, 'lowpass', 2000, 300, when); tone('square', 900, 700, 0.03, 0.08, when + 0.02); },
  engineStart(when = 0) {
    for (let i = 0; i < 4; i++) noise(0.09, 0.3, 'lowpass', 600, 200, when + i * 0.11);
    tone('sawtooth', 38, 62, 1.0, 0.22, when + 0.45); tone('square', 40, 58, 1.0, 0.1, when + 0.45);
  },
  engine(d = 1, f = 50, v = 0.16, when = 0) { tone('sawtooth', f, f * 1.05, d, v, when); tone('square', f * 0.5, f * 0.52, d, v * 0.5, when); },
  chew(when = 0) { noise(0.08, 0.12, 'bandpass', 700, 400, when, undefined, 2); },
  bite(when = 0) { noise(0.12, 0.3, 'bandpass', 1400, 600, when, undefined, 1.5); },
  breath(when = 0, wet = false) {
    noise(0.7, wet ? 0.16 : 0.09, 'bandpass', wet ? 500 : 900, wet ? 350 : 600, when, undefined, 1.5);
    noise(0.8, wet ? 0.13 : 0.07, 'bandpass', wet ? 380 : 700, wet ? 600 : 1000, when + 0.9, undefined, 1.5);
    if (wet) tone('sawtooth', 70, 55, 0.7, 0.05, when + 0.9);
  },
  heartbeat(when = 0) { tone('sine', 62, 40, 0.14, 0.5, when); tone('sine', 58, 38, 0.14, 0.38, when + 0.22); },
  growl(when = 0, d = 1.2) { tone('sawtooth', 75, 52, d, 0.18, when); tone('sawtooth', 79, 50, d, 0.12, when); noise(d, 0.25, 'lowpass', 500, 180, when, undefined, 3); },
  squelch(when = 0) { noise(0.25, 0.3, 'lowpass', 900, 200, when, undefined, 4); tone('sine', 200, 90, 0.18, 0.15, when); },
  screech(when = 0, d = 3.6) { // a monster's scream into the night
    for (const [f0, f1, v] of [[620, 440, 0.12], [930, 610, 0.09], [1240, 820, 0.06], [310, 220, 0.12]]) {
      tone('sawtooth', f0 * 0.7, f0, 0.35, v, when);
      tone('sawtooth', f0, f1, d, v, when + 0.33); tone('square', f0 * 1.01, f1 * 1.02, d * 0.9, v * 0.5, when + 0.33);
    }
    noise(d + 0.4, 0.5, 'bandpass', 1400, 700, when, undefined, 1.2);
    noise(d * 1.6, 0.22, 'bandpass', 900, 300, when + d * 0.6, undefined, 0.8); // echo off the buildings
    tone('sawtooth', 500, 330, d * 1.3, 0.04, when + d * 0.55);
  },
  thunder(when = 0) { noise(3.5, 0.55, 'lowpass', 600, 40, when, undefined, 0.5); noise(0.4, 0.4, 'lowpass', 2500, 300, when); },
  ding() { sfx.ding(); },
  // music stings / pads on the music bus
  pad(notes, d, v = 0.05, when = 0, type = 'sine') { for (const n of notes) { const f = 440 * Math.pow(2, (n - 69) / 12); tone(type, f, f, d, v, when, mus()); tone('triangle', f * 2, f * 2, d * 0.8, v * 0.25, when, mus()); } },
  sting(when = 0) { this.pad([45, 52, 57, 60], 3.5, 0.06, when, 'sawtooth'); tone('sine', 55, 40, 3, 0.25, when, mus()); },
  choir(when = 0, d = 6) { for (const n of [50, 57, 62, 65, 69]) { const f = 440 * Math.pow(2, (n - 69) / 12); for (const det of [0.995, 1.005]) tone('sawtooth', f * det, f * det, d, 0.022, when, mus()); } },
  // a short synthwave loop for the drive into the sunset
  synthwave(when = 0, bars = 4) {
    const bus = mus(), spb = 0.21;
    const chords = [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 55]];
    for (let b = 0; b < bars; b++) {
      const ch = chords[b % 4];
      for (let s = 0; s < 16; s++) {
        const t = when + (b * 16 + s) * spb / 2;
        const n = ch[(s % 4)] + 12 + (s % 8 >= 4 ? 12 : 0), f = 440 * Math.pow(2, (n - 69) / 12);
        tone('sawtooth', f, f, spb * 0.45, 0.025, t, bus);
        if (s % 4 === 0) { const bf = 440 * Math.pow(2, (ch[0] - 12 - 69) / 12); tone('sawtooth', bf, bf, spb * 1.6, 0.07, t, bus); tone('sine', 120, 40, 0.18, 0.4, t, bus); }
        if (s % 8 === 4) noise(0.2, 0.25, 'highpass', 3000, 2000, t, bus);
        if (s % 2 === 1) noise(0.04, 0.06, 'highpass', 8000, 6000, t, bus);
      }
      for (const n of ch) { const f = 440 * Math.pow(2, (n - 69) / 12); tone('triangle', f, f, spb * 7.5, 0.02, when + b * 8 * spb, bus); }
    }
  },
};

// continuous beds (rain, fire roar, city hum, diner buzz): re-triggered short noise grains
export function bed(kind, v = 1) {
  const fn = {
    rain: (t) => { noise(0.9, 0.14 * v, 'highpass', 1500, 1100, t); noise(0.9, 0.08 * v, 'lowpass', 900, 600, t + 0.2); },
    fire: (t) => { noise(0.9, 0.12 * v, 'lowpass', 700, 300, t); if (Math.random() < 0.4) noise(0.06, 0.12 * v, 'highpass', 3000, 2000, t + R(0, 0.4)); },
    city: (t) => { noise(1, 0.05 * v, 'lowpass', 400, 300, t); },
    room: (t) => { noise(1, 0.035 * v, 'lowpass', 300, 250, t); tone('sine', 120, 120, 1, 0.008 * v, t); },
    wind: (t) => { noise(1, 0.08 * v, 'bandpass', R(300, 600), R(250, 500), t, undefined, 0.8); },
  }[kind];
  return { kind, fn, v };
}
