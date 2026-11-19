// Burger Bro Block Party — the game rules.
//
// One deterministic engine shared by the browser (to play) and the server (to replay
// and verify). Everything here is integer ticks at 60 Hz: the frame rate the browser
// draws at never changes what happens. Same seed + same inputs = same game, always.
//
// Board: 10 wide, 20 visible rows, plus 2 hidden spawn rows on top (rows 0–1).
// Pieces: the seven four-cell shapes, each one burger ingredient (art lives in
// render.js; it never changes collision). Rotation: SRS with its kick tables.
// Randomiser: seven-bag on a seeded mulberry32.

export const RULES_VERSION = "bb-1";

export const RULES = Object.freeze({
  version: RULES_VERSION,
  width: 10,
  visibleRows: 20,
  hiddenRows: 2,
  hz: 60,
  lockDelayTicks: 30,
  maxLockResets: 15,
  softDropInterval: 2, // ticks per row while soft drop is held
  lineScores: [0, 100, 300, 500, 800], // × level at lock
  softDropPoints: 1, // per cell
  hardDropPoints: 2, // per cell
  milestoneLines: 5, // reaching this many lines clears Level 1
  maxTicks: 60 * 60 * 60, // 60-minute absolute run lifetime
});

export const PIECES = ["I", "O", "T", "L", "J", "S", "Z"];
// Which ingredient each shape is (the brief's atlas, page 5).
export const INGREDIENT = { I: "bacon", O: "cheddar", T: "patty", L: "bun", J: "pickle", S: "lettuce", Z: "tomato" };

// Input codes (kept small so an input log is compact).
export const INPUT = Object.freeze({ LEFT: 1, RIGHT: 2, CW: 3, CCW: 4, HARD: 5, HOLD: 6, SOFT_ON: 7, SOFT_OFF: 8 });
const VALID_INPUTS = new Set(Object.values(INPUT));

// ---------- shapes ----------
// Spawn orientation in a box (3×3, or 4×4 for I and O), y grows downward.
const BASE = {
  I: { n: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { n: 4, cells: [[1, 0], [2, 0], [1, 1], [2, 1]] },
  T: { n: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  L: { n: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
  J: { n: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  S: { n: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { n: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
};

// SHAPES[type][rot] = [[x,y]×4], rot 0..3 clockwise.
export const SHAPES = {};
for (const t of PIECES) {
  const { n, cells } = BASE[t];
  const rots = [cells.map((c) => c.slice())];
  for (let r = 1; r < 4; r++) {
    if (t === "O") { rots.push(cells.map((c) => c.slice())); continue; }
    rots.push(rots[r - 1].map(([x, y]) => [n - 1 - y, x]));
  }
  SHAPES[t] = rots;
}

// SRS kicks, written with y up as published, converted to y down below.
const KICK_JLSTZ = {
  "0>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "1>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "1>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "2>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "2>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "3>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "3>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "0>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};
const KICK_I = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};
function kicks(type, from, to) {
  if (type === "O") return [[0, 0]];
  const table = type === "I" ? KICK_I : KICK_JLSTZ;
  return table[from + ">" + to].map(([x, y]) => [x, -y]);
}

// ---------- level and gravity ----------
// Level 1: 0–4 lines · 2: 5–14 · 3: 15–24 · 4: 25–34 · then 10 more lines per level.
export function levelForLines(lines) {
  if (lines < RULES.milestoneLines) return 1;
  return 2 + Math.floor((lines - RULES.milestoneLines) / 10);
}
export function linesForNextLevel(level) {
  return level <= 1 ? RULES.milestoneLines : RULES.milestoneLines + (level - 1) * 10;
}
export function gravityTicks(level) {
  return Math.max(4, Math.round(54 * Math.pow(0.82, level - 1)));
}

// ---------- seeded random ----------
function nextRandom(st) {
  // mulberry32: one uint32 of state, returns [0, 1).
  st.rng = (st.rng + 0x6d2b79f5) >>> 0;
  let t = st.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function refillBag(st) {
  const bag = PIECES.slice();
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(st) * (i + 1));
    const tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp;
  }
  st.queue.push(...bag);
}
function takeNext(st) {
  while (st.queue.length < 8) refillBag(st);
  return st.queue.shift();
}

// ---------- state ----------
export function createGame(seed) {
  const rows = RULES.visibleRows + RULES.hiddenRows;
  const st = {
    rules: RULES_VERSION,
    tick: 0,
    rng: seed >>> 0,
    queue: [],
    board: new Array(rows * RULES.width).fill(""), // "" or a piece letter
    piece: null, // { t, r, x, y }
    hold: "",
    holdUsed: false,
    score: 0,
    lines: 0,
    level: 1,
    soft: false,
    gravityCounter: 0,
    lockTimer: 0,
    lockResets: 0,
    lowestY: 0,
    phase: "play", // play | milestone | over
    milestoneReached: false,
    milestone: null, // { tick, score, lines, level }
    overReason: "",
    events: [], // per-step notices for the renderer (not part of the digest)
  };
  spawn(st, takeNext(st));
  return st;
}

const W = RULES.width;
const ROWS = RULES.visibleRows + RULES.hiddenRows;

function cellsOf(p) {
  return SHAPES[p.t][p.r].map(([x, y]) => [p.x + x, p.y + y]);
}
function fits(st, p) {
  for (const [x, y] of cellsOf(p)) {
    if (x < 0 || x >= W || y < 0 || y >= ROWS) return false;
    if (st.board[y * W + x]) return false;
  }
  return true;
}

function spawn(st, t) {
  const p = { t, r: 0, x: 3, y: 0 };
  if (!fits(st, p)) { endGame(st, "block_out"); return; }
  st.piece = p;
  // Step into view at once, as the guideline does.
  const down = { ...p, y: p.y + 1 };
  if (fits(st, down)) st.piece = down;
  st.gravityCounter = 0;
  st.lockTimer = 0;
  st.lockResets = 0;
  st.lowestY = st.piece.y;
}

function endGame(st, reason) {
  st.phase = "over";
  st.overReason = reason;
  st.piece = null;
  st.events.push({ type: "over", reason });
}

function grounded(st) {
  return !fits(st, { ...st.piece, y: st.piece.y + 1 });
}

function afterMoveOnGround(st) {
  // A successful move or rotation while resting buys time, at most maxLockResets times.
  if (grounded(st) && st.lockResets < RULES.maxLockResets) {
    st.lockTimer = 0;
    st.lockResets++;
  }
}

function moveDown(st) {
  const p = { ...st.piece, y: st.piece.y + 1 };
  if (!fits(st, p)) return false;
  st.piece = p;
  if (p.y > st.lowestY) { st.lowestY = p.y; st.lockResets = 0; st.lockTimer = 0; }
  return true;
}

function lock(st) {
  const cells = cellsOf(st.piece);
  let allHidden = true;
  for (const [x, y] of cells) {
    st.board[y * W + x] = st.piece.t;
    if (y >= RULES.hiddenRows) allHidden = false;
  }
  const type = st.piece.t;
  st.piece = null;
  // Clear full rows.
  const full = [];
  for (let y = 0; y < ROWS; y++) {
    let ok = true;
    for (let x = 0; x < W; x++) if (!st.board[y * W + x]) { ok = false; break; }
    if (ok) full.push(y);
  }
  if (full.length) {
    const kept = [];
    for (let y = 0; y < ROWS; y++) if (!full.includes(y)) kept.push(st.board.slice(y * W, y * W + W));
    const fresh = [];
    for (let i = 0; i < full.length; i++) fresh.push(new Array(W).fill(""));
    st.board = [].concat(...fresh, ...kept);
    // Score with the level at lock, then update lines and level.
    st.score += RULES.lineScores[full.length] * st.level;
    const before = st.lines;
    st.lines += full.length;
    st.level = levelForLines(st.lines);
    st.events.push({ type: "clear", rows: full, n: full.length });
    if (!st.milestoneReached && before < RULES.milestoneLines && st.lines >= RULES.milestoneLines) {
      st.milestoneReached = true;
      st.milestone = { tick: st.tick, score: st.score, lines: st.lines, level: st.level };
      st.phase = "milestone";
      st.events.push({ type: "milestone" });
    }
  }
  st.events.push({ type: "lock", t: type });
  if (allHidden && !full.length) { endGame(st, "lock_out"); return; }
  st.holdUsed = false;
  if (st.phase === "milestone") {
    // The next piece is drawn now so the board after the choice is the same for everyone.
    spawn(st, takeNext(st));
    if (st.phase === "over") return;
    st.phase = "milestone";
    return;
  }
  spawn(st, takeNext(st));
}

function rotate(st, dir) {
  const p = st.piece;
  const to = (p.r + (dir > 0 ? 1 : 3)) % 4;
  for (const [dx, dy] of kicks(p.t, p.r, to)) {
    const q = { t: p.t, r: to, x: p.x + dx, y: p.y + dy };
    if (fits(st, q)) {
      st.piece = q;
      if (q.y > st.lowestY) { st.lowestY = q.y; st.lockResets = 0; st.lockTimer = 0; }
      else afterMoveOnGround(st);
      st.events.push({ type: "rotate" });
      return true;
    }
  }
  return false;
}

function shift(st, dx) {
  const q = { ...st.piece, x: st.piece.x + dx };
  if (!fits(st, q)) return false;
  st.piece = q;
  afterMoveOnGround(st);
  st.events.push({ type: "move" });
  return true;
}

function hardDrop(st) {
  let n = 0;
  while (moveDown(st)) n++;
  st.score += n * RULES.hardDropPoints;
  st.events.push({ type: "hard", n });
  lock(st);
}

function doHold(st) {
  if (st.holdUsed) return false;
  const cur = st.piece.t;
  const next = st.hold || takeNext(st);
  st.hold = cur;
  spawn(st, next);
  st.holdUsed = true;
  st.events.push({ type: "hold" });
  return true;
}

// Apply one input at the current tick. Returns false if the input is not allowed now.
export function applyInput(st, code) {
  if (st.phase !== "play" || !st.piece) return false;
  switch (code) {
    case INPUT.LEFT: shift(st, -1); return true;
    case INPUT.RIGHT: shift(st, 1); return true;
    case INPUT.CW: rotate(st, 1); return true;
    case INPUT.CCW: rotate(st, -1); return true;
    case INPUT.HARD: hardDrop(st); return true;
    case INPUT.HOLD: doHold(st); return true;
    case INPUT.SOFT_ON: st.soft = true; return true;
    case INPUT.SOFT_OFF: st.soft = false; return true;
    default: return false;
  }
}

// Advance one tick (gravity and lock delay). Inputs for this tick go in before step.
export function step(st) {
  if (st.phase !== "play") return;
  st.tick++;
  if (st.tick >= RULES.maxTicks) { endGame(st, "time_limit"); return; }
  if (!st.piece) return;
  const interval = st.soft ? Math.min(RULES.softDropInterval, gravityTicks(st.level)) : gravityTicks(st.level);
  st.gravityCounter++;
  if (st.gravityCounter >= interval) {
    st.gravityCounter = 0;
    if (moveDown(st)) {
      if (st.soft) st.score += RULES.softDropPoints;
    }
  }
  if (st.piece && grounded(st)) {
    st.lockTimer++;
    if (st.lockTimer >= RULES.lockDelayTicks) lock(st);
  } else {
    st.lockTimer = 0;
  }
}

// After the Level 1 choice "Keep stacking".
export function resume(st) {
  if (st.phase === "milestone") st.phase = "play";
}

// ---------- helpers for the screen ----------
export function ghostY(st) {
  if (!st.piece) return null;
  let p = st.piece;
  while (fits(st, { ...p, y: p.y + 1 })) p = { ...p, y: p.y + 1 };
  return p.y;
}
export function pieceCells(p) { return p ? cellsOf(p) : []; }
export function previewQueue(st, n = 3) {
  const copy = { rng: st.rng, queue: st.queue.slice() };
  while (copy.queue.length < n) refillBag(copy);
  return copy.queue.slice(0, n);
}

// ---------- digest ----------
// A short fingerprint of everything that decides the future of the game. The browser
// sends it with each checkpoint; the server replays and compares.
export function digest(st) {
  const parts = [
    st.rules, st.tick, st.rng, st.queue.join(""), st.board.map((c) => c || ".").join(""),
    st.piece ? `${st.piece.t}${st.piece.r},${st.piece.x},${st.piece.y}` : "-",
    st.hold || "-", st.holdUsed ? 1 : 0, st.score, st.lines, st.level, st.soft ? 1 : 0,
    st.gravityCounter, st.lockTimer, st.lockResets, st.lowestY, st.phase,
  ].join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < parts.length; i++) {
    h ^= parts.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function summary(st) {
  return { tick: st.tick, score: st.score, lines: st.lines, level: st.level, phase: st.phase, overReason: st.overReason, milestone: st.milestone };
}

// ---------- replay (the server's verifier, also used by tests) ----------
// events: [[tick, code], ...] sorted by tick. An event at tick T is applied after the
// game has stepped to tick T, before tick T+1. continueAfterMilestone: whether the
// player chose "Keep stacking"; if not, any input after the milestone is rejected.
// untilTick: replay only up to this tick (a checkpoint).
export function replay(seed, events, { continueAfterMilestone = false, untilTick = null } = {}) {
  const st = createGame(seed);
  let i = 0;
  let lastTick = 0;
  const target = untilTick == null ? (events.length ? events[events.length - 1][0] : 0) : untilTick;
  if (!Number.isInteger(target) || target < 0 || target > RULES.maxTicks) return { ok: false, error: "bad_tick", state: st };
  while (true) {
    // Inputs at this tick.
    while (i < events.length && events[i][0] === st.tick) {
      const [t, code] = events[i];
      if (!VALID_INPUTS.has(code)) return { ok: false, error: "bad_input", at: i, state: st };
      if (t < lastTick) return { ok: false, error: "out_of_order", at: i, state: st };
      lastTick = t;
      if (st.phase === "milestone") {
        if (!continueAfterMilestone) return { ok: false, error: "input_after_milestone", at: i, state: st };
        resume(st);
      }
      if (st.phase === "over") return { ok: false, error: "input_after_end", at: i, state: st };
      applyInput(st, code);
      i++;
    }
    if (i < events.length && events[i][0] < st.tick) return { ok: false, error: "out_of_order", at: i, state: st };
    if (st.tick >= target) break;
    if (st.phase === "over") break;
    if (st.phase === "milestone") {
      if (!continueAfterMilestone) break;
      resume(st);
    }
    st.events.length = 0;
    step(st);
  }
  if (i < events.length) return { ok: false, error: "input_after_end", at: i, state: st };
  st.events.length = 0;
  return { ok: true, state: st };
}

// Validate the shape of an input log without replaying it.
export function validEventList(events, maxCount = 200000) {
  if (!Array.isArray(events) || events.length > maxCount) return false;
  let last = -1;
  for (const e of events) {
    if (!Array.isArray(e) || e.length !== 2) return false;
    const [t, c] = e;
    if (!Number.isInteger(t) || t < 0 || t > RULES.maxTicks || t < last) return false;
    if (!VALID_INPUTS.has(c)) return false;
    last = t;
  }
  return true;
}
