// One run of Block Party in the browser: the fixed-step loop, keyboard and touch input
// (recorded as timed inputs), drawing, and checkpoints to the server, which replays them.
import { createGame, applyInput, step, resume, replay, digest, previewQueue, linesForNextLevel, INPUT, RULES } from "./engine.js";
import { sizeCanvas, drawBoard, drawPreview } from "./render.js";
import { api, ApiError } from "./api.js";
import { sfx, music, setAudioEnabled } from "./sound.js";
import { t } from "./i18n.js";

const TICK_MS = 1000 / RULES.hz;
const DAS = 8; // ticks before a held left/right repeats
const ARR = 1; // ticks between repeats
const CHECKPOINT_TICKS = 300; // about every 5 seconds of play
const VIS = RULES.visibleRows;

// ---------- sound: music and effects (sound.js), all behind the Sound switch ----------
// Presentation only: nothing here changes the rules, so the server's replay is unaffected.
const SPARK = ["#FFE79A", "#F6C431", "#FFB09C", "#F2B48A", "#FFF3D6", "#B8EB8C"];

export class Game {
  static soundOn = (() => { try { return localStorage.getItem("bba-sound") !== "off"; } catch { return true; } })();
  static setSound(on) { Game.soundOn = on; setAudioEnabled(on); try { localStorage.setItem("bba-sound", on ? "on" : "off"); } catch {} }

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
    this.sparks = []; // line-clear sparks (not under reduced motion)
    this.shake = null; // { until, mag }
    this.combo = 0; // clears in a row
    this.clearedThisLock = false;
    setAudioEnabled(Game.soundOn);
    this.acc = 0;
    this.last = 0;
    this.pausedAt = Date.now();
    // Rebuild from what the server accepted (a new run has no inputs).
    const r = replay(run.seed, run.inputs || [], { rules: run.rulesVersion, continueAfterMilestone: run.choice === "continue", untilTick: run.checkpoint.tick });
    this.st = r.ok ? r.state : createGame(run.seed, run.rulesVersion);
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
    if (p) { cancelAnimationFrame(this.raf); this.raf = 0; this.release(INPUT.SOFT_ON); this.held.clear(); music.pause(); }
    else { this.last = performance.now(); this.acc = 0; this.raf = requestAnimationFrame(this.frame); music.start(this.st.level); }
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
    const levelBefore = this.levelSeen || this.st.level;
    for (const e of this.st.events) {
      if (e.type === "clear") {
        this.clearedThisLock = true;
        this.combo++;
        sfx("clear", { n: e.n, combo: this.combo - 1 });
        const rows = e.rows.map((y) => y - RULES.hiddenRows).filter((y) => y >= 0);
        const dur = this.reduceMotion ? 90 : (e.n >= 4 ? 320 : 200);
        this.flash = { rows, until: performance.now() + dur, dur, big: e.n >= 4 };
        this.burst(rows, e.n);
        this.callout(t("pop" + Math.min(4, e.n)), this.combo >= 2 ? t("popCombo", { n: this.combo }) : "", e.n >= 4 ? "big" : "");
        if (e.n >= 4) this.quake(7, 320); else if (e.n >= 2) this.quake(3, 160);
      } else if (e.type === "hard") { sfx("hard"); this.hardThisLock = true; if (e.n > 2) this.quake(2, 90); }
      else if (e.type === "lock") {
        if (!this.clearedThisLock) { this.combo = 0; if (!this.hardThisLock) sfx("lock"); }
        this.clearedThisLock = false;
        this.hardThisLock = false;
      }
      else if (e.type === "rotate") sfx("rotate");
      else if (e.type === "hold") sfx("hold");
    }
    this.st.events.length = 0;
    if (this.st.level > levelBefore) {
      sfx("level");
      music.setLevel(this.st.level);
      setTimeout(() => this.callout(t("popLevel", { n: this.st.level }), t("popFaster"), "level"), 420);
    }
    this.levelSeen = this.st.level;
    this.dangerCheck();
    this.hooks.onHud && this.hooks.onHud(this.hud());
  }

  // ---------- excitement: callouts, sparks, shake, danger ----------
  callout(text, sub = "", kind = "") {
    const wrap = this.els.wrap;
    if (!wrap || !text) return;
    const el = document.createElement("div");
    el.className = "bba-call" + (kind ? " bba-call-" + kind : "");
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `<b></b>${sub ? "<span></span>" : ""}`;
    el.firstChild.textContent = text;
    if (sub) el.lastChild.textContent = sub;
    wrap.querySelectorAll(".bba-call").forEach((o) => o.remove());
    wrap.appendChild(el);
    setTimeout(() => el.remove(), kind === "big" || kind === "level" ? 1500 : 1000);
  }
  burst(rows, n) {
    if (this.reduceMotion || !this.cell) return;
    const c = this.cell, now = performance.now();
    for (const r of rows) {
      for (let i = 0; i < (n >= 4 ? 18 : 10); i++) {
        this.sparks.push({
          x: Math.random() * c * RULES.width, y: (r + 0.5) * c,
          vx: (Math.random() - 0.5) * c * 0.5, vy: -(0.2 + Math.random() * 0.5) * c,
          s: Math.max(2, Math.round(c / (n >= 4 ? 4 : 5))), col: SPARK[(Math.random() * SPARK.length) | 0],
          born: now, life: 550 + Math.random() * 350,
        });
      }
    }
    if (this.sparks.length > 400) this.sparks.splice(0, this.sparks.length - 400);
  }
  quake(mag, ms) {
    if (this.reduceMotion) return;
    this.shake = { mag, until: performance.now() + ms, ms };
  }
  dangerCheck() {
    const b = this.st.board, W = RULES.width, top = RULES.hiddenRows;
    let high = false;
    for (let i = top * W; i < (top + 4) * W; i++) if (b[i]) { high = true; break; }
    if (high !== this.danger) {
      this.danger = high;
      music.setDanger(high);
      this.els.wrap && this.els.wrap.classList.toggle("bba-danger", high);
    }
  }

  phaseChanged() {
    // Score mode: the run already chose to keep stacking, so Level 1 is only a moment.
    if (this.st.phase === "milestone" && this.run.choice === "continue") {
      this.snapshot();
      resume(this.st);
      sfx("level");
      this.callout(t("clear"), t("popFaster"), "level");
      return;
    }
    this.setPaused(true);
    this.snapshot();
    if (this.st.phase === "milestone") {
      sfx("level");
      music.stop();
      this.flush().then((run) => run && this.hooks.onMilestone(run));
    } else if (this.st.phase === "over") {
      music.stop();
      sfx("over");
      this.hooks.onOver();
    }
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
    if (this.sparks.length) {
      const ctx = this.ctx;
      this.sparks = this.sparks.filter((p) => now - p.born < p.life);
      for (const p of this.sparks) {
        const k = (now - p.born) / 1000;
        const x = p.x + p.vx * k, y = p.y + p.vy * k + 0.5 * this.cell * 9 * k * k;
        ctx.globalAlpha = Math.max(0, 1 - (now - p.born) / p.life);
        ctx.fillStyle = p.col;
        ctx.fillRect(Math.round(x), Math.round(y), p.s, p.s);
      }
      ctx.globalAlpha = 1;
    }
    const board = this.els.board;
    if (this.shake && now < this.shake.until) {
      const m = this.shake.mag * ((this.shake.until - now) / this.shake.ms);
      board.style.transform = `translate(${Math.round((Math.random() - 0.5) * 2 * m)}px, ${Math.round((Math.random() - 0.5) * 2 * m)}px)`;
    } else if (this.shake) { this.shake = null; board.style.transform = ""; }
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
          this.hooks.onRun && this.hooks.onRun(this.run);
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
    const r = replay(run.seed, run.inputs, { rules: run.rulesVersion, continueAfterMilestone: run.choice === "continue", untilTick: run.checkpoint.tick });
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
    music.stop();
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
  }
}

export { INPUT };
