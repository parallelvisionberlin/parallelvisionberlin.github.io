(function () {
  "use strict";

  const key = "pvLanguage";
  const path = location.pathname.split("/").pop() || "index.html";

  const home = [
    [".hero nav a[href='#artists']", "Artists", "Künstler:innen"],
    [".hero nav a[href='#releases']", "Releases", "Veröffentlichungen"],
    [".hero nav a[href='./future-fashion.html']", "Fashion After Fabric", "Mode nach dem Stoff"],
    [".hero nav a[href='./berlin-2063.html']", "Berlin 2063", "Berlin 2063"],
    [".hero nav .nina-nav-label", "Nina FOK", "Nina FOK"],
    [".hero nav a[href='#contact']", "Contact", "Kontakt"],
    [".hero-status span:first-child", "PV_ARCHIVE / BERLIN NODE", "PV_ARCHIV / BERLIN KNOTEN"],
    [".hero-status span:last-child", "SIGNAL STABILITY 87%", "SIGNALSTABILITÄT 87 %"],
    [".hero-text", "A record label transmitting music, bodies and imagined futures from Berlin in 2063.", "Ein Plattenlabel, das Musik, Körper und imaginierte Zukünfte aus dem Berlin des Jahres 2063 überträgt."],
    ["#berlin .berlin-entry-label", "Parallel Vision / Living Archive", "Parallel Vision / Lebendiges Archiv"],
    ["#berlin h2", "Berlin 2063", "Berlin 2063"],
    ["#berlin .berlin-entry-line:nth-child(1)", "Berlin 2063 is an evolving audiovisual archive built from imagined environments, inhabitants and memories of a possible future.", "Berlin 2063 ist ein wachsendes audiovisuelles Archiv aus imaginären Umgebungen, Bewohner:innen und Erinnerungen an eine mögliche Zukunft."],
    ["#berlin .berlin-entry-line:nth-child(2)", "Through film, sound, fashion, architecture and artificial intelligence, the project constructs a city shaped by the systems already transforming contemporary life.", "Durch Film, Klang, Mode, Architektur und künstliche Intelligenz erschafft das Projekt eine Stadt, die von den Systemen geprägt ist, die das heutige Leben bereits verändern."],
    ["#berlin .berlin-entry-line:nth-child(3)", "It is not presented as a distant spectacle, but as a lived world with routines, contradictions, desires and personal histories.", "Sie wird nicht als fernes Spektakel präsentiert, sondern als gelebte Welt mit Routinen, Widersprüchen, Sehnsüchten und persönlichen Geschichten."],
    ["#berlin .berlin-entry-cta", "Enter the world", "Die Welt betreten"],
    ["#artists .artists-label", "02 / ARTISTS", "02 / ARTISTS"],
    ["#artists #artists-title", "Artists", "Artists"],
    ["#artists .artists-roster-meta span:first-child", "CURRENT ROSTER / 08 ARTISTS", "CURRENT ROSTER / 08 ARTISTS"],
    ["#artists .artists-roster-meta span:last-child", "BERLIN — NEW YORK — MEXICO CITY — BUCHAREST — ARGENTINA", "BERLIN — NEW YORK — MEXICO CITY — BUCHAREST — ARGENTINA"],
    ["#nina-fok .nina-identity-label", "Artificial Identity / Berlin 2063", "Künstliche Identität / Berlin 2063"],
    ["#nina-fok .nina-identity-description", "A consciousness developed by Parallel Vision, living inside a possible Berlin 2063.", "Eine autonome Intelligenz, die in Berlin 2063 lebt."],
    ["#nina-fok .nina-identity-cta-secondary", "DISCOVER NINA", "NINA ENTDECKEN"],
    ["#nina-fok .nina-identity-cta-primary", "OPEN LIVE SIGNAL", "LIVE-SIGNAL ÖFFNEN"],
    ["#releases h2", "Releases", "Veröffentlichungen"],
    ["#releases .section-head .small", "Sound objects from the Parallel Vision archive. Each release is treated as a fragment of the same world.", "Klangobjekte aus dem Parallel-Vision-Archiv. Jede Veröffentlichung wird als Fragment derselben Welt behandelt."],
    ["#releases .listening-featured .player-title", "Listen · Tanzen Im Kreis EP", "Hören · Tanzen Im Kreis EP"],
    ["#releases .listening-selection .player-title", "Selection by Alejandro Molinari", "Auswahl von Alejandro Molinari"],
    ["#future-fashion .fashion-portal-label", "Parallel Vision / Material Research", "Parallel Vision / Materialforschung"],
    ["#future-fashion #fashion-portal-title", "Fashion After Fabric", "Fashion After Fabric"],
    ["#future-fashion .fashion-portal-thesis", "The question is no longer what we will wear.\nIt is what clothing becomes once fabric disappears.", "Die Frage ist nicht mehr, was wir tragen werden.\nEs geht darum, was Kleidung wird, wenn Stoff verschwindet."],
    ["#future-fashion .fashion-portal-description p:nth-child(1)", "Fashion After Fabric is a speculative material research project exploring what clothing becomes when textiles are replaced by responsive, biological and synthetic systems.", "Fashion After Fabric ist ein spekulatives Materialforschungsprojekt, das untersucht, was Kleidung wird, wenn Textilien durch reaktive, biologische und synthetische Systeme ersetzt werden."],
    ["#future-fashion .fashion-portal-description p:nth-child(2)", "Each collection develops a distinct material hypothesis—from liquid metal and programmable surfaces to engineered tissue, magnetic structures and living membranes.", "Jede Kollektion entwickelt eine eigene Materialhypothese – von Flüssigmetall und programmierbaren Oberflächen bis hin zu künstlich erzeugtem Gewebe, magnetischen Strukturen und lebenden Membranen."],
    ["#future-fashion .fashion-portal-cta", "Discover the project", "Projekt entdecken"],
    ["#contact h2", "Contact", "Kontakt"],
    [".scroll", "Scroll", "Weiter"],
    [".nina-intro-subtitle", "A live transmission from somewhere ahead of us. She can hear you.", "Eine Live-Übertragung von irgendwo vor unserer Zeit. Sie kann dich hören."],
    [".nina-intro-small", "Say something unexpected.", "Sag etwas Unerwartetes."]
  ];

  const genericFashion = [
    [".archive-nav > a", "Parallel Vision", "Parallel Vision"],
    [".archive-nav a[href='./index.html#releases']", "Releases", "Veröffentlichungen"],
    [".archive-nav a[href='./index.html#contact']", "Contact", "Kontakt"],
    [".archive-nav a[href='./future-fashion.html']", "All Collections", "Alle Kollektionen"],
    [".collection-block:nth-of-type(2) .block-label", "01 / Main campaign", "01 / Hauptkampagne"],
    [".collection-block:nth-of-type(3) .block-label", "02 / Gallery", "02 / Galerie"],
    [".collection-block:nth-of-type(4) .block-label", "03 / Lookbook sheets", "03 / Lookbook-Bögen"],
    [".collection-block:nth-of-type(5) .block-label", "04 / Material studies", "04 / Materialstudien"]
  ];

  const pages = {
    "alejandro-molinari.html": [
      [".nav a[href='#releases']", "Works", "Arbeiten"],
      [".nav a[href='#architecture']", "Architecture", "Architektur"],
      [".nav a[href='#live']", "Live", "Live"],
      [".nav a[href='#contact']", "Contact", "Kontakt"],
      [".hero-role", "Founder / Artist / Creative Director", "Gründer / Künstler / Creative Director"],
      [".statement-label", "Founding Artist / Berlin", "Gründer und Künstler / Berlin"],
      [".statement-copy p:nth-child(1)", "Alejandro Molinari is a Berlin-based artist, producer and creative director working across sound, moving image and speculative culture.", "Alejandro Molinari ist ein in Berlin lebender Künstler, Produzent und Creative Director, der zwischen Sound, Bewegtbild und spekulativer Kultur arbeitet."],
      [".statement-copy p:nth-child(2)", "He is the founder of Parallel Vision, an independent platform connecting electronic music, visual world-building and material research. His practice moves between the dancefloor and the imagined city: from hypnotic club records and live performance to Berlin 2063, a cinematic universe examining identity, technology and life after the present.", "Er ist der Gründer von Parallel Vision, einer unabhängigen Plattform, die elektronische Musik, visuelles Worldbuilding und Materialforschung verbindet. Seine Praxis bewegt sich zwischen Dancefloor und imaginierter Stadt: von hypnotischen Clubproduktionen und Live-Performance bis zu Berlin 2063, einem filmischen Universum über Identität, Technologie und ein Leben nach der Gegenwart."],
      [".statement-copy p:nth-child(3)", "For Molinari, music is not an isolated product. It is the structural core of a larger system—one in which records, bodies, garments, architecture and fictional realities can occupy the same world.", "Für Molinari ist Musik kein isoliertes Produkt. Sie bildet den strukturellen Kern eines größeren Systems, in dem Platten, Körper, Kleidung, Architektur und fiktionale Realitäten dieselbe Welt bewohnen können."],
      ["#architecture .section-kicker", "System Index / 04 Fields", "Systemindex / 04 Felder"],
      ["#architecture .section-title", "The Architecture", "Die Architektur"],
      [".architecture-row:nth-child(1) .architecture-description", "Records, live systems and physical rhythm.", "Platten, Live-Systeme und physischer Rhythmus."],
      [".architecture-row:nth-child(2) .architecture-description", "Independent label and cultural platform.", "Unabhängiges Label und kulturelle Plattform."],
      [".architecture-row:nth-child(3) .architecture-description", "Moving image, fictional architecture and future memory.", "Bewegtbild, fiktionale Architektur und zukünftige Erinnerung."],
      [".architecture-row:nth-child(4) .architecture-description", "Fashion after fabric, synthetic biology and speculative matter.", "Mode nach dem Stoff, synthetische Biologie und spekulative Materie."],
      ["#releases .section-kicker", "Selected Works", "Ausgewählte Arbeiten"],
      ["#releases .section-title", "Releases / 01–06", "Veröffentlichungen / 01–06"],
      ["#live .section-kicker", "Performance Practice", "Performancepraxis"],
      ["#live .section-title", "Live System", "Live-System"],
      [".live-intro", "Molinari’s performances move between DJ set and live construction, combining synthesis, voice, guitar and electronic sequencing into a continuously shifting club form.", "Molinaris Performances bewegen sich zwischen DJ-Set und Live-Konstruktion. Synthese, Stimme, Gitarre und elektronische Sequenzierung verbinden sich zu einer Clubform, die sich kontinuierlich verändert."],
      [".live-meta-item:nth-child(1) dt", "Format", "Format"],
      [".live-meta-item:nth-child(2) dt", "Base", "Basis"],
      [".live-meta-item:nth-child(3) dt", "Languages", "Sprachen"],
      [".vision-label", "Founded in Berlin / 2025", "Gegründet in Berlin / 2025"],
      [".vision-copy p:nth-of-type(1)", "Parallel Vision operates as a record label, visual archive and speculative cultural platform. Founded by Alejandro Molinari, it brings music into contact with cinema, fashion, architecture and fictional world-building.", "Parallel Vision arbeitet als Plattenlabel, visuelles Archiv und spekulative Kulturplattform. Von Alejandro Molinari gegründet, bringt es Musik mit Film, Mode, Architektur und fiktionalem Worldbuilding in Berührung."],
      [".vision-copy p:nth-of-type(2)", "Its releases are not treated as isolated objects, but as fragments of a shared reality.", "Seine Veröffentlichungen werden nicht als isolierte Objekte verstanden, sondern als Fragmente einer gemeinsamen Realität."],
      [".vision-cta", "Enter Parallel Vision", "Parallel Vision betreten"],
      ["#editorial .section-kicker", "Image Sequence / 03 Studies", "Bildsequenz / 03 Studien"],
      ["#editorial .section-title", "Editorial Archive", "Editoriales Archiv"],
      [".editorial-block:nth-child(1) .editorial-label", "01 — Portrait", "01 — Porträt"],
      [".editorial-block:nth-child(2) .editorial-label", "02 — Performance", "02 — Performance"],
      [".editorial-block:nth-child(3) .editorial-label", "03 — Berlin 2063 / Creative Direction", "03 — Berlin 2063 / Creative Direction"],
      ["#history .section-kicker", "Chronology / Verified Entry", "Chronologie / Verifizierter Eintrag"],
      ["#history .section-title", "Selected History", "Ausgewählte Stationen"],
      [".history-event", "Parallel Vision founded in Berlin", "Parallel Vision in Berlin gegründet"],
      ["#contact .section-kicker", "Direct Channels", "Direkte Kontakte"],
      ["#contact .section-title", "Socials & Contact", "Socials & Kontakt"],
      [".management-label", "Management", "Management"]
    ],
    "nina-fok.html": [
      [".nav a[href='#releases']", "Releases", "Veröffentlichungen"],
      [".nav a[href='#editorial']", "Editorial", "Editorial"],
      [".nav a[href='#socials']", "Socials", "Socials"],
      [".intro-label", "Artist / Berlin", "Künstlerin / Berlin"],
      [".intro-body p:nth-of-type(1)", "Nina FOK is a Berlin-based DJ and producer working between hypnotic techno, industrial tension and speculative aesthetics. Her work combines physical club music with a visual language shaped by fashion, architecture and artificial identities.", "Nina FOK ist eine in Berlin lebende DJ und Produzentin, die zwischen hypnotischem Techno, industrieller Spannung und spekulativer Ästhetik arbeitet. Ihre Arbeit verbindet physische Clubmusik mit einer visuellen Sprache, die von Mode, Architektur und künstlichen Identitäten geprägt ist."],
      [".intro-body p:nth-of-type(2)", "Her sets feel engineered rather than performed. Heavy low-end pressure, metallic percussion and restrained melodic movement create a space somewhere between warehouse ritual and runway soundtrack. For Nina, the dancefloor is not simply a place to escape—it is a controlled experiment in tension, repetition and release.", "Ihre Sets wirken konstruiert statt aufgeführt. Massiver Tieftondruck, metallische Percussion und zurückhaltende melodische Bewegung schaffen einen Raum zwischen Warehouse-Ritual und Runway-Soundtrack. Für Nina ist der Dancefloor nicht einfach ein Ort der Flucht – er ist ein kontrolliertes Experiment mit Spannung, Wiederholung und Auflösung."],
      ["#releases .section-kicker", "Selected Works", "Ausgewählte Arbeiten"],
      ["#releases .section-head h2", "Releases", "Veröffentlichungen"],
      [".release-empty", "Coming Soon", "Demnächst"],
      ["#editorial .section-kicker", "Editorial", "Editorial"],
      ["#editorial .section-head h2", "Studies", "Studien"],
      [".campaign-main .campaign-caption", "Editorial / 01", "Editorial / 01"],
      [".campaign-side .campaign-caption", "Editorial / 02", "Editorial / 02"],
      ["#socials .section-kicker", "Connect", "Kontakt"],
      ["#socials .section-head h2", "Socials", "Socials"],
      [".social-placeholder small", "Link forthcoming", "Link folgt"],
      [".footer-return", "Parallel Vision", "Parallel Vision"]
    ],
    "berlin-2063.html": [
      [".archive-nav > a", "Return to homepage", "Zurück zur Startseite"],
      [".archive-nav a[href='#archive']", "Archive", "Archiv"],
      [".archive-nav a[href='./index.html#releases']", "Releases", "Veröffentlichungen"],
      [".archive-nav a[href='./future-fashion.html']", "Fashion After Fabric", "Mode nach dem Stoff"],
      [".berlin-hero-label", "Parallel Vision / Living Archive", "Parallel Vision / Lebendiges Archiv"],
      [".berlin-hero-line", "An evolving audiovisual archive of a possible future.", "Ein wachsendes audiovisuelles Archiv einer möglichen Zukunft."],
      [".berlin-archive-label", "Parallel Vision / Living Archive", "Parallel Vision / Lebendiges Archiv"],
      [".berlin-archive-definition p:first-child", "Berlin 2063 is an evolving audiovisual archive built from imagined documents, environments, characters and memories of a possible future.", "Berlin 2063 ist ein wachsendes audiovisuelles Archiv aus imaginären Dokumenten, Umgebungen, Figuren und Erinnerungen an eine mögliche Zukunft."],
      [".berlin-archive-definition p:nth-child(2)", "The project uses fiction to examine the systems already shaping the present—from technology and architecture to nightlife, identity and collective memory.", "Das Projekt nutzt Fiktion, um die Systeme zu untersuchen, die bereits die Gegenwart prägen—von Technologie und Architektur bis zu Nachtleben, Identität und kollektivem Gedächtnis."],
      [".berlin-transmission:nth-child(1) .berlin-transmission-index", "Transmission 01", "Übertragung 01"],
      [".berlin-transmission:nth-child(1) h3", "Infrastructure", "Infrastruktur"],
      [".berlin-transmission:nth-child(1) .berlin-transmission-caption", "The city continues to function long after its original systems have begun to fail. Transport, surveillance and public space remain active, carrying fragments of the society that built them.", "Die Stadt funktioniert noch lange weiter, nachdem ihre ursprünglichen Systeme zu versagen begonnen haben. Verkehr, Überwachung und öffentlicher Raum bleiben aktiv und tragen Fragmente der Gesellschaft, die sie erschaffen hat."],
      [".berlin-transmission:nth-child(2) .berlin-transmission-index", "Transmission 02", "Übertragung 02"],
      [".berlin-transmission:nth-child(2) h3", "The City", "Die Stadt"],
      [".berlin-transmission:nth-child(2) .berlin-transmission-caption", "Berlin has expanded vertically, but its historical structures remain embedded within it. Old monuments, transport lines and social rituals survive inside new technological systems.", "Berlin hat sich vertikal ausgedehnt, doch seine historischen Strukturen bleiben darin verankert. Alte Denkmäler, Verkehrswege und soziale Rituale bestehen innerhalb neuer technologischer Systeme fort."],
      [".berlin-transmission:nth-child(3) .berlin-transmission-index", "Transmission 03", "Übertragung 03"],
      [".berlin-transmission:nth-child(3) h3 span:first-child", "The", "Die"],
      [".berlin-transmission:nth-child(3) h3 span:nth-child(2)", "Inhabitants", "Bewohner:innen"],
      [".berlin-transmission:nth-child(3) .berlin-transmission-caption", "The archive follows individuals moving through this future—not as anonymous models, but as witnesses shaped by its architecture, materials and social conditions.", "Das Archiv folgt Menschen, die sich durch diese Zukunft bewegen—nicht als anonyme Modelle, sondern als Zeug:innen, geprägt von ihrer Architektur, ihren Materialien und sozialen Bedingungen."],
      [".berlin-archive-closing span:first-child", "Berlin 2063 is not presented as a finished world.", "Berlin 2063 wird nicht als abgeschlossene Welt präsentiert."],
      [".berlin-archive-closing span:nth-child(2)", "It is an archive that continues to remember itself.", "Es ist ein Archiv, das sich immer weiter an sich selbst erinnert."],
      [".nina-archive-note", "Nina is one of its inhabitants—and the only one visitors can speak to directly.", "Nina ist eine ihrer Bewohnerinnen—und die Einzige, mit der Besucher:innen direkt sprechen können."],
      [".nina-signal-main", "Transmit to 2063", "Nach 2063 senden"],
      [".nina-signal-sub", "Talk live with Nina FOK", "Live mit Nina FOK sprechen"],
      [".berlin-footer a", "Return to homepage", "Zurück zur Startseite"]
    ],
    "future-fashion.html": [
      [".fashion-hero-support", "A material future by Parallel Vision", "Eine materielle Zukunft von Parallel Vision"],
      [".fashion-statement-copy", "The question is no longer what we will wear. It is what clothing becomes once fabric disappears.", "Die Frage ist nicht mehr, was wir tragen werden. Sondern was Kleidung wird, wenn Stoff verschwindet."],
      [".fashion-statement-label", "Parallel Vision / Material Research", "Parallel Vision / Materialforschung"],
      [".fashion-project-definition .fashion-chapter-label", "Parallel Vision / Material Research", "Parallel Vision / Materialforschung"],
      ["#fashion-research-title", "Material\nResearch\nFor\u00a0Bodies\nIn\u00a0Transition", "Materialsysteme\nfür\u00a0Körper\nim\u00a0Übergang"],
      [".fashion-project-definition .fashion-chapter-copy p:nth-child(1)", "A speculative material research project exploring clothing beyond textiles through responsive matter, biotechnology, synthetic systems and new relationships between technology and the human body.", "Ein spekulatives Materialforschungsprojekt, das Kleidung jenseits von Textilien durch reaktive Materie, Biotechnologie, synthetische Systeme und neue Beziehungen zwischen Technologie und dem menschlichen Körper untersucht."],
      [".fashion-project-definition .fashion-chapter-copy p:nth-child(2)", "Across its collections, garments become synthetic skin, protective architecture, memory systems and interfaces between the body and its environment.", "In den Kollektionen werden Kleidungsstücke zu synthetischer Haut, schützender Architektur, Erinnerungssystemen und Schnittstellen zwischen Körper und Umwelt."],
      [".fashion-project-definition .fashion-chapter-copy p:nth-child(3)", "The project exists across images, moving works, artist collaborations and future physical experiments.", "Das Projekt entfaltet sich in Bildern, Bewegtbildarbeiten, künstlerischen Kollaborationen und zukünftigen physischen Experimenten."],
      [".fashion-material-test .fashion-chapter-label", "Material Test 01", "Materialtest 01"],
      ["#fashion-material-test-title", "Reactive matter replacing fabric.", "Reaktive Materie ersetzt Stoff."],
      [".fashion-material-test-copy p", "Fashion After Fabric explores clothing as a living interface where responsive materials, synthetic biology and engineered systems replace traditional textiles and become part of the human body.", "Fashion After Fabric erforscht Kleidung als lebendige Schnittstelle, in der reaktive Materialien, synthetische Biologie und technische Systeme traditionelle Textilien ersetzen und Teil des menschlichen Körpers werden."],
      [".fashion-material-archive .fashion-chapter-label", "Archive / 05 Material Systems", "Archiv / 05 Materialsysteme"],
      ["#fashion-archive-title", "The Material Archive", "Das\nMaterialarchiv"],
      [".fashion-material-index li:nth-child(1) p", "Responsive metallic skin", "Reaktive metallische Haut"],
      [".fashion-material-index li:nth-child(2) p", "Synthetic tissue replacing the first layer of flesh", "Synthetisches Gewebe ersetzt die erste Hautschicht"],
      [".fashion-material-index li:nth-child(3) p", "Protective volume and nightlife architecture", "Schützendes Volumen und Architektur des Nachtlebens"],
      [".fashion-material-index li:nth-child(4) p", "Memory, media and reconstructed material", "Erinnerung, Medien und rekonstruiertes Material"],
      [".fashion-material-index li:nth-child(5) p", "Biological adaptation and altered anatomy", "Biologische Anpassung und veränderte Anatomie"],
      [".preview-card[href='./chromia.html'] p", "Reactive alloy skins and liquid-metal body interfaces.", "Reaktive Legierungshäute und Körperschnittstellen aus Flüssigmetall."],
      [".preview-card[href='./flesh-zero.html'] p", "Chrome, gas, foam and synthetic tissue collapsing into one living surface.", "Chrom, Gas, Schaum und synthetisches Gewebe verschmelzen zu einer lebendigen Oberfläche."],
      [".preview-card[href='./lotus-2063.html'] p", "Oversized black ritual silhouettes for future nightlife.", "Übergroße schwarze Ritualsilhouetten für das Nachtleben der Zukunft."],
      [".preview-card[href='./magnetic-tape.html'] p", "Analog memory translated into ribboned body architecture.", "Analoge Erinnerung, übersetzt in bandförmige Körperarchitektur."],
      [".preview-card[href='./dna-mutation.html'] p", "Living surfaces, altered membranes and speculative bio-material.", "Lebende Oberflächen, veränderte Membranen und spekulatives Biomaterial."],
      [".preview-arrow", "Open archive →", "Archiv öffnen →"],
      [".fashion-collaboration .fashion-chapter-label", "Artist Collaboration / Moving Image", "Künstlerische Zusammenarbeit / Bewegtbild"],
      ["#fashion-collaboration-title", "Worn by the Inhabitants", "Getragen\u00a0von\u00a0den\nBewohner:innen"],
      [".fashion-collaboration .fashion-chapter-copy p:nth-child(1)", "Fashion After Fabric expands through collaborations with musicians, performers and visual artists.", "Fashion After Fabric erweitert sich durch Kollaborationen mit Musiker:innen, Performer:innen und visuellen Künstler:innen."],
      [".fashion-collaboration .fashion-chapter-copy p:nth-child(2)", "Artists are reimagined as inhabitants of Berlin 2063, wearing evolving material systems inside films, projected runways and live audiovisual environments.", "Künstler:innen werden als Bewohner:innen von Berlin 2063 neu gedacht und tragen sich entwickelnde Materialsysteme in Filmen, projizierten Laufstegen und audiovisuellen Live-Umgebungen."],
      [".fashion-collaboration .fashion-chapter-copy p:nth-child(3)", "The same garment may transform between bodies, performances and realities.", "Dasselbe Kleidungsstück kann sich zwischen Körpern, Performances und Realitäten verwandeln."],
      [".fashion-development .fashion-chapter-label", "Future Development", "Zukünftige Entwicklung"],
      ["#fashion-development-title", "Beyond the Image", "Jenseits des Bildes"],
      [".fashion-development .fashion-chapter-copy p:nth-child(1)", "Fashion After Fabric is an evolving archive of visual research, moving-image experiments and material propositions.", "Fashion After Fabric ist ein wachsendes Archiv visueller Forschung, Bewegtbildexperimente und materieller Entwürfe."],
      [".fashion-development .fashion-chapter-copy p:nth-child(2)", "Its next stages move toward physical prototypes, installations, performance, projection and collaborations across fashion, music and technology.", "Die nächsten Phasen führen zu physischen Prototypen, Installationen, Performance, Projektion und Kollaborationen zwischen Mode, Musik und Technologie."],
      [".fashion-closing p", "The future of clothing may not be something we wear.\nIt may be something we enter.", "Die Zukunft der Kleidung ist vielleicht nichts, das wir tragen.\nVielleicht ist sie etwas, das wir betreten."],
      [".archive-footer a", "Return to main archive", "Zum Hauptarchiv"]
    ],
    "chromia.html": [
      [".collection-intro p", "CHROMIA imagines liquid metal clothing as a second skin: monochrome alloy, mercury movement, chrome membranes and garments that react to heat, sound and pulse.", "CHROMIA denkt Kleidung aus Flüssigmetall als zweite Haut: monochrome Legierungen, Quecksilberbewegung, Chrommembranen und Kleidungsstücke, die auf Wärme, Klang und Puls reagieren."],
      [".archive-footer a", "Next: Flesh Zero →", "Weiter: Flesh Zero →"]
    ],
    "flesh-zero.html": [
      [".collection-intro p", "Flesh Zero is the point where the body stops being dressed and begins being replaced. Chrome, gas, foam and volatile synthetic tissue form a ceremonial surface around the human silhouette. The collection belongs to the Parallel Vision Berlin 2063 timeline and expands the Liquid Metal language into something more organic, ritualistic and unstable than Chromia.", "Flesh Zero ist der Punkt, an dem der Körper nicht länger bekleidet, sondern ersetzt wird. Chrom, Gas, Schaum und flüchtiges synthetisches Gewebe bilden eine zeremonielle Oberfläche um die menschliche Silhouette. Die Kollektion gehört zur Zeitlinie Parallel Vision Berlin 2063 und erweitert die Sprache des flüssigen Metalls um etwas Organischeres, Ritualistischeres und Instabileres als Chromia."],
      [".archive-footer a", "Next: Lotus 2063 →", "Weiter: Lotus 2063 →"]
    ],
    "lotus-2063.html": [
      [".collection-intro p", "LOTUS 2063 expands black ceremonial dressing into oversized ritual silhouettes. Built for humid corridors, late transmission hours and the social theatre of future nightlife.", "LOTUS 2063 erweitert schwarze zeremonielle Kleidung zu übergroßen Ritualsilhouetten. Geschaffen für feuchte Korridore, späte Übertragungsstunden und das soziale Theater des zukünftigen Nachtlebens."],
      [".archive-footer a", "Next: Magnetic Tape →", "Weiter: Magnetic Tape →"]
    ],
    "magnetic-tape.html": [
      [".collection-intro p", "Magnetic Tape turns archive media into body architecture: signal ribbons, black reflective strips, recorded movement and clothing pulled from a damaged future cassette.", "Magnetic Tape verwandelt Archivmedien in Körperarchitektur: Signalbänder, schwarze Reflexstreifen, aufgezeichnete Bewegung und Kleidung wie aus einer beschädigten Kassette der Zukunft."],
      [".archive-footer a", "Next: DNA Mutation →", "Weiter: DNA Mutation →"]
    ],
    "dna-mutation.html": [
      [".collection-intro p", "DNA Mutation treats fashion as an evolving organism: bacterial surfaces, spikes, genetic alteration, living membranes and garments that behave less like products than changing bodies.", "DNA Mutation behandelt Mode als sich entwickelnden Organismus: bakterielle Oberflächen, Stacheln, genetische Veränderungen, lebende Membranen und Kleidungsstücke, die sich eher wie wandelnde Körper als wie Produkte verhalten."],
      [".archive-footer a", "Return to collection archive →", "Zurück zum Kollektionsarchiv →"]
    ]
  };

  const entries = path === "index.html" ? home : genericFashion.concat(pages[path] || []);

  function makeSwitch() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pv-language-switch";
    button.innerHTML = '<span data-language="de">DE</span><i>/</i><span data-language="en">EN</span>';
    const target = document.querySelector(".archive-nav-links") || document.querySelector(".hero nav");
    if (target) target.appendChild(button);
    return button;
  }

  function apply(language) {
    document.documentElement.lang = language;
    entries.forEach(function (entry) {
      document.querySelectorAll(entry[0]).forEach(function (element) {
        element.textContent = language === "de" ? entry[2] : entry[1];
      });
    });
    document.querySelectorAll(".pv-language-switch [data-language]").forEach(function (element) {
      element.classList.toggle("is-active", element.dataset.language === language);
    });
    const switcher = document.querySelector(".pv-language-switch");
    if (switcher) switcher.setAttribute("aria-label", language === "de" ? "Sprache: Deutsch. Zu Englisch wechseln" : "Language: English. Switch to German");
    const ninaSignal = document.querySelector(".nina-nav-signal");
    if (ninaSignal) ninaSignal.setAttribute("aria-label", language === "de" ? "Nina-FOK-Signal verfügbar" : "Nina FOK signal available");
    try { localStorage.setItem(key, language); } catch (_) {}
    window.dispatchEvent(new CustomEvent("pv-language-change", { detail: { language: language } }));
  }

  let saved;
  try { saved = localStorage.getItem(key); } catch (_) {}
  let language = saved === "de" || saved === "en" ? saved : (navigator.language || "en").toLowerCase().startsWith("de") ? "de" : "en";
  const switcher = makeSwitch();
  if (switcher) switcher.addEventListener("click", function () {
    language = document.documentElement.lang === "de" ? "en" : "de";
    apply(language);
  });
  apply(language);
}());
