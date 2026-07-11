// OpticQuiz Colorblind-Safe Checker — Figma plugin main (sandbox).
// Reads solid fill + stroke colors from the current selection (or the page if
// nothing is selected), hands them to the UI (which runs the CVD engine), and
// — the polish — lets the UI ask us to SELECT the layers that use a given color
// so a designer can jump straight to what needs fixing. Nothing leaves the machine.

figma.showUI(__html__, { width: 400, height: 640, themeColors: true });

var colorNodes = {}; // hex -> [nodes that paint with it], rebuilt on every scan

function toHex(c) { var v = Math.round(c * 255); return (v < 16 ? "0" : "") + v.toString(16); }
function colHex(col) { return "#" + toHex(col.r) + toHex(col.g) + toHex(col.b); }

function collect(nodes, set) {
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    var paints = [];
    if ("fills" in n && Array.isArray(n.fills)) paints = paints.concat(n.fills);
    if ("strokes" in n && Array.isArray(n.strokes)) paints = paints.concat(n.strokes);
    var local = {};
    for (var p = 0; p < paints.length; p++) {
      var paint = paints[p];
      if (paint && paint.type === "SOLID" && paint.visible !== false) {
        var hx = colHex(paint.color);
        set[hx] = true;
        if (!local[hx]) { local[hx] = true; (colorNodes[hx] = colorNodes[hx] || []).push(n); }
      }
    }
    if ("children" in n && n.children && n.children.length) collect(n.children, set);
  }
}

function scan() {
  var sel = figma.currentPage.selection;
  var nodes = sel.length ? sel : figma.currentPage.children;
  var set = {};
  colorNodes = {};
  try { collect(nodes, set); } catch (e) { /* some nodes may be unavailable */ }
  var colors = Object.keys(set);
  figma.ui.postMessage({ type: "colors", colors: colors, fromSelection: sel.length > 0, count: colors.length });
}

function selectByColors(colors) {
  var seen = {}, nodes = [];
  for (var i = 0; i < colors.length; i++) {
    var list = colorNodes[colors[i]] || [];
    for (var j = 0; j < list.length; j++) {
      var n = list[j];
      if (!n.removed && !seen[n.id]) { seen[n.id] = true; nodes.push(n); }
    }
  }
  if (nodes.length) {
    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);
  }
  figma.ui.postMessage({ type: "selected", count: nodes.length });
}

scan();
figma.on("selectionchange", scan);
figma.on("currentpagechange", scan);

figma.ui.onmessage = function (msg) {
  if (msg.type === "rescan") scan();
  else if (msg.type === "select" && msg.colors) selectByColors(msg.colors);
  else if (msg.type === "close") figma.closePlugin();
};
