#!/usr/bin/env node
// cvdsim CLI — simulate color-vision deficiency for a color or an image.
const fs = require("fs");
const cvd = require("./index.js");

const args = process.argv.slice(2);
function usage() {
  console.error(`cvdsim — simulate color-vision deficiency

  cvdsim <hexcolor> [type]               how a color looks to a deficiency
                                         (type: protan | deutan | tritan; omit for all three)
  cvdsim <image.png|jpg> <type> [out]    recolor an image (default out: <name>-<type>.png)

Examples:
  cvdsim "#d7191c" deutan
  cvdsim "#d7191c"
  cvdsim chart.png deutan chart-deutan.png`);
  process.exit(1);
}
if (!args.length || args[0] === "-h" || args[0] === "--help") usage();

const first = args[0];
if (/\.(png|jpe?g)$/i.test(first)) {
  const type = args[1];
  if (!cvd.TYPES.includes(type)) { console.error('image mode needs a type: protan | deutan | tritan'); process.exit(1); }
  const out = args[2] || first.replace(/\.(png|jpe?g)$/i, `-${type}.png`);
  fs.writeFileSync(out, cvd.simulateImage(first, type));
  console.log(`wrote ${out}`);
} else {
  const type = args[1];
  if (type) {
    if (!cvd.TYPES.includes(type)) { console.error('type must be protan | deutan | tritan'); process.exit(1); }
    console.log(cvd.simulate(first, type));
  } else {
    const all = cvd.simulateAll(first);
    for (const t of cvd.TYPES) console.log(`${t}: ${all[t]}`);
  }
}
