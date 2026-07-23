(function () {
  "use strict";

  const key = "pvLanguage";
  const path = location.pathname.split("/").pop() || "index.html";

  const home = [
    [".hero nav a[href='#artists']", "Artists", "Künstler:innen"],
    [".hero nav a[href='#releases']", "Releases", "Veröffentlichungen"],
    [".hero nav a[href='./future-fashion.html']", "Fashion After Fabric", "Mode nach dem Stoff"],
    [".hero nav a[href='#berlin']", "Berlin 2063", "Berlin 2063"],
    [".hero nav a[href='#contact']", "Contact", "Kontakt"],
    [".hero-status span:first-child", "PV_ARCHIVE / BERLIN NODE", "PV_ARCHIV / BERLIN KNOTEN"],
    [".hero-status span:last-child", "SIGNAL STABILITY 87%", "SIGNALSTABILITÄT 87 %"],
    [".hero-text", "A record label transmitting music, bodies and imagined futures from Berlin in 2063.", "Ein Plattenlabel, das Musik, Körper und imaginierte Zukünfte aus dem Berlin des Jahres 2063 überträgt."],
    [".nina-signal-main", "Transmit to 2063", "Nach 2063 senden"],
    [".nina-signal-sub", "Talk live with Nina FOK", "Live mit Nina FOK sprechen"],
    [".nina-archive-note", "Nina is one of its inhabitants—and the only one visitors can speak to directly.", "Nina ist eine ihrer Bewohnerinnen—und die Einzige, mit der Besucher:innen direkt sprechen können."],
    ["#berlin .berlin-archive-label", "Parallel Vision / Living Archive", "Parallel Vision / Lebendiges Archiv"],
    ["#berlin .berlin-archive-definition p:first-child", "Berlin 2063 is an evolving audiovisual archive built from imagined documents, environments, characters and memories of a possible future.", "Berlin 2063 ist ein wachsendes audiovisuelles Archiv aus imaginären Dokumenten, Umgebungen, Figuren und Erinnerungen an eine mögliche Zukunft."],
    ["#berlin .berlin-archive-definition p:nth-child(2)", "The project uses fiction to examine the systems already shaping the present—from technology and architecture to nightlife, identity and collective memory.", "Das Projekt nutzt Fiktion, um die Systeme zu untersuchen, die bereits die Gegenwart prägen—von Technologie und Architektur bis zu Nachtleben, Identität und kollektivem Gedächtnis."],
    ["#berlin .berlin-transmission:nth-child(1) .berlin-transmission-index", "Transmission 01", "Übertragung 01"],
    ["#berlin .berlin-transmission:nth-child(1) h3", "Infrastructure", "Infrastruktur"],
    ["#berlin .berlin-transmission:nth-child(1) .berlin-transmission-caption", "The city continues to function long after its original systems have begun to fail. Transport, surveillance and public space remain active, carrying fragments of the society that built them.", "Die Stadt funktioniert noch lange weiter, nachdem ihre ursprünglichen Systeme zu versagen begonnen haben. Verkehr, Überwachung und öffentlicher Raum bleiben aktiv und tragen Fragmente der Gesellschaft, die sie erschaffen hat."],
    ["#berlin .berlin-transmission:nth-child(2) .berlin-transmission-index", "Transmission 02", "Übertragung 02"],
    ["#berlin .berlin-transmission:nth-child(2) h3", "The City", "Die Stadt"],
    ["#berlin .berlin-transmission:nth-child(2) .berlin-transmission-caption", "Berlin has expanded vertically, but its historical structures remain embedded within it. Old monuments, transport lines and social rituals survive inside new technological systems.", "Berlin hat sich vertikal ausgedehnt, doch seine historischen Strukturen bleiben darin verankert. Alte Denkmäler, Verkehrswege und soziale Rituale bestehen innerhalb neuer technologischer Systeme fort."],
    ["#berlin .berlin-transmission:nth-child(3) .berlin-transmission-index", "Transmission 03", "Übertragung 03"],
    ["#berlin .berlin-transmission:nth-child(3) h3 span:first-child", "The", "Die"],
    ["#berlin .berlin-transmission:nth-child(3) h3 span:nth-child(2)", "Inhabitants", "Bewohner:innen"],
    ["#berlin .berlin-transmission:nth-child(3) .berlin-transmission-caption", "The archive follows individuals moving through this future—not as anonymous models, but as witnesses shaped by its architecture, materials and social conditions.", "Das Archiv folgt Menschen, die sich durch diese Zukunft bewegen—nicht als anonyme Modelle, sondern als Zeug:innen, geprägt von ihrer Architektur, ihren Materialien und sozialen Bedingungen."],
    ["#berlin .berlin-archive-closing span:first-child", "Berlin 2063 is not presented as a finished world.", "Berlin 2063 wird nicht als abgeschlossene Welt präsentiert."],
    ["#berlin .berlin-archive-closing span:nth-child(2)", "It is an archive that continues to remember itself.", "Es ist ein Archiv, das sich immer weiter an sich selbst erinnert."],
    ["#artists h2", "Artists", "Künstler:innen"],
    ["#artists .section-head .small", "A growing constellation of artists connected by dark groove, emotional tension, cinematic club music and future-facing atmosphere.", "Eine wachsende Konstellation von Künstler:innen, verbunden durch dunklen Groove, emotionale Spannung, filmische Clubmusik und eine zukunftsgerichtete Atmosphäre."],
    ["#releases h2", "Releases", "Veröffentlichungen"],
    ["#releases .section-head .small", "Sound objects from the Parallel Vision archive. Each release is treated as a fragment of the same world.", "Klangobjekte aus dem Parallel-Vision-Archiv. Jede Veröffentlichung wird als Fragment derselben Welt behandelt."],
    ["#future-fashion .fashion-lede", "The question is no longer what we will wear.\nIt is what clothing becomes once fabric disappears.", "Die Frage ist nicht mehr, was wir tragen werden.\nSondern was Kleidung wird, wenn Stoff verschwindet."],
    ["#future-fashion .fashion-archive-label", "Collections", "Kollektionen"],
    ["#future-fashion .fashion-copy > .small", "Five material studies from the Parallel Vision fashion archive.", "Fünf Materialstudien aus dem Modearchiv von Parallel Vision."],
    ["#contact h2", "Contact", "Kontakt"],
    [".scroll", "Scroll", "Weiter"],
    [".nina-intro-subtitle", "A live transmission from somewhere ahead of us. She can see you. She can hear you.", "Eine Live-Übertragung von irgendwo vor unserer Zeit. Sie kann dich sehen. Sie kann dich hören."],
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
    "future-fashion.html": [
      [".eyebrow", "Parallel Vision Atelier / Berlin 2063", "Parallel Vision Atelier / Berlin 2063"],
      [".hero-lede", "The question is no longer what we will wear.\nIt is what clothing becomes once fabric disappears.", "Die Frage ist nicht mehr, was wir tragen werden.\nSondern was Kleidung wird, wenn Stoff verschwindet."],
      [".fashion-research-definition", "A speculative material research project exploring clothing beyond textiles through responsive matter, biotechnology, synthetic systems and new relationships between technology and the human body.", "Ein spekulatives Materialforschungsprojekt, das Kleidung jenseits von Textilien durch reaktive Materie, Biotechnologie, synthetische Systeme und neue Beziehungen zwischen Technologie und dem menschlichen Körper untersucht."],
      [".chapter-index", "Archive / 05 Collections", "Archiv / 05 Kollektionen"],
      [".chapter-copy", "Five material systems for bodies moving through the humid, unstable and ceremonial spaces of Berlin 2063.", "Fünf Materialsysteme für Körper, die sich durch die feuchten, instabilen und zeremoniellen Räume Berlins im Jahr 2063 bewegen."],
      [".preview-card[href='./chromia.html'] p", "Reactive alloy skins and liquid-metal body interfaces.", "Reaktive Legierungshäute und Körperschnittstellen aus Flüssigmetall."],
      [".preview-card[href='./flesh-zero.html'] p", "Chrome, gas, foam and synthetic tissue collapsing into one living surface.", "Chrom, Gas, Schaum und synthetisches Gewebe verschmelzen zu einer lebendigen Oberfläche."],
      [".preview-card[href='./lotus-2063.html'] p", "Oversized black ritual silhouettes for future nightlife.", "Übergroße schwarze Ritualsilhouetten für das Nachtleben der Zukunft."],
      [".preview-card[href='./magnetic-tape.html'] p", "Analog memory translated into ribboned body architecture.", "Analoge Erinnerung, übersetzt in bandförmige Körperarchitektur."],
      [".preview-card[href='./dna-mutation.html'] p", "Living surfaces, altered membranes and speculative bio-material.", "Lebende Oberflächen, veränderte Membranen und spekulatives Biomaterial."],
      [".preview-arrow", "Open archive →", "Archiv öffnen →"],
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
