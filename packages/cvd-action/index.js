// OpticQuiz Colorblind Check — GitHub Action.
// Scans stylesheet colors and fails the build when a pair collapses under simulated
// color-vision deficiency (Machado 2009 + CIEDE2000). Zero runtime deps (engine vendored).
const fs = require("fs");
const path = require("path");
const cvd = require("./cvd");

function inp(name, def) {
  return process.env["INPUT_" + name.toUpperCase().replace(/-/g, "_")] || def;
}
const root = inp("path", ".");
const filesInput = inp("files", "");
const failOn = inp("fail-on", "conflict");
const severity = parseFloat(inp("severity", "1")) || 1;
const model = inp("model", "machado");

const EXT = [".css", ".scss", ".less"];
const HEX = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

function walk(dir, out) {
  var entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".git" || e.name === "dist") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.indexOf(path.extname(e.name).toLowerCase()) >= 0) out.push(p);
  }
  return out;
}
function norm(h) { h = h.toLowerCase(); if (h.length === 4) h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return h; }

const files = filesInput
  ? filesInput.split(",").map((s) => s.trim()).filter(Boolean)
  : walk(root, []);

let totalConflicts = 0, totalBorderline = 0, checked = 0;

for (const f of files) {
  var text;
  try { text = fs.readFileSync(f, "utf8"); } catch (e) { continue; }
  const hexes = Array.from(new Set((text.match(HEX) || []).map(norm)));
  if (hexes.length < 2) continue;
  checked++;
  const r = cvd.checkPalette(hexes, { severity: severity, model: model });
  const conflicts = [];
  for (const t of cvd.TYPES) for (const c of r.types[t].conflicts) conflicts.push({ t: t, c: c });

  let bl = 0;
  for (let i = 0; i < hexes.length; i++) for (let j = i + 1; j < hexes.length; j++) {
    if (cvd.deltaE(hexes[i], hexes[j]) < 13) continue;
    for (const t of cvd.TYPES) {
      const d = cvd.deltaE(cvd.simulate(hexes[i], t, severity, model), cvd.simulate(hexes[j], t, severity, model));
      if (d >= 10 && d < 15) bl++;
    }
  }
  totalBorderline += bl;

  if (conflicts.length) {
    totalConflicts += conflicts.length;
    for (const { t, c } of conflicts) {
      console.log(`::error file=${f}::Colorblind conflict — ${c.a} / ${c.b} collapse for ${t} (ΔE ${c.normal} → ${c.sim})`);
    }
  } else if (bl && failOn === "borderline") {
    console.log(`::warning file=${f}::${bl} borderline color pair(s) (ΔE 10–15) — distinct, but tight.`);
  }
}

const outFile = process.env.GITHUB_OUTPUT;
if (outFile) {
  try { fs.appendFileSync(outFile, `conflicts=${totalConflicts}\nborderline=${totalBorderline}\nfiles_checked=${checked}\n`); } catch (e) {}
}

console.log(`OpticQuiz: checked ${checked} file(s) — ${totalConflicts} conflict(s), ${totalBorderline} borderline pair(s).`);

const fail = failOn === "borderline" ? (totalConflicts > 0 || totalBorderline > 0) : totalConflicts > 0;
if (fail) {
  console.log("::error::OpticQuiz colorblind check failed. See annotations above.");
  process.exit(1);
}
