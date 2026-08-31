// imageCheck.js — extract the salient palette from an image and run it through the
// colorblind-safety check.
//
// This file does pixel decoding, palette extraction and area weighting ONLY. Every bit of
// colorimetry — the confusion simulation and the CIEDE2000 difference — comes from
// opticquiz-cvd. There is deliberately no second copy of the confusion math here to drift out
// of sync with the palette checker; extracting a palette from an image and then calling
// checkPalette on it is exactly what a person does by hand, made automatic.
//
// PNG and JPEG only. Screenshots and charts are almost always one of those; webp/gif are not
// decoded, and the tool says so rather than guessing.

import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";
import cvd from "opticquiz-cvd";

const pngSig = [0x89, 0x50, 0x4e, 0x47];
const jpgSig = [0xff, 0xd8, 0xff];

function sniff(buf) {
  if (pngSig.every((b, i) => buf[i] === b)) return "png";
  if (jpgSig.every((b, i) => buf[i] === b)) return "jpeg";
  return null;
}

function rgbToHex(r, g, b) {
  const h = (v) => ("0" + Math.max(0, Math.min(255, v | 0)).toString(16)).slice(-2);
  return "#" + h(r) + h(g) + h(b);
}

function hexToRgb(hex) {
  const n = parseInt(String(hex).replace(/^#/, ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

async function loadRgba(opts) {
  let buf;
  if (Buffer.isBuffer(opts)) buf = opts;
  else if (opts.path) buf = await readFile(opts.path);
  else if (opts.dataUri) {
    const m = /^data:[^;]*;base64,([\s\S]+)$/.exec(String(opts.dataUri).trim());
    buf = Buffer.from(m ? m[1] : opts.dataUri, "base64");
  } else {
    throw new Error("checkImage needs a `path` to a local image or a base64 `dataUri`.");
  }
  const kind = sniff(buf);
  if (kind === "png") {
    const p = PNG.sync.read(buf);
    return { width: p.width, height: p.height, data: p.data };
  }
  if (kind === "jpeg") {
    const j = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 512 });
    return { width: j.width, height: j.height, data: j.data };
  }
  throw new Error("Unsupported image format — checkImage reads PNG and JPEG only.");
}

// Quantise to 4 bits per channel, histogram, and return the most common colours as
// [{ hex, share }], where share is the fraction of sampled opaque pixels that colour covers.
// Area share is what separates "these two collapse but they are 0.2% of the image" from
// "these two collapse and they are 40% of it" — the same conflict, very different severity.
function extractPalette(img, maxColors) {
  const { width, height, data } = img;
  const total = width * height;
  const stride = Math.max(1, Math.floor(Math.sqrt(total / 40000))); // cap ~40k samples
  const bins = new Map();
  let sampled = 0;
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) continue; // skip transparent
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      let e = bins.get(key);
      if (!e) { e = { n: 0, r: 0, g: 0, b: 0 }; bins.set(key, e); }
      e.n++; e.r += r; e.g += g; e.b += b; sampled++;
    }
  }
  if (!sampled) throw new Error("Image has no opaque pixels to analyse.");
  const top = [...bins.values()].sort((a, b) => b.n - a.n).slice(0, maxColors);
  return top.map((e) => ({
    hex: rgbToHex(Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)),
    share: +(e.n / sampled).toFixed(4)
  }));
}

// Recolour the image as a given deficiency sees it, reusing cvd.simulate. Every distinct
// 5-bit-binned colour is simulated once and cached in a lookup table, so the engine's
// simulation runs a few hundred times rather than once per pixel, and the matrix still lives
// only in opticquiz-cvd. Output is downscaled so the returned PNG stays a reasonable size.
function simulateImagePng(img, type) {
  const { width, height, data } = img;
  const scale = Math.min(1, 480 / Math.max(width, height));
  const ow = Math.max(1, Math.round(width * scale));
  const oh = Math.max(1, Math.round(height * scale));
  const out = new PNG({ width: ow, height: oh });
  const lut = new Map();
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const sx = Math.min(width - 1, Math.floor(x / scale));
      const sy = Math.min(height - 1, Math.floor(y / scale));
      const si = (sy * width + sx) * 4, oi = (y * ow + x) * 4;
      const r = data[si], g = data[si + 1], b = data[si + 2], a = data[si + 3];
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let s = lut.get(key);
      if (!s) { s = hexToRgb(cvd.simulate(rgbToHex(r, g, b), type)); lut.set(key, s); }
      out.data[oi] = s[0]; out.data[oi + 1] = s[1]; out.data[oi + 2] = s[2]; out.data[oi + 3] = a;
    }
  }
  return PNG.sync.write(out).toString("base64");
}

export async function analyzeImage(opts) {
  opts = opts || {};
  const maxColors = Math.max(2, Math.min(32, opts.maxColors || 12));
  const img = await loadRgba(opts);
  const palette = extractPalette(img, maxColors);
  const report = cvd.checkPalette(palette.map((p) => p.hex));

  // Attach the combined area share to each conflict and put the worst-area conflicts first.
  const shareOf = (hex) => (palette.find((p) => p.hex === hex) || {}).share || 0;
  for (const t of cvd.TYPES) {
    const cs = report.types[t].conflicts;
    for (const c of cs) c.areaShare = +(shareOf(c.a) + shareOf(c.b)).toFixed(4);
    cs.sort((a, b) => b.areaShare - a.areaShare);
  }

  const simulated = opts.returnSimulated
    ? simulateImagePng(img, opts.simulateType || "deutan")
    : null;

  return { width: img.width, height: img.height, palette, report, simulated };
}
