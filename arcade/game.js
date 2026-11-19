// One run of Block Party in the browser: the fixed-step loop, keyboard and touch input
// (recorded as timed inputs), drawing, and checkpoints to the server, which replays them.
import { createGame, applyInput, step, resume, replay, digest, previewQueue, linesForNextLevel, INPUT, RULES } from "./engine.js";
import { sizeCanvas, drawBoard, drawPreview } from "./render.js";
import { api, ApiError } from "./api.js";

const TICK_MS = 1000 / RULES.hz;
const DAS = 10; // ticks before a held left/right repeats
const ARR = 2; // ticks between repeats
const CHECKPOINT_TICKS = 300; // about every 5 seconds of play
const VIS = RULES.visibleRows;

// ---------- sound (short, quiet, optional) ----------
let audio = null;
function beep(kind) {
  if (!Game.soundOn) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    const f = { move: 220, rotate: 330, lock: 140, hard: 110, clear: 660, hold: 260, level: 880 }[kind] || 200;
    o.type = kind === "clear" || kind === "level" ? "square" : "triangle";
    o.frequency.value = f;
    g.gain.value = 0.035;
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + (kind === "clear" ? 0.25 : 0.07));
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.3);
  } catch {}
}

export class Game {
  static soundOn = (() => { try { return localStorage.getItem("bba-sound") !== "off"; } catch { return true; } })();
  static setSound(on) { Game.soundOn = on; try { localStorage.setItem("bba-sound", on ? "on" : "off"); } catch {} }

  constructor({ run, els, hooks, reduceMotion }) {
    this.run = run;
    this.els = els; // { board, next[], hold, wrap }
    this.hooks = hooks; // onHud(state), onMilestone(run), onOver(), onStatus(kind, text), onPauseChange(paused)
    this.reduceMotion = reduceMotion;
    this.paused = true;
    this.stopped = false;
    this.queue = []; // presses waiting for the next tick
    this.held = new Map(); // code -> tick pressed
    this.unsent = []; // inputs since the last snapshot
    this.snapshots = []; // checkpoints waiting to be accepted
    this.seq = run.checkpoint.seq;
    this.lastSnapTick = run.checkpoint.tick;
    this.flash = null;
    this.acc = 0;
    this.last = 0;
    this.pausedAt = Date.now();
    // Rebuild from what the server accepted (a new run has no inputs).
    const r = replay(run.seed, run.inputs || [], { continueAfterMilestone: run.choice === "continue", untilTick: run.checkpoint.tick });
    this.st = r.ok ? r.state : createGame(run.seed);
    if (run.choice === "continue") resume(this.st);
    this.frame = this.frame.bind(this);
    this.layout = this.layout.bind(this);
    this.ro = new ResizeObserver(this.layout);
    this.ro.observe(els.wrap);
    this.layout();
    this.raf = 0;
  }

  // ---------- size: a square cell from both axes ----------
  layout() {
    const r = this.els.wrap.getBoundingClientRect();
    const cell = Math.max(8, Math.floor(Math.min(r.width / RULES.width, r.height / VIS)));
    if (cell === this.cell) { this.draw(); return; }
    this.cell = cell;
    const s = sizeCanvas(this.els.board, cell * RULES.width, cell * VIS);
    this.ctx = s.ctx;
    this.dpr = s.dpr;
    this.prevKey = "";
    this.draw();
  }

  // ---------- control ----------
  start() { this.setPaused(false); }
  setPaused(p) {
    if (this.stopped || this.st.phase !== "play") p = true;
    if (p === this.paused) return;
    this.paused = p;
    this.pausedAt = p ? Date.now() : 0;
    if (p) { cancelAnimationFrame(this.raf); this.raf = 0; this.release(INPUT.SOFT_ON); this.held.clear(); }
    else { this.last = performance.now(); this.acc = 0; this.raf = requestAnimationFrame(this.frame); }
    this.hooks.onPauseChange && this.hooks.onPauseChange(this.paused);
    if (p) this.snapshot(); // a pause saves where the board is, even with no new moves
  }
  press(code) {
    if (this.paused || this.stopped) return;
    if (code === INPUT.SOFT_ON) { if (!this.held.has(code)) { this.held.set(code, -1); this.queue.push(code); } return; }
    if (code === INPUT.LEFT || code === INPUT.RIGHT) { if (this.held.has(code)) return; this.held.set(code, -1); }
    this.queue.push(code);
  }
  release(code) {
    if (!this.held.has(code)) return;
    this.held.delete(code);
    if (code === INPUT.SOFT_ON && !this.paused) this.queue.push(INPUT.SOFT_OFF);
    else if (code === INPUT.SOFT_ON) this.queue.push(INPUT.SOFT_OFF);
  }

  // ---------- the fixed-step loop ----------
  frame(now) {
    if (this.paused || this.stopped) return;
    this.acc += Math.min(250, now - this.last);
    this.last = now;
    let n = 0;
    while (this.acc >= TICK_MS && n < 6) { this.tick(); this.acc -= TICK_MS; n++; if (this.paused) break; }
    if (n === 6) this.acc = 0; // a slow device slows the game, never skips it
    this.draw(now);
    if (!this.paused && !this.stopped) this.raf = requestAnimationFrame(this.frame);
  }

  apply(code) {
    if (applyInput(this.st, code)) this.unsent.push([this.st.tick, code]);
  }

  tick() {
    const st = this.st;
    if (st.phase !== "play") return;
    while (this.queue.length && st.phase === "play") {
      const code = this.queue.shift();
      if (code === INPUT.SOFT_OFF && st.soft === false) continue;
      this.apply(code);
      if (this.held.has(code)) this.held.set(code, st.tick);
    }
    // Held left/right repeat.
    for (const code of [INPUT.LEFT, INPUT.RIGHT]) {
      const since = this.held.get(code);
      if (since == null || since < 0 || st.phase !== "play") continue;
      const d = st.tick - since;
      if (d >= DAS && (d - DAS) % ARR === 0) this.apply(code);
    }
    this.react();
    if (st.phase !== "play") { this.phaseChanged(); return; }
    if (st.tick - this.lastSnapTick >= CHECKPOINT_TICKS) this.snapshot();
    st.events.length = 0;
    step(st);
    this.react();
    if (st.phase !== "play") this.phaseChanged();
  }

  react() {
    for (const e of this.st.events) {
      if (e.type === "clear") {
        beep(e.n >= 4 ? "level" : "clear");
        const rows = e.rows.map((y) => y - RULES.hiddenRows).filter((y) => y >= 0);
        const dur = this.reduceMotion ? 90 : 180;
        this.flash = { rows, until: performance.now() + dur, dur };
      } else if (e.type === "hard") beep("hard");
      else if (e.type === "lock") beep("lock");
      else if (e.type === "rotate") beep("rotate");
      else if (e.type === "hold") beep("hold");
    }
    this.st.events.length = 0;
    this.hooks.onHud && this.hooks.onHud(this.hud());
  }

  phaseChanged() {
    this.setPaused(true);
    this.snapshot();
    if (this.st.phase === "milestone") this.flush().then((run) => run && this.hooks.onMilestone(run));
    else if (this.st.phase === "over") this.hooks.onOver();
  }

  hud() {
    const st = this.st;
    const target = linesForNextLevel(st.level);
    const from = st.level <= 1 ? 0 : linesForNextLevel(st.level - 1);
    return {
      score: st.score, level: st.level, lines: st.lines, target,
      progress: Math.max(0, Math.min(1, (st.lines - from) / (target - from))),
      next: previewQueue(st, 3), hold: st.hold, holdUsed: st.holdUsed, phase: st.phase,
    };
  }

  // ---------- drawing ----------
  draw(now = performance.now()) {
    if (!this.ctx) return;
    drawBoard(this.ctx, this.dpr, this.st, this.cell, { flash: this.flash, now });
    const h = this.hud();
    const key = h.next.join("") + "|" + h.hold + (h.holdUsed ? 1 : 0) + "|" + this.cell;
    if (key !== this.prevKey) {
      this.prevKey = key;
      const ps = Math.max(22, Math.min(46, Math.round(this.cell * 1.6)));
      this.els.next.forEach((c, i) => c && drawPreview(c, h.next[i], i === 0 ? ps : Math.round(ps * 0.7)));
      if (this.els.hold) drawPreview(this.els.hold, h.hold, ps, { dim: h.holdUsed });
    }
  }

  // ---------- checkpoints ----------
  snapshot() {
    const st = this.st;
    if (st.tick === this.lastSnapTick && !this.unsent.length) return;
    this.seq++;
    this.snapshots.push({ seq: this.seq, inputs: this.unsent, tick: st.tick, digest: digest(st) });
    this.unsent = [];
    this.lastSnapTick = st.tick;
    this.pump();
  }

  pump() {
    if (this.sending || !this.snapshots.length || this.stopped) return this.sendPromise;
    this.sending = true;
    this.sendPromise = (async () => {
      let wait = 1000;
      while (this.snapshots.length && !this.stopped) {
        const s = this.snapshots[0];
        try {
          const r = await api("POST", `runs/${this.run.id}/checkpoint`, s);
          this.snapshots.shift();
          this.run = { ...this.run, ...r.run };
          wait = 1000;
          this.hooks.onStatus && this.hooks.onStatus("ok");
        } catch (e) {
          if (e.code === "network" || e.status >= 500 || e.status === 429) {
            this.hooks.onStatus && this.hooks.onStatus("offline");
            await new Promise((r) => setTimeout(r, wait));
            wait = Math.min(15000, wait * 2);
            continue;
          }
          if (e.code === "desync" || e.code === "replay_rejected" || e.code === "checkpoint_out_of_sequence" || e.code === "idempotency_conflict") {
            await this.resync();
            break;
          }
          // Expired or ended on the server: stop here.
          this.snapshots = [];
          this.stopped = true;
          this.hooks.onStatus && this.hooks.onStatus("ended", e.code);
          break;
        }
      }
      this.sending = false;
      return this.run;
    })();
    return this.sendPromise;
  }

  // Wait until every snapshot is accepted; returns the run as the server sees it.
  async flush() {
    while (this.snapshots.length && !this.stopped) { await this.pump(); if (this.snapshots.length) await new Promise((r) => setTimeout(r, 500)); }
    return this.stopped ? null : this.run;
  }

  // Reload the run from the server's last accepted checkpoint.
  async resync() {
    const { run } = await api("GET", `runs/${this.run.id}`);
    this.run = run;
    const r = replay(run.seed, run.inputs, { continueAfterMilestone: run.choice === "continue", untilTick: run.checkpoint.tick });
    if (r.ok) {
      this.st = r.state;
      if (run.choice === "continue") resume(this.st);
    }
    this.snapshots = [];
    this.unsent = [];
    this.seq = run.checkpoint.seq;
    this.lastSnapTick = run.checkpoint.tick;
    this.queue = [];
    this.setPaused(true);
    this.prevKey = "";
    this.draw();
    this.hooks.onStatus && this.hooks.onStatus("resynced");
    if (run.state === "decision_ready") this.hooks.onMilestone(run);
  }

  continueAfterChoice(run) {
    this.run = { ...this.run, ...run };
    resume(this.st);
    this.react();
    this.draw();
  }

  async finish(reason) {
    this.setPaused(true);
    await this.flush();
    if (this.stopped) return null;
    const body = { inputs: this.unsent, endTick: this.st.tick, digest: digest(this.st), reason };
    for (let wait = 1000; ; wait = Math.min(15000, wait * 2)) {
      try {
        const { run } = await api("POST", `runs/${this.run.id}/finish`, body);
        this.unsent = [];
        this.stopped = true;
        return run;
      } catch (e) {
        if (e.code === "network" || e.status >= 500) { this.hooks.onStatus && this.hooks.onStatus("offline"); await new Promise((r) => setTimeout(r, wait)); continue; }
        if (e.code === "run_not_active") { const { run } = await api("GET", `runs/${this.run.id}`); this.stopped = true; return run; }
        throw e;
      }
    }
  }

  destroy() {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
  }
}

export { INPUT };
