// Drawing for Block Party: original pixel ingredient tiles, the board, the ghost piece,
// line-clear flashes and the small next/hold previews. Art never changes geometry:
// each tile is drawn inside one square cell with a dark seam around it.
import { RULES, SHAPES, ghostY, pieceCells } from "./engine.js";

const W = RULES.width;
const HID = RULES.hiddenRows;
const VIS = RULES.visibleRows;

// One look per shape. Value, pattern and outline differ as well as hue, so the
// pieces stay distinguishable without colour.
const TILE = {
  I: { name: "bacon", base: "#B4472B", dark: "#7A2A16", light: "#F2B48A" },
  O: { name: "cheddar", base: "#F6C431", dark: "#C98F12", light: "#FFE79A" },
  T: { name: "patty", base: "#6A3A22", dark: "#3E1F10", light: "#A8673F" },
  L: { name: "bun", base: "#D8A35A", dark: "#A8722F", light: "#FFF3D6" },
  J: { name: "pickle", base: "#6F8F2F", dark: "#46601A", light: "#C9DD7A" },
  S: { name: "lettuce", base: "#58A33A", dark: "#2F6E1E", light: "#B8EB8C" },
  Z: { name: "tomato", base: "#D2412C", dark: "#8E2214", light: "#FFB09C" },
};

function px(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

// Draw one ingredient tile at size s (a whole number of CSS pixels).
function drawTile(ctx, t, s) {
  const k = TILE[t];
  const u = Math.max(1, Math.floor(s / 8)); // one "pixel" of the pixel art
  px(ctx, 0, 0, s, s, "#1A0F0B"); // seam
  const i = Math.max(1, Math.round(s / 16));
  px(ctx, i, i, s - 2 * i, s - 2 * i, k.base);
  // bevel
  px(ctx, i, i, s - 2 * i, u, k.light);
  px(ctx, i, i, u, s - 2 * i, k.light);
  px(ctx, i, s - i - u, s - 2 * i, u, k.dark);
  px(ctx, s - i - u, i, u, s - 2 * i, k.dark);
  const g = (gx, gy, gw, gh, c) => px(ctx, i + gx * u, i + gy * u, gw * u, gh * u, c);
  switch (t) {
    case "I": // bacon: wavy fat stripes
      g(1, 2, 2, 1, k.light); g(3, 3, 2, 1, k.light); g(5, 2, 1, 1, k.light);
      g(1, 5, 1, 1, k.light); g(2, 4, 2, 1, k.light); g(4, 5, 2, 1, k.light);
      break;
    case "O": // cheddar: holes
      g(2, 2, 1, 1, k.dark); g(4, 3, 2, 2, k.dark); g(2, 5, 1, 1, k.dark);
      break;
    case "T": // patty: diagonal grill marks
      g(1, 2, 1, 1, k.dark); g(2, 3, 1, 1, k.dark); g(3, 4, 1, 1, k.dark);
      g(3, 1, 1, 1, k.dark); g(4, 2, 1, 1, k.dark); g(5, 3, 1, 1, k.dark);
      g(2, 5, 1, 1, k.light); g(4, 5, 1, 1, k.light);
      break;
    case "L": // sesame bun: seeds
      g(2, 2, 1, 1, k.light); g(4, 1, 1, 1, k.light); g(5, 4, 1, 1, k.light); g(2, 4, 1, 1, k.light);
      break;
    case "J": // pickle: a ring
      g(2, 2, 3, 1, k.light); g(2, 4, 3, 1, k.light); g(2, 3, 1, 1, k.light); g(4, 3, 1, 1, k.light); g(3, 3, 1, 1, k.dark);
      break;
    case "S": // lettuce: a wave
      g(1, 3, 1, 1, k.light); g(2, 2, 1, 1, k.light); g(3, 3, 1, 1, k.light); g(4, 2, 1, 1, k.light); g(5, 3, 1, 1, k.light);
      g(1, 5, 1, 1, k.dark); g(3, 5, 1, 1, k.dark); g(5, 5, 1, 1, k.dark);
      break;
    case "Z": // tomato: seed dots
      g(2, 2, 1, 1, k.light); g(4, 2, 1, 1, k.light); g(3, 4, 1, 1, k.light); g(1, 4, 1, 1, k.dark); g(5, 4, 1, 1, k.dark);
      break;
  }
}

// Tiles are cached per size and device-pixel ratio.
const cache = new Map();
function tileCanvas(t, s, dpr) {
  const key = t + s + "@" + dpr;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = Math.round(s * dpr);
  c.height = Math.round(s * dpr);
  const ctx = c.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = false;
  drawTile(ctx, t, s);
  cache.set(key, c);
  return c;
}

export function sizeCanvas(canvas, cssW, cssH) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return { ctx, dpr };
}

// flash: { rows: [visible row indexes], until: ms } or null
export function drawBoard(ctx, dpr, st, cell, { flash = null, now = 0 } = {}) {
  const w = cell * W, h = cell * VIS;
  px(ctx, 0, 0, w, h, "#1C110D");
  // faint grid, kept off the cell edges' seams
  ctx.fillStyle = "rgba(255,240,220,0.045)";
  for (let x = 1; x < W; x++) ctx.fillRect(x * cell, 0, 1, h);
  for (let y = 1; y < VIS; y++) ctx.fillRect(0, y * cell, w, 1);
  for (let y = HID; y < HID + VIS; y++) {
    for (let x = 0; x < W; x++) {
      const t = st.board[y * W + x];
      if (t) ctx.drawImage(tileCanvas(t, cell, dpr), x * cell, (y - HID) * cell, cell, cell);
    }
  }
  if (st.piece) {
    // Ghost: a quieter outline only.
    const gy = ghostY(st);
    if (gy != null && gy !== st.piece.y) {
      ctx.strokeStyle = "rgba(255,240,220,0.42)";
      ctx.lineWidth = Math.max(1, Math.round(cell / 14));
      for (const [x, y] of pieceCells({ ...st.piece, y: gy })) {
        if (y < HID) continue;
        const o = ctx.lineWidth / 2 + 1;
        ctx.strokeRect(x * cell + o, (y - HID) * cell + o, cell - 2 * o, cell - 2 * o);
      }
    }
    for (const [x, y] of pieceCells(st.piece)) {
      if (y < HID) continue;
      ctx.drawImage(tileCanvas(st.piece.t, cell, dpr), x * cell, (y - HID) * cell, cell, cell);
    }
  }
  if (flash && now < flash.until) {
    const a = Math.max(0, (flash.until - now) / flash.dur);
    ctx.fillStyle = `rgba(255,236,190,${0.75 * a})`;
    for (const r of flash.rows) ctx.fillRect(0, r * cell, w, cell);
  }
}

// A piece shape centred in a small box (next / hold previews).
export function drawPreview(canvas, t, cssSize, { dim = false } = {}) {
  const { ctx, dpr } = sizeCanvas(canvas, cssSize * 1.6, cssSize);
  ctx.clearRect(0, 0, cssSize * 1.6, cssSize);
  if (!t) return;
  const cells = SHAPES[t][0];
  const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const s = Math.floor(Math.min((cssSize * 1.6) / (cw + 0.6), cssSize / (ch + 0.6)));
  const ox = Math.floor((cssSize * 1.6 - cw * s) / 2), oy = Math.floor((cssSize - ch * s) / 2);
  ctx.globalAlpha = dim ? 0.4 : 1;
  for (const [x, y] of cells) ctx.drawImage(tileCanvas(t, s, dpr), ox + (x - minX) * s, oy + (y - minY) * s, s, s);
  ctx.globalAlpha = 1;
}

export const TILE_NAMES = Object.fromEntries(Object.entries(TILE).map(([k, v]) => [k, v.name]));
