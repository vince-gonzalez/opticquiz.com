// OpticQuiz Colorblind-Safe Checker — Figma plugin main (sandbox).
// Reads solid fill + stroke colors from the current selection (or the page if
// nothing is selected), and hands them to the UI, which runs the CVD engine.
// Nothing leaves the machine.

figma.showUI(__html__, { width: 380, height: 600, themeColors: true });

function toHex(c) { var v = Math.round(c * 255); return (v < 16 ? "0" : "") + v.toString(16); }
function colHex(col) { return "#" + toHex(col.r) + toHex(col.g) + toHex(col.b); }

function collect(nodes, set) {
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    var paints = [];
    if ("fills" in n && Array.isArray(n.fills)) paints = paints.concat(n.fills);
    if ("strokes" in n && Array.isArray(n.strokes)) paints = paints.concat(n.strokes);
    for (var p = 0; p < paints.length; p++) {
      var paint = paints[p];
      if (paint && paint.type === "SOLID" && paint.visible !== false) set[colHex(paint.color)] = true;
    }
    if ("children" in n && n.children && n.children.length) collect(n.children, set);
  }
}

function scan() {
  var sel = figma.currentPage.selection;
  var nodes = sel.length ? sel : figma.currentPage.children;
  var set = {};
  try { collect(nodes, set); } catch (e) { /* dynamic-page: some nodes may need loading */ }
  var colors = Object.keys(set);
  figma.ui.postMessage({ type: "colors", colors: colors, fromSelection: sel.length > 0, count: colors.length });
}

scan();
figma.on("selectionchange", scan);
figma.on("currentpagechange", scan);

figma.ui.onmessage = function (msg) {
  if (msg.type === "rescan") scan();
  else if (msg.type === "close") figma.closePlugin();
};
