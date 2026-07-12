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

console.log(ok ? "\nALL PASS" : "\nFAILURES");
process.exit(ok ? 0 : 1);
