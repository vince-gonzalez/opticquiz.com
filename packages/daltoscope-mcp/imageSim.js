// imageSim.js (ESM) — recolor an image as a color-vision deficiency sees it, for the MCP server.
// The per-pixel transform is opticquiz-cvd's simulate(), applied once per distinct color via a LUT.
// PNG and JPEG in; returns a base64 PNG plus dimensions for an MCP image content block.

import { readFileSync } from "node:fs";
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

function loadRgba({ path, dataUri }) {
  let buf;
  if (dataUri) buf = Buffer.from(String(dataUri).replace(/^data:[^;]*;base64,/, ""), "base64");
  else if (path) buf = readFileSync(path);
  else throw new Error("Provide a file `path` or a base64 `dataUri`.");
  const kind = sniff(buf);
  if (kind === "png") {
    const p = PNG.sync.read(buf);
    return { width: p.width, height: p.height, data: p.data };
  }
  if (kind === "jpeg") {
    const j = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 512 });
    return { width: j.width, height: j.height, data: j.data };
  }
  throw new Error("Unsupported image format — reads PNG and JPEG.");
}

export function simulateImage({ path, dataUri, type = "deutan", severity = 1, maxSide = 1400 }) {
  if (!cvd.TYPES.includes(type)) throw new Error('type must be "protan", "deutan", or "tritan".');
  const img = loadRgba({ path, dataUri });
  const scale = maxSide > 0 ? Math.min(1, maxSide / Math.max(img.width, img.height)) : 1;
  const ow = Math.max(1, Math.round(img.width * scale));
  const oh = Math.max(1, Math.round(img.height * scale));
  const out = new PNG({ width: ow, height: oh });
  const lut = new Map();
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
  return { base64: PNG.sync.write(out).toString("base64"), width: ow, height: oh, type };
}
