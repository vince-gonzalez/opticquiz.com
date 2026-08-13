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
