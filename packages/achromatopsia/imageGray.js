// imageGray.js — render an image as achromatopsia (total color blindness) sees it: pure luminance.
// Each pixel is replaced by the gray whose WCAG relative luminance matches the pixel's, via
// opticquiz-cvd's relLuminance. Pure-JS pngjs/jpeg-js; PNG/JPEG in, PNG out.

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
function hx(v) { return ("0" + Math.max(0, Math.min(255, v | 0)).toString(16)).slice(-2); }
function linToSrgb(y) { return y <= 0.0031308 ? 12.92 * y : 1.055 * Math.pow(y, 1 / 2.4) - 0.055; }
function grayValue(r, g, b) {
  const y = cvd.relLuminance("#" + hx(r) + hx(g) + hx(b));
  return Math.round(Math.max(0, Math.min(1, linToSrgb(y))) * 255);
}

function loadRgba(input) {
  let buf;
  if (Buffer.isBuffer(input)) buf = input;
  else if (typeof input === "string" && /^data:[^;]*;base64,/.test(input.trim()))
    buf = Buffer.from(input.trim().replace(/^data:[^;]*;base64,/, ""), "base64");
  else if (typeof input === "string") buf = readFileSync(input);
  else throw new Error("grayImage needs a file path, a Buffer, or a base64 data URI.");
  const kind = sniff(buf);
  if (kind === "png") { const p = PNG.sync.read(buf); return { width: p.width, height: p.height, data: p.data }; }
  if (kind === "jpeg") { const j = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 512 }); return { width: j.width, height: j.height, data: j.data }; }
  throw new Error("Unsupported image format — reads PNG and JPEG.");
}

function grayImage(input, opts) {
  opts = opts || {};
  const img = loadRgba(input);
  const cap = opts.maxSide == null ? 2000 : opts.maxSide;
  const scale = cap > 0 ? Math.min(1, cap / Math.max(img.width, img.height)) : 1;
  const ow = Math.max(1, Math.round(img.width * scale));
  const oh = Math.max(1, Math.round(img.height * scale));
  const out = new PNG({ width: ow, height: oh });
  const lut = new Map();
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const sx = Math.min(img.width - 1, Math.floor(x / scale));
      const sy = Math.min(img.height - 1, Math.floor(y / scale));
      const si = (sy * img.width + sx) * 4, oi = (y * ow + x) * 4;
      const r = img.data[si], g = img.data[si + 1], b = img.data[si + 2], a = img.data[si + 3];
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let v = lut.get(key);
      if (v === undefined) { v = grayValue(r, g, b); lut.set(key, v); }
      out.data[oi] = v; out.data[oi + 1] = v; out.data[oi + 2] = v; out.data[oi + 3] = a;
    }
  }
  return PNG.sync.write(out);
}

module.exports = { grayImage, grayValue };
