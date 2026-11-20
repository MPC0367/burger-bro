// Block Party's sound: an original chiptune loop and the effects, made live with Web Audio
// (no files to download). The music speeds up with the level and gets busier when the
// stack is near the top. Everything is quiet by default and follows the Sound switch.
let ac = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null;
let enabled = true;

function ctx() {
  if (ac) return ac;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ac = new AC();
  master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
  musicBus = ac.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
  sfxBus = ac.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ac;
}

// Phones start audio only inside a tap, and an iPhone with its side switch on silent mutes
// Web Audio. Call this from every tap and key press: it wakes the audio context inside the
// gesture, plays one silent sample (what iOS needs to count it as unlocked), and asks iOS to
// treat the game as media so it plays with the switch on silent (audioSession on iOS 17+;
// on older iOS a silent looping <audio> element does the same job).
let unlocked = false, keeper = null;
function silentWav() {
  // 0.5 s of silence, 8 kHz mono 8-bit: a few kB, made here so no file is fetched.
  const n = 4000, b = new Uint8Array(44 + n), v = new DataView(b.buffer);
  const str = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
  str(0, "RIFF"); v.setUint32(4, 36 + n, true); str(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, "data"); v.setUint32(40, n, true);
  b.fill(128, 44);
  return URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
}
export function unlockAudio() {
  if (!enabled) return;
  try {
    if (navigator.audioSession && navigator.audioSession.type !== "playback") navigator.audioSession.type = "playback";
    else if (!navigator.audioSession && !keeper && /iP(hone|ad|od)|Macintosh/.test(navigator.userAgent) && "ontouchend" in document) {
      keeper = new Audio(silentWav());
      keeper.loop = true; keeper.setAttribute("playsinline", ""); keeper.volume = 0.01;
      keeper.play().catch(() => { keeper = null; });
    } else if (keeper && keeper.paused) keeper.play().catch(() => {});
    const a = ctx(); if (!a) return;
    if (a.state !== "running") a.resume();
    if (!unlocked) {
      const src = a.createBufferSource();
      src.buffer = a.createBuffer(1, 1, 22050);
      src.connect(a.destination); src.start(0);
      unlocked = true;
    }
  } catch {}
}
// iOS puts the audio "interrupted" after a call or a trip to another app: wake it on return.
if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => {
  if (!document.hidden && ac && ac.state !== "running" && enabled && music.wanted) ac.resume().catch(() => {});
});

// The arcade closed or sound was switched off: let the phone's audio go back to normal.
export function sleepAudio() {
  music.stop();
  if (keeper) keeper.pause();
}

export function setAudioEnabled(on) {
  enabled = on;
  if (!on) { music.pause(); if (keeper) keeper.pause(); }
  else if (music.wanted) music.start(music.level);
}

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function tone(bus, { type = "square", f, f2, t, dur, vol, attack = 0.004 }) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t); o.stop(t + dur + 0.02);
}
function noise(bus, { t, dur, vol, hp = 1000 }) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf;
  f.type = "highpass"; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(bus);
  s.start(t); s.stop(t + dur + 0.02);
}

// ---------- the music: four bars, Am – F – C – G, lead in eighths ----------
const _ = null;
const LEAD = [
  69, _, 72, 76, _, 74, 72, 76, // Am
  77, _, 76, 72, _, 69, 72, 74, // F
  76, _, 79, 76, _, 74, 72, 67, // C
  71, _, 74, 79, _, 77, 76, 74, // G
];
const BASS = [45, 41, 48, 43]; // A2 F2 C3 G2

export const music = {
  wanted: false, playing: false, level: 1, danger: false, step: 0, next: 0, timer: 0,
  start(level = 1) {
    this.wanted = true; this.level = level;
    if (!enabled || this.playing) return;
    const a = ctx(); if (!a) return;
    if (a.state !== "running") a.resume();
    this.playing = true;
    this.next = a.currentTime + 0.06;
    musicBus.gain.cancelScheduledValues(a.currentTime);
    musicBus.gain.setValueAtTime(0.55, a.currentTime);
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
  },
  pause() {
    this.playing = false;
    clearInterval(this.timer); this.timer = 0;
  },
  stop() { this.wanted = false; this.pause(); this.step = 0; },
  setLevel(n) { this.level = n; },
  setDanger(b) { this.danger = b; },
  stepLen() { // seconds per eighth note; 138 bpm at level 1, faster each level, at most 196
    const bpm = Math.min(196, 138 + (this.level - 1) * 7 + (this.danger ? 10 : 0));
    return 60 / bpm / 2;
  },
  schedule() {
    if (!this.playing || !ac) return;
    while (this.next < ac.currentTime + 0.15) {
      const t = this.next, i = this.step % 32, len = this.stepLen();
      const bar = Math.floor(i / 8), beat = i % 8;
      const lead = LEAD[i];
      if (lead) tone(musicBus, { type: "square", f: hz(lead), t, dur: len * 0.9, vol: 0.05 });
      // bass: root and octave, bouncing
      tone(musicBus, { type: "triangle", f: hz(BASS[bar] + (beat % 2 ? 12 : 0)), t, dur: len * 0.85, vol: 0.13 });
      // drums: kick on 1 and 3, snare on 2 and 4, hats on the off-beats (every eighth when in danger)
      if (beat === 0 || beat === 4) tone(musicBus, { type: "sine", f: 150, f2: 45, t, dur: 0.14, vol: 0.32 });
      if (beat === 2 || beat === 6) noise(musicBus, { t, dur: 0.1, vol: 0.12, hp: 1800 });
      if (beat % 2 === 1 || this.danger) noise(musicBus, { t, dur: 0.03, vol: 0.045, hp: 7000 });
      // a high echo of the lead from level 3, for lift
      if (lead && this.level >= 3 && beat % 2 === 0) tone(musicBus, { type: "square", f: hz(lead + 12), t: t + len * 0.5, dur: len * 0.4, vol: 0.018 });
      this.next += len;
      this.step++;
    }
  },
};

// ---------- effects ----------
export function sfx(kind, opt = {}) {
  if (!enabled) return;
  const a = ctx(); if (!a) return;
  if (a.state !== "running") a.resume();
  const t = a.currentTime + 0.005;
  try {
    switch (kind) {
      case "rotate": tone(sfxBus, { type: "square", f: 620, f2: 880, t, dur: 0.05, vol: 0.035 }); break;
      case "hold": tone(sfxBus, { type: "triangle", f: 520, f2: 330, t, dur: 0.09, vol: 0.08 }); break;
      case "lock": tone(sfxBus, { type: "triangle", f: 190, f2: 90, t, dur: 0.07, vol: 0.12 }); break;
      case "hard":
        tone(sfxBus, { type: "sine", f: 220, f2: 50, t, dur: 0.16, vol: 0.4 });
        noise(sfxBus, { t, dur: 0.08, vol: 0.12, hp: 600 });
        break;
      case "clear": { // a rising arpeggio, one note more per line, higher with each combo
        const n = opt.n || 1, up = Math.min(12, (opt.combo || 0) * 2);
        const notes = [72, 76, 79, 84, 88].slice(0, n + 1);
        notes.forEach((m, i) => tone(sfxBus, { type: "square", f: hz(m + up), t: t + i * 0.055, dur: 0.12, vol: 0.07 }));
        if (n >= 4) { // BIG BRO: a fanfare and a cymbal
          [84, 88, 91, 96].forEach((m, i) => tone(sfxBus, { type: "sawtooth", f: hz(m), t: t + 0.3 + i * 0.07, dur: 0.22, vol: 0.05 }));
          noise(sfxBus, { t: t + 0.3, dur: 0.6, vol: 0.12, hp: 5000 });
        }
        break;
      }
      case "level":
        [67, 72, 76, 79, 84].forEach((m, i) => tone(sfxBus, { type: "square", f: hz(m), t: t + i * 0.08, dur: i === 4 ? 0.4 : 0.1, vol: 0.07 }));
        break;
      case "over":
        [72, 71, 70, 69, 64].forEach((m, i) => tone(sfxBus, { type: "square", f: hz(m), f2: i === 4 ? hz(52) : undefined, t: t + i * 0.16, dur: i === 4 ? 0.6 : 0.15, vol: 0.07 }));
        break;
    }
  } catch {}
}
