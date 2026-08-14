/* OpticQuiz — /color/ string dictionary (Phase 1: intro screen).
   Load BEFORE /assets/oq-i18n.js. UI-chrome strings only; the detailed
   medical result text stays English until a native speaker verifies it. */
window.OQ_LANGS = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "pt", name: "Português" },
  { code: "it", name: "Italiano" },
  { code: "zh", name: "中文" },
  { code: "hi", name: "हिन्दी" }
];
window.OQ_I18N = {
  en: {
    "hdr.badge": "COLOR TEST",
    "intro.eyebrow": "Color Vision Screening",
    "intro.h1": "COLOR<br>VISION<br>TEST",
    "intro.lede": "8 Ishihara-style dot plates, drawn fresh on your screen each time. A digit hides in the dots — normal color vision reads it, red-green or blue-yellow deficiency sees a blank field. Tests both eyes. Results stay on your device.",
    "setup.heading": "Before you begin",
    "check.0.title": "Maximize screen brightness",
    "check.0.sub": "Low brightness shifts perceived hue and reduces plate accuracy.",
    "check.1.title": "Normal indoor or diffuse light",
    "check.1.sub": "Direct sunlight on screen or strong colored ambient light will skew results.",
    "check.2.title": "Remove tinted glasses or lenses",
    "check.2.sub": "Prescription lenses are fine. Tinted, photochromic, or colored lenses are not.",
    "eye.heading": "Select which eye to test first",
    "eye.right": "Right", "eye.right.sub": "Start here",
    "eye.left": "Left", "eye.left.sub": "Or here",
    "eye.note": "You will test both eyes — the other eye follows automatically. Cover the non-testing eye with your palm, not a lens.",
    "btn.start": "Start Test",
    "btn.start.aria": "Start the color vision test",
    "link.alltests": "← All free vision tests"
  },
  es: {
    "hdr.badge": "TEST DE COLOR",
    "intro.eyebrow": "Cribado de la visión del color",
    "intro.h1": "TEST<br>DE VISIÓN<br>DEL COLOR",
    "intro.lede": "8 láminas de puntos estilo Ishihara, generadas de nuevo en tu pantalla cada vez. Un dígito se esconde entre los puntos: la visión normal lo lee; una deficiencia rojo-verde o azul-amarillo ve un campo en blanco. Evalúa ambos ojos. Los resultados se quedan en tu dispositivo.",
    "setup.heading": "Antes de empezar",
    "check.0.title": "Sube el brillo al máximo",
    "check.0.sub": "Un brillo bajo altera el tono percibido y reduce la precisión de las láminas.",
    "check.1.title": "Luz interior normal o difusa",
    "check.1.sub": "La luz solar directa sobre la pantalla o una luz ambiental muy coloreada falsean los resultados.",
    "check.2.title": "Quítate gafas o lentes con tinte",
    "check.2.sub": "Las lentes graduadas están bien. Las lentes tintadas, fotocromáticas o de color, no.",
    "eye.heading": "Elige qué ojo evaluar primero",
    "eye.right": "Derecho", "eye.right.sub": "Empieza aquí",
    "eye.left": "Izquierdo", "eye.left.sub": "O aquí",
    "eye.note": "Evaluarás ambos ojos: el otro ojo sigue automáticamente. Cubre el ojo que no evalúas con la palma de la mano, no con una lente.",
    "btn.start": "Empezar test",
    "btn.start.aria": "Empezar el test de visión del color",
    "link.alltests": "← Todos los test de visión gratuitos"
  },
  fr: {
    "hdr.badge": "TEST COULEUR",
    "intro.eyebrow": "Dépistage de la vision des couleurs",
    "intro.h1": "TEST<br>DE VISION<br>DES COULEURS",
    "intro.lede": "8 planches de points façon Ishihara, générées à neuf sur votre écran à chaque fois. Un chiffre se cache dans les points : une vision normale le lit ; une déficience rouge-vert ou bleu-jaune ne voit qu'un champ uniforme. Teste les deux yeux. Les résultats restent sur votre appareil.",
    "setup.heading": "Avant de commencer",
    "check.0.title": "Réglez la luminosité au maximum",
    "check.0.sub": "Une faible luminosité modifie la teinte perçue et réduit la précision des planches.",
    "check.1.title": "Lumière intérieure normale ou diffuse",
    "check.1.sub": "La lumière directe du soleil sur l'écran ou une lumière ambiante très colorée fausse les résultats.",
    "check.2.title": "Retirez lunettes ou verres teintés",
    "check.2.sub": "Les verres correcteurs, c'est bon. Les verres teintés, photochromiques ou colorés, non.",
    "eye.heading": "Choisissez l'œil à tester en premier",
    "eye.right": "Droit", "eye.right.sub": "Commencez ici",
    "eye.left": "Gauche", "eye.left.sub": "Ou ici",
    "eye.note": "Vous testerez les deux yeux — l'autre œil suit automatiquement. Couvrez l'œil non testé avec la paume, pas avec un verre.",
    "btn.start": "Démarrer le test",
    "btn.start.aria": "Démarrer le test de vision des couleurs",
    "link.alltests": "← Tous les tests de vision gratuits"
  },
  de: {
    "hdr.badge": "FARBTEST",
    "intro.eyebrow": "Farbsehschwäche-Screening",
    "intro.h1": "FARB-<br>SEH-<br>TEST",
    "intro.lede": "8 Ishihara-artige Punkttafeln, jedes Mal frisch auf Ihrem Bildschirm erzeugt. Eine Ziffer versteckt sich in den Punkten – normales Farbsehen liest sie; eine Rot-Grün- oder Blau-Gelb-Schwäche sieht nur eine leere Fläche. Testet beide Augen. Ergebnisse bleiben auf Ihrem Gerät.",
    "setup.heading": "Bevor Sie beginnen",
    "check.0.title": "Bildschirmhelligkeit maximieren",
    "check.0.sub": "Geringe Helligkeit verschiebt den wahrgenommenen Farbton und mindert die Genauigkeit der Tafeln.",
    "check.1.title": "Normales Innen- oder Streulicht",
    "check.1.sub": "Direktes Sonnenlicht auf dem Bildschirm oder stark farbiges Umgebungslicht verfälscht die Ergebnisse.",
    "check.2.title": "Getönte Brillen oder Gläser abnehmen",
    "check.2.sub": "Korrekturgläser sind in Ordnung. Getönte, selbsttönende oder farbige Gläser nicht.",
    "eye.heading": "Wählen Sie, welches Auge zuerst getestet wird",
    "eye.right": "Rechts", "eye.right.sub": "Hier starten",
    "eye.left": "Links", "eye.left.sub": "Oder hier",
    "eye.note": "Sie testen beide Augen – das andere Auge folgt automatisch. Decken Sie das nicht getestete Auge mit der Handfläche ab, nicht mit einem Glas.",
    "btn.start": "Test starten",
    "btn.start.aria": "Den Farbsehtest starten",
    "link.alltests": "← Alle kostenlosen Sehtests"
  },
  pt: {
    "hdr.badge": "TESTE DE COR",
    "intro.eyebrow": "Rastreio da visão de cores",
    "intro.h1": "TESTE<br>DE VISÃO<br>DE CORES",
    "intro.lede": "8 lâminas de pontos no estilo Ishihara, geradas na hora na sua tela a cada vez. Um dígito se esconde nos pontos — a visão normal o enxerga; uma deficiência vermelho-verde ou azul-amarelo vê um campo em branco. Testa os dois olhos. Os resultados ficam no seu dispositivo.",
    "setup.heading": "Antes de começar",
    "check.0.title": "Aumente o brilho da tela ao máximo",
    "check.0.sub": "Brilho baixo altera o tom percebido e reduz a precisão das lâminas.",
    "check.1.title": "Luz interna normal ou difusa",
    "check.1.sub": "Luz solar direta na tela ou luz ambiente muito colorida distorce os resultados.",
    "check.2.title": "Retire óculos ou lentes com tonalidade",
    "check.2.sub": "Lentes de grau tudo bem. Lentes tingidas, fotocromáticas ou coloridas, não.",
    "eye.heading": "Escolha qual olho testar primeiro",
    "eye.right": "Direito", "eye.right.sub": "Comece aqui",
    "eye.left": "Esquerdo", "eye.left.sub": "Ou aqui",
    "eye.note": "Você vai testar os dois olhos — o outro olho segue automaticamente. Cubra o olho que não está sendo testado com a palma da mão, não com uma lente.",
    "btn.start": "Iniciar teste",
    "btn.start.aria": "Iniciar o teste de visão de cores",
    "link.alltests": "← Todos os testes de visão gratuitos"
  },
  it: {
    "hdr.badge": "TEST COLORE",
    "intro.eyebrow": "Screening della visione dei colori",
    "intro.h1": "TEST<br>DELLA VISIONE<br>DEI COLORI",
    "intro.lede": "8 tavole a punti in stile Ishihara, generate ogni volta sul tuo schermo. Una cifra si nasconde tra i punti: la visione normale la legge; un deficit rosso-verde o blu-giallo vede un campo uniforme. Testa entrambi gli occhi. I risultati restano sul tuo dispositivo.",
    "setup.heading": "Prima di iniziare",
    "check.0.title": "Porta la luminosità dello schermo al massimo",
    "check.0.sub": "Una luminosità bassa altera la tonalità percepita e riduce la precisione delle tavole.",
    "check.1.title": "Luce interna normale o diffusa",
    "check.1.sub": "La luce solare diretta sullo schermo o una luce ambientale molto colorata falsa i risultati.",
    "check.2.title": "Togli occhiali o lenti colorate",
    "check.2.sub": "Le lenti da vista vanno bene. Le lenti colorate, fotocromatiche o tinte no.",
    "eye.heading": "Scegli quale occhio testare per primo",
    "eye.right": "Destro", "eye.right.sub": "Inizia qui",
    "eye.left": "Sinistro", "eye.left.sub": "O qui",
    "eye.note": "Testerai entrambi gli occhi: l'altro segue automaticamente. Copri l'occhio non in esame con il palmo, non con una lente.",
    "btn.start": "Inizia il test",
    "btn.start.aria": "Inizia il test della visione dei colori",
    "link.alltests": "← Tutti i test della vista gratuiti"
  },
  zh: {
    "hdr.badge": "色觉测试",
    "intro.eyebrow": "色觉筛查",
    "intro.h1": "色觉<br>测试",
    "intro.lede": "8 张石原氏风格的圆点色盘，每次都会在你的屏幕上重新生成。数字藏在圆点之中——色觉正常者能读出，红绿或蓝黄色觉缺陷者只看到一片空白。双眼分别测试。结果只保留在你的设备上。",
    "setup.heading": "开始之前",
    "check.0.title": "将屏幕亮度调到最高",
    "check.0.sub": "亮度过低会改变感知到的色调，降低色盘的准确性。",
    "check.1.title": "正常的室内光或漫射光",
    "check.1.sub": "屏幕上有直射阳光或强烈的有色环境光都会使结果失真。",
    "check.2.title": "摘下有色眼镜或镜片",
    "check.2.sub": "近视、老花等矫正镜片没问题；有色、变色或彩色镜片则不行。",
    "eye.heading": "选择先测试哪只眼睛",
    "eye.right": "右眼", "eye.right.sub": "从这里开始",
    "eye.left": "左眼", "eye.left.sub": "或从这里",
    "eye.note": "你将测试双眼——另一只眼会自动接续。用手掌遮住未测试的那只眼，不要用镜片。",
    "btn.start": "开始测试",
    "btn.start.aria": "开始色觉测试",
    "link.alltests": "← 所有免费视力测试"
  },
  hi: {
    "hdr.badge": "रंग परीक्षण",
    "intro.eyebrow": "रंग दृष्टि जाँच",
    "intro.h1": "रंग<br>दृष्टि<br>परीक्षण",
    "intro.lede": "इशिहारा शैली की 8 बिंदु-प्लेटें, हर बार आपकी स्क्रीन पर नए सिरे से बनतीं। बिंदुओं में एक अंक छिपा होता है — सामान्य रंग दृष्टि उसे पढ़ लेती है; लाल-हरा या नीला-पीला दोष होने पर केवल खाली क्षेत्र दिखता है। दोनों आँखों की जाँच। परिणाम आपके डिवाइस पर ही रहते हैं।",
    "setup.heading": "शुरू करने से पहले",
    "check.0.title": "स्क्रीन की चमक अधिकतम करें",
    "check.0.sub": "कम चमक से दिखने वाला रंग बदल जाता है और प्लेट की सटीकता घट जाती है।",
    "check.1.title": "सामान्य इनडोर या विसरित रोशनी",
    "check.1.sub": "स्क्रीन पर सीधी धूप या तेज़ रंगीन रोशनी परिणाम बिगाड़ देती है।",
    "check.2.title": "रंगीन चश्मा या लेंस उतार दें",
    "check.2.sub": "नंबर वाले चश्मे ठीक हैं। रंगीन, फोटोक्रोमिक या टिंटेड लेंस नहीं।",
    "eye.heading": "चुनें कि पहले कौन-सी आँख जाँचनी है",
    "eye.right": "दाईं", "eye.right.sub": "यहाँ से शुरू करें",
    "eye.left": "बाईं", "eye.left.sub": "या यहाँ से",
    "eye.note": "आप दोनों आँखों की जाँच करेंगे — दूसरी आँख अपने-आप बाद में आती है। जिस आँख की जाँच नहीं हो रही उसे हथेली से ढकें, लेंस से नहीं।",
    "btn.start": "परीक्षण शुरू करें",
    "btn.start.aria": "रंग दृष्टि परीक्षण शुरू करें",
    "link.alltests": "← सभी निःशुल्क दृष्टि परीक्षण"
  }
};

/* ---------------------------------------------------------------------------
   SEO / head strings. Read by tools/build-i18n-pages.js to stamp <title>, the
   meta description and the Open Graph tags into each generated language variant.

   A language missing any of these four keys is SKIPPED by the generator. That is
   deliberate: an English <title> on a French URL is worse than having no French
   page at all, because it tells Google the page is English and gives the reader a
   result they cannot read.

   These cover the instrument, the procedure and the privacy claim only. Per the
   note at the top of this file, the detailed medical result text stays English
   until a native speaker verifies it, so nothing here interprets a result.
   --------------------------------------------------------------------------- */
(function (D) {
  var SEO = {
    en: {
      "seo.title": "Color Blindness Test — Free Online Ishihara Plates — OpticQuiz",
      "seo.desc": "Free color blindness test — procedurally generated Ishihara plates screen red-green and blue-yellow deficiency per eye, with an honest severity read. On-device.",
      "seo.og.title": "OpticQuiz — Color Vision Screening",
      "seo.og.desc": "8 Ishihara-style plates, drawn fresh each time. Screens red-green and blue-yellow color vision. Free. No account. Results stay on your device."
    },
    fr: {
      "seo.title": "Test de daltonisme — planches d'Ishihara en ligne, gratuit — OpticQuiz",
      "seo.desc": "Test de daltonisme gratuit — des planches d'Ishihara redessinées à chaque essai dépistent les déficiences rouge-vert et bleu-jaune, œil par œil. Tout reste sur votre appareil.",
      "seo.og.title": "OpticQuiz — Dépistage de la vision des couleurs",
      "seo.og.desc": "8 planches de type Ishihara, redessinées à chaque fois. Dépiste la vision des couleurs rouge-vert et bleu-jaune. Gratuit. Sans compte. Les résultats restent sur votre appareil."
    },
    de: {
      "seo.title": "Farbenblindheitstest — kostenlose Ishihara-Tafeln online — OpticQuiz",
      "seo.desc": "Kostenloser Farbenblindheitstest — bei jedem Durchlauf neu erzeugte Ishihara-Tafeln prüfen Rot-Grün- und Blau-Gelb-Schwächen, getrennt für jedes Auge. Alles bleibt auf Ihrem Gerät.",
      "seo.og.title": "OpticQuiz — Screening des Farbsehens",
      "seo.og.desc": "8 Tafeln im Ishihara-Stil, jedes Mal neu gezeichnet. Prüft das Rot-Grün- und Blau-Gelb-Farbsehen. Kostenlos. Ohne Konto. Ergebnisse bleiben auf Ihrem Gerät."
    }
  };
  for (var l in SEO) { if (D[l]) { for (var k in SEO[l]) { D[l][k] = SEO[l][k]; } } }
})(window.OQ_I18N);

/* SEO / head strings, wave 2. Each title leads with the SAME term this language's own
   intro.h1 already uses, because /de/ shipped with an h1 saying "Farbsehtest" under a title
   saying "Farbenblindheitstest" — two different terms on one page, the title bidding for a
   phrase the page did not deliver. Consistency here is a correctness choice, not a keyword
   choice: none of these terms has been validated against search volume, and Search Console
   query data per /{lang}/color/ is the instrument that will settle that.

   As above, these describe the instrument, the procedure and the privacy claim. None
   interprets a result. */
(function (D) {
  var SEO = {
    es: {
      "seo.title": "Test de visión del color — láminas de Ishihara online, gratis — OpticQuiz",
      "seo.desc": "Test de visión del color gratuito: láminas de Ishihara generadas de nuevo en cada intento detectan deficiencias rojo-verde y azul-amarillo, ojo por ojo. Todo queda en tu dispositivo.",
      "seo.og.title": "OpticQuiz — Cribado de la visión del color",
      "seo.og.desc": "8 láminas estilo Ishihara, dibujadas de nuevo cada vez. Detecta la visión del color rojo-verde y azul-amarillo. Gratis. Sin cuenta. Los resultados quedan en tu dispositivo."
    },
    pt: {
      "seo.title": "Teste de visão de cores — lâminas de Ishihara online, grátis — OpticQuiz",
      "seo.desc": "Teste de visão de cores gratuito: lâminas de Ishihara geradas na hora a cada tentativa rastreiam deficiências vermelho-verde e azul-amarelo, olho a olho. Tudo fica no seu dispositivo.",
      "seo.og.title": "OpticQuiz — Rastreio da visão de cores",
      "seo.og.desc": "8 lâminas no estilo Ishihara, desenhadas de novo a cada vez. Rastreia a visão de cores vermelho-verde e azul-amarelo. Grátis. Sem conta. Os resultados ficam no seu dispositivo."
    },
    it: {
      "seo.title": "Test della visione dei colori — tavole di Ishihara online, gratis — OpticQuiz",
      "seo.desc": "Test della visione dei colori gratuito: tavole di Ishihara generate ogni volta rilevano le deficienze rosso-verde e blu-giallo, occhio per occhio. Tutto resta sul tuo dispositivo.",
      "seo.og.title": "OpticQuiz — Screening della visione dei colori",
      "seo.og.desc": "8 tavole in stile Ishihara, ridisegnate ogni volta. Rileva la visione dei colori rosso-verde e blu-giallo. Gratis. Senza account. I risultati restano sul tuo dispositivo."
    },
    zh: {
      "seo.title": "色觉测试 — 免费在线石原氏色盘 — OpticQuiz",
      "seo.desc": "免费色觉测试：每次重新生成的石原氏风格色盘，分别检测左右眼的红绿与蓝黄色觉缺陷。所有结果只保留在你的设备上。",
      "seo.og.title": "OpticQuiz — 色觉筛查",
      "seo.og.desc": "8 张石原氏风格色盘，每次重新绘制。检测红绿与蓝黄色觉。免费，无需账号，结果只留在你的设备上。"
    },
    hi: {
      "seo.title": "रंग दृष्टि परीक्षण — मुफ़्त ऑनलाइन इशिहारा प्लेटें — OpticQuiz",
      "seo.desc": "मुफ़्त रंग दृष्टि परीक्षण: हर बार नए सिरे से बनने वाली इशिहारा प्लेटें प्रत्येक आँख की लाल-हरी और नीली-पीली रंग-दृष्टि कमी की जाँच करती हैं। परिणाम आपके डिवाइस पर ही रहते हैं।",
      "seo.og.title": "OpticQuiz — रंग दृष्टि जाँच",
      "seo.og.desc": "इशिहारा शैली की 8 प्लेटें, हर बार नए सिरे से बनतीं। लाल-हरी और नीली-पीली रंग दृष्टि की जाँच। मुफ़्त। खाता नहीं चाहिए। परिणाम आपके डिवाइस पर ही रहते हैं।"
    }
  };
  for (var l in SEO) { if (D[l]) { for (var k in SEO[l]) { D[l][k] = SEO[l][k]; } } }
})(window.OQ_I18N);

/* About / FAQ section keys. The /color/ page shipped in seven languages on 2026-08-13 with this
   section still in English — roughly 21% of the page text, because the July Phase 1 dictionary
   covered the intro screen only. A translated URL whose body is a fifth English is mixed-language
   content, which is exactly what those pages were built to stop being.

   The en values are generated from color/index.html itself, not retyped, so the dictionary cannot
   drift from the markup. Link labels are translated while the hrefs still point at English
   articles: a reader deserves to know what a link leads to even when the destination is not
   translated yet. */
(function (D) {
  var S = {
    en: {
      "about.h2": "About this color blindness test",
      "about.p1": "This free online color blindness test uses <strong>Ishihara-style dot plates</strong> — the hidden-number design used in eye clinics for over a century. Each plate is generated fresh in your browser: a digit is drawn in dots that differ from the background only in <strong>hue</strong>, along a red-green or blue-yellow confusion line, while dot size and brightness are randomized so you can't cheat by shape or shading. If your color vision separates those hues, the number pops out; if it doesn't, you see a uniform field.",
      "about.p2": "<strong>How these plates are generated.</strong> Every plate is drawn procedurally in JavaScript the moment the test loads — there are <strong>no stored, scanned, or scraped Ishihara images</strong> anywhere on this site. The dots are packed live, the hidden figure is separated from the background only along a color-confusion axis, and the lightness of every dot is randomized within a shared band on each run. Because of that, <strong>no two runs are identical</strong>: a plate can't be memorized, screenshotted, or traced by brightness — only genuine hue discrimination reveals the figure. Most free online color tests reuse the same fixed public-domain plate images; this one does not, which is what makes it a fresh screen every time rather than a picture quiz.",
      "about.p3": "You'll see 8 plates per eye — five red-green, two blue-yellow (tritan), and one lightness-only control that everyone can read. Scoring is a plain count of how many you read correctly on each axis, not a black-box \"AI\" verdict or invented probability. The result is an honest screen: it can flag a likely <strong>red-green</strong> or <strong>tritan</strong> deficiency and give a coarse severity band, but a screen cannot separate protanopia from deuteranopia, and it is never a diagnosis.",
      "faq.0.a": "It's a useful screen, not a diagnosis. Uncalibrated screens shift results between devices, but a plate test built from real confusion-axis colors can reliably flag a likely deficiency. Confirm anything meaningful with an eye-care professional.",
      "faq.0.q": "How accurate is an online color blindness test?",
      "faq.1.a": "No — it detects the shared red-green confusion pattern, but separating protan from deutan needs a clinician's anomaloscope or diagnostic plates.",
      "faq.1.q": "Can this test tell if I'm protan or deutan?",
      "faq.2.a": "Yes — it gives an honest severity read (none, borderline, mild, moderate, or strong) from how many red-green plates you missed, and shows the exact count it's based on. On five plates that band is coarse: a single plate can shift it, and an uncalibrated screen can too. For a finer read, the saturation and red-green match tests grade further — and a clinician's anomaloscope grades it properly.",
      "faq.2.q": "Does this test show how severe my color blindness is?",
      "faq.3.a": "Inherited color blindness is the same in both eyes, but a one-eye difference can point to an acquired change worth examining — and per-eye testing improves reliability.",
      "faq.3.q": "Why test each eye separately?",
      "faq.4.a": "Yes — free, no account, and it runs entirely on your device. Nothing is uploaded or stored.",
      "faq.4.q": "Is this test free?",
      "faq.h2": "Frequently asked questions",
      "links.0": "<strong>This test's method is published</strong> — read the open-access paper &amp; open source →",
      "links.1": "Designing something? Check your color palette is colorblind-safe →",
      "links.2": "Testing a young child? Use the shape-based Color Test for Kids →",
      "links.3": "Read: Color Blindness, Explained →",
      "links.4": "Read: How Ishihara Plates Work →",
      "links.5": "Read: How Accurate Are Online Color Blindness Tests? →",
      "links.6": "Read: Which Color Vision Test Is Most Accurate? →",
      "links.7": "Try: the Anomaloscope red-green matching test →"
    },
    es: {
      "about.h2": "Sobre este test de daltonismo",
      "about.p1": "Este test gratuito de visión del color en línea usa <strong>láminas de puntos estilo Ishihara</strong>: el diseño de número oculto que se usa en las consultas oftalmológicas desde hace más de un siglo. Cada lámina se genera de nuevo en tu navegador: un dígito se dibuja con puntos que se diferencian del fondo solo en el <strong>tono</strong>, a lo largo de una línea de confusión rojo-verde o azul-amarillo, mientras que el tamaño y el brillo de los puntos se aleatorizan para que no puedas hacer trampa por forma o sombreado. Si tu visión del color separa esos tonos, el número salta a la vista; si no, ves un campo uniforme.",
      "about.p2": "<strong>Cómo se generan estas láminas.</strong> Cada lámina se dibuja de forma procedimental en JavaScript en el momento en que se carga el test: <strong>no hay imágenes de Ishihara almacenadas, escaneadas ni copiadas</strong> en ningún lugar de este sitio. Los puntos se empaquetan en vivo, la figura oculta se separa del fondo solo a lo largo de un eje de confusión de color, y la luminosidad de cada punto se aleatoriza dentro de una banda común en cada ejecución. Por eso <strong>no hay dos ejecuciones idénticas</strong>: una lámina no se puede memorizar, capturar en pantalla ni trazar por brillo; solo una discriminación real del tono revela la figura. La mayoría de los tests de color gratuitos en línea reutilizan las mismas imágenes fijas de dominio público; este no, y eso es lo que lo convierte en un cribado nuevo cada vez en lugar de un cuestionario con fotos.",
      "about.p3": "Verás 8 láminas por ojo: cinco rojo-verde, dos azul-amarillo (tritán) y un control solo de luminosidad que todo el mundo puede leer. La puntuación es un simple recuento de cuántas leíste correctamente en cada eje, no un veredicto opaco de «IA» ni una probabilidad inventada. El resultado es un cribado honesto: puede señalar una probable deficiencia <strong>rojo-verde</strong> o <strong>tritán</strong> y dar una banda de gravedad aproximada, pero una pantalla no puede separar la protanopía de la deuteranopía, y nunca es un diagnóstico.",
      "faq.0.a": "Es un cribado útil, no un diagnóstico. Las pantallas sin calibrar desplazan los resultados entre dispositivos, pero un test de láminas construido con colores de ejes de confusión reales puede señalar de forma fiable un patrón probable. La confirmación necesita láminas calibradas clínicamente o un anomaloscopio.",
      "faq.0.q": "¿Qué precisión tiene un test de daltonismo en línea?",
      "faq.1.a": "No: detecta el patrón de confusión rojo-verde compartido, pero separar protán de deután requiere el anomaloscopio de un clínico o láminas diagnósticas.",
      "faq.1.q": "¿Puede este test decirme si soy protán o deután?",
      "faq.2.a": "Sí: da una lectura honesta de gravedad (ninguna, límite, leve, moderada o fuerte) según cuántas láminas rojo-verde fallaste, y muestra el recuento exacto del que sale esa banda. Con cinco láminas la banda es gruesa y una pantalla sin calibrar también la desplaza, así que es una estimación, no un grado clínico.",
      "faq.2.q": "¿Muestra este test la gravedad de mi daltonismo?",
      "faq.3.a": "El daltonismo hereditario es igual en ambos ojos, pero una diferencia en un solo ojo puede apuntar a un cambio adquirido que conviene examinar, y evaluar ojo por ojo mejora la fiabilidad al detectar un despiste en cualquiera de los lados.",
      "faq.3.q": "¿Por qué hay que evaluar cada ojo por separado?",
      "faq.4.a": "Sí: gratuito, sin cuenta, y funciona enteramente en tu dispositivo. No se sube ni se almacena nada.",
      "faq.4.q": "¿Este test es gratuito?",
      "faq.h2": "Preguntas frecuentes",
      "links.0": "<strong>El método de este test está publicado</strong> — lee el artículo de acceso abierto y el código fuente →",
      "links.1": "¿Estás diseñando algo? Comprueba que tu paleta de colores sea segura para daltónicos →",
      "links.2": "¿Vas a evaluar a un niño pequeño? Usa el test de color con formas para niños →",
      "links.3": "Leer: el daltonismo, explicado →",
      "links.4": "Leer: cómo funcionan las láminas de Ishihara →",
      "links.5": "Leer: ¿qué precisión tienen los tests de daltonismo en línea? →",
      "links.6": "Leer: ¿qué test de visión del color es más preciso? →",
      "links.7": "Probar: el anomaloscopio, test de igualación rojo-verde →"
    },
    fr: {
      "about.h2": "À propos de ce test de daltonisme",
      "about.p1": "Ce test de vision des couleurs gratuit en ligne utilise des <strong>planches de points de type Ishihara</strong> — le principe du nombre caché employé en cabinet d'ophtalmologie depuis plus d'un siècle. Chaque planche est générée à neuf dans votre navigateur : un chiffre est dessiné avec des points qui ne diffèrent du fond que par la <strong>teinte</strong>, le long d'une ligne de confusion rouge-vert ou bleu-jaune, tandis que la taille et la luminosité des points sont randomisées pour que vous ne puissiez pas tricher par la forme ou l'ombrage. Si votre vision des couleurs sépare ces teintes, le chiffre saute aux yeux ; sinon, vous voyez un champ uniforme.",
      "about.p2": "<strong>Comment ces planches sont générées.</strong> Chaque planche est dessinée de façon procédurale en JavaScript au moment où le test se charge — il n'y a <strong>aucune image d'Ishihara stockée, scannée ou récupérée</strong> nulle part sur ce site. Les points sont assemblés en direct, la figure cachée n'est séparée du fond que le long d'un axe de confusion des couleurs, et la clarté de chaque point est randomisée dans une bande commune à chaque exécution. De ce fait, <strong>deux exécutions ne sont jamais identiques</strong> : une planche ne peut être mémorisée, capturée en image ni tracée par la luminosité — seule une véritable discrimination de teinte révèle la figure. La plupart des tests de couleur gratuits en ligne réutilisent les mêmes images fixes du domaine public ; celui-ci non, et c'est ce qui en fait un dépistage neuf à chaque fois plutôt qu'un questionnaire illustré.",
      "about.p3": "Vous verrez 8 planches par œil — cinq rouge-vert, deux bleu-jaune (tritan) et un contrôle en clarté seule que tout le monde peut lire. La notation est un simple décompte des planches lues correctement sur chaque axe, et non un verdict opaque « d'IA » ni une probabilité inventée. Le résultat est un dépistage honnête : il peut signaler une probable déficience <strong>rouge-vert</strong> ou <strong>tritan</strong> et donner une bande de sévérité grossière, mais un écran ne peut pas séparer la protanopie de la deutéranopie, et ce n'est jamais un diagnostic.",
      "faq.0.a": "C'est un dépistage utile, pas un diagnostic. Les écrans non calibrés décalent les résultats d'un appareil à l'autre, mais un test de planches construit à partir de vraies couleurs d'axes de confusion peut signaler de façon fiable un profil probable. La confirmation exige des planches calibrées cliniquement ou un anomaloscope.",
      "faq.0.q": "Quelle est la fiabilité d'un test de daltonisme en ligne ?",
      "faq.1.a": "Non — il détecte le schéma de confusion rouge-vert commun aux deux, mais séparer protan de deutan demande l'anomaloscope d'un clinicien ou des planches diagnostiques.",
      "faq.1.q": "Ce test peut-il dire si je suis protan ou deutan ?",
      "faq.2.a": "Oui — il donne une lecture honnête de sévérité (aucune, limite, légère, modérée ou forte) à partir du nombre de planches rouge-vert manquées, et affiche le décompte exact dont provient cette bande. Sur cinq planches la bande est grossière, et un écran non calibré la décale aussi : c'est une estimation, pas un grade clinique.",
      "faq.2.q": "Ce test indique-t-il la sévérité de mon daltonisme ?",
      "faq.3.a": "Le daltonisme héréditaire est identique dans les deux yeux, mais une différence sur un seul œil peut signaler un changement acquis qui mérite un examen — et tester œil par œil améliore la fiabilité en repérant un moment d'inattention d'un côté ou de l'autre.",
      "faq.3.q": "Pourquoi tester chaque œil séparément ?",
      "faq.4.a": "Oui — gratuit, sans compte, et il fonctionne entièrement sur votre appareil. Rien n'est envoyé ni conservé.",
      "faq.4.q": "Ce test est-il gratuit ?",
      "faq.h2": "Questions fréquentes",
      "links.0": "<strong>La méthode de ce test est publiée</strong> — lisez l'article en accès libre et le code source →",
      "links.1": "Vous concevez quelque chose ? Vérifiez que votre palette est sûre pour les daltoniens →",
      "links.2": "Vous testez un jeune enfant ? Utilisez le test de couleur par formes pour enfants →",
      "links.3": "À lire : le daltonisme, expliqué →",
      "links.4": "À lire : comment fonctionnent les planches d'Ishihara →",
      "links.5": "À lire : quelle est la fiabilité des tests de daltonisme en ligne ? →",
      "links.6": "À lire : quel test de vision des couleurs est le plus précis ? →",
      "links.7": "À essayer : l'anomaloscope, test d'égalisation rouge-vert →"
    },
    de: {
      "about.h2": "Über diesen Farbenblindheitstest",
      "about.p1": "Dieser kostenlose Online-Test des Farbsehens verwendet <strong>Punkttafeln im Ishihara-Stil</strong> — das Prinzip der versteckten Zahl, das seit über hundert Jahren in Augenarztpraxen eingesetzt wird. Jede Tafel wird in Ihrem Browser neu erzeugt: Eine Ziffer wird aus Punkten gezeichnet, die sich vom Hintergrund nur im <strong>Farbton</strong> unterscheiden, entlang einer Rot-Grün- oder Blau-Gelb-Verwechslungslinie, während Punktgröße und Helligkeit zufällig variiert werden, damit Sie nicht über Form oder Schattierung schummeln können. Trennt Ihr Farbsehen diese Töne, springt die Zahl hervor; wenn nicht, sehen Sie eine gleichmäßige Fläche.",
      "about.p2": "<strong>Wie diese Tafeln erzeugt werden.</strong> Jede Tafel wird in dem Moment, in dem der Test lädt, prozedural in JavaScript gezeichnet — auf dieser Website liegen <strong>keine gespeicherten, gescannten oder kopierten Ishihara-Bilder</strong>. Die Punkte werden live gepackt, die versteckte Figur wird nur entlang einer Farbverwechslungsachse vom Hintergrund getrennt, und die Helligkeit jedes Punktes wird bei jedem Durchlauf innerhalb eines gemeinsamen Bandes zufällig gewählt. Deshalb sind <strong>keine zwei Durchläufe gleich</strong>: Eine Tafel lässt sich nicht auswendig lernen, per Screenshot festhalten oder über die Helligkeit nachzeichnen — nur echte Farbtonunterscheidung zeigt die Figur. Die meisten kostenlosen Online-Farbtests verwenden immer dieselben gemeinfreien Tafelbilder; dieser nicht, und genau das macht ihn jedes Mal zu einem frischen Screening statt zu einem Bilderquiz.",
      "about.p3": "Sie sehen 8 Tafeln pro Auge — fünf Rot-Grün, zwei Blau-Gelb (Tritan) und eine reine Helligkeitskontrolle, die jeder lesen kann. Die Auswertung ist eine schlichte Zählung, wie viele Sie auf jeder Achse richtig gelesen haben, kein undurchsichtiges „KI“-Urteil und keine erfundene Wahrscheinlichkeit. Das Ergebnis ist ein ehrliches Screening: Es kann auf eine wahrscheinliche <strong>Rot-Grün</strong>- oder <strong>Tritan</strong>-Schwäche hinweisen und ein grobes Schweregradband angeben, aber ein Bildschirm kann Protanopie nicht von Deuteranopie trennen, und es ist nie eine Diagnose.",
      "faq.0.a": "Er ist ein nützliches Screening, keine Diagnose. Unkalibrierte Bildschirme verschieben die Ergebnisse zwischen Geräten, aber ein Tafeltest aus echten Verwechslungsachsen-Farben kann ein wahrscheinliches Muster zuverlässig anzeigen. Die Bestätigung braucht klinisch kalibrierte Tafeln oder ein Anomaloskop.",
      "faq.0.q": "Wie genau ist ein Online-Farbenblindheitstest?",
      "faq.1.a": "Nein — er erkennt das gemeinsame Rot-Grün-Verwechslungsmuster, aber Protan von Deutan zu trennen erfordert das Anomaloskop einer Fachperson oder diagnostische Tafeln.",
      "faq.1.q": "Kann dieser Test sagen, ob ich Protan oder Deutan bin?",
      "faq.2.a": "Ja — er gibt eine ehrliche Schweregradangabe (keine, grenzwertig, leicht, mittel oder stark) danach, wie viele Rot-Grün-Tafeln Sie verfehlt haben, und nennt die genaue Zahl, aus der dieses Band stammt. Bei fünf Tafeln ist das Band grob, und ein unkalibrierter Bildschirm verschiebt es zusätzlich — es ist eine Schätzung, kein klinischer Grad.",
      "faq.2.q": "Zeigt dieser Test, wie stark meine Farbenblindheit ist?",
      "faq.3.a": "Angeborene Farbenblindheit ist auf beiden Augen gleich, aber ein Unterschied auf einem Auge kann auf eine erworbene Veränderung hinweisen, die eine Untersuchung wert ist — und die Prüfung Auge für Auge erhöht die Zuverlässigkeit, weil sie einen Aufmerksamkeitsfehler auf einer Seite auffängt.",
      "faq.3.q": "Warum jedes Auge einzeln testen?",
      "faq.4.a": "Ja — kostenlos, ohne Konto, und er läuft vollständig auf Ihrem Gerät. Nichts wird hochgeladen oder gespeichert.",
      "faq.4.q": "Ist dieser Test kostenlos?",
      "faq.h2": "Häufige Fragen",
      "links.0": "<strong>Die Methode dieses Tests ist veröffentlicht</strong> — lesen Sie den Open-Access-Artikel und den Quellcode →",
      "links.1": "Sie gestalten etwas? Prüfen Sie, ob Ihre Farbpalette für Farbenblinde sicher ist →",
      "links.2": "Sie testen ein kleines Kind? Nutzen Sie den formbasierten Farbtest für Kinder →",
      "links.3": "Lesen: Farbenblindheit, erklärt →",
      "links.4": "Lesen: Wie Ishihara-Tafeln funktionieren →",
      "links.5": "Lesen: Wie genau sind Online-Farbenblindheitstests? →",
      "links.6": "Lesen: Welcher Farbsehtest ist am genauesten? →",
      "links.7": "Ausprobieren: das Anomaloskop, Rot-Grün-Abgleichstest →"
    },
    pt: {
      "about.h2": "Sobre este teste de daltonismo",
      "about.p1": "Este teste gratuito de visão de cores online usa <strong>lâminas de pontos no estilo Ishihara</strong> — o desenho de número oculto usado em consultórios oftalmológicos há mais de um século. Cada lâmina é gerada de novo no seu navegador: um dígito é desenhado com pontos que diferem do fundo apenas na <strong>matiz</strong>, ao longo de uma linha de confusão vermelho-verde ou azul-amarelo, enquanto o tamanho e o brilho dos pontos são aleatorizados para que não seja possível trapacear pela forma ou pelo sombreado. Se a sua visão de cores separa essas matizes, o número salta à vista; se não, você vê um campo uniforme.",
      "about.p2": "<strong>Como estas lâminas são geradas.</strong> Cada lâmina é desenhada proceduralmente em JavaScript no momento em que o teste carrega — <strong>não há imagens de Ishihara guardadas, digitalizadas ou copiadas</strong> em nenhum lugar deste site. Os pontos são organizados ao vivo, a figura oculta é separada do fundo apenas ao longo de um eixo de confusão de cor, e a luminosidade de cada ponto é aleatorizada dentro de uma faixa comum a cada execução. Por isso, <strong>não há duas execuções iguais</strong>: uma lâmina não pode ser memorizada, capturada em imagem nem traçada pelo brilho — só a discriminação real de matiz revela a figura. A maioria dos testes de cor gratuitos online reutiliza as mesmas imagens fixas de domínio público; este não, e é isso que faz dele um rastreio novo a cada vez, em vez de um questionário com fotos.",
      "about.p3": "Você verá 8 lâminas por olho — cinco vermelho-verde, duas azul-amarelo (tritan) e um controlo apenas de luminosidade que toda a gente consegue ler. A pontuação é uma contagem simples de quantas leu corretamente em cada eixo, não um veredicto opaco de «IA» nem uma probabilidade inventada. O resultado é um rastreio honesto: pode assinalar uma provável deficiência <strong>vermelho-verde</strong> ou <strong>tritan</strong> e dar uma faixa de gravidade aproximada, mas um ecrã não consegue separar protanopia de deuteranopia, e nunca é um diagnóstico.",
      "faq.0.a": "É um rastreio útil, não um diagnóstico. Ecrãs não calibrados deslocam os resultados entre dispositivos, mas um teste de lâminas construído com cores reais de eixos de confusão consegue assinalar de forma fiável um padrão provável. A confirmação exige lâminas calibradas clinicamente ou um anomaloscópio.",
      "faq.0.q": "Qual é a precisão de um teste de daltonismo online?",
      "faq.1.a": "Não — deteta o padrão de confusão vermelho-verde comum aos dois, mas separar protan de deutan exige o anomaloscópio de um clínico ou lâminas de diagnóstico.",
      "faq.1.q": "Este teste consegue dizer se sou protan ou deutan?",
      "faq.2.a": "Sim — dá uma leitura honesta de gravidade (nenhuma, limítrofe, ligeira, moderada ou forte) a partir de quantas lâminas vermelho-verde falhou, e mostra a contagem exata de onde vem essa faixa. Com cinco lâminas a faixa é grosseira, e um ecrã não calibrado também a desloca — é uma estimativa, não um grau clínico.",
      "faq.2.q": "Este teste mostra a gravidade do meu daltonismo?",
      "faq.3.a": "O daltonismo hereditário é igual nos dois olhos, mas uma diferença num só olho pode indicar uma alteração adquirida que vale a pena examinar — e testar olho a olho melhora a fiabilidade ao apanhar uma distração de qualquer dos lados.",
      "faq.3.q": "Porquê testar cada olho separadamente?",
      "faq.4.a": "Sim — gratuito, sem conta, e funciona inteiramente no seu dispositivo. Nada é enviado nem guardado.",
      "faq.4.q": "Este teste é gratuito?",
      "faq.h2": "Perguntas frequentes",
      "links.0": "<strong>O método deste teste está publicado</strong> — leia o artigo de acesso aberto e o código fonte →",
      "links.1": "Está a desenhar alguma coisa? Verifique se a sua paleta é segura para daltónicos →",
      "links.2": "Vai testar uma criança pequena? Use o teste de cor por formas para crianças →",
      "links.3": "Ler: daltonismo, explicado →",
      "links.4": "Ler: como funcionam as lâminas de Ishihara →",
      "links.5": "Ler: qual a precisão dos testes de daltonismo online? →",
      "links.6": "Ler: qual teste de visão de cores é mais preciso? →",
      "links.7": "Experimentar: o anomaloscópio, teste de igualação vermelho-verde →"
    },
    it: {
      "about.h2": "Informazioni su questo test del daltonismo",
      "about.p1": "Questo test gratuito online della visione dei colori usa <strong>tavole a punti in stile Ishihara</strong> — il principio del numero nascosto impiegato negli studi oculistici da oltre un secolo. Ogni tavola è generata da capo nel tuo browser: una cifra è disegnata con punti che differiscono dallo sfondo solo per la <strong>tinta</strong>, lungo una linea di confusione rosso-verde o blu-giallo, mentre dimensione e luminosità dei punti sono randomizzate perché tu non possa barare con la forma o l'ombreggiatura. Se la tua visione dei colori separa quelle tinte, il numero salta all'occhio; altrimenti vedi un campo uniforme.",
      "about.p2": "<strong>Come vengono generate queste tavole.</strong> Ogni tavola è disegnata proceduralmente in JavaScript nel momento in cui il test si carica — su questo sito <strong>non esistono immagini di Ishihara memorizzate, scansionate o copiate</strong>. I punti vengono disposti dal vivo, la figura nascosta è separata dallo sfondo solo lungo un asse di confusione cromatica, e la chiarezza di ogni punto è randomizzata entro una banda comune a ogni esecuzione. Per questo <strong>due esecuzioni non sono mai identiche</strong>: una tavola non può essere memorizzata, catturata con uno screenshot o ricalcata dalla luminosità — solo una vera discriminazione di tinta rivela la figura. La maggior parte dei test di colore gratuiti online riutilizza le stesse immagini fisse di pubblico dominio; questo no, ed è ciò che lo rende uno screening nuovo ogni volta anziché un quiz per immagini.",
      "about.p3": "Vedrai 8 tavole per occhio — cinque rosso-verde, due blu-giallo (tritan) e un controllo di sola luminosità che chiunque può leggere. Il punteggio è un semplice conteggio di quante ne hai lette correttamente su ciascun asse, non un verdetto opaco di «IA» né una probabilità inventata. Il risultato è uno screening onesto: può segnalare una probabile deficienza <strong>rosso-verde</strong> o <strong>tritan</strong> e dare una banda di gravità approssimativa, ma uno schermo non può separare la protanopia dalla deuteranopia, e non è mai una diagnosi.",
      "faq.0.a": "È uno screening utile, non una diagnosi. Gli schermi non calibrati spostano i risultati tra dispositivi, ma un test a tavole costruito con colori reali degli assi di confusione può segnalare in modo affidabile un profilo probabile. La conferma richiede tavole calibrate clinicamente o un anomaloscopio.",
      "faq.0.q": "Quanto è accurato un test del daltonismo online?",
      "faq.1.a": "No — rileva lo schema di confusione rosso-verde comune a entrambi, ma separare protan da deutan richiede l'anomaloscopio di un clinico o tavole diagnostiche.",
      "faq.1.q": "Questo test può dirmi se sono protan o deutan?",
      "faq.2.a": "Sì — fornisce una lettura onesta della gravità (nessuna, borderline, lieve, moderata o forte) in base a quante tavole rosso-verde hai sbagliato, e mostra il conteggio esatto da cui deriva quella banda. Su cinque tavole la banda è grossolana, e uno schermo non calibrato la sposta ulteriormente: è una stima, non un grado clinico.",
      "faq.2.q": "Questo test indica quanto è grave il mio daltonismo?",
      "faq.3.a": "Il daltonismo ereditario è uguale in entrambi gli occhi, ma una differenza su un solo occhio può indicare un cambiamento acquisito che vale la pena esaminare — e testare occhio per occhio migliora l'affidabilità intercettando un calo di attenzione da un lato o dall'altro.",
      "faq.3.q": "Perché testare ogni occhio separatamente?",
      "faq.4.a": "Sì — gratuito, senza account, e funziona interamente sul tuo dispositivo. Nulla viene caricato o conservato.",
      "faq.4.q": "Questo test è gratuito?",
      "faq.h2": "Domande frequenti",
      "links.0": "<strong>Il metodo di questo test è pubblicato</strong> — leggi l'articolo ad accesso aperto e il codice sorgente →",
      "links.1": "Stai progettando qualcosa? Verifica che la tua palette sia sicura per i daltonici →",
      "links.2": "Devi testare un bambino piccolo? Usa il test dei colori con le forme per bambini →",
      "links.3": "Leggi: il daltonismo, spiegato →",
      "links.4": "Leggi: come funzionano le tavole di Ishihara →",
      "links.5": "Leggi: quanto sono accurati i test del daltonismo online? →",
      "links.6": "Leggi: quale test della visione dei colori è più accurato? →",
      "links.7": "Prova: l'anomaloscopio, test di equiparazione rosso-verde →"
    },
    zh: {
      "about.h2": "关于这个色盲测试",
      "about.p1": "这个免费的在线色觉测试使用<strong>石原氏风格的圆点色盘</strong>——一个多世纪以来眼科诊室一直使用的隐藏数字设计。每张色盘都在你的浏览器里重新生成：数字由一些圆点组成，它们与背景仅在<strong>色调</strong>上不同，沿着红绿或蓝黄混淆线排布；同时圆点的大小和亮度被随机化，因此你无法靠形状或明暗作弊。如果你的色觉能分辨这些色调，数字就会跳出来；如果不能，你只会看到一片均匀的圆点。",
      "about.p2": "<strong>这些色盘是如何生成的。</strong>每张色盘都在测试加载的那一刻由 JavaScript 程序化绘制——本站<strong>没有任何存储、扫描或抓取的石原氏图片</strong>。圆点是实时排布的，隐藏图形只沿颜色混淆轴与背景分离，且每次运行时每个圆点的明度都会在同一区间内随机取值。正因如此，<strong>没有两次运行是完全相同的</strong>：色盘无法被背下来、截图保存或按亮度描摹——只有真正的色调辨别才能看出图形。大多数免费在线色觉测试反复使用同一组公有领域的固定图片；本测试不是，这正是它每次都是一次全新筛查、而不是一场看图问答的原因。",
      "about.p3": "每只眼睛会看到 8 张色盘——五张红绿、两张蓝黄（三色异常），以及一张所有人都能读出的纯明度对照盘。评分只是简单统计你在每条轴上读对了几张，而不是不透明的“人工智能”判定或凭空生成的概率。结果是一次诚实的筛查：它能提示可能的<strong>红绿</strong>或<strong>蓝黄</strong>色觉缺陷，并给出一个粗略的严重程度区间，但屏幕无法区分红色盲与绿色盲，而且它绝不是诊断。",
      "faq.0.a": "它是一次有用的筛查，不是诊断。未经校准的屏幕会让结果在不同设备之间发生偏移，但用真实混淆轴颜色构建的色盘测试能够可靠地提示一种可能的模式。确诊需要经过临床校准的色盘或色觉异常镜。",
      "faq.0.q": "在线色盲测试有多准确？",
      "faq.1.a": "不能——它检测的是两者共有的红绿混淆模式，而区分红色弱与绿色弱需要临床医生的色觉异常镜或诊断用色盘。",
      "faq.1.q": "这个测试能分辨我是红色弱还是绿色弱吗？",
      "faq.2.a": "会——它会根据你错过了多少张红绿色盘给出一个诚实的严重程度（无、临界、轻度、中度或重度），并显示得出该区间的确切张数。只有五张色盘时区间比较粗，未校准的屏幕也会让它偏移，所以这是一个估计值，而不是临床分级。",
      "faq.2.q": "这个测试会显示我的色盲有多严重吗？",
      "faq.3.a": "遗传性色盲在两只眼睛上是相同的，但单眼出现差异可能提示某种后天变化，值得进一步检查——而且逐眼测试还能发现某一侧的注意力失误，从而提高可靠性。",
      "faq.3.q": "为什么要分别测试每只眼睛？",
      "faq.4.a": "免费——无需账号，并且完全在你的设备上运行。没有任何内容被上传或存储。",
      "faq.4.q": "这个测试免费吗？",
      "faq.h2": "常见问题",
      "links.0": "<strong>本测试的方法已公开发表</strong>——阅读开放获取论文与开源代码 →",
      "links.1": "在做设计吗？检查你的配色方案对色觉缺陷者是否友好 →",
      "links.2": "要测试幼儿吗？请使用基于图形的儿童色觉测试 →",
      "links.3": "阅读：色盲是怎么回事 →",
      "links.4": "阅读：石原氏色盘的工作原理 →",
      "links.5": "阅读：在线色盲测试有多准确？ →",
      "links.6": "阅读：哪种色觉测试最准确？ →",
      "links.7": "试试：色觉异常镜，红绿匹配测试 →"
    },
    hi: {
      "about.h2": "इस रंग-अंधता परीक्षण के बारे में",
      "about.p1": "यह निःशुल्क ऑनलाइन रंग दृष्टि परीक्षण <strong>इशिहारा शैली की बिंदु-प्लेटों</strong> का उपयोग करता है — वही छिपे-अंक वाला डिज़ाइन जो सौ साल से भी अधिक समय से नेत्र चिकित्सालयों में इस्तेमाल होता आया है। हर प्लेट आपके ब्राउज़र में नए सिरे से बनती है: एक अंक ऐसे बिंदुओं से बनाया जाता है जो पृष्ठभूमि से केवल <strong>रंगत</strong> में भिन्न होते हैं, लाल-हरी या नीली-पीली भ्रम रेखा के साथ, जबकि बिंदुओं का आकार और चमक यादृच्छिक रखे जाते हैं ताकि आप आकार या छाया से अनुमान न लगा सकें। यदि आपकी रंग दृष्टि इन रंगतों को अलग कर पाती है, अंक उभर आता है; नहीं तो आपको एक समान क्षेत्र दिखता है।",
      "about.p2": "<strong>ये प्लेटें कैसे बनती हैं।</strong> हर प्लेट परीक्षण लोड होते ही JavaScript में प्रक्रियात्मक रूप से बनाई जाती है — इस साइट पर कहीं भी <strong>कोई संग्रहित, स्कैन की गई या कॉपी की गई इशिहारा छवि नहीं है</strong>। बिंदु तत्काल व्यवस्थित होते हैं, छिपी आकृति पृष्ठभूमि से केवल एक रंग-भ्रम अक्ष के साथ अलग होती है, और हर बार हर बिंदु की चमक एक साझा पट्टी के भीतर यादृच्छिक चुनी जाती है। इसी कारण <strong>कोई दो बार एक जैसे नहीं होते</strong>: किसी प्लेट को याद नहीं किया जा सकता, स्क्रीनशॉट से पकड़ा नहीं जा सकता और चमक से नहीं खींचा जा सकता — केवल वास्तविक रंगत विभेदन ही आकृति दिखाता है। अधिकांश निःशुल्क ऑनलाइन रंग परीक्षण वही निश्चित सार्वजनिक-डोमेन छवियाँ दोबारा इस्तेमाल करते हैं; यह नहीं करता, और यही इसे हर बार एक नई जाँच बनाता है, न कि तस्वीरों की प्रश्नोत्तरी।",
      "about.p3": "आप हर आँख के लिए 8 प्लेटें देखेंगे — पाँच लाल-हरी, दो नीली-पीली (ट्राइटन), और एक केवल-चमक वाली नियंत्रण प्लेट जिसे हर कोई पढ़ सकता है। स्कोरिंग बस यह गिनती है कि आपने हर अक्ष पर कितनी सही पढ़ीं, न कि कोई अपारदर्शी “एआई” निर्णय या गढ़ी हुई प्रायिकता। परिणाम एक ईमानदार जाँच है: यह संभावित <strong>लाल-हरी</strong> या <strong>ट्राइटन</strong> कमी की ओर संकेत कर सकता है और एक मोटा गंभीरता-स्तर दे सकता है, पर कोई स्क्रीन प्रोटैनोपिया को ड्यूटेरैनोपिया से अलग नहीं कर सकती, और यह कभी निदान नहीं है।",
      "faq.0.a": "यह एक उपयोगी जाँच है, निदान नहीं। बिना कैलिब्रेट की गई स्क्रीनें उपकरणों के बीच परिणाम बदल देती हैं, फिर भी वास्तविक भ्रम-अक्ष रंगों से बनी प्लेट-जाँच किसी संभावित प्रवृत्ति को भरोसे से दर्शा सकती है। पुष्टि के लिए चिकित्सकीय रूप से कैलिब्रेट प्लेटें या एनोमैलोस्कोप चाहिए।",
      "faq.0.q": "ऑनलाइन रंग-अंधता परीक्षण कितना सटीक होता है?",
      "faq.1.a": "नहीं — यह दोनों में समान लाल-हरी भ्रम प्रवृत्ति पहचानता है, पर प्रोटैन को ड्यूटैन से अलग करने के लिए चिकित्सक का एनोमैलोस्कोप या नैदानिक प्लेटें चाहिए।",
      "faq.1.q": "क्या यह परीक्षण बता सकता है कि मैं प्रोटैन हूँ या ड्यूटैन?",
      "faq.2.a": "हाँ — आपने कितनी लाल-हरी प्लेटें चूकीं, इसके आधार पर यह एक ईमानदार गंभीरता-स्तर (कोई नहीं, सीमांत, हल्की, मध्यम या तेज़) देता है और वह सटीक गिनती भी दिखाता है जिससे वह स्तर निकला। पाँच प्लेटों पर यह स्तर मोटा होता है, और बिना कैलिब्रेट स्क्रीन उसे और खिसका देती है — यह एक अनुमान है, नैदानिक श्रेणी नहीं।",
      "faq.2.q": "क्या यह परीक्षण बताता है कि मेरी रंग-अंधता कितनी गंभीर है?",
      "faq.3.a": "वंशानुगत रंग-अंधता दोनों आँखों में एक जैसी होती है, पर किसी एक आँख में अंतर किसी अर्जित बदलाव की ओर संकेत कर सकता है जिसकी जाँच ज़रूरी है — और आँख-दर-आँख परीक्षण किसी एक ओर की असावधानी पकड़कर विश्वसनीयता भी बढ़ाता है।",
      "faq.3.q": "हर आँख की जाँच अलग-अलग क्यों करें?",
      "faq.4.a": "हाँ — निःशुल्क, बिना खाते के, और यह पूरी तरह आपके डिवाइस पर चलता है। कुछ भी अपलोड या संग्रहित नहीं होता।",
      "faq.4.q": "क्या यह परीक्षण निःशुल्क है?",
      "faq.h2": "अक्सर पूछे जाने वाले प्रश्न",
      "links.0": "<strong>इस परीक्षण की विधि प्रकाशित है</strong> — मुक्त-पहुँच शोधपत्र और खुला स्रोत कोड पढ़ें →",
      "links.1": "कुछ डिज़ाइन कर रहे हैं? जाँचें कि आपका रंग-पटल वर्णांध-सुरक्षित है →",
      "links.2": "किसी छोटे बच्चे की जाँच कर रहे हैं? आकृति-आधारित बाल रंग परीक्षण का उपयोग करें →",
      "links.3": "पढ़ें: रंग-अंधता, सरल भाषा में →",
      "links.4": "पढ़ें: इशिहारा प्लेटें कैसे काम करती हैं →",
      "links.5": "पढ़ें: ऑनलाइन रंग-अंधता परीक्षण कितने सटीक हैं? →",
      "links.6": "पढ़ें: कौन-सा रंग दृष्टि परीक्षण सबसे सटीक है? →",
      "links.7": "आज़माएँ: एनोमैलोस्कोप, लाल-हरा मिलान परीक्षण →"
    }
  };
  for (var l in S) { if (!D[l]) { D[l] = {}; } for (var k in S[l]) { D[l][k] = S[l][k]; } }
})(window.OQ_I18N);
