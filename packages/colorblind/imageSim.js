// imageSim.js — recolor an image as a given color-vision deficiency sees it.
//
// The per-color transform is opticquiz-cvd's simulate(); this file only decodes the image, runs
// each distinct color through simulate once via a lookup table, and re-encodes. There is no
// second copy of the simulation math here. Pure-JS pngjs and jpeg-js decode, so the install has
// no native build to fail. PNG and JPEG in; PNG out.

const { readFileSync } = require("node:fs");
const { PNG } = require("pngjs");
const jpeg = require("jpeg-js");
const cvd = require("opticquiz-cvd");

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

// input: a file path (string), a Buffer, or a base64 data URI string.
function loadRgba(input) {
  let buf;
  if (Buffer.isBuffer(input)) buf = input;
  else if (typeof input === "string" && /^data:[^;]*;base64,/.test(input.trim())) {
    buf = Buffer.from(input.trim().replace(/^data:[^;]*;base64,/, ""), "base64");
  } else if (typeof input === "string") {
    buf = readFileSync(input);
  } else {
    throw new Error("simulateImage needs a file path, a Buffer, or a base64 data URI.");
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
  throw new Error("Unsupported image format — simulateImage reads PNG and JPEG.");
}

/**
 * Recolor an image as `type` (protan | deutan | tritan) sees it.
 * @returns {Buffer} a PNG buffer.
 * opts.maxSide caps the longest side (default 2000; 0 keeps the original size).
 * opts.severity 0..1 passes through to the model (1 = full dichromacy).
 */
function simulateImage(input, type, opts) {
  opts = opts || {};
  if (!cvd.TYPES.includes(type)) {
    throw new Error('type must be one of "protan", "deutan", "tritan".');
  }
  const severity = opts.severity == null ? 1 : opts.severity;
  const img = loadRgba(input);
  const cap = opts.maxSide == null ? 2000 : opts.maxSide;
  const scale = cap > 0 ? Math.min(1, cap / Math.max(img.width, img.height)) : 1;
  const ow = Math.max(1, Math.round(img.width * scale));
  const oh = Math.max(1, Math.round(img.height * scale));
  const out = new PNG({ width: ow, height: oh });
  const lut = new Map(); // 5-bit-per-channel key -> simulated [r,g,b]

  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const sx = Math.min(img.width - 1, Math.floor(x / scale));
      const sy = Math.min(img.height - 1, Math.floor(y / scale));
      const si = (sy * img.width + sx) * 4;
      const oi = (y * ow + x) * 4;
      const r = img.data[si], g = img.data[si + 1], b = img.data[si + 2], a = img.data[si + 3];
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let s = lut.get(key);
      if (!s) { s = hexToRgb(cvd.simulate(rgbToHex(r, g, b), type, severity)); lut.set(key, s); }
      out.data[oi] = s[0]; out.data[oi + 1] = s[1]; out.data[oi + 2] = s[2]; out.data[oi + 3] = a;
    }
  }
  return PNG.sync.write(out);
}

module.exports = { simulateImage };
