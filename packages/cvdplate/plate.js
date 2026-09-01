// plate.js — generate an Ishihara-style pseudoisochromatic plate.
//
// A digit is drawn in a field of dots whose colors are chosen so the figure stands out to normal
// vision but collapses into the background for a chosen deficiency (protan/deutan/tritan). The
// color pair is selected with opticquiz-cvd's own deltaE + simulate — a pair with a large normal
// CIEDE2000 difference and a small difference after simulation — so the "hiding" is measured, not
// eyeballed. Reproducible from a seed. Pure-JS pngjs; no native build. PNG out.

const { PNG } = require("pngjs");
const cvd = require("opticquiz-cvd");

// 5x7 bitmap font, digits only.
const FONT = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"]
};

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function hexToRgb(hex) {
  const n = parseInt(String(hex).replace(/^#/, ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v) => ("0" + Math.round((v + m) * 255).toString(16)).slice(-2);
  return "#" + to(r) + to(g) + to(b);
}

// A pair distinct to normal vision but collapsing under `type`.
function pickPair(type) {
  const pool = [];
  for (let h = 0; h < 360; h += 8) for (const l of [0.45, 0.55]) pool.push(hslToHex(h, 0.5, l));
  let best = null, bestScore = -Infinity;
  for (let i = 0; i < pool.length; i++) {
    const ai = pool[i], asim = cvd.simulate(ai, type);
    for (let j = i + 1; j < pool.length; j++) {
      const bj = pool[j];
      const normal = cvd.deltaE(ai, bj);
      if (normal < 30) continue; // clearly different to normal vision
      const sim = cvd.deltaE(asim, cvd.simulate(bj, type));
      if (sim >= 9) continue; // must collapse under the deficiency
      const score = normal - sim * 4;
      if (score > bestScore) { bestScore = score; best = { figure: ai, background: bj, normal, sim }; }
    }
  }
  return best;
}

// A few lightness-jittered shades of a base color, for Ishihara-like texture.
function shades(hex, rgen, n) {
  const lab = cvd.hexToLab(hex);
  const out = [];
  for (let i = 0; i < n; i++) {
    const dl = (rgen() * 2 - 1) * 16;
    out.push(cvd.labToHex(clamp(lab[0] + dl, 8, 96), lab[1], lab[2]));
  }
  return out;
}

// Boolean figure mask for the number, centered in the disk.
function buildMask(number, size) {
  const mask = new Uint8Array(size * size);
  const glyphs = String(number).split("").filter((c) => FONT[c]);
  if (!glyphs.length) return mask;
  const cols = glyphs.length * 5 + (glyphs.length - 1); // 1-col gap between digits
  const rows = 7;
  const span = size * 0.5; // number spans ~half the plate
  const cell = Math.floor(Math.min(span / cols, (size * 0.62) / rows));
  const w = cols * cell, h = rows * cell;
  const x0 = Math.floor((size - w) / 2), y0 = Math.floor((size - h) / 2);
  glyphs.forEach((g, gi) => {
    const bmp = FONT[g];
    const gx = x0 + gi * 6 * cell;
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
      if (bmp[r][c] !== "1") continue;
      for (let dy = 0; dy < cell; dy++) for (let dx = 0; dx < cell; dx++) {
        const px = gx + c * cell + dx, py = y0 + r * cell + dy;
        if (px >= 0 && px < size && py >= 0 && py < size) mask[py * size + px] = 1;
      }
    }
  });
  return mask;
}

function drawDot(data, size, cx, cy, r, rgb) {
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(size - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(size - 1, Math.ceil(cy + r));
  const r2 = r * r;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy <= r2) {
      const i = (y * size + x) * 4;
      data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; data[i + 3] = 255;
    }
  }
}

/**
 * Generate a plate. Returns a PNG Buffer.
 * @param {string|number} number  the digit(s) to hide (0-9)
 * @param {object} [opts] type ("protan"|"deutan"|"tritan", default "deutan"), size (px, default 480), seed (default 1)
 */
function plate(number, opts) {
  opts = opts || {};
  const type = opts.type || "deutan";
  if (!cvd.TYPES.includes(type)) throw new Error('type must be "protan", "deutan", or "tritan".');
  const size = opts.size || 480;
  const seed = opts.seed == null ? 1 : opts.seed;
  const rgen = rng(seed);
  const pair = pickPair(type);
  if (!pair) throw new Error("could not find a confusable color pair for " + type);
  const figPool = shades(pair.figure, rgen, 6).map(hexToRgb);
  const bgPool = shades(pair.background, rgen, 6).map(hexToRgb);
  const mask = buildMask(number, size);

  const png = new PNG({ width: size, height: size });
  const data = png.data;
  for (let i = 0; i < data.length; i += 4) { data[i] = 246; data[i + 1] = 242; data[i + 2] = 234; data[i + 3] = 255; }

  const R = size / 2 - 2, cx0 = size / 2, cy0 = size / 2;
  const rMin = Math.max(2.5, size / 130), rMax = Math.max(rMin + 2, size / 62);
  const target = Math.floor((Math.PI * R * R) / (Math.PI * Math.pow((rMin + rMax) / 2, 2)) * 0.85);
  // spatial grid for fast overlap rejection
  const gcell = rMax * 2, gcols = Math.ceil(size / gcell);
  const grid = new Map();
  const key = (gx, gy) => gx * 100000 + gy;
  let placed = 0, attempts = 0, figCount = 0, maxAttempts = target * 40;
  while (placed < target && attempts++ < maxAttempts) {
    const ang = rgen() * 2 * Math.PI, rad = Math.sqrt(rgen()) * (R - rMax);
    const x = cx0 + Math.cos(ang) * rad, y = cy0 + Math.sin(ang) * rad;
    const r = rMin + rgen() * (rMax - rMin);
    const gx = Math.floor(x / gcell), gy = Math.floor(y / gcell);
    let ok = true;
    for (let a = -1; a <= 1 && ok; a++) for (let b = -1; b <= 1 && ok; b++) {
      const cellArr = grid.get(key(gx + a, gy + b));
      if (!cellArr) continue;
      for (const p of cellArr) { const dx = p.x - x, dy = p.y - y; if (dx * dx + dy * dy < (p.r + r + 1) * (p.r + r + 1)) { ok = false; break; } }
    }
    if (!ok) continue;
    const fig = mask[Math.floor(y) * size + Math.floor(x)] === 1;
    if (fig) figCount++;
    const pool = fig ? figPool : bgPool;
    drawDot(data, size, x, y, r, pool[Math.floor(rgen() * pool.length)]);
    const k = key(gx, gy);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push({ x, y, r });
    placed++;
  }

  const buf = PNG.sync.write(png);
  buf._meta = { type, pair, placed, figCount, size };
  return buf;
}

module.exports = { plate, pickPair };
