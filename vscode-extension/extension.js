// OpticQuiz — Colorblind-Safe Colors (VS Code extension)
// Underlines color pairs that collapse under color-vision-deficiency simulation,
// and fixes them. Runs the published opticquiz-cvd engine (Machado 2009 + CIEDE2000)
// locally — nothing leaves the machine.
const vscode = require("vscode");
const cvd = require("opticquiz-cvd");

const HEX_RE = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const LANGS = ["css", "scss", "less", "javascript", "javascriptreact", "typescript",
  "typescriptreact", "json", "jsonc", "html", "vue", "svelte", "astro"];
const TYPE_NAMES = { protan: "protanopia", deutan: "deuteranopia", tritan: "tritanopia" };

let diag;
const timers = new Map();

function norm(h) {
  h = h.toLowerCase();
  if (h.length === 4) h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  return h;
}
function cfg() {
  const c = vscode.workspace.getConfiguration("opticquiz");
  return { enable: c.get("enable", true), severity: c.get("severity", 1), model: c.get("model", "machado"), collapse: c.get("collapse", 10) };
}

// Every hex occurrence in the doc, with its exact range and normalized value.
function findHexes(doc) {
  const text = doc.getText(), out = [];
  let m;
  HEX_RE.lastIndex = 0;
  while ((m = HEX_RE.exec(text)) !== null) {
    out.push({ raw: m[0], hex: norm(m[0]), range: new vscode.Range(doc.positionAt(m.index), doc.positionAt(m.index + m[0].length)) });
    if (out.length > 2000) break; // sanity cap
  }
  return out;
}

// Map each conflicting color -> the colors it collapses with, per CVD type.
function conflictMap(palette, o) {
  const rep = cvd.checkPalette(palette, { severity: o.severity, model: o.model, collapse: o.collapse });
  const map = new Map(); // hex -> [ "collapses with #x for deuteranopia (70.6 -> 8.1)" ]
  for (const t of cvd.TYPES) {
    for (const cf of rep.types[t].conflicts) {
      const msg = (other) => `collapses with ${other} for ${TYPE_NAMES[t]} (ΔE ${cf.normal} → ${cf.sim})`;
      if (!map.has(cf.a)) map.set(cf.a, []);
      if (!map.has(cf.b)) map.set(cf.b, []);
      map.get(cf.a).push(msg(cf.b));
      map.get(cf.b).push(msg(cf.a));
    }
  }
  return map;
}

function updateDiagnostics(doc) {
  if (!doc || !LANGS.includes(doc.languageId)) return;
  const o = cfg();
  if (!o.enable) { diag.set(doc.uri, []); return; }
  const hexes = findHexes(doc);
  if (hexes.length < 2) { diag.set(doc.uri, []); return; }
  const palette = Array.from(new Set(hexes.map((h) => h.hex)));
  let map;
  try { map = conflictMap(palette, o); } catch (e) { diag.set(doc.uri, []); return; }
  const items = [];
  for (const h of hexes) {
    const reasons = map.get(h.hex);
    if (!reasons) continue;
    const d = new vscode.Diagnostic(h.range,
      `${h.hex} ${reasons[0]}${reasons.length > 1 ? ` (+${reasons.length - 1} more)` : ""}. This pair is hard to tell apart for colorblind viewers.`,
      vscode.DiagnosticSeverity.Warning);
    d.source = "OpticQuiz";
    d.code = "colorblind-conflict";
    items.push(d);
  }
  diag.set(doc.uri, items);
}

function scheduleScan(doc) {
  const key = doc.uri.toString();
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => updateDiagnostics(doc), 250));
}

// Replace every hex in the doc with its colorblind-safe counterpart.
async function fixFile() {
  const ed = vscode.window.activeTextEditor;
  if (!ed) return;
  const doc = ed.document, o = cfg();
  const hexes = findHexes(doc);
  const palette = Array.from(new Set(hexes.map((h) => h.hex)));
  if (palette.length < 2) { vscode.window.showInformationMessage("OpticQuiz: need at least two colors to check."); return; }
  let fixed;
  try { fixed = cvd.fixPalette(palette, { severity: o.severity, model: o.model, collapse: o.collapse }); }
  catch (e) { vscode.window.showErrorMessage("OpticQuiz: " + e.message); return; }
  if (fixed.pass && palette.every((p, i) => p === fixed.colors[i])) {
    vscode.window.showInformationMessage("OpticQuiz: already colorblind-safe — nothing to change.");
    return;
  }
  const remap = new Map();
  palette.forEach((p, i) => { if (p !== fixed.colors[i]) remap.set(p, fixed.colors[i]); });
  const edit = new vscode.WorkspaceEdit();
  let n = 0;
  for (const h of hexes) {
    const to = remap.get(h.hex);
    if (to) { edit.replace(doc.uri, h.range, to); n++; }
  }
  await vscode.workspace.applyEdit(edit);
  const maxD = fixed.drift.reduce((a, b) => (b > a ? b : a), 0);
  vscode.window.showInformationMessage(
    `OpticQuiz: fixed ${remap.size} color${remap.size === 1 ? "" : "s"} (${n} occurrence${n === 1 ? "" : "s"}), largest shift ${maxD.toFixed(1)} ΔE. Now colorblind-safe.`);
}

// Quick-fix bulb on a flagged color.
class FixProvider {
  provideCodeActions(doc, range, ctx) {
    const mine = ctx.diagnostics.filter((d) => d.source === "OpticQuiz");
    if (!mine.length) return;
    const a = new vscode.CodeAction("Fix colors to be colorblind-safe (OpticQuiz)", vscode.CodeActionKind.QuickFix);
    a.command = { command: "opticquiz.fixFile", title: "Fix colors to be colorblind-safe" };
    a.diagnostics = mine;
    a.isPreferred = true;
    return [a];
  }
}

function activate(context) {
  diag = vscode.languages.createDiagnosticCollection("opticquiz");
  context.subscriptions.push(diag);

  if (vscode.window.activeTextEditor) updateDiagnostics(vscode.window.activeTextEditor.document);

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((d) => updateDiagnostics(d)),
    vscode.workspace.onDidChangeTextDocument((e) => scheduleScan(e.document)),
    vscode.window.onDidChangeActiveTextEditor((ed) => { if (ed) updateDiagnostics(ed.document); }),
    vscode.workspace.onDidCloseTextDocument((d) => diag.delete(d.uri)),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("opticquiz") && vscode.window.activeTextEditor) updateDiagnostics(vscode.window.activeTextEditor.document);
    }),
    vscode.languages.registerCodeActionsProvider(LANGS.map((l) => ({ language: l })), new FixProvider(), { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }),
    vscode.commands.registerCommand("opticquiz.checkFile", () => {
      const ed = vscode.window.activeTextEditor;
      if (!ed) return;
      updateDiagnostics(ed.document);
      const n = (diag.get(ed.document.uri) || []).length;
      vscode.window.showInformationMessage(n ? `OpticQuiz: ${n} colorblind conflict${n === 1 ? "" : "s"} found. Run "OpticQuiz: Fix colors" to resolve.` : "OpticQuiz: colors look colorblind-safe.");
    }),
    vscode.commands.registerCommand("opticquiz.fixFile", fixFile)
  );
}

function deactivate() { if (diag) diag.dispose(); }

module.exports = { activate, deactivate };
