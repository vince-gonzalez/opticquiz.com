#!/usr/bin/env node
/* Generate indexable per-language copies of an i18n-marked page.
 *
 *   node tools/build-i18n-pages.js            build, then verify
 *   node tools/build-i18n-pages.js --check    verify only, write nothing
 *
 * The problem this exists to solve. assets/oq-i18n.js is a client-side toggle whose own header
 * says "No reload, no separate URLs". Eight languages of /color/ therefore lived at ONE URL,
 * Googlebot crawled it with an English locale and saw English, and the site carried no hreflang
 * and no language URLs in its sitemap. Over the 90 days to 2026-08-12 that produced zero
 * non-English search clicks, while `oeil dominant test` surfaced the ENGLISH /dominance/ page at
 * position 26 — the demand was there and there was nothing indexable to answer it with.
 *
 * A language is emitted only if the dictionary carries every UI key AND all four seo.* keys.
 * Falling back to English for a missing title would tell Google the page is English, which is
 * worse than not publishing it.
 *
 * The translated variants deliberately DROP the FAQPage JSON-LD. Structured data has to match
 * the visible text; English Q&A markup on a French page is a mismatch. Translate the FAQ into
 * the dictionary and it can come back.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.dirname(__dirname);
const ORIGIN = "https://opticquiz.com";
const SEO_KEYS = ["seo.title", "seo.desc", "seo.og.title", "seo.og.desc"];
const RTL = { ar: 1, he: 1, fa: 1, ur: 1 };
const MARK_OPEN = "<!-- oq:hreflang -->";
const MARK_CLOSE = "<!-- /oq:hreflang -->";

// Pages that carry an i18n dictionary. Add a row when a page gets one.
const PAGES = [{ dir: "color", dict: "assets/oq-i18n-color.js", priority: "0.9" }];

const CHECK_ONLY = process.argv.includes("--check");
let failures = [];
const fail = (m) => failures.push(m);

function loadDict(rel) {
  // Read the dictionary with the engine that owns the format rather than parsing JS by hand.
  const abs = path.join(ROOT, rel);
  delete require.cache[require.resolve(abs)];
  global.window = {};
  require(abs);
  const { OQ_I18N: dict, OQ_LANGS: langs } = global.window;
  if (!dict || !langs) throw new Error(rel + " did not define OQ_I18N / OQ_LANGS");
  return { dict, langs };
}

function eligible(dict, langs) {
  const uiKeys = Object.keys(dict.en).filter((k) => !k.startsWith("seo."));
  const out = [];
  for (const { code } of langs) {
    if (code === "en") continue;
    const d = dict[code];
    if (!d) continue;
    const missing = [...uiKeys, ...SEO_KEYS].filter((k) => !(k in d));
    if (missing.length) {
      console.log(`   skip ${code}: missing ${missing.length} key(s) — ${missing.slice(0, 4).join(", ")}`);
      continue;
    }
    out.push(code);
  }
  return { list: out, uiKeys };
}

// ---------------------------------------------------------------- html rewriting

function setInner(html, attr, key, value, ctx) {
  // /g matters: a key can legitimately mark several elements. link.alltests marks three links
  // on /color/, and replacing only the first left English text on the translated pages — the
  // verify pass caught it.
  const re = new RegExp(`(<([a-zA-Z][\\w-]*)\\b[^>]*\\b${attr}="${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>)([\\s\\S]*?)(</\\2>)`, "g");
  const n = (html.match(re) || []).length;
  if (!n) { fail(`${ctx}: no element carries ${attr}="${key}"`); return html; }
  return html.replace(re, (_m, open, _tag, _inner, close) => open + value + close);
}

function setAttrFromSpec(html, dict, lang, ctx) {
  // data-i18n-attr="aria-label:btn.start.aria" — set that attribute to the translated value.
  const re = /<([a-zA-Z][\w-]*)\b([^>]*\bdata-i18n-attr="([^"]+)"[^>]*)>/g;
  return html.replace(re, (m, tag, attrs, spec) => {
    let out = attrs;
    for (const pair of spec.split(";")) {
      const [name, key] = pair.split(":").map((s) => s && s.trim());
      if (!name || !key) continue;
      const v = dict[lang][key];
      if (v == null) { fail(`${ctx}: dictionary has no ${key} for ${lang}`); continue; }
      const esc = v.replace(/"/g, "&quot;");
      const ar = new RegExp(`\\b${name}="[^"]*"`);
      out = ar.test(out) ? out.replace(ar, `${name}="${esc}"`) : `${out} ${name}="${esc}"`;
    }
    return `<${tag}${out}>`;
  });
}

function replaceOnce(html, re, value, ctx, what) {
  if (!re.test(html)) { fail(`${ctx}: could not find ${what}`); return html; }
  return html.replace(re, () => value);
}

function hreflangBlock(dir, langs) {
  const rows = [`  <link rel="alternate" hreflang="x-default" href="${ORIGIN}/${dir}/">`,
                `  <link rel="alternate" hreflang="en" href="${ORIGIN}/${dir}/">`];
  for (const l of langs) rows.push(`  <link rel="alternate" hreflang="${l}" href="${ORIGIN}/${l}/${dir}/">`);
  return [MARK_OPEN, ...rows, MARK_CLOSE].join("\n");
}

function injectHreflang(html, block, ctx) {
  const existing = new RegExp(`${MARK_OPEN}[\\s\\S]*?${MARK_CLOSE}`);
  if (existing.test(html)) return html.replace(existing, () => block);   // idempotent
  if (!/<\/head>/i.test(html)) { fail(`${ctx}: no </head> to inject into`); return html; }
  return html.replace(/<\/head>/i, () => block + "\n</head>");
}

function buildVariant(src, dir, lang, langs, dict, uiKeys) {
  const ctx = `${lang}/${dir}`;
  let h = src;
  const D = dict[lang];

  h = replaceOnce(h, /<html\b[^>]*>/i,
    `<html lang="${lang}"${RTL[lang] ? ' dir="rtl"' : ""}>`, ctx, "<html> tag");

  for (const k of uiKeys) {
    if (k.endsWith(".aria")) continue;                       // handled via data-i18n-attr
    if (new RegExp(`data-i18n-html="${k}"`).test(h)) h = setInner(h, "data-i18n-html", k, D[k], ctx);
    else if (new RegExp(`data-i18n="${k}"`).test(h)) h = setInner(h, "data-i18n", k, D[k], ctx);
  }
  h = setAttrFromSpec(h, dict, lang, ctx);

  const esc = (s) => s.replace(/"/g, "&quot;");
  h = replaceOnce(h, /<title>[\s\S]*?<\/title>/i, `<title>${D["seo.title"]}</title>`, ctx, "<title>");
  h = replaceOnce(h, /<meta name="description" content="[^"]*">/i,
    `<meta name="description" content="${esc(D["seo.desc"])}">`, ctx, "meta description");
  h = replaceOnce(h, /<meta property="og:title" content="[^"]*">/i,
    `<meta property="og:title" content="${esc(D["seo.og.title"])}">`, ctx, "og:title");
  h = replaceOnce(h, /<meta property="og:description" content="[^"]*">/i,
    `<meta property="og:description" content="${esc(D["seo.og.desc"])}">`, ctx, "og:description");
  h = replaceOnce(h, /<meta name="twitter:title" content="[^"]*">/i,
    `<meta name="twitter:title" content="${esc(D["seo.og.title"])}">`, ctx, "twitter:title");
  h = replaceOnce(h, /<meta name="twitter:description" content="[^"]*">/i,
    `<meta name="twitter:description" content="${esc(D["seo.og.desc"])}">`, ctx, "twitter:description");
  h = replaceOnce(h, /<meta property="og:url" content="[^"]*">/i,
    `<meta property="og:url" content="${ORIGIN}/${lang}/${dir}/">`, ctx, "og:url");
  h = replaceOnce(h, /<link rel="canonical" href="[^"]*">/i,
    `<link rel="canonical" href="${ORIGIN}/${lang}/${dir}/">`, ctx, "canonical");

  // English FAQ markup must not ride along on a translated page.
  h = h.replace(/<script type="application\/ld\+json">[\s\S]*?"FAQPage"[\s\S]*?<\/script>\s*/i, "");

  const urls = { en: `/${dir}/` };
  for (const l of langs) urls[l] = `/${l}/${dir}/`;
  h = injectHreflang(h, hreflangBlock(dir, langs) + "\n" +
    `  <script>window.OQ_PAGE_LANG=${JSON.stringify(lang)};window.OQ_LANG_URLS=${JSON.stringify(urls)};</script>`,
    ctx);
  return h;
}

// ---------------------------------------------------------------- verification

function verify(out, dir, lang, dict, uiKeys) {
  const ctx = `${lang}/${dir}`;
  const D = dict[lang], E = dict.en;
  const text = out.replace(/<script[\s\S]*?<\/script>/gi, "");

  const m = out.match(/<html\b[^>]*lang="([^"]+)"/i);
  if (!m || m[1] !== lang) fail(`${ctx}: <html lang> is ${m ? m[1] : "absent"}, expected ${lang}`);

  for (const k of uiKeys) {
    if (k.endsWith(".aria")) continue;
    const want = D[k], eng = E[k];
    if (!text.includes(want)) fail(`${ctx}: translated string for ${k} is not in the output`);
    // Only flag a leftover English string when the two actually differ.
    if (want !== eng && eng.length > 12 && text.includes(eng)) fail(`${ctx}: English ${k} survived`);
  }
  if (!out.includes(`<title>${D["seo.title"]}</title>`)) fail(`${ctx}: title not translated`);
  if (out.includes(`href="${ORIGIN}/${dir}/"><link`)) fail(`${ctx}: canonical still points at English`);
  const can = out.match(/<link rel="canonical" href="([^"]+)"/);
  if (!can || can[1] !== `${ORIGIN}/${lang}/${dir}/`) fail(`${ctx}: canonical is ${can && can[1]}`);
  if (/"FAQPage"/.test(out)) fail(`${ctx}: English FAQPage JSON-LD survived`);
  if (!out.includes(`window.OQ_PAGE_LANG="${lang}"`)) fail(`${ctx}: OQ_PAGE_LANG not set`);
  for (const l of ["x-default", "en", lang]) {
    if (!new RegExp(`hreflang="${l}"`).test(out)) fail(`${ctx}: hreflang="${l}" missing`);
  }
}

// ---------------------------------------------------------------- sitemap

function updateSitemap(dir, langs, priority) {
  const p = path.join(ROOT, "sitemap.xml");
  let s = fs.readFileSync(p, "utf8");
  let added = 0;
  for (const l of langs) {
    const loc = `${ORIGIN}/${l}/${dir}/`;
    if (s.includes(`<loc>${loc}</loc>`)) continue;
    const anchor = `  <url><loc>${ORIGIN}/${dir}/</loc>`;
    const i = s.indexOf(anchor);
    if (i < 0) { fail(`sitemap: no entry for /${dir}/ to insert after`); return 0; }
    const eol = s.indexOf("\n", i);
    s = s.slice(0, eol + 1) + `  <url><loc>${loc}</loc><priority>${priority}</priority></url>\n` + s.slice(eol + 1);
    added++;
  }
  if (added && !CHECK_ONLY) fs.writeFileSync(p, s);
  return added;
}

// ---------------------------------------------------------------- main

console.log(CHECK_ONLY ? "VERIFY ONLY — nothing will be written\n" : "BUILD\n");
for (const page of PAGES) {
  const { dict, langs } = loadDict(page.dict);
  const { list, uiKeys } = eligible(dict, langs);
  console.log(`/${page.dir}/  ${uiKeys.length} ui keys  →  ${list.length ? list.join(", ") : "(no eligible language)"}`);
  if (!list.length) continue;

  const srcPath = path.join(ROOT, page.dir, "index.html");
  const src = fs.readFileSync(srcPath, "utf8");

  for (const lang of list) {
    const out = buildVariant(src, page.dir, lang, list, dict, uiKeys);
    verify(out, page.dir, lang, dict, uiKeys);
    const dest = path.join(ROOT, lang, page.dir, "index.html");
    if (!CHECK_ONLY) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, out);
    }
    console.log(`   ${CHECK_ONLY ? "checked" : "wrote  "} ${lang}/${page.dir}/index.html   ${(out.length / 1024).toFixed(1)} kB`);
  }

  // Reciprocity: the English original must point back at every variant, or the cluster is
  // one-way and Google ignores it.
  let en = injectHreflang(src, hreflangBlock(page.dir, list), `en/${page.dir}`);
  for (const l of [...list, "x-default", "en"]) {
    if (!new RegExp(`hreflang="${l}"`).test(en)) fail(`en/${page.dir}: hreflang="${l}" missing from the source page`);
  }
  if (!CHECK_ONLY && en !== src) { fs.writeFileSync(srcPath, en); console.log(`   updated ${page.dir}/index.html with the hreflang cluster`); }

  const n = updateSitemap(page.dir, list, page.priority);
  console.log(`   sitemap: ${n} url(s) ${CHECK_ONLY ? "would be" : ""} added`);
}

console.log();
if (failures.length) {
  console.log(`FAILED — ${failures.length} problem(s):`);
  for (const f of failures) console.log("   " + f);
  process.exit(1);
}
console.log("all checks passed");
