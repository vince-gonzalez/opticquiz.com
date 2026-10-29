import worker from "./worker.js";
const call = async (path, body, method="POST") => {
  const req = new Request("https://opticquiz.com" + path, method==="POST"
    ? { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : { method });
  const res = await worker.fetch(req);
  return { status: res.status, body: await res.json() };
};
const a = await call("/api/check", { colors: ["#d7191c","#1a9641","#2166ac"] });
console.log("CHECK unsafe ->", a.status, "pass:", a.body.pass, "| deutan conflicts:", a.body.types.deutan.conflicts.length);
const b = await call("/api/check", { colors: ["#0072b2","#e69f00","#009e73","#cc79a7"] });
console.log("CHECK safe   ->", b.status, "pass:", b.body.pass);
const c = await call("/api/simulate", { color: "#ff0000" });
console.log("SIMULATE     ->", c.status, JSON.stringify(c.body));
const d = await call("/api", null, "GET");
console.log("GET /api     ->", d.status, "service:", d.body.service);
const e = await call("/api/check", { nope: 1 });
console.log("BAD input    ->", e.status, e.body.error);

// /api/simulate type handling. An unknown type used to come back 200 with the color
// unchanged — a no-op that read like a result. It must now be a 400.
let failures = 0;
const expect = (name, cond, saw) => {
  if (!cond) { failures++; console.log("FAIL " + name + " -- saw " + JSON.stringify(saw)); }
  else console.log("PASS " + name);
};
for (const t of ["protan", "deutan", "tritan", "normal"]) {
  const r = await call("/api/simulate", { color: "#d7191c", type: t });
  expect(`simulate type=${t} -> 200`, r.status === 200 && typeof r.body.result === "string", r.body);
}
const bad = await call("/api/simulate", { color: "#d7191c", type: "protanopia" });
expect("simulate type=protanopia -> 400, not a silent 200 no-op",
  bad.status === 400 && !("result" in bad.body), { status: bad.status, body: bad.body });
const bad2 = await call("/api/simulate", { color: "#d7191c", type: "nonsense" });
expect("simulate type=nonsense -> 400", bad2.status === 400, bad2.body);
const up = await call("/api/simulate", { color: "#d7191c", type: "  PROTAN " });
expect("simulate type is normalized in the echo", up.status === 200 && up.body.type === "protan", up.body);

// A malformed color used to be read as #000000 and scored as if the caller had asked
// about black. Every engine route must answer 400, not 200 and not 500.
for (const [route, payload] of [
  ["/api/simulate", { color: "red", type: "deutan" }],
  ["/api/simulate", { color: "#12345" }],
  ["/api/check", { colors: ["#d7191c", "nope"] }],
  ["/api/fix", { colors: ["#d7191c", "#ab"] }],
  ["/api/contrast", { foreground: "#fff", background: "rebeccapurple" }]
]) {
  const r = await call(route, payload);
  expect(`${route} with a malformed color -> 400`,
    r.status === 400 && typeof r.body.error === "string", { status: r.status, body: r.body });
}
// Alpha hex is accepted (alpha discarded), so these are 200.
const al = await call("/api/simulate", { color: "#d7191cff", type: "deutan" });
expect("8-digit alpha hex -> 200", al.status === 200 && al.body.result === "#8a7b0c", al.body);
// The badge degrades to a "bad colors" SVG rather than throwing.
const bq = await worker.fetch(new Request("https://opticquiz.com/api/badge?colors=d7191c,zzz"));
expect("badge with a malformed color stays an SVG 200",
  bq.status === 200 && (bq.headers.get("content-type") || "").includes("svg"), bq.status);
console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL PASS");
process.exit(failures ? 1 : 0);
