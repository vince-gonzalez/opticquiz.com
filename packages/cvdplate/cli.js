#!/usr/bin/env node
// cvdplate CLI — generate an Ishihara-style pseudoisochromatic plate.
const fs = require("fs");
const { plate } = require("./index.js");

const args = process.argv.slice(2);
function usage() {
  console.error(`cvdplate — generate an Ishihara-style color-vision test plate

  cvdplate <number> [type] [out.png] [--seed N] [--size PX]

  type: protan | deutan | tritan (default deutan) — the deficiency the digit collapses under
  out:  default plate-<number>-<type>.png
  seed: same seed -> identical plate (default 1)

Examples:
  cvdplate 7
  cvdplate 29 protan plate.png --seed 3`);
  process.exit(1);
}
if (!args.length || args[0] === "-h" || args[0] === "--help") usage();

const number = args[0];
let type = "deutan", out = null, seed = 1, size = 480;
for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if (a === "--seed") seed = parseInt(args[++i], 10) || 1;
  else if (a === "--size") size = parseInt(args[++i], 10) || 480;
  else if (["protan", "deutan", "tritan"].includes(a)) type = a;
  else if (/\.png$/i.test(a)) out = a;
}
out = out || `plate-${number}-${type}.png`;
fs.writeFileSync(out, plate(String(number), { type, seed, size }));
console.log(`wrote ${out} (hiding "${number}", collapses under ${type})`);
