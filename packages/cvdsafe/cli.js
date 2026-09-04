#!/usr/bin/env node
// cvdsafe CLI — check whether a set of colors stays distinct for colorblind viewers.
const cvd = require("./index.js");

const args = process.argv.slice(2).filter((a) => a !== "--json");
const asJson = process.argv.includes("--json");
if (!args.length || args[0] === "-h" || args[0] === "--help") {
  console.error(`cvdsafe — is this palette colorblind-safe?

  cvdsafe <hex> <hex> [...]    check a palette; exit 0 if safe, 2 if not
  cvdsafe ... --json           print the full report as JSON

Example:
  cvdsafe "#d7191c" "#1a9641" "#2166ac"`);
  process.exit(1);
}
const r = cvd.checkPalette(args);
if (asJson) { console.log(JSON.stringify(r)); process.exit(r.pass ? 0 : 2); }
if (r.pass) { console.log("PASS — colorblind-safe"); process.exit(0); }
console.log("FAIL — colors that collapse under colorblindness:");
for (const t of ["protan", "deutan", "tritan"]) {
  const c = r.types[t].conflicts;
  if (c.length) console.log(`  ${t}: ` + c.map((x) => `${x.a} / ${x.b}`).join(", "));
}
process.exit(2);
