var Q = require("./index.js");
var ok = true;
function assert(name, cond) { console.log((cond ? "PASS " : "FAIL ") + name); if (!cond) ok = false; }

assert("deltaE identity is 0", Q.deltaE("#123456", "#123456") === 0);
assert("black vs white ~100", Math.abs(Q.deltaE("#000", "#fff") - 100) < 0.5);
assert("red -> deutan is #a39000", Q.simulate("#ff0000", "deutan") === "#a39000");

var unsafe = Q.checkPalette(["#d7191c", "#1a9641", "#2166ac"]);
assert("unsafe red/green/blue fails overall", unsafe.pass === false);
assert("unsafe fails on deutan", unsafe.types.deutan.pass === false);

var safe = Q.checkPalette(["#0072b2", "#e69f00", "#009e73", "#cc79a7"]);
assert("Okabe-Ito palette passes", safe.pass === true);

// --- type / model validation --------------------------------------------------
// An unrecognized name must never be a silent pass-through: that returned the input
// unchanged and a caller believed the simulation had run.
function caught(fn) {
  try { fn(); } catch (e) { return e; }
  return null;
}
function assertThrows(name, fn, needles) {
  var e = caught(fn);
  if (!e) { assert(name + " -- did not throw", false); return; }
  var msg = String(e.message);
  var missing = needles.filter(function (n) { return msg.indexOf(n) === -1; });
  assert(name, e instanceof TypeError && missing.length === 0);
  if (missing.length) console.log("       message was: " + msg);
}

// the three valid types, plus normal
assert("protan simulates", Q.simulate("#ff0000", "protan") === "#6d5f00");
assert("deutan simulates", Q.simulate("#ff0000", "deutan") === "#a39000");
assert("tritan simulates", Q.simulate("#ff0000", "tritan") === "#ff000f");
assert("normal is a pass-through", Q.simulate("#ff0000", "normal") === "#ff0000");
assert("normal lowercases", Q.simulate("#FF0000", "normal") === "#ff0000");
assert("TYPES unchanged", Q.TYPES.join(",") === "protan,deutan,tritan");

// the regression that prompted this: a long clinical name used to return the input
assert("protanopia is NOT a silent no-op", Q.simulate("#d7191c", "protan") !== "#d7191c");
assertThrows("unknown type throws", function () { Q.simulate("#d7191c", "nonsense"); },
  ["unknown type", '"nonsense"', "protan, deutan, tritan, normal"]);

// long clinical forms are refused, but the error names the short form to use
assertThrows("protanopia throws and names protan", function () { Q.simulate("#d7191c", "protanopia"); },
  ["unknown type", 'Use "protan"']);
assertThrows("deuteranopia throws and names deutan", function () { Q.simulate("#d7191c", "deuteranopia"); },
  ['Use "deutan"']);
assertThrows("tritanopia throws and names tritan", function () { Q.simulate("#d7191c", "tritanopia"); },
  ['Use "tritan"']);

// anomalous trichromacy is a severity, not a type — refusing it is the point
assertThrows("deuteranomaly points at severity", function () { Q.simulate("#d7191c", "deuteranomaly"); },
  ["severity", 'use "deutan"']);

// shapes that used to slip through the old `!M[type]` test
assertThrows("undefined type throws", function () { Q.simulate("#d7191c"); }, ["unknown type"]);
assertThrows("null type throws", function () { Q.simulate("#d7191c", null); }, ["unknown type"]);
assertThrows("non-string type throws", function () { Q.simulate("#d7191c", 42); }, ["unknown type"]);
assertThrows("empty type throws", function () { Q.simulate("#d7191c", ""); }, ["unknown type"]);
assertThrows("inherited key throws", function () { Q.simulate("#d7191c", "constructor"); }, ["unknown type"]);

// case and surrounding space are tolerated
assert("type is case-insensitive", Q.simulate("#ff0000", "PROTAN") === "#6d5f00");
assert("type is trimmed", Q.simulate("#ff0000", "  deutan  ") === "#a39000");

// model had the same silent fallback: a typo quietly became machado
assert("machado is the default", Q.simulate("#ff0000", "protan") === Q.simulate("#ff0000", "protan", 1, "machado"));
assert("brettel differs from machado", Q.simulate("#ff0000", "protan", 1, "brettel") === "#6c5c0c");
assertThrows("unknown model throws", function () { Q.simulate("#ff0000", "protan", 1, "brettle"); },
  ["unknown model", '"brettle"', "machado, brettel"]);
assertThrows("checkPalette rejects a bad model", function () { Q.checkPalette(["#000", "#fff"], { model: "machdo" }); },
  ["unknown model"]);

// the validators are exported so wrappers can share one vocabulary
assert("normalizeType canonicalizes", Q.normalizeType(" Deutan ") === "deutan");
assert("normalizeType passes normal", Q.normalizeType("normal") === "normal");
assert("normalizeModel defaults to machado", Q.normalizeModel(undefined) === "machado");
assert("MODELS exported", Q.MODELS.join(",") === "machado,brettel");
assertThrows("normalizeType labels the caller", function () { Q.normalizeType("bogus", "simulateImage"); },
  ["simulateImage: unknown type"]);

// --- color parsing ------------------------------------------------------------
// A malformed color used to parse as NaN and come back #000000, so a typo measured as
// black. "normal" used to return the raw input, so it could not be compared with a
// simulated value of the same color.
assert("normal canonicalizes 3-digit to 6", Q.simulate("#abc", "normal") === "#aabbcc");
assert("normal canonicalizes without the hash", Q.simulate("abc", "normal") === "#aabbcc");
assert("normal canonicalizes uppercase", Q.simulate("#AABBCC", "normal") === "#aabbcc");
assert("normal trims", Q.simulate("  #abc  ", "normal") === "#aabbcc");
assert("4-digit alpha hex parses, alpha discarded", Q.simulate("#abcd", "normal") === "#aabbcc");
assert("8-digit alpha hex parses, alpha discarded", Q.simulate("#aabbccdd", "normal") === "#aabbcc");
assert("8-digit simulates as its 6-digit self",
  Q.simulate("#d7191cff", "deutan") === Q.simulate("#d7191c", "deutan"));

// the comparison that was silently broken: a short hex against its own simulation
assert("normal is comparable to a simulated value",
  Q.simulate("#f00", "normal") === "#ff0000" && Q.simulate("#f00", "deutan") === Q.simulate("#ff0000", "deutan"));

["red", "#ab", "#abcde", "#1234567", "#abcdefgh", "", "#gggggg", "rgb(1,2,3)", "#"].forEach(function (bad) {
  assertThrows("malformed color " + JSON.stringify(bad) + " throws", function () { Q.simulate(bad, "deutan"); },
    ["invalid color", "Expected a hex color"]);
});
assertThrows("malformed color throws for normal too", function () { Q.simulate("red", "normal"); },
  ["invalid color"]);

// every public entry validates, not just simulate — a bad color used to score as black
assertThrows("deltaE validates", function () { Q.deltaE("#fff", "red"); }, ["invalid color"]);
assertThrows("checkPalette validates", function () { Q.checkPalette(["#d7191c", "nope"]); }, ["invalid color"]);
assertThrows("fixPalette validates", function () { Q.fixPalette(["#d7191c", "#ab"]); }, ["invalid color"]);
assertThrows("contrastRatio validates", function () { Q.contrastRatio("#fff", "xyz"); }, ["invalid color"]);
assertThrows("relLuminance validates", function () { Q.relLuminance("xyz"); }, ["invalid color"]);
assertThrows("checkContrast validates", function () { Q.checkContrast("#fff", "xyz"); }, ["invalid color"]);
assertThrows("hexToLab validates", function () { Q.hexToLab("xyz"); }, ["invalid color"]);

// labToHex output must always be re-readable by the parser
var round = Q.simulate(Q.labToHex(55, 20, -30), "normal");
assert("labToHex output round-trips through the parser", /^#[0-9a-f]{6}$/.test(round));

console.log(ok ? "\nALL PASS" : "\nFAILURES");
process.exit(ok ? 0 : 1);
