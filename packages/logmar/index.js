// logmar — convert between visual-acuity notations: logMAR, Snellen (20/x or 6/x), and decimal.
//
// logMAR = log10(MAR) = -log10(decimal acuity); decimal = 1 / MAR. Snellen m/x has decimal = m/x.
// Pure arithmetic, no dependencies. 20/20 = 0.0 logMAR = 1.0 decimal; larger logMAR = worse acuity.
//
//   const la = require("logmar");
//   la.snellenToLogmar("20/40");   // 0.301
//   la.logmarToSnellen(0.3);       // "20/40"
//   la.decimalToLogmar(0.5);       // 0.301

function snellenToDecimal(s) {
  const m = String(s).match(/^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/);
  if (!m) throw new Error('Snellen acuity must look like "20/40" or "6/12".');
  const num = parseFloat(m[1]), den = parseFloat(m[2]);
  if (!(num > 0) || !(den > 0)) throw new Error("Snellen numerator and denominator must be > 0.");
  return num / den;
}
function decimalToLogmar(d) {
  if (!(d > 0)) throw new Error("decimal acuity must be > 0.");
  const v = -Math.log10(d);
  return v === 0 ? 0 : v; // avoid -0 at 20/20
}
function logmarToDecimal(l) {
  return Math.pow(10, -l);
}
function snellenToLogmar(s) {
  return decimalToLogmar(snellenToDecimal(s));
}
function decimalToSnellen(d, base) {
  base = base || 20;
  if (!(d > 0)) throw new Error("decimal acuity must be > 0.");
  return base + "/" + Math.round(base / d);
}
function logmarToSnellen(l, base) {
  return decimalToSnellen(logmarToDecimal(l), base || 20);
}

module.exports = {
  snellenToDecimal, decimalToLogmar, logmarToDecimal,
  snellenToLogmar, logmarToSnellen, decimalToSnellen
};
