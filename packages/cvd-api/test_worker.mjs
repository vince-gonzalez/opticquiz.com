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
