# -*- coding: utf-8 -*-
"""List the user-facing English still built inside inline <script> on a localized page.

The page prose was translated, but these pages assemble their results and interpretation text
in JavaScript. On a localized page that text is still English, so a reader gets translated
instructions and an English result — worst on d15, astig and amsler, where the interpretation
paragraph is the whole point of taking the test.

    python tools/find-js-strings.py <lang>      writes tools/js-strings-<lang>.txt
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANG = sys.argv[1] if len(sys.argv) > 1 else "de"
PAGES = ["d15", "astig", "amsler", "acuity", "anomal", "blindspot", "contrast", "dominance", "stereo"]

# A quoted run that reads like a sentence: two lowercase words in a row, no markup, not a CSS
# rule or a selector. Deliberately conservative — a missed string is better than a mangled one.
QUOTED = re.compile(r'"([^"\\\n]{20,})"|\'([^\'\\\n]{20,})\'')
SENTENCE = re.compile(r'[a-z]{3}\s+[a-z]{3}')
MARKUP = re.compile(r'[<>]|^\s*[.#]|^[a-z-]+\s*:|px|rgba?\(')

lines, total = [], 0
for page in PAGES:
    p = os.path.join(ROOT, LANG, page, "index.html")
    if not os.path.exists(p):
        continue
    s = io.open(p, encoding="utf-8").read()
    js = "".join(re.findall(r'<script(?![^>]*src=)(?![^>]*ld\+json)[^>]*>(.*?)</script>', s, re.S))
    hits = []
    for a, b in QUOTED.findall(js):
        t = (a or b).strip()
        if SENTENCE.search(t) and not MARKUP.search(t):
            if t not in hits:
                hits.append(t)
    total += len(hits)
    lines.append("### %s  (%d strings)" % (page, len(hits)))
    for t in hits:
        lines.append("    " + t)
    lines.append("")

out = os.path.join(ROOT, "tools", "js-strings-%s.txt" % LANG)
io.open(out, "w", encoding="utf-8", newline="").write("\n".join(lines))
print("wrote %s  (%d strings across %d pages)" % (out, total, len(PAGES)))
