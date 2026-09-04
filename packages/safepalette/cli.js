#!/usr/bin/env node
// safepalette CLI — print N colorblind-safe hex colors.
const sp = require("./index.js");

const args = process.argv.slice(2);
if (!args.length || args[0] === "-h" || args[0] === "--help") {
  console.error(`safepalette — colorblind-safe colors

  safepalette <count>          print <count> colorblind-safe hex colors
  safepalette <count> --json   print them as a JSON array

Example:
  safepalette 6`);
  process.exit(1);
}
const n = parseInt(args[0], 10);
if (!(n >= 1)) { console.error("count must be a positive integer"); process.exit(1); }
const colors = sp.generate(n);
if (args.includes("--json")) console.log(JSON.stringify(colors));
else console.log(colors.join("\n"));
