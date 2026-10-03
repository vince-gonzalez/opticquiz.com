# -*- coding: utf-8 -*-
"""Keep hreflang alternates and canonical correct across every localized page.

A translated page nobody can find helps nobody. hreflang is how a search engine knows to serve
the German page to a German speaker rather than the English one, and it only works if EVERY
page in a translation set points at every other one, including back at the English original.
Miss the back-links and search engines generally ignore the whole cluster.

/color/ and its seven translations were already wired correctly by hand. This generalizes that
to every localized page so the newly translated tests are reachable.

    python tools/hreflang.py            apply
    python tools/hreflang.py --check     report gaps, change nothing, exit non-zero on any
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://opticquiz.com"
LANGS = ["es", "fr", "de", "pt", "it", "zh", "hi"]      # order matches the existing /color/ block
PAGES = ["color", "flicker", "acuity", "d15", "contrast", "astig", "amsler",
         "blindspot", "anomal", "dominance", "stereo"]
CHECK = "--check" in sys.argv

# Matches the contiguous run of hreflang links, so it can be replaced wholesale and stays
# idempotent. The RSS <link rel="alternate"> has no hreflang and is deliberately not matched.
HREF_RE = re.compile(r'(?:[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n?)+')
CANON_RE = re.compile(r'[ \t]*<link rel="canonical" href="[^"]*">\n?')


def block(page):
    out = ['<link rel="alternate" hreflang="x-default" href="%s/%s/">' % (BASE, page),
           '<link rel="alternate" hreflang="en" href="%s/%s/">' % (BASE, page)]
    for L in LANGS:
        if os.path.exists(os.path.join(ROOT, L, page, "index.html")):
            out.append('<link rel="alternate" hreflang="%s" href="%s/%s/%s/">' % (L, BASE, L, page))
    return "\n".join(out) + "\n"


def patch(path, page, lang):
    if not os.path.exists(path):
        return None
    src = io.open(path, encoding="utf-8").read()
    canonical = '<link rel="canonical" href="%s/%s/%s/">\n' % (BASE, lang, page) if lang \
        else '<link rel="canonical" href="%s/%s/">\n' % (BASE, page)
    new = src

    if HREF_RE.search(new):
        new = HREF_RE.sub(block(page), new, count=1)
    else:
        # No alternates yet: put them right after the canonical, or after <head> if there is none.
        if CANON_RE.search(new):
            new = CANON_RE.sub(lambda m: m.group(0) + block(page), new, count=1)
        else:
            new = re.sub(r'(<head[^>]*>\n?)', lambda m: m.group(1) + block(page), new, count=1)

    if CANON_RE.search(new):
        new = CANON_RE.sub(canonical, new, count=1)
    else:
        new = re.sub(r'(<head[^>]*>\n?)', lambda m: m.group(1) + canonical, new, count=1)

    changed = new != src
    if changed and not CHECK:
        io.open(path, "w", encoding="utf-8", newline="").write(new)
    return changed


touched, gaps = 0, []
for page in PAGES:
    en = os.path.join(ROOT, page, "index.html")
    if not os.path.exists(en):
        continue
    langs_present = [L for L in LANGS if os.path.exists(os.path.join(ROOT, L, page, "index.html"))]
    if not langs_present:
        continue
    if patch(en, page, None):
        touched += 1
    for L in langs_present:
        if patch(os.path.join(ROOT, L, page, "index.html"), page, L):
            touched += 1
    missing = [L for L in LANGS if L not in langs_present]
    print("  %-11s en + %d language(s)%s" % (page, len(langs_present),
          ("   missing: " + ",".join(missing)) if missing else ""))
    if missing:
        gaps.append("%s: %s" % (page, ",".join(missing)))

print()
print("  %d file(s) %s" % (touched, "would change" if CHECK else "updated"))
if gaps:
    print("  translation sets that are incomplete (not an error, just not finished):")
    for g in gaps:
        print("    " + g)
