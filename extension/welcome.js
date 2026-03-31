/* ── Welcome Page: i18n + Confetti + Scroll Reveal ── */

/* ── Translations ── */
var LOCALES = {
  en: {
    title: "Welcome to Proofreader",
    "hero.h1": "Thanks for installing Proofreader",
    "hero.tagline": "Your writing, sharper. Instantly.",
    "ai.label": "AI Providers",
    "ai.h2": "Your AI, your rules",
    "ai.p1": "Bring your own API key and connect directly to the provider you already use. No middleman, no accounts, no one else sees your text.",
    "ai.gemini": "Free tier with generous limits",
    "ai.openai": "GPT-4o-mini, fast and sharp",
    "ai.claude": "Nuanced, precise rewrites",
    "ai.grok": "Capable and growing",
    "ai.getKey": "Get API key →",
    "styles.label": "Styles",
    "styles.h2": "Write for the room",
    "styles.p1": "Different text needs different handling. Choose from four built-in styles — Grammar Only, Casual, Neutral, or Formal — or create your own with custom prompts, icons, and colours.",
    "styles.p2": "Each style carries its own thinking level so you get fast fixes when speed matters and deep precision when it counts.",
    "settings.label": "Settings",
    "settings.h2": "Tuned to you",
    "settings.p1": "Auto-proofread on paste, trigger after a typing pause, enable the right-click context menu, switch themes — Proofreader adapts to the way you work. Everything is stored locally on your machine.",
    "settings.p2": "The side panel lives one click away in your browser toolbar. No app switching, no copying text into a chat window.",
    "history.label": "History & Incognito",
    "history.h2": "Your sessions, your call",
    "history.p1": "Enable history to keep a searchable log of every proofread session — input, output, style, and timestamp. Browse, re-use, or delete any entry at any time. Everything stays on your device.",
    "history.p2": "Need something off the record? Incognito Mode skips saving entirely and shifts the theme to near-black so you always know when it's active.",
    "languages.label": "Languages",
    "languages.h2": "Seven languages, one panel",
    "languages.p1": "The interface is available in English, French, Spanish, Italian, German, Portuguese, and Dutch. Your browser language is detected automatically, or you can pick one manually.",
    "languages.p2": "The AI itself handles text in any language you throw at it — the UI just follows suit.",
    "start.h2": "Get started in three steps",
    "start.sub": "You'll be proofreading in under a minute.",
    "start.step1.h3": "Grab an API key",
    "start.step1.p": "Grab a free API key from Gemini, OpenAI, Anthropic, or xAI — whichever you prefer.",
    "start.step2.h3": "Open the side panel",
    "start.step2.p": "Click the Proofreader icon in your toolbar. Paste in your API key in settings and you're connected.",
    "start.step3.h3": "Paste and proofread",
    "start.step3.p": "Drop any text into the editor, pick a style, and hit Proofread. Clean copy in seconds.",
    "footer.credit": "Proofreader is open source and built by Mark Notton.",
    "footer.privacy": "Your text goes to the AI. Nowhere else. No servers, no tracking, no data storage.",
    "footer.coffee": "If it's saved you a few minutes, a coffee would make my day.",
    "footer.bmcButton": "Buy me a coffee"
  },
  fr: {
    title: "Bienvenue sur Proofreader",
    "hero.h1": "Merci d'avoir installé Proofreader",
    "hero.tagline": "Votre écriture, plus nette. Instantanément.",
    "ai.label": "Fournisseurs IA",
    "ai.h2": "Votre IA, vos règles",
    "ai.p1": "Utilisez votre propre clé API et connectez-vous directement au fournisseur de votre choix. Pas d'intermédiaire, pas de compte à créer, personne d'autre ne voit votre texte.",
    "ai.gemini": "Niveau gratuit avec des limites généreuses",
    "ai.openai": "GPT-4o-mini, rapide et précis",
    "ai.claude": "Réécritures nuancées et précises",
    "ai.grok": "Performant et en pleine croissance",
    "ai.getKey": "Obtenir une clé API →",
    "styles.label": "Styles",
    "styles.h2": "Écrivez pour votre audience",
    "styles.p1": "Chaque texte mérite un traitement adapté. Choisissez parmi quatre styles intégrés — Grammaire seule, Décontracté, Neutre ou Formel — ou créez les vôtres avec des consignes, icônes et couleurs personnalisées.",
    "styles.p2": "Chaque style possède son propre niveau de réflexion pour des corrections rapides quand la vitesse compte et une précision approfondie quand c'est nécessaire.",
    "settings.label": "Paramètres",
    "settings.h2": "Adapté à vous",
    "settings.p1": "Correction automatique au collage, déclenchement après une pause de frappe, menu contextuel au clic droit, choix du thème — Proofreader s'adapte à votre façon de travailler. Tout est stocké localement sur votre machine.",
    "settings.p2": "Le panneau latéral est à un clic dans la barre d'outils de votre navigateur. Pas de changement d'application, pas de copier-coller dans une fenêtre de chat.",
    "history.label": "Historique & Incognito",
    "history.h2": "Vos sessions, vos choix",
    "history.p1": "Activez l'historique pour conserver un journal consultable de chaque session — texte original, résultat, style et horodatage. Parcourez, réutilisez ou supprimez n'importe quelle entrée. Tout reste sur votre appareil.",
    "history.p2": "Besoin de discrétion ? Le mode Incognito désactive l'enregistrement et bascule le thème vers un fond quasi-noir pour que vous sachiez toujours quand il est actif.",
    "languages.label": "Langues",
    "languages.h2": "Sept langues, un seul panneau",
    "languages.p1": "L'interface est disponible en anglais, français, espagnol, italien, allemand, portugais et néerlandais. La langue de votre navigateur est détectée automatiquement, ou vous pouvez en choisir une manuellement.",
    "languages.p2": "L'IA gère le texte dans toutes les langues que vous lui soumettez — l'interface suit le mouvement.",
    "start.h2": "Commencez en trois étapes",
    "start.sub": "Vous corrigerez vos textes en moins d'une minute.",
    "start.step1.h3": "Obtenez une clé API",
    "start.step1.p": "Procurez-vous une clé API gratuite chez Gemini, OpenAI, Anthropic ou xAI — selon votre préférence.",
    "start.step2.h3": "Ouvrez le panneau latéral",
    "start.step2.p": "Cliquez sur l'icône Proofreader dans votre barre d'outils. Collez votre clé API dans les paramètres et c'est parti.",
    "start.step3.h3": "Collez et corrigez",
    "start.step3.p": "Déposez n'importe quel texte dans l'éditeur, choisissez un style et lancez la correction. Texte propre en quelques secondes.",
    "footer.credit": "Proofreader est open source et créé par Mark Notton.",
    "footer.privacy": "Votre texte va à l'IA. Nulle part ailleurs. Pas de serveurs, pas de suivi, pas de stockage de données.",
    "footer.coffee": "Si ça vous a fait gagner quelques minutes, un café me ferait plaisir.",
    "footer.bmcButton": "Offrez-moi un café"
  },
  es: {
    title: "Bienvenido a Proofreader",
    "hero.h1": "Gracias por instalar Proofreader",
    "hero.tagline": "Tu escritura, más nítida. Al instante.",
    "ai.label": "Proveedores de IA",
    "ai.h2": "Tu IA, tus reglas",
    "ai.p1": "Usa tu propia clave API y conéctate directamente al proveedor que prefieras. Sin intermediarios, sin cuentas, nadie más ve tu texto.",
    "ai.gemini": "Nivel gratuito con límites generosos",
    "ai.openai": "GPT-4o-mini, rápido y preciso",
    "ai.claude": "Reescrituras matizadas y precisas",
    "ai.grok": "Capaz y en crecimiento",
    "ai.getKey": "Obtener clave API →",
    "styles.label": "Estilos",
    "styles.h2": "Escribe para tu audiencia",
    "styles.p1": "Cada texto necesita un tratamiento diferente. Elige entre cuatro estilos integrados — Solo gramática, Casual, Neutro o Formal — o crea los tuyos con instrucciones, iconos y colores personalizados.",
    "styles.p2": "Cada estilo tiene su propio nivel de reflexión para correcciones rápidas cuando importa la velocidad y precisión profunda cuando cuenta.",
    "settings.label": "Ajustes",
    "settings.h2": "Ajustado a ti",
    "settings.p1": "Corrección automática al pegar, activación tras una pausa al escribir, menú contextual con clic derecho, cambio de tema — Proofreader se adapta a tu forma de trabajar. Todo se almacena localmente en tu máquina.",
    "settings.p2": "El panel lateral está a un clic en la barra de herramientas de tu navegador. Sin cambiar de aplicación, sin copiar texto en una ventana de chat.",
    "history.label": "Historial e Incógnito",
    "history.h2": "Tus sesiones, tu decisión",
    "history.p1": "Activa el historial para guardar un registro de cada sesión — texto original, resultado, estilo y marca de tiempo. Navega, reutiliza o elimina cualquier entrada. Todo se queda en tu dispositivo.",
    "history.p2": "¿Necesitas privacidad? El modo Incógnito desactiva el guardado y cambia el tema a casi negro para que siempre sepas cuándo está activo.",
    "languages.label": "Idiomas",
    "languages.h2": "Siete idiomas, un solo panel",
    "languages.p1": "La interfaz está disponible en inglés, francés, español, italiano, alemán, portugués y neerlandés. El idioma de tu navegador se detecta automáticamente, o puedes elegir uno manualmente.",
    "languages.p2": "La IA maneja texto en cualquier idioma que le envíes — la interfaz simplemente sigue el paso.",
    "start.h2": "Empieza en tres pasos",
    "start.sub": "Estarás corrigiendo en menos de un minuto.",
    "start.step1.h3": "Consigue una clave API",
    "start.step1.p": "Obtén una clave API gratuita de Gemini, OpenAI, Anthropic o xAI — la que prefieras.",
    "start.step2.h3": "Abre el panel lateral",
    "start.step2.p": "Haz clic en el icono de Proofreader en tu barra de herramientas. Pega tu clave API en los ajustes y listo.",
    "start.step3.h3": "Pega y corrige",
    "start.step3.p": "Pon cualquier texto en el editor, elige un estilo y pulsa Corregir. Texto limpio en segundos.",
    "footer.credit": "Proofreader es de código abierto y fue creado por Mark Notton.",
    "footer.privacy": "Tu texto va a la IA. A ningún otro lugar. Sin servidores, sin rastreo, sin almacenamiento de datos.",
    "footer.coffee": "Si te ha ahorrado unos minutos, un café me alegraría el día.",
    "footer.bmcButton": "Invítame a un café"
  },
  it: {
    title: "Benvenuto su Proofreader",
    "hero.h1": "Grazie per aver installato Proofreader",
    "hero.tagline": "La tua scrittura, più precisa. Istantaneamente.",
    "ai.label": "Provider IA",
    "ai.h2": "La tua IA, le tue regole",
    "ai.p1": "Usa la tua chiave API e connettiti direttamente al provider che preferisci. Nessun intermediario, nessun account, nessun altro vede il tuo testo.",
    "ai.gemini": "Livello gratuito con limiti generosi",
    "ai.openai": "GPT-4o-mini, veloce e preciso",
    "ai.claude": "Riscritture sfumate e precise",
    "ai.grok": "Capace e in crescita",
    "ai.getKey": "Ottieni chiave API →",
    "styles.label": "Stili",
    "styles.h2": "Scrivi per il tuo pubblico",
    "styles.p1": "Ogni testo ha bisogno di un trattamento diverso. Scegli tra quattro stili integrati — Solo grammatica, Casual, Neutro o Formale — o crea i tuoi con istruzioni, icone e colori personalizzati.",
    "styles.p2": "Ogni stile ha il proprio livello di riflessione per correzioni rapide quando serve velocità e precisione profonda quando conta.",
    "settings.label": "Impostazioni",
    "settings.h2": "Su misura per te",
    "settings.p1": "Correzione automatica al incolla, attivazione dopo una pausa nella digitazione, menu contestuale con clic destro, cambio tema — Proofreader si adatta al tuo modo di lavorare. Tutto è memorizzato localmente sulla tua macchina.",
    "settings.p2": "Il pannello laterale è a un clic nella barra degli strumenti del browser. Niente cambio di app, niente copia-incolla in una finestra di chat.",
    "history.label": "Cronologia & Incognito",
    "history.h2": "Le tue sessioni, a modo tuo",
    "history.p1": "Abilita la cronologia per conservare un registro ricercabile di ogni sessione — testo originale, risultato, stile e ora. Sfoglia, riutilizza o elimina qualsiasi voce. Tutto rimane sul tuo dispositivo.",
    "history.p2": "Hai bisogno di riservatezza? La modalità Incognito disattiva il salvataggio e passa a un tema quasi nero così sai sempre quando è attiva.",
    "languages.label": "Lingue",
    "languages.h2": "Sette lingue, un solo pannello",
    "languages.p1": "L'interfaccia è disponibile in inglese, francese, spagnolo, italiano, tedesco, portoghese e olandese. La lingua del browser viene rilevata automaticamente, oppure puoi sceglierne una manualmente.",
    "languages.p2": "L'IA gestisce il testo in qualsiasi lingua gli invii — l'interfaccia segue di conseguenza.",
    "start.h2": "Inizia in tre passaggi",
    "start.sub": "Correggerai i testi in meno di un minuto.",
    "start.step1.h3": "Ottieni una chiave API",
    "start.step1.p": "Procurati una chiave API gratuita da Gemini, OpenAI, Anthropic o xAI — quella che preferisci.",
    "start.step2.h3": "Apri il pannello laterale",
    "start.step2.p": "Clicca sull'icona Proofreader nella barra degli strumenti. Incolla la tua chiave API nelle impostazioni e sei connesso.",
    "start.step3.h3": "Incolla e correggi",
    "start.step3.p": "Inserisci qualsiasi testo nell'editor, scegli uno stile e premi Correggi. Testo pulito in pochi secondi.",
    "footer.credit": "Proofreader è open source e creato da Mark Notton.",
    "footer.privacy": "Il tuo testo va all'IA. Da nessun'altra parte. Nessun server, nessun tracciamento, nessun archivio dati.",
    "footer.coffee": "Se ti ha fatto risparmiare qualche minuto, un caffè mi renderebbe felice.",
    "footer.bmcButton": "Offrimi un caffè"
  },
  de: {
    title: "Willkommen bei Proofreader",
    "hero.h1": "Danke für die Installation von Proofreader",
    "hero.tagline": "Dein Text, schärfer. Sofort.",
    "ai.label": "KI-Anbieter",
    "ai.h2": "Deine KI, deine Regeln",
    "ai.p1": "Verwende deinen eigenen API-Schlüssel und verbinde dich direkt mit dem Anbieter deiner Wahl. Kein Mittelsmann, kein Konto, niemand sonst sieht deinen Text.",
    "ai.gemini": "Kostenloses Kontingent mit großzügigen Limits",
    "ai.openai": "GPT-4o-mini, schnell und präzise",
    "ai.claude": "Nuancierte, präzise Umschreibungen",
    "ai.grok": "Leistungsfähig und wachsend",
    "ai.getKey": "API-Schlüssel holen →",
    "styles.label": "Stile",
    "styles.h2": "Schreibe für dein Publikum",
    "styles.p1": "Jeder Text braucht eine andere Behandlung. Wähle aus vier integrierten Stilen — Nur Grammatik, Locker, Neutral oder Formell — oder erstelle eigene mit individuellen Anweisungen, Icons und Farben.",
    "styles.p2": "Jeder Stil hat sein eigenes Denkniveau für schnelle Korrekturen, wenn Geschwindigkeit zählt, und tiefe Präzision, wenn es darauf ankommt.",
    "settings.label": "Einstellungen",
    "settings.h2": "Auf dich abgestimmt",
    "settings.p1": "Automatische Korrektur beim Einfügen, Auslösung nach einer Tipp-Pause, Rechtsklick-Kontextmenü, Theme-Wechsel — Proofreader passt sich deiner Arbeitsweise an. Alles wird lokal auf deinem Gerät gespeichert.",
    "settings.p2": "Das Seitenpanel ist nur einen Klick in der Browser-Symbolleiste entfernt. Kein App-Wechsel, kein Text in ein Chat-Fenster kopieren.",
    "history.label": "Verlauf & Inkognito",
    "history.h2": "Deine Sitzungen, deine Wahl",
    "history.p1": "Aktiviere den Verlauf für ein durchsuchbares Protokoll jeder Sitzung — Originaltext, Ergebnis, Stil und Zeitstempel. Durchsuchen, wiederverwenden oder einzelne Einträge löschen. Alles bleibt auf deinem Gerät.",
    "history.p2": "Brauche etwas Privatsphäre? Der Inkognito-Modus deaktiviert das Speichern und wechselt das Theme zu Fast-Schwarz, damit du immer weißt, wenn er aktiv ist.",
    "languages.label": "Sprachen",
    "languages.h2": "Sieben Sprachen, ein Panel",
    "languages.p1": "Die Oberfläche ist verfügbar in Englisch, Französisch, Spanisch, Italienisch, Deutsch, Portugiesisch und Niederländisch. Die Browsersprache wird automatisch erkannt, oder du kannst manuell eine auswählen.",
    "languages.p2": "Die KI verarbeitet Text in jeder Sprache, die du ihr gibst — die Oberfläche folgt einfach.",
    "start.h2": "Starte in drei Schritten",
    "start.sub": "Du korrigierst in weniger als einer Minute.",
    "start.step1.h3": "Hol dir einen API-Schlüssel",
    "start.step1.p": "Hol dir einen kostenlosen API-Schlüssel von Gemini, OpenAI, Anthropic oder xAI — ganz nach deiner Wahl.",
    "start.step2.h3": "Öffne das Seitenpanel",
    "start.step2.p": "Klicke auf das Proofreader-Symbol in deiner Symbolleiste. Füge deinen API-Schlüssel in den Einstellungen ein und du bist verbunden.",
    "start.step3.h3": "Einfügen und korrigieren",
    "start.step3.p": "Gib beliebigen Text in den Editor ein, wähle einen Stil und klicke auf Korrigieren. Sauberer Text in Sekunden.",
    "footer.credit": "Proofreader ist Open Source und wurde von Mark Notton entwickelt.",
    "footer.privacy": "Dein Text geht an die KI. Nirgendwo anders hin. Keine Server, kein Tracking, keine Datenspeicherung.",
    "footer.coffee": "Wenn es dir ein paar Minuten gespart hat, würde mich ein Kaffee freuen.",
    "footer.bmcButton": "Kauf mir einen Kaffee"
  },
  pt: {
    title: "Bem-vindo ao Proofreader",
    "hero.h1": "Obrigado por instalar o Proofreader",
    "hero.tagline": "A sua escrita, mais nítida. Instantaneamente.",
    "ai.label": "Provedores de IA",
    "ai.h2": "A sua IA, as suas regras",
    "ai.p1": "Use a sua própria chave API e conecte-se diretamente ao provedor que preferir. Sem intermediários, sem contas, ninguém mais vê o seu texto.",
    "ai.gemini": "Nível gratuito com limites generosos",
    "ai.openai": "GPT-4o-mini, rápido e preciso",
    "ai.claude": "Reescritas matizadas e precisas",
    "ai.grok": "Capaz e em crescimento",
    "ai.getKey": "Obter chave API →",
    "styles.label": "Estilos",
    "styles.h2": "Escreva para o seu público",
    "styles.p1": "Cada texto precisa de um tratamento diferente. Escolha entre quatro estilos integrados — Só gramática, Casual, Neutro ou Formal — ou crie os seus com instruções, ícones e cores personalizadas.",
    "styles.p2": "Cada estilo tem o seu próprio nível de reflexão para correções rápidas quando a velocidade importa e precisão profunda quando conta.",
    "settings.label": "Definições",
    "settings.h2": "Ajustado a si",
    "settings.p1": "Correção automática ao colar, ativação após uma pausa na digitação, menu de contexto com clique direito, mudança de tema — o Proofreader adapta-se à sua forma de trabalhar. Tudo é armazenado localmente na sua máquina.",
    "settings.p2": "O painel lateral está a um clique na barra de ferramentas do navegador. Sem trocar de aplicação, sem copiar texto para uma janela de chat.",
    "history.label": "Histórico & Incógnito",
    "history.h2": "As suas sessões, à sua maneira",
    "history.p1": "Ative o histórico para manter um registo pesquisável de cada sessão — texto original, resultado, estilo e data. Navegue, reutilize ou elimine qualquer entrada. Tudo fica no seu dispositivo.",
    "history.p2": "Precisa de privacidade? O modo Incógnito desativa o registo e muda o tema para quase negro para que saiba sempre quando está ativo.",
    "languages.label": "Idiomas",
    "languages.h2": "Sete idiomas, um só painel",
    "languages.p1": "A interface está disponível em inglês, francês, espanhol, italiano, alemão, português e neerlandês. O idioma do navegador é detetado automaticamente, ou pode escolher um manualmente.",
    "languages.p2": "A IA lida com texto em qualquer idioma que lhe enviar — a interface simplesmente acompanha.",
    "start.h2": "Comece em três passos",
    "start.sub": "Estará a corrigir em menos de um minuto.",
    "start.step1.h3": "Obtenha uma chave API",
    "start.step1.p": "Obtenha uma chave API gratuita do Gemini, OpenAI, Anthropic ou xAI — o que preferir.",
    "start.step2.h3": "Abra o painel lateral",
    "start.step2.p": "Clique no ícone do Proofreader na barra de ferramentas. Cole a sua chave API nas definições e está conectado.",
    "start.step3.h3": "Cole e corrija",
    "start.step3.p": "Coloque qualquer texto no editor, escolha um estilo e clique em Corrigir. Texto limpo em segundos.",
    "footer.credit": "Proofreader é open source e criado por Mark Notton.",
    "footer.privacy": "O seu texto vai para a IA. Mais nenhum lugar. Sem servidores, sem rastreamento, sem armazenamento de dados.",
    "footer.coffee": "Se lhe poupou uns minutos, um café fazia-me o dia.",
    "footer.bmcButton": "Pague-me um café"
  },
  nl: {
    title: "Welkom bij Proofreader",
    "hero.h1": "Bedankt voor het installeren van Proofreader",
    "hero.tagline": "Je tekst, scherper. Direct.",
    "ai.label": "AI-providers",
    "ai.h2": "Jouw AI, jouw regels",
    "ai.p1": "Gebruik je eigen API-sleutel en maak rechtstreeks verbinding met de provider van je keuze. Geen tussenpersoon, geen account, niemand anders ziet je tekst.",
    "ai.gemini": "Gratis niveau met ruime limieten",
    "ai.openai": "GPT-4o-mini, snel en scherp",
    "ai.claude": "Genuanceerde, precieze herschrijvingen",
    "ai.grok": "Capabel en groeiend",
    "ai.getKey": "API-sleutel ophalen →",
    "styles.label": "Stijlen",
    "styles.h2": "Schrijf voor je publiek",
    "styles.p1": "Elke tekst verdient een andere aanpak. Kies uit vier ingebouwde stijlen — Alleen grammatica, Casual, Neutraal of Formeel — of maak je eigen met aangepaste instructies, iconen en kleuren.",
    "styles.p2": "Elke stijl heeft zijn eigen denkniveau voor snelle correcties als snelheid telt en diepe precisie wanneer het ertoe doet.",
    "settings.label": "Instellingen",
    "settings.h2": "Op jou afgestemd",
    "settings.p1": "Automatische correctie bij plakken, activering na een typepauze, rechtermuisklik-contextmenu, thema wisselen — Proofreader past zich aan je werkwijze aan. Alles wordt lokaal op je apparaat opgeslagen.",
    "settings.p2": "Het zijpaneel is één klik verwijderd in de werkbalk van je browser. Geen app wisselen, geen tekst kopiëren naar een chatvenster.",
    "history.label": "Geschiedenis & Incognito",
    "history.h2": "Jouw sessies, jouw keuze",
    "history.p1": "Schakel geschiedenis in voor een doorzoekbaar logboek van elke sessie — originele tekst, resultaat, stijl en tijdstip. Bekijk, hergebruik of verwijder elke invoer. Alles blijft op je apparaat.",
    "history.p2": "Privacygevoelig? De incognitomodus slaat niets op en schakelt het thema over naar bijna-zwart zodat je altijd weet wanneer hij actief is.",
    "languages.label": "Talen",
    "languages.h2": "Zeven talen, één paneel",
    "languages.p1": "De interface is beschikbaar in het Engels, Frans, Spaans, Italiaans, Duits, Portugees en Nederlands. De browsertaal wordt automatisch gedetecteerd, of je kunt er handmatig een kiezen.",
    "languages.p2": "De AI verwerkt tekst in elke taal die je aanbiedt — de interface volgt gewoon.",
    "start.h2": "Begin in drie stappen",
    "start.sub": "Je bent binnen een minuut aan het corrigeren.",
    "start.step1.h3": "Haal een API-sleutel",
    "start.step1.p": "Haal een gratis API-sleutel op bij Gemini, OpenAI, Anthropic of xAI — welke je voorkeur ook heeft.",
    "start.step2.h3": "Open het zijpaneel",
    "start.step2.p": "Klik op het Proofreader-icoon in je werkbalk. Plak je API-sleutel in de instellingen en je bent verbonden.",
    "start.step3.h3": "Plak en corrigeer",
    "start.step3.p": "Zet tekst in de editor, kies een stijl en klik op Corrigeren. Schone tekst in seconden.",
    "footer.credit": "Proofreader is open source en gemaakt door Mark Notton.",
    "footer.privacy": "Je tekst gaat naar de AI. Nergens anders heen. Geen servers, geen tracking, geen dataopslag.",
    "footer.coffee": "Als het je een paar minuten heeft bespaard, zou een koffie mijn dag maken.",
    "footer.bmcButton": "Koop een koffie voor me"
  }
}

var SUPPORTED = ["en", "fr", "es", "it", "de", "pt", "nl"]

/* Detect browser language, fall back to "en" */
function detectLocale() {
  var lang = (navigator.language || "en").slice(0, 2).toLowerCase()
  return SUPPORTED.indexOf(lang) !== -1 ? lang : "en"
}

/* Apply translations to all [data-i18n] elements */
function applyLocale(lang) {
  var dict = LOCALES[lang] || LOCALES.en
  document.documentElement.lang = lang

  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var key = el.getAttribute("data-i18n")
    if (dict[key]) {
      if (el.tagName === "TITLE") {
        document.title = dict[key]
      } else {
        el.textContent = dict[key]
      }
    }
  })
}

/* ── Language picker ── */
var picker = document.getElementById("lang-picker")
var currentLang = detectLocale()

if (picker) {
  picker.value = currentLang
  applyLocale(currentLang)

  picker.addEventListener("change", function () {
    currentLang = picker.value
    applyLocale(currentLang)
  })
}

/* ── Confetti — burst explosion from centre ── */
;(function () {
  var canvas = document.getElementById("confetti")
  var ctx = canvas.getContext("2d")
  var W, H
  var particles = []
  var colors = ["#4A9EF5", "#f472b6", "#fbbf24", "#34d399", "#a78bfa", "#fb923c", "#38bdf8"]
  var total = 200

  function resize() {
    W = canvas.width = window.innerWidth
    H = canvas.height = window.innerHeight
  }

  function Particle() {
    this.x = W / 2 + (Math.random() - 0.5) * 60
    this.y = H * 0.25 + (Math.random() - 0.5) * 40
    this.w = 5 + Math.random() * 7
    this.h = this.w * 0.55
    this.color = colors[Math.floor(Math.random() * colors.length)]

    var angle = Math.random() * Math.PI * 2
    var speed = 4 + Math.random() * 10
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed - 3

    this.gravity = 0.12 + Math.random() * 0.06
    this.drag = 0.98
    this.rotation = Math.random() * 360
    this.va = (Math.random() - 0.5) * 10
    this.opacity = 1
    this.decay = 0.005 + Math.random() * 0.005
  }

  function init() {
    resize()
    for (var i = 0; i < total; i++) particles.push(new Particle())
    animate()
  }

  function animate() {
    ctx.clearRect(0, 0, W, H)
    var alive = false

    particles.forEach(function (p) {
      if (p.opacity <= 0) return
      alive = true

      p.vy += p.gravity
      p.vx *= p.drag
      p.vy *= p.drag
      p.x += p.vx
      p.y += p.vy
      p.rotation += p.va
      p.opacity -= p.decay

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.globalAlpha = Math.max(0, p.opacity)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    })

    if (alive) requestAnimationFrame(animate)
    else canvas.style.display = "none"
  }

  window.addEventListener("resize", resize)
  init()
})()

/* ── Scroll reveal ── */
var observer = new IntersectionObserver(
  function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible")
        observer.unobserve(entry.target)
      }
    })
  },
  { threshold: 0.15 }
)

document.querySelectorAll(".section, .getting-started").forEach(function (el) {
  observer.observe(el)
})
