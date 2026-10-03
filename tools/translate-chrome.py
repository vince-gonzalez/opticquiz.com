# -*- coding: utf-8 -*-
"""Translate the shared nav and footer on the localized pages.

Every translated page had its body text translated but kept an English navigation bar and an
entirely English footer, so a non-English visitor could read the page they landed on and then
had no route onward. That is the whole site's navigation, in English, on every localized page.

This rewrites only the text inside the <!-- oq:nav --> and <!-- oq:footer --> blocks, matching
on >text< so it touches text nodes and never an href, class or attribute. Body copy outside
those blocks is left alone — it was already translated by hand.

Proper nouns stay in English on purpose: OpticQuiz, F-Keys Creative, Chrome Web Store,
Microsoft Edge Add-ons, Firefox Add-ons, VS Code Marketplace, MCP Registry, PyPI, npm,
Farnsworth D-15, the DOI, and opticquiz.com. Translating a product name helps nobody find it.

    python tools/translate-chrome.py           apply
    python tools/translate-chrome.py --check    report what is still English, change nothing
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGS = ["de", "es", "fr", "hi", "it", "pt", "zh"]
# Every localized page, whether or not it exists yet. Missing ones are skipped silently, so a
# new language or test can be added to these lists before the page is written.
PAGES = ["color", "flicker", "acuity", "d15", "contrast", "astig", "amsler",
         "blindspot", "anomal", "dominance", "stereo"]

# English source string -> translation per language.
T = {
    "Vision tests": {
        "de": u"Sehtests", "es": u"Pruebas de visión", "fr": u"Tests de vision",
        "hi": u"दृष्टि परीक्षण", "it": u"Test della vista", "pt": u"Testes de visão",
        "zh": u"视力测试"},
    "Color tools": {
        "de": u"Farbwerkzeuge", "es": u"Herramientas de color", "fr": u"Outils de couleur",
        "hi": u"रंग उपकरण", "it": u"Strumenti colore", "pt": u"Ferramentas de cor",
        "zh": u"颜色工具"},
    "Developers": {
        "de": u"Entwickler", "es": u"Desarrolladores", "fr": u"Développeurs",
        "hi": u"डेवलपर", "it": u"Sviluppatori", "pt": u"Desenvolvedores",
        "zh": u"开发者"},
    "Research": {
        "de": u"Forschung", "es": u"Investigación", "fr": u"Recherche",
        "hi": u"अनुसंधान", "it": u"Ricerca", "pt": u"Pesquisa", "zh": u"研究"},
    "Set up": {
        "de": u"Einrichten", "es": u"Configurar", "fr": u"Configurer",
        "hi": u"सेट अप करें", "it": u"Configura", "pt": u"Configurar", "zh": u"设置"},
    "Reviewed &amp; listed by": {
        "de": u"Geprüft und gelistet von", "es": u"Revisado y publicado por",
        "fr": u"Évalué et référencé par", "hi": u"समीक्षित और सूचीबद्ध",
        "it": u"Recensito ed elencato da", "pt": u"Avaliado e listado por",
        "zh": u"已审核并收录于"},
    "Color vision": {
        "de": u"Farbsehen", "es": u"Visión del color", "fr": u"Vision des couleurs",
        "hi": u"रंग दृष्टि", "it": u"Visione dei colori", "pt": u"Visão de cores",
        "zh": u"色觉"},
    "Visual acuity": {
        "de": u"Sehschärfe", "es": u"Agudeza visual", "fr": u"Acuité visuelle",
        "hi": u"दृश्य तीक्ष्णता", "it": u"Acuità visiva", "pt": u"Acuidade visual",
        "zh": u"视敏度"},
    "Flicker fusion": {
        "de": u"Flimmerverschmelzung", "es": u"Fusión de parpadeo",
        "fr": u"Fusion de scintillement", "hi": u"फ्लिकर फ्यूजन",
        "it": u"Fusione dello sfarfallio", "pt": u"Fusão de cintilação",
        "zh": u"闪烁融合"},
    "All 17 tests": {
        "de": u"Alle 17 Tests", "es": u"Las 17 pruebas", "fr": u"Les 17 tests",
        "hi": u"सभी 17 परीक्षण", "it": u"Tutti i 17 test", "pt": u"Todos os 17 testes",
        "zh": u"全部 17 项测试"},
    "Palette checker": {
        "de": u"Paletten-Prüfer", "es": u"Verificador de paletas",
        "fr": u"Vérificateur de palette", "hi": u"पैलेट चेकर",
        "it": u"Verificatore di palette", "pt": u"Verificador de paletas",
        "zh": u"调色板检查器"},
    "Contrast checker": {
        "de": u"Kontrast-Prüfer", "es": u"Verificador de contraste",
        "fr": u"Vérificateur de contraste", "hi": u"कंट्रास्ट चेकर",
        "it": u"Verificatore di contrasto", "pt": u"Verificador de contraste",
        "zh": u"对比度检查器"},
    "Palette benchmark": {
        "de": u"Paletten-Benchmark", "es": u"Comparativa de paletas",
        "fr": u"Banc d'essai de palettes", "hi": u"पैलेट बेंचमार्क",
        "it": u"Benchmark delle palette", "pt": u"Comparativo de paletas",
        "zh": u"调色板基准测试"},
    "One-line widget": {
        "de": u"Ein-Zeilen-Widget", "es": u"Widget de una línea",
        "fr": u"Widget d'une ligne", "hi": u"एक-पंक्ति विजेट",
        "it": u"Widget di una riga", "pt": u"Widget de uma linha",
        "zh": u"一行代码小工具"},
    "Browser extension": {
        "de": u"Browser-Erweiterung", "es": u"Extensión del navegador",
        "fr": u"Extension de navigateur", "hi": u"ब्राउज़र एक्सटेंशन",
        "it": u"Estensione del browser", "pt": u"Extensão do navegador",
        "zh": u"浏览器扩展"},
    "Platform &amp; API": {
        "de": u"Plattform &amp; API", "es": u"Plataforma y API",
        "fr": u"Plateforme et API", "hi": u"प्लेटफ़ॉर्म और API",
        "it": u"Piattaforma e API", "pt": u"Plataforma e API", "zh": u"平台与 API"},
    "Live correction": {
        "de": u"Live-Korrektur", "es": u"Corrección en vivo",
        "fr": u"Correction en direct", "hi": u"लाइव सुधार",
        "it": u"Correzione in tempo reale", "pt": u"Correção ao vivo",
        "zh": u"实时校正"},
    "Use cases": {
        "de": u"Anwendungsfälle", "es": u"Casos de uso", "fr": u"Cas d'usage",
        "hi": u"उपयोग के मामले", "it": u"Casi d'uso", "pt": u"Casos de uso",
        "zh": u"使用场景"},
    "About": {
        "de": u"Über", "es": u"Acerca de", "fr": u"À propos", "hi": u"परिचय",
        "it": u"Informazioni", "pt": u"Sobre", "zh": u"关于"},
    "Methodology": {
        "de": u"Methodik", "es": u"Metodología", "fr": u"Méthodologie",
        "hi": u"कार्यप्रणाली", "it": u"Metodologia", "pt": u"Metodologia", "zh": u"方法"},
    "Impact archive": {
        "de": u"Wirkungsarchiv", "es": u"Archivo de impacto", "fr": u"Archive d'impact",
        "hi": u"प्रभाव संग्रह", "it": u"Archivio degli impatti",
        "pt": u"Arquivo de impacto", "zh": u"影响档案"},
    "Support": {
        "de": u"Hilfe", "es": u"Soporte", "fr": u"Assistance", "hi": u"सहायता",
        "it": u"Assistenza", "pt": u"Suporte", "zh": u"支持"},
    "Privacy": {
        "de": u"Datenschutz", "es": u"Privacidad", "fr": u"Confidentialité",
        "hi": u"गोपनीयता", "it": u"Privacy", "pt": u"Privacidade", "zh": u"隐私"},
    "An F-Keys Creative production": {
        "de": u"Eine Produktion von F-Keys Creative",
        "es": u"Una producción de F-Keys Creative",
        "fr": u"Une production F-Keys Creative",
        "hi": u"F-Keys Creative की प्रस्तुति",
        "it": u"Una produzione F-Keys Creative",
        "pt": u"Uma produção F-Keys Creative",
        "zh": u"F-Keys Creative 出品"},
}

# Strings that carry trailing punctuation or a following link, matched on the opening tag.
PARTIAL = {
    "One published method": {
        "de": u"Eine veröffentlichte Methode", "es": u"Un método publicado",
        "fr": u"Une méthode publiée", "hi": u"एक प्रकाशित विधि",
        "it": u"Un metodo pubblicato", "pt": u"Um método publicado",
        "zh": u"一套公开发表的方法"},
}

NOTE_EN = (u"Educational &amp; accessibility use — not a medical device, diagnosis, "
           u"or a legal ADA/WCAG audit.")
NOTE = {
    "de": u"Für Bildungs- und Barrierefreiheitszwecke — kein Medizinprodukt, keine Diagnose "
          u"und kein rechtsgültiges ADA/WCAG-Audit.",
    "es": u"Uso educativo y de accesibilidad: no es un dispositivo médico, ni un diagnóstico, "
          u"ni una auditoría legal ADA/WCAG.",
    "fr": u"Usage éducatif et d'accessibilité — ni dispositif médical, ni diagnostic, "
          u"ni audit légal ADA/WCAG.",
    "hi": u"शैक्षिक और सुगम्यता उपयोग के लिए — यह चिकित्सा उपकरण, निदान या कानूनी ADA/WCAG ऑडिट नहीं है।",
    "it": u"Uso educativo e di accessibilità — non è un dispositivo medico, una diagnosi "
          u"o un audit legale ADA/WCAG.",
    "pt": u"Uso educacional e de acessibilidade — não é um dispositivo médico, diagnóstico "
          u"ou auditoria legal ADA/WCAG.",
    "zh": u"用于教育和无障碍用途 — 并非医疗器械、诊断或法律意义上的 ADA/WCAG 审计。",
}

BLOCK_RE = re.compile(r'(<!-- oq:nav -->.*?<!-- /oq:nav -->)|(<!-- oq:footer -->.*?<!-- /oq:footer -->)', re.S)
CHECK = "--check" in sys.argv


def translate_block(block, lang):
    out, hits = block, 0
    # Longest first, so "Vision tests" cannot be clipped by a shorter overlapping key.
    for en in sorted(T, key=len, reverse=True):
        tr = T[en].get(lang)
        if not tr:
            continue
        needle = ">" + en + "<"
        n = out.count(needle)
        if n:
            out = out.replace(needle, ">" + tr + "<")
            hits += n
    for en, table in PARTIAL.items():
        tr = table.get(lang)
        if tr and ">" + en + " " in out:
            hits += out.count(">" + en + " ")
            out = out.replace(">" + en + " ", ">" + tr + " ")
    if NOTE_EN in out and NOTE.get(lang):
        out = out.replace(NOTE_EN, NOTE[lang])
        hits += 1
    return out, hits


total_hits, total_files, still_english = 0, 0, []
for lang in LANGS:
    for page in PAGES:
        path = os.path.join(ROOT, lang, page, "index.html")
        if not os.path.exists(path):
            continue
        src = io.open(path, encoding="utf-8").read()
        hits = [0]

        def repl(m):
            block = m.group(0)
            new, n = translate_block(block, lang)
            hits[0] += n
            return new

        new = BLOCK_RE.sub(repl, src)
        # What is still English inside the chrome?
        for m in BLOCK_RE.finditer(new):
            for en in T:
                # A translation that is legitimately identical to the English is not a miss:
                # "Privacy" is the word Italian actually uses.
                if T[en].get(lang) == en:
                    continue
                if ">" + en + "<" in m.group(0):
                    still_english.append("%s/%s: %s" % (lang, page, en))
        if new != src and not CHECK:
            io.open(path, "w", encoding="utf-8", newline="").write(new)
        total_hits += hits[0]
        total_files += 1
        print("  %-14s %3d string(s) %s" % (lang + "/" + page, hits[0],
                                            "(check only)" if CHECK else "translated"))

print()
print("  %d file(s), %d string(s) %s" % (total_files, total_hits,
                                         "would change" if CHECK else "translated"))
if still_english:
    print("  STILL ENGLISH IN CHROME:")
    for s in sorted(set(still_english)):
        print("    " + s)
    sys.exit(1)
print("  no English left in any localized nav or footer")
