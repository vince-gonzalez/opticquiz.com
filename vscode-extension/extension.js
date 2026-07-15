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
  timers.set(key, setTimeout(() => {
    updateDiagnostics(doc);
    if (panel && previewDoc && doc === previewDoc) renderPreview();
  }, 250));
}

// ---- shared fix core (used by the command, the quick-fix, and the panel) ----
let panel;      // singleton preview webview
let previewDoc; // document currently shown in the panel

async function fixDocument(doc) {
  const o = cfg();
  const hexes = findHexes(doc);
  const palette = Array.from(new Set(hexes.map((h) => h.hex)));
  if (palette.length < 2) { vscode.window.showInformationMessage("OpticQuiz: need at least two colors."); return false; }
  let fixed;
  try { fixed = cvd.fixPalette(palette, { severity: o.severity, model: o.model, collapse: o.collapse }); }
  catch (e) { vscode.window.showErrorMessage("OpticQuiz: " + e.message); return false; }
  const remap = new Map();
  palette.forEach((p, i) => { if (p !== fixed.colors[i]) remap.set(p, fixed.colors[i]); });
  if (remap.size === 0) { vscode.window.showInformationMessage("OpticQuiz: already colorblind-safe — nothing to change."); return false; }
  const edit = new vscode.WorkspaceEdit();
  let n = 0;
  for (const h of hexes) { const to = remap.get(h.hex); if (to) { edit.replace(doc.uri, h.range, to); n++; } }
  await vscode.workspace.applyEdit(edit);
  const maxD = fixed.drift.reduce((a, b) => (b > a ? b : a), 0);
  vscode.window.showInformationMessage(`OpticQuiz: fixed ${remap.size} color${remap.size === 1 ? "" : "s"} (${n} occurrence${n === 1 ? "" : "s"}), largest shift ${maxD.toFixed(1)} ΔE.`);
  return true;
}
async function fixFile() { const ed = vscode.window.activeTextEditor; if (ed) await fixDocument(ed.document); }

// ---- visual preview panel ----
const TYPE_LABEL = { deutan: "Deuteranopia (most common)", protan: "Protanopia", tritan: "Tritanopia" };

function conflictCount(rep) { return cvd.TYPES.reduce((a, t) => a + rep.types[t].conflicts.length, 0); }

function analyze(palette, o) {
  const report = cvd.checkPalette(palette, { severity: o.severity, model: o.model, collapse: o.collapse });
  const sims = {};
  for (const t of cvd.TYPES) sims[t] = palette.map((h) => cvd.simulate(h, t, o.severity, o.model));
  const fix = cvd.fixPalette(palette, { severity: o.severity, model: o.model, collapse: o.collapse });
  const contrast = palette.map((h) => ({ hex: h, white: +cvd.contrastRatio(h, "#ffffff").toFixed(1), black: +cvd.contrastRatio(h, "#000000").toFixed(1) }));
  return { palette, report, sims, fix, contrast };
}

function swatches(arr, labels) {
  return '<div class="row">' + arr.map((h) =>
    '<div class="cell"><span class="sw" style="background:' + h + '"></span>' + (labels ? '<code>' + h + '</code>' : '') + '</div>').join("") + '</div>';
}

function renderHtml(d, o) {
  const pass = d.report.pass, cc = conflictCount(d.report);
  let h = '<h2>' + (pass ? '<span class="ok">✓ Colorblind-safe</span>' : '<span class="bad">' + cc + ' conflict' + (cc === 1 ? '' : 's') + '</span>') + '</h2>';
  h += '<div class="section"><div class="lbl">Your colors</div>' + swatches(d.palette, true) + '</div>';
  h += '<div class="section"><div class="lbl">As a colorblind viewer sees them</div>';
  for (const t of cvd.TYPES) h += '<div class="simlbl">' + TYPE_LABEL[t] + '</div>' + swatches(d.sims[t], false);
  h += '</div>';
  const conflicts = [];
  for (const t of cvd.TYPES) for (const c of d.report.types[t].conflicts) conflicts.push({ t, c });
  if (conflicts.length) {
    h += '<div class="section"><div class="lbl">What collapses</div>';
    for (const { t, c } of conflicts) h += '<div class="cf"><span class="sw sm" style="background:' + c.a + '"></span><span class="sw sm" style="background:' + c.b + '"></span> <code>' + c.a + '</code> / <code>' + c.b + '</code> — ' + t + ' (ΔE ' + c.normal + ' → ' + c.sim + ')</div>';
    h += '</div>';
  }
  if (!pass) {
    const maxD = d.fix.drift.reduce((a, b) => (b > a ? b : a), 0);
    h += '<div class="section fix"><div class="lbl">Suggested colorblind-safe palette <span class="muted">· largest shift ' + maxD.toFixed(1) + ' ΔE</span></div>' + swatches(d.fix.colors, true) + '<button id="apply">Apply this fix to the file</button></div>';
  }
  h += '<div class="section"><div class="lbl">Text contrast (WCAG)</div><table><tr><th></th><th>on white</th><th>on black</th></tr>';
  for (const c of d.contrast) {
    const w = c.white >= 4.5, b = c.black >= 4.5;
    h += '<tr><td><span class="sw sm" style="background:' + c.hex + '"></span><code>' + c.hex + '</code></td><td class="' + (w ? 'ok' : 'bad') + '">' + c.white + ':1 ' + (w ? 'AA' : '✕') + '</td><td class="' + (b ? 'ok' : 'bad') + '">' + c.black + ':1 ' + (b ? 'AA' : '✕') + '</td></tr>';
  }
  h += '</table><div class="muted">AA needs 4.5:1 for normal text.</div></div>';
  h += '<div class="foot">Machado 2009 + CIEDE2000 · severity ' + o.severity + ' · ' + o.model + ' · <a href="https://doi.org/10.5281/zenodo.21310578">published method</a></div>';
  return wrapHtml(h);
}

function wrapHtml(inner) {
  const n = nonce();
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${n}';">
<style>
body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);padding:14px 18px;font-size:13px;}
h2{font-size:15px;margin:0 0 14px;}
.ok{color:#3fb950;} .bad{color:#f85149;}
.section{margin:0 0 18px;}
.lbl{font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.7;margin-bottom:8px;}
.simlbl{font-size:11px;opacity:.6;margin:8px 0 4px;}
.row{display:flex;flex-wrap:wrap;gap:8px;}
.cell{display:flex;flex-direction:column;align-items:center;gap:3px;}
.sw{width:38px;height:38px;border-radius:5px;border:1px solid rgba(128,128,128,.4);}
.sw.sm{width:20px;height:20px;display:inline-block;vertical-align:middle;border-radius:4px;margin-right:2px;}
code{font-family:var(--vscode-editor-font-family,monospace);font-size:11px;opacity:.85;}
.cf{margin:5px 0;font-size:12px;}
.fix{border:1px solid #3fb95055;background:rgba(63,185,80,.06);border-radius:6px;padding:12px;}
button{margin-top:12px;background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;padding:8px 14px;border-radius:4px;cursor:pointer;font-size:13px;}
button:hover{background:var(--vscode-button-hoverBackground);}
table{border-collapse:collapse;font-size:12px;}
th,td{text-align:left;padding:4px 12px 4px 0;}
th{font-weight:normal;opacity:.6;font-size:11px;}
.muted{opacity:.6;font-size:11px;}
.foot{margin-top:16px;opacity:.5;font-size:11px;}
a{color:var(--vscode-textLink-foreground);}
</style></head><body>${inner}
<script nonce="${n}">const vscode=acquireVsCodeApi();const b=document.getElementById('apply');if(b)b.addEventListener('click',()=>vscode.postMessage({type:'apply'}));</script>
</body></html>`;
}
function nonce() { let s = ""; const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"; for (let i = 0; i < 20; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }

function previewCommand() {
  const ed = vscode.window.activeTextEditor;
  if (!ed) { vscode.window.showInformationMessage("OpticQuiz: open a file with colors first."); return; }
  previewDoc = ed.document;
  renderPreview();
}
function renderPreview() {
  if (!previewDoc) return;
  const o = cfg();
  const palette = Array.from(new Set(findHexes(previewDoc).map((h) => h.hex)));
  if (!panel) {
    panel = vscode.window.createWebviewPanel("opticquizPreview", "OpticQuiz — Colorblind Check",
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true }, { enableScripts: true });
    panel.onDidDispose(() => { panel = undefined; });
    panel.webview.onDidReceiveMessage(async (m) => { if (m.type === "apply") { if (await fixDocument(previewDoc)) renderPreview(); } });
  }
  panel.webview.html = palette.length < 2
    ? wrapHtml('<h2>OpticQuiz</h2><p class="muted">Add at least two colors to this file to check them.</p>')
    : renderHtml(analyze(palette, o), o);
  panel.reveal(vscode.ViewColumn.Beside, true);
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
    const p = new vscode.CodeAction("Preview colors — simulate, fix, contrast (OpticQuiz)", vscode.CodeActionKind.QuickFix);
    p.command = { command: "opticquiz.preview", title: "Preview colors" };
    p.diagnostics = mine;
    return [a, p];
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
    vscode.commands.registerCommand("opticquiz.fixFile", fixFile),
    vscode.commands.registerCommand("opticquiz.preview", previewCommand)
  );
}

function deactivate() { if (diag) diag.dispose(); }

module.exports = { activate, deactivate };
