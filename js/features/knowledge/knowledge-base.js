// ==================== KNOWLEDGE BASE & HELP ASSISTANT ====================
// Source-bound help for LARGER.slicer machine documentation.

const KNOWLEDGE_REPOSITORY = 'https://github.com/Moeewe/LARGER.slicer';

// Dokumentenindex aus dem LARGER.slicer-Ordner (erzeugt mit scripts/build-knowledge.mjs):
// Dokumente je Maschine, Inhaltsverzeichnisse, durchsuchbare Abschnitte und Fehlerhilfen.
let knowledgeIndex = null;
let knowledgeIndexPromise = null;
function loadKnowledgeIndex() {
  if (knowledgeIndex) return Promise.resolve(knowledgeIndex);
  if (!knowledgeIndexPromise) {
    knowledgeIndexPromise = fetch('data/larger-slicer.json')
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('HTTP ' + response.status))))
      .then(data => { knowledgeIndex = data; return data; })
      .catch(error => { console.warn('Dokumentenindex nicht verfügbar:', error); knowledgeIndexPromise = null; return null; });
  }
  return knowledgeIndexPromise;
}

const KNOWLEDGE_MACHINE_LABELS = { weber: 'Weber DXR25', ginger: 'Ginger One', ur5: 'Universal Robots UR5', zuend: 'Zünd G3 (CNC)', all: 'Allgemein' };
const KNOWLEDGE_SOURCE_DOCS = { weber: 'weber-de', ginger: 'ginger', kuka: 'kuka-de', ur5: 'ur5', zuend: 'zuend', overview: 'overview' };
const knowledgeDocUrl = (doc, anchor) => `${doc.url}${anchor ? '#' + anchor : ''}`;
const knowledgeDocsFor = profile => (knowledgeIndex?.docs || []).filter(doc => doc.machines.includes(profile));

function knowledgeDocChips(doc) {
  return `<span class="material-chip">${knowledgeEscape(doc.kind)}</span><span class="material-chip">${knowledgeEscape(String(doc.lang).toUpperCase())}</span>`;
}
function knowledgeDocItem(doc, withToc = true) {
  const toc = withToc && doc.toc?.length > 1
    ? `<details class="kdoc-toc"><summary>Inhalt (${doc.toc.length})</summary><ul>${doc.toc.map(item => `<li><a href="${knowledgeEscape(knowledgeDocUrl(doc, item.anchor))}" target="_blank" rel="noopener noreferrer">${knowledgeEscape(item.title)}</a></li>`).join('')}</ul></details>` : '';
  return `<li class="kdoc"><div class="kdoc-head"><a href="${knowledgeEscape(knowledgeDocUrl(doc))}" target="_blank" rel="noopener noreferrer">${knowledgeEscape(doc.title)}</a>${knowledgeDocChips(doc)}</div>${toc}</li>`;
}

// Dokumente zur Maschine (Anleitungen, Fehlerbehebung, Checklisten)
function knowledgeDocsBlock(profile) {
  const docs = knowledgeDocsFor(profile);
  if (!docs.length) return '';
  return `<div class="kguide-links"><h4>Dokumente zu dieser Maschine</h4><ul class="kdocs">${docs.map(doc => knowledgeDocItem(doc)).join('')}</ul></div>`;
}

// Alle Dokumente, nach Maschine gruppiert (Startseite, eingeklappt)
function knowledgeAllDocsBlock() {
  if (!knowledgeIndex) return '<p>Dokumente werden geladen …</p>';
  return Object.entries(KNOWLEDGE_MACHINE_LABELS).map(([profile, label]) => {
    const docs = knowledgeDocsFor(profile);
    return docs.length ? `<h4 class="kdocs-group">${knowledgeEscape(label)}</h4><ul class="kdocs">${docs.map(doc => knowledgeDocItem(doc, false)).join('')}</ul>` : '';
  }).join('') + `<p class="kdocs-source"><small>Stand ${knowledgeEscape(knowledgeIndex.source?.generatedAt || '')} · <a href="${KNOWLEDGE_REPOSITORY}" target="_blank" rel="noopener noreferrer">Repository auf GitHub</a></small></p>`;
}

const KNOWLEDGE_GUIDES = {
  start: {
    title: 'Erste Schritte mit PelletTrackr', source: null,
    steps: [
      'Konto bestätigen. Registriere dich mit deiner Hochschul-E-Mail und klicke auf den Link in der Bestätigungsmail. Kommt keine Mail an, schau im Spam-Ordner nach oder melde dich einfach an – wir senden den Link dann erneut.',
      'Dein Dashboard. Ganz oben siehst du, welche Maschinen gerade frei sind. Darunter stehen deine Aufträge und Kosten: Gesamtkosten, Bezahlt und Offen.',
      'Einweisung klären. Für manche Maschinen brauchst du eine Sicherheitsunterweisung. Unter „Mein Profil“ siehst du, für welche du eingetragen bist. Im Zweifel frag in der Werkstatt.',
      'Schritt-für-Schritt-Hilfe nutzen. Wähle hier unter „Hilfe & Anleitungen“ deine Maschine und arbeite die Schritte ab. An der Maschine selbst kommst du mit dem QR-Code auf dem Etikett direkt dorthin.',
      'Auftrag erfassen. Gib unter „Auftrag erfassen“ einen Job-Namen, die Maschine und die Zeit an. Material und Menge nur, wenn du welches verbraucht hast. Die Kosten siehst du sofort.',
      'Bezahlen. Offene Aufträge findest du unter „Deine Aufträge“. Sobald die Werkstatt die Zahlung bestätigt, steht der Auftrag auf „Bezahlt“ und du kannst den Nachweis öffnen.',
      'Mehr Services. Unter „Deine Services“ kannst du Equipment leihen, Defekte melden und Material wünschen. Etwas klappt nicht? Nutze die Suche in der Hilfe oder melde ein Problem.'
    ]
  },
  zuend: {
    title: 'Zünd G3 L-2500 · 3D-Fräsen und Schneiden', source: 'zuend',
    steps: [
      'Sicherheit prüfen. Nur als eingewiesene Person arbeiten, Schutzbrille tragen, die Absaugung einschalten und den Not-Aus-Taster erreichbar halten.',
      'Material auflegen. Höchstens 50 mm dick (Öffnungshöhe 60 mm). Das Material flach auflegen und mit dem Vakuum sicher fixieren; die Saugfläche an die Materialgröße anpassen.',
      'Datei vorbereiten. Für 3D-Fräsen die Rhino-Datei und das Grasshopper-Skript öffnen; die Geometrie muss in den Arbeitsbereich von 1800 × 2500 mm passen und darf höchstens 50 mm hoch sein. Normales Schneiden und 2D-Aufträge laufen über die Software Zünd Cut Center.',
      'Parameter einstellen. Materialdicke, Zustelltiefe (typisch 2–5 mm), Bahnabstand (60–80 % des Werkzeugdurchmessers), Werkzeug aus dem Magazin und Spindeldrehzahl (typisch 18.000–24.000 U/min) festlegen.',
      'Werkzeugweg prüfen. Die Vorschau in Rhino kontrollieren und die Z-Werte innerhalb der sicheren Grenzen halten, dann die PLT-Datei exportieren.',
      'Auf die Maschine übertragen. PLT-Datei im Zünd Cut Center laden, die Werkzeughöhe kalibrieren und den Auftrag über die Oberfläche des Cut Centers starten.',
      'Während des Fräsens beobachten. Niemals in den Arbeitsbereich greifen, solange die Maschine läuft. Bei schlechter Oberfläche, Rattern oder zu wenig Vakuum hilft die Fehlerhilfe unten.'
    ]
  },
  weber: {
    title: 'Weber DXR25 · Großroboter / DXR-Steuerung', source: 'weber',
    steps: [
      'Nur als eingewiesene Person arbeiten. Raum 5–10 Minuten lüften, Sicherheitsbereich räumen und Anlage auf sichtbare Schäden prüfen.',
      'Not-Aus-Schalter und Türmechanik prüfen. Die Tür wird erst für den Start verriegelt.',
      'Robotersteuerung und danach den Schaltschrank entsprechend der dokumentierten Einschaltreihenfolge einschalten.',
      'Weber-Runtime starten, Hinweise quittieren und prüfen, ob alle notwendigen Statusanzeigen bereit sind.',
      'Tür schließen, den blinkenden weißen Knopf drücken und damit das Sicherheitssystem verriegeln.',
      'Bremstest beziehungsweise SAK-Fahrt durchführen und den gesamten Arbeitsraum beobachten.',
      'DXR-Datei laden und nur fortfahren, wenn der File Health Check ein eindeutiges GO meldet.',
      'Bauteilmaße, Offsets, Extruderausrichtung und Kollisionsfreiheit prüfen. Multiaxiale Bahnen besonders auf Abstand zum Zaun kontrollieren.',
      'Mit reduziertem Override von 10–50 % starten und erst nach stabiler Bewegung schrittweise erhöhen.',
      'Druck beobachten. Bei ungewöhnlichen Geräuschen, Geruch, Vibration oder Kollisionsgefahr sofort stoppen und bei Gefahr Not-Aus betätigen.'
    ]
  },
  ginger: {
    title: 'Ginger für einen Druck vorbereiten', source: 'ginger',
    steps: [
      'Nur als eingewiesene Person arbeiten. Hauptmaschine und Heizbett an getrennten Stromkreisen betreiben.',
      'Alle Not-Aus-Taster prüfen und den Arbeitsbereich freihalten.',
      'Nozzle-Größe, Sauberkeit, Bett-Nivellierung, Z-Offset und Haftmittel kontrollieren.',
      'Heizbett und Extruder auf die zum Material passenden Temperaturen vorheizen.',
      'Material fördern, bis die Düse sauber ist. Rückstände vor dem Homing entfernen.',
      'Alle Achsen homen; Z-Homing erst bei erreichter Extrudertemperatur durchführen.',
      'Die mit LARGER Slicer erzeugte G-Code-Datei über microSD laden.',
      'Mixer-Verhältnis einstellen; dokumentierter Ausgangswert ist 93 % Basismaterial und 7 % Additiv.',
      'Druck starten und Brim sowie erste Schichten ständig kontrollieren. Flow und Z-Offset bei Bedarf vorsichtig korrigieren.',
      'Nach dem Druck Bett und Bauteil abkühlen lassen, bevor das Bauteil entfernt wird.'
    ]
  },
  ur5: {
    title: 'Universal Robots UR5 · kleiner Roboterarm / UR5slicer.gh', source: 'ur5',
    steps: [
      'Nur als eingewiesene Person arbeiten und sicherstellen, dass Roboter, Werkzeug und Arbeitsraum kollisionsfrei sind.',
      'Laptop per Ethernet direkt mit dem UR5-Netzwerkadapter verbinden und die dokumentierte statische IP-Konfiguration prüfen.',
      'Rhino und Grasshopper öffnen; Robots- und MeshEdit-Komponenten müssen ohne rote Fehler geladen sein.',
      'Beim ersten Einsatz die UR5-Bibliothek über den Libraries-Dialog der Robot-Komponente installieren.',
      'Werkzeug, TCP, Werkzeuglänge und Robot Configuration für Schulter, Ellenbogen und Handgelenk korrekt einstellen.',
      'Die vollständige Simulation mit dem Animation-Slider abfahren. Auf Kollisionen, Singularitäten und unerreichbare Positionen achten.',
      'Grasshopper-Datei vor dem Upload speichern und Warnungs-/Fehlerausgaben prüfen.',
      'Programm hochladen und am Pendant nur nach Sichtprüfung ausführen.',
      'Bewegung zunächst langsam beobachten. Bei unerwarteter Bewegung sofort stoppen.'
    ]
  }
};

const KNOWLEDGE_FAQ = [
  {
    profile: 'weber', keywords: ['sicherheitsbereich', 'sicherheitszaun', 'zaun', 'notstop', 'safety', 'bremse', 'knacken'],
    title: 'Sicherheitsstopp nahe dem Zaun',
    answer: 'Prüfe zuerst die genaue Meldung auf HMI oder Smartpad. Bei multiaxialen Bahnen kann TCP oder Extruder bereits vor dem physischen Zaun in den geschützten Bremsbereich geraten. Nur eingewiesene Personen dürfen in T1 mit gedrücktem Totmannschalter langsam aus dem Schutzbereich verfahren. Danach wieder EXT/Remote wählen, das CNC-Programm bei Bedarf neu anwählen und zurücksetzen. Vor einem Neustart Bahn und Extruderausrichtung mit zusätzlichem Zaunabstand korrigieren.',
    source: 'kuka'
  },
  {
    profile: 'weber', keywords: ['bewegt', 'bewegen', 'reagiert', 'startet nicht', 'grundstellung', 'referenz', 'bremstest', '0,0,0'],
    title: 'Roboter bewegt sich nicht',
    answer: 'Prüfe, ob Not-Aus gelöst, Tür verriegelt und alle Statusanzeigen grün sind. Wähle anschließend am Smartpad das CNC-Programm „cnc“ neu an und führe „Programm zurücksetzen“ aus. Nach einem Abbruch oder Handverfahren kann zusätzlich ein Reset des EMI unter PrgView erforderlich sein. Falls die Referenzfahrt weiter scheitert, kontrolliere den Referenzschalter und dessen Kontrolllampen. Nicht weiterfahren, wenn die Ursache unklar bleibt.',
    source: 'kuka'
  },
  {
    profile: 'weber', keywords: ['tür', 'tuer', 'verriegelt', 'weiß', 'weiss', 'freigabe'],
    title: 'Sicherheit beziehungsweise Türfreigabe fehlt',
    answer: 'Arbeitsbereich vollständig räumen, Tür schließen und die Türmechanik prüfen. Wenn der weiße Knopf blinkt, drücken, um das Sicherheitssystem zu verriegeln. Vor Bewegung müssen die notwendigen Freigaben und Statusanzeigen vorliegen. Bei weiterhin fehlender Freigabe nicht überbrücken, sondern Meldung am HMI/Smartpad auswerten.',
    source: 'weber'
  },
  {
    profile: 'weber', keywords: ['endlos', 'laden', 'job', 'nc-laufwerk', 'gcode.nc'],
    title: 'Job lädt endlos',
    answer: 'Die Weber-Runtime beenden, im Explorer das NC-Laufwerk öffnen und prüfen, ob die Verbindung grün wird. Bei Ladeproblemen kann die vorhandene Gcode.nc auf dem geteilten Laufwerk gelöscht und der Job anschließend neu geladen werden.',
    source: 'weber'
  },
  {
    profile: 'ginger', keywords: ['haftung', 'erste schicht', 'brim', 'bett', 'z-offset', 'ablöst'],
    title: 'Erste Schicht haftet nicht',
    answer: 'Bett-Nivellierung und Z-Offset prüfen, die Druckfläche reinigen und ein passendes Haftmittel verwenden. Kontrolliere Nozzle-Größe, Materialtemperatur und Flow. Brim und erste Schichten beobachten und Z-Offset beziehungsweise Flow nur in kleinen Schritten korrigieren.',
    source: 'ginger'
  },
  {
    profile: 'ginger', keywords: ['verstopft', 'düse', 'duese', 'material', 'extruder', 'fördert nicht', 'foerdert nicht'],
    title: 'Materialförderung oder Düse prüfen',
    answer: 'Extruder auf Materialtemperatur bringen und Material fördern, bis die Düse sauber ist. Rückstände vor dem Homing entfernen. Mixer-Einstellung, Materialzufuhr und Nozzle auf Blockaden kontrollieren. Bei ungewöhnlichem Druck, Geräuschen oder Überhitzung stoppen.',
    source: 'ginger'
  },
  {
    profile: 'ur5', keywords: ['upload', 'hängt', 'haengt', 'verbindung', 'ethernet', 'ip', 'ping'],
    title: 'UR5-Verbindung oder Upload hängt',
    answer: 'Nur die kabelgebundene Ethernet-Verbindung verwenden. IP-Konfiguration des Laptops, Kabel und Robot-IP prüfen. Grasshopper-Datei vor dem Upload speichern. Falls der Upload hängt, Ethernet kurz trennen, Einstellungen kontrollieren und erneut verbinden. Anschließend die Verbindung per Ping prüfen.',
    source: 'ur5'
  },
  {
    profile: 'ur5', keywords: ['rot', 'roboter fehlt', 'bibliothek', 'library', 'komponente'],
    title: 'UR5-Komponente ist rot oder Roboter fehlt',
    answer: 'In der roten Robot-Komponente den Libraries-Dialog öffnen, zu Universal Robots wechseln und UR5 installieren. Danach die Grasshopper-Datei speichern, schließen und erneut öffnen. Die Bibliothek muss nur einmal pro Rhino-Installation eingerichtet werden.',
    source: 'ur5'
  }
];

let knowledgeMachines = [];
let knowledgeArticles = [];
let activeGuide = null;
let activeGuideStep = 0;

function knowledgeEscape(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function knowledgeSourceLink(sourceId) {
  const doc = knowledgeIndex?.docs.find(item => item.id === KNOWLEDGE_SOURCE_DOCS[sourceId]);
  return doc ? `<a href="${knowledgeEscape(knowledgeDocUrl(doc))}" target="_blank" rel="noopener noreferrer">Quelle: ${knowledgeEscape(doc.title)}</a>` : '';
}

function knowledgeProfileForMachine(machine) {
  const type=String(machine?.machineType||machine?.category||'').toLowerCase();
  if(type==='ur5') return 'ur5';
  if(type==='weber_dxr') return 'weber';
  if(type==='cnc') return 'zuend';
  const text = `${machine?.name || ''} ${machine?.model || ''} ${machine?.category || ''}`.toLowerCase();
  if (/ur\s?-?5|universal robots?/.test(text)) return 'ur5';
  if (/weber|dxr|kuka/.test(text)) return 'weber';
  if (/ginger/.test(text)) return 'ginger';
  if (/z(ü|ue|u)nd|\bg3\b|cnc/.test(text)) return 'zuend';
  if (/ur\s?-?5|universal robot/.test(text)) return 'ur5';
  return '';
}

function knowledgeStatusLabel(status) {
  const map = { available: 'Verfügbar', printing: 'In Betrieb', in_use: 'In Betrieb', maintenance: 'Wartung', broken: 'Defekt', borrowed: 'Ausgeliehen', rented: 'Ausgeliehen' };
  return map[status] || status || 'Status unbekannt';
}

let knowledgeMachinesLoaded = false;
async function loadKnowledgeMachines() {
  if (!window.db || knowledgeMachinesLoaded) return;
  try {
    const [printers, equipment, machines] = await Promise.all([
      window.db.collection('printers').get(), window.db.collection('equipment').get(), window.db.collection('machines').get()
    ]);
    knowledgeMachines = [
      ...printers.docs.map(doc => ({ id: doc.id, collection: 'printers', ...doc.data() })),
      ...equipment.docs.map(doc => ({ id: doc.id, collection: 'equipment', ...doc.data() })),
      ...machines.docs.filter(doc=>doc.data().active!==false).map(doc => ({ id: doc.id, collection: 'machines', ...doc.data() }))
    ].filter(machine => machine.name).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    try { const saved=await window.db.collection('knowledgeArticles').get(); knowledgeArticles=saved.docs.map(doc=>({id:doc.id,...doc.data()})); } catch (_) { knowledgeArticles=[]; }
    knowledgeMachinesLoaded = true;
  } catch (error) {
    console.warn('Maschinen konnten für die Wissensdatenbank nicht geladen werden:', error);
    knowledgeMachines = [];
  }
}

function knowledgeHasGuide(machine) {
  return Array.isArray(machine?.guideSteps) && machine.guideSteps.length > 0;
}
function knowledgeLinksFor(machine) {
  return (Array.isArray(machine?.guideLinks) ? machine.guideLinks : []).filter(link => /^https:\/\//.test(link?.url || ''));
}

function knowledgeSafetyLinksFor(machine) {
  return (Array.isArray(machine?.safetyLinks) ? machine.safetyLinks : []).filter(link => /^https:\/\//.test(link?.url || ''));
}
function knowledgeHasSafety(machine) {
  return Boolean(String(machine?.safetyText || '').trim()) || knowledgeSafetyLinksFor(machine).length > 0;
}

// Sicherheits- und Betriebsanweisung (Arbeitsschutz) der Maschine; Nutzer können Links vorschlagen.
function knowledgeSafetyBlock(machine, open = false) {
  if (!machine) return '';
  const text = String(machine.safetyText || '').trim();
  const links = knowledgeSafetyLinksFor(machine).map(link => `<li><a href="${knowledgeEscape(link.url)}" target="_blank" rel="noopener noreferrer">${knowledgeEscape(link.title || link.url)}</a></li>`).join('');
  if (!text && !links && !machine.id) return '';
  return `<details class="kguide-safety" ${open ? 'open' : ''}><summary>Sicherheits- und Betriebsanweisung</summary><div class="kguide-safety-body">
    ${text ? `<p class="kguide-safety-text">${knowledgeEscape(text)}</p>` : ''}${links ? `<ul>${links}</ul>` : ''}
    ${!text && !links ? '<p>Für diese Maschine ist noch keine Betriebsanweisung hinterlegt.</p>' : ''}
    ${machine.id ? '<button class="link-small" onclick="knowledgeSuggestTutorial(\'safety\')">Betriebsanweisung vorschlagen</button>' : ''}</div></details>`;
}

// Benötigtes Equipment (z. B. Schlüssel), das zur Maschine gehört
function knowledgeEquipmentBlock(machine) {
  const items = Array.isArray(machine?.requiredEquipment) ? machine.requiredEquipment : [];
  if (!items.length) return '';
  return `<p class="kguide-material">Dafür brauchst du: ${knowledgeEscape(items.map(item => item.name).join(', '))}. <button class="link-small" onclick="closeModal();showEquipmentRequest?.()">Ausleihe anfragen</button></p>`;
}

// Videos, Dokumente und die passende README aus GitHub zur Maschine
function knowledgeLinksBlock(machine, profile) {
  const links = knowledgeLinksFor(machine);
  const items = links.map(link => `<li><a href="${knowledgeEscape(link.url)}" target="_blank" rel="noopener noreferrer">${knowledgeEscape(link.title || link.url)}</a></li>`);
  const suggest = machine?.id ? `<button class="link-small" onclick="knowledgeSuggestTutorial()">Tutorial vorschlagen</button>` : '';
  const own = items.length || suggest
    ? `<div class="kguide-links"><h4>Videos & Links</h4>${items.length ? `<ul>${items.join('')}</ul>` : '<p>Noch keine Links hinterlegt.</p>'}${suggest}</div>` : '';
  return own + knowledgeDocsBlock(profile);
}

function knowledgeArticlesFor(machine) {
  const haystack = `${machine?.name || ''} ${machine?.model || ''} ${machine?.jobTypes || ''}`.toLocaleLowerCase('de');
  return knowledgeArticles.filter(a => a.machineName && haystack.includes(a.machineName.toLocaleLowerCase('de')));
}

// Ein Schritt = kurzer Titel + Details; Sicherheitshinweise werden hervorgehoben.
function knowledgeSplitStep(text) {
  const match = String(text).match(/^(.{12,90}?[.:])\s+([\s\S]+)$/);
  const title = (match ? match[1] : text).replace(/[.:]$/, '');
  return { title, body: match ? match[2] : '', warning: /not-aus|sofort stoppen|gefahr|kollision|eingewiesen|singularit/i.test(text) };
}

// Nur Maschinen anzeigen, für die es wirklich eine Anleitung gibt.
function knowledgeGuideTargets() {
  const covered = new Set();
  const targets = knowledgeMachines.filter(machine => {
    const profile = knowledgeProfileForMachine(machine);
    if (profile) covered.add(profile);
    return profile || knowledgeArticlesFor(machine).length || knowledgeHasGuide(machine) || knowledgeLinksFor(machine).length || knowledgeHasSafety(machine);
  }).map(machine => ({ value: `machine:${machine.collection}:${machine.id}`, name: machine.name, status: knowledgeStatusLabel(machine.status), statusKey: machine.status || '', profile: knowledgeProfileForMachine(machine) }));
  const general = [['weber', 'Weber DXR25 (Großroboter)'], ['ur5', 'Universal Robots UR5'], ['ginger', 'Ginger'], ['zuend', 'Zünd G3 (CNC-Fräse)']]
    .filter(([profile]) => !covered.has(profile))
    .map(([profile, name]) => ({ value: `profile:${profile}`, name, status: '', statusKey: '', profile }));
  return [...targets, ...general];
}

async function showKnowledgeBase(machineReference = null) {
  showModalWithContent(`<div class="modal-header"><h2>Hilfe & Anleitungen</h2><button class="close-btn" onclick="closeModal()">&times;</button></div>
    <div class="modal-body knowledge-base">
      <p class="knowledge-disclaimer"><strong>Sicherheit:</strong> Nur für eingewiesene Personen. Bei Gefahr sofort stoppen, im Notfall Not-Aus drücken.</p>
      <div id="knowledgeContent"><p>Wird geladen …</p></div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Schließen</button></div>`);
  await Promise.all([loadKnowledgeMachines(), loadKnowledgeIndex()]);
  showKnowledgeGuideMode();
  if (machineReference) {
    const value = `machine:${machineReference.collection}:${machineReference.id}`;
    if (knowledgeGuideTargets().some(target => target.value === value)) startKnowledgeGuide(value);
    else if (window.toast) window.toast.info('Für diese Maschine gibt es noch keine Schritt-für-Schritt-Anleitung. Du kannst unten eine Frage stellen.');
  }
}

// Startseite der Hilfe: Maschine wählen oder direkt eine Frage stellen.
function showKnowledgeGuideMode() {
  activeGuide = null; activeGuideStep = 0;
  const target = document.getElementById('knowledgeContent');
  if (!target) return;
  const tiles = knowledgeGuideTargets().map(item => `<button class="knowledge-tile" onclick="startKnowledgeGuide('${knowledgeEscape(item.value)}')">
      <span class="knowledge-tile-text"><strong>${knowledgeEscape(item.name)}</strong>${item.status ? `<small class="knowledge-status knowledge-status-${knowledgeEscape(item.statusKey)}">${knowledgeEscape(item.status)}</small>` : '<small>Anleitung</small>'}</span>
      <span class="knowledge-tile-go" aria-hidden="true">→</span></button>`).join('');
  const articles = knowledgeArticles.map(a => `<article><strong>${knowledgeEscape(a.title)}</strong>${a.machineName ? ` · ${knowledgeEscape(a.machineName)}` : ''}<p>${knowledgeEscape(a.body)}</p>${a.url ? `<a href="${knowledgeEscape(a.url)}" target="_blank" rel="noopener noreferrer">Anleitung öffnen</a>` : ''}</article>`).join('');
  target.innerHTML = `<button class="knowledge-start" onclick="startKnowledgeGuide('profile:start')"><span><strong>Neu hier? Erste Schritte</strong><small>In 2 Minuten wissen, wie alles funktioniert</small></span><span class="knowledge-tile-go" aria-hidden="true">→</span></button>
    <div class="knowledge-hero"><h3>Deine Maschine</h3><p>Wähle eine Maschine – wir führen dich Schritt für Schritt.</p></div>
    <div class="knowledge-tiles">${tiles || '<p>Noch keine Anleitungen hinterlegt.</p>'}</div>
    <div class="knowledge-help-card"><h3>Etwas funktioniert nicht?</h3>
      <div class="knowledge-chat-input"><input id="knowledgeQuestion" class="form-input" placeholder="Beschreibe kurz das Problem …" enterkeyhint="search" onkeydown="if(event.key === 'Enter'){ submitKnowledgeQuestion(); }"><button class="btn btn-primary" onclick="submitKnowledgeQuestion()">Suchen</button></div>
      <div class="knowledge-suggestions"><button onclick="askKnowledgeQuestion('Der Roboter bewegt sich nicht')">Roboter bewegt sich nicht</button><button onclick="askKnowledgeQuestion('Sicherheitsbereich ausgelöst')">Sicherheitsstopp</button><button onclick="askKnowledgeQuestion('Die erste Schicht haftet nicht')">Erste Schicht haftet nicht</button></div>
      <div id="knowledgeConversation" class="knowledge-conversation"></div></div>
    <details class="knowledge-readme-links"><summary>Alle Dokumente (LARGER.slicer)</summary><div>${knowledgeAllDocsBlock()}${articles}</div></details>`;
}

function startKnowledgeGuide(valueArg) {
  const value = typeof valueArg === 'string' ? valueArg : '';
  let profile = value.startsWith('profile:') ? value.split(':')[1] : '';
  let machine = null;
  if (value.startsWith('machine:')) {
    const [, collection, id] = value.split(':');
    machine = knowledgeMachines.find(item => item.collection === collection && item.id === id);
    profile = knowledgeProfileForMachine(machine);
  }
  // Nur Links hinterlegt (z. B. Video-Tutorials ohne eigene Schritte): Linkseite zeigen.
  if (machine && !knowledgeHasGuide(machine) && (knowledgeLinksFor(machine).length || knowledgeHasSafety(machine)) && !KNOWLEDGE_GUIDES[profile]) {
    activeGuide = { title: machine.name, profile: profile || 'custom', machine, source: null, steps: [], linksOnly: true };
    renderKnowledgeLinksPage(); return;
  }
  // Die an der Maschine hinterlegte Anleitung hat immer Vorrang vor allgemeinen Anleitungen.
  if (machine && knowledgeHasGuide(machine)) {
    activeGuide = { title: machine.name, profile: profile || 'custom', machine, source: null, steps: machine.guideSteps };
    activeGuideStep = 0; renderKnowledgeGuideStep(); return;
  }
  if (!profile || !KNOWLEDGE_GUIDES[profile]) {
    const matches = machine ? knowledgeArticlesFor(machine) : [];
    if (machine && matches.length) {
      activeGuide = { title: machine.name, profile: 'admin', machine, source: 'overview', steps: matches.flatMap(a => a.body.split(/\n+/).map(s => s.trim()).filter(Boolean).map(s => `${a.title}: ${s}`)) };
      activeGuideStep = 0; renderKnowledgeGuideStep(); return;
    }
    if (window.toast) window.toast.info('Für diese Maschine gibt es noch keine Schritt-für-Schritt-Anleitung. Stelle unten eine Frage.');
    return;
  }
  activeGuide = { ...KNOWLEDGE_GUIDES[profile], profile, machine };
  activeGuideStep = 0;
  renderKnowledgeGuideStep();
}

// Welches Material die Maschine verarbeitet (aus "Maschinen verwalten")
function knowledgeMaterialLine(machine) {
  if (!machine || !window.machineMaterialRule) return '';
  const rule = window.machineMaterialRule(machine);
  if (!rule.uses) return '';
  const forms = rule.types.map(type => ({ filament: 'Filament', pellet: 'Pellet' }[type] || type));
  if (!forms.length && !rule.ids.length) return '';
  return `<p class="kguide-material">Material: ${knowledgeEscape(forms.join(' · ') || 'ausgewählte Materialien')}${rule.masterbatch ? '' : ' · ohne Masterbatch'}</p>`;
}

function knowledgeGuideHeader() {
  const total = activeGuide.steps.length;
  const segments = activeGuide.steps.map((_, i) => i < activeGuideStep
    ? `<button class="kstep-seg done" onclick="knowledgeGuideGo(${i})" aria-label="Zu Schritt ${i + 1}"></button>`
    : `<span class="kstep-seg ${i === activeGuideStep ? 'current' : ''}"></span>`).join('');
  return `<div class="kguide-top"><button class="btn btn-link knowledge-back" onclick="showKnowledgeGuideMode()">← Alle Maschinen</button><span class="kguide-machine">${knowledgeEscape(activeGuide.machine?.name || activeGuide.title)}</span></div>
    ${knowledgeMaterialLine(activeGuide.machine)}
    ${knowledgeEquipmentBlock(activeGuide.machine)}
    ${knowledgeSafetyBlock(activeGuide.machine)}
    <div class="kstep-bar" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${activeGuideStep + 1}">${segments}</div>`;
}

function renderKnowledgeGuideStep() {
  const target = document.getElementById('knowledgeContent');
  if (!target || !activeGuide) return;
  const total = activeGuide.steps.length;
  const isLast = activeGuideStep === total - 1;
  const { title, body, warning } = knowledgeSplitStep(activeGuide.steps[activeGuideStep]);
  target.innerHTML = `${knowledgeGuideHeader()}
    <div class="kstep-card ${warning ? 'kstep-warning' : ''}">
      <div class="kstep-head"><span class="kstep-number">${activeGuideStep + 1}</span><span class="kstep-count">von ${total}</span></div>
      <h3 class="kstep-title">${knowledgeEscape(title)}</h3>
      ${body ? `<p class="kstep-body">${knowledgeEscape(body)}</p>` : ''}
      ${warning ? '<div class="kstep-callout"><b class="kstep-callout-mark">!</b><span><strong>Sicherheit:</strong> Nur eingewiesene Personen. Bei Gefahr sofort stoppen, im Notfall Not-Aus drücken.</span></div>' : ''}
    </div>
    <div class="kstep-actions">
      <button class="btn btn-primary kstep-next" onclick="${isLast ? 'knowledgeGuideDone()' : 'knowledgeGuideNext()'}">✓ ${isLast ? 'Alles erledigt' : 'Erledigt – weiter'}</button>
      <button class="btn btn-secondary" onclick="knowledgeGuidePrevious()" ${activeGuideStep === 0 ? 'disabled' : ''}>Zurück</button>
    </div>
    ${knowledgeLinksBlock(activeGuide.machine, activeGuide.profile)}
    <div class="kstep-foot"><button class="link-small" onclick="showKnowledgeChatMode()">Etwas klappt nicht? Frage stellen</button><span class="knowledge-source">${activeGuide.source ? knowledgeSourceLink(activeGuide.source) : ''}</span></div>`;
}

function renderKnowledgeLinksPage() {
  const target = document.getElementById('knowledgeContent');
  if (!target || !activeGuide) return;
  target.innerHTML = `<div class="kguide-top"><button class="btn btn-link knowledge-back" onclick="showKnowledgeGuideMode()">← Alle Maschinen</button><span class="kguide-machine">${knowledgeEscape(activeGuide.title)}</span></div>
    <div class="kstep-card"><h3 class="kstep-title">Infos zur Maschine</h3><p class="kstep-body">Für diese Maschine gibt es noch keine Schritt-für-Schritt-Anleitung, aber diese Informationen.</p></div>
    ${knowledgeMaterialLine(activeGuide.machine)}${knowledgeEquipmentBlock(activeGuide.machine)}
    ${knowledgeSafetyBlock(activeGuide.machine, true)}
    ${knowledgeLinksBlock(activeGuide.machine, activeGuide.profile)}`;
}

// Tutorial vorschlagen (Nutzer): Admins prüfen und übernehmen den Link
function knowledgeSuggestTutorial(kind = 'tutorial') {
  const machine = activeGuide?.machine;
  const target = document.getElementById('knowledgeContent');
  if (!machine?.id || !target) return;
  const back = activeGuide.linksOnly ? 'renderKnowledgeLinksPage()' : 'renderKnowledgeGuideStep()';
  target.innerHTML = `<div class="kstep-card"><h3 class="kstep-title">Link vorschlagen</h3>
      <p class="kstep-body">Kennst du ein gutes Video, ein Dokument oder die Betriebsanweisung zu <strong>${knowledgeEscape(machine.name)}</strong>? Die Werkstatt prüft den Link und nimmt ihn auf.</p>
      <label class="form-label" for="suggestKind">Art</label><select id="suggestKind" class="form-select"><option value="tutorial" ${kind === 'tutorial' ? 'selected' : ''}>Tutorial / Video / Dokument</option><option value="safety" ${kind === 'safety' ? 'selected' : ''}>Betriebsanweisung / Sicherheit</option></select>
      <label class="form-label" for="suggestUrl">Link (https://…)</label><input id="suggestUrl" class="form-input" type="url" inputmode="url" autocapitalize="none" placeholder="https://www.youtube.com/watch?v=…">
      <label class="form-label" for="suggestTitle">Titel (optional)</label><input id="suggestTitle" class="form-input" maxlength="160" placeholder="z. B. Einführung in die Bedienung">
      <label class="form-label" for="suggestNote">Hinweis (optional)</label><input id="suggestNote" class="form-input" maxlength="500" placeholder="Wofür ist das hilfreich?"></div>
    <div class="kstep-actions"><button class="btn btn-primary kstep-next" onclick="knowledgeSubmitSuggestion()">Vorschlag senden</button><button class="btn btn-secondary" onclick="${back}">Abbrechen</button></div>`;
}

async function knowledgeSubmitSuggestion() {
  const machine = activeGuide?.machine;
  const url = document.getElementById('suggestUrl')?.value.trim();
  if (!machine?.id) return;
  if (!/^https:\/\/[^\s]{4,500}$/.test(url || '')) { window.toast?.warning('Bitte einen Link angeben, der mit https:// beginnt.'); return; }
  const uid = window.firebase?.auth?.().currentUser?.uid;
  if (!uid) { window.toast?.error('Bitte melde dich an.'); return; }
  try {
    await window.db.collection('tutorialSuggestions').add({
      machineCollection: machine.collection, machineId: machine.id, machineName: machine.name || '',
      kind: document.getElementById('suggestKind')?.value === 'safety' ? 'safety' : 'tutorial',
      title: document.getElementById('suggestTitle').value.trim().slice(0, 160),
      url, note: document.getElementById('suggestNote').value.trim().slice(0, 500),
      userId: uid, userName: window.currentUser?.name || '', status: 'pending',
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
    window.toast?.success('Danke! Die Werkstatt prüft deinen Vorschlag.');
    if (activeGuide.linksOnly) renderKnowledgeLinksPage(); else renderKnowledgeGuideStep();
  } catch (error) {
    window.toast?.error('Vorschlag konnte nicht gesendet werden: ' + (error.message || error));
  }
}

function knowledgeGuideDone() {
  const target = document.getElementById('knowledgeContent');
  if (!target || !activeGuide) return;
  const isStart = activeGuide.profile === 'start';
  activeGuideStep = activeGuide.steps.length;
  const name = knowledgeEscape(activeGuide.machine?.name || activeGuide.title);
  target.innerHTML = `<div class="kdone"><div class="kdone-icon">✓</div><h3>Geschafft!</h3>
    <p>${isStart ? 'Du kennst jetzt die Grundlagen. Such dir als Nächstes deine Maschine aus.' : `Alle ${activeGuide.steps.length} Schritte für <strong>${name}</strong> sind erledigt. Viel Erfolg bei der Arbeit!`}</p>
    <button class="btn btn-primary" onclick="${isStart ? 'showKnowledgeGuideMode()' : 'knowledgeFinishGuide()'}">${isStart ? 'Maschine wählen' : 'Auftrag erfassen'}</button>
    <button class="btn btn-secondary" onclick="${isStart ? 'closeModal()' : 'showKnowledgeGuideMode()'}">${isStart ? 'Schließen' : 'Zurück zur Übersicht'}</button></div>`;
}

function knowledgeGuideGo(index) { if (activeGuide && index >= 0 && index < activeGuide.steps.length) { activeGuideStep = index; renderKnowledgeGuideStep(); } }

// Am Ende der Anleitung: Maschine im Auftragsformular vorauswählen und dorthin springen.
function knowledgeFinishGuide() {
  const machine = activeGuide?.machine;
  closeModal();
  if (machine?.collection && machine?.id) {
    window.pendingMachineRef = { collection: machine.collection, id: machine.id, source: 'guide' };
    document.dispatchEvent(new CustomEvent('machine:scanned'));
  }
  document.querySelector('.entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function knowledgeGuideNext() { if (activeGuide && activeGuideStep < activeGuide.steps.length - 1) { activeGuideStep++; renderKnowledgeGuideStep(); } }
function knowledgeGuidePrevious() { if (activeGuide && activeGuideStep > 0) { activeGuideStep--; renderKnowledgeGuideStep(); } }

// Alte Aufrufer: der Chat ist jetzt Teil der Startseite.
function showKnowledgeChatMode() { showKnowledgeGuideMode(); document.getElementById('knowledgeQuestion')?.focus(); }

// Die Anleitungen sind teils englisch: häufige deutsche Begriffe werden um englische Entsprechungen ergänzt.
const KNOWLEDGE_STOPWORDS = new Set(['nicht', 'beim', 'der', 'die', 'das', 'und', 'ist', 'mit', 'von', 'fur', 'auf', 'den', 'dem', 'ein', 'eine', 'wie', 'was', 'wenn', 'kann', 'noch', 'nur', 'aber', 'oder', 'the', 'and', 'for', 'are', 'with', 'reicht', 'geht', 'wird']);
const KNOWLEDGE_SYNONYMS = {
  vakuum: ['vacuum'], frasen: ['milling', 'router'], frase: ['milling', 'router'], schneiden: ['cutting', 'cut'], werkzeug: ['tool'], absaugung: ['extraction', 'dust'],
  duse: ['nozzle'], duese: ['nozzle'], druck: ['print'], drucken: ['print'], haftet: ['adhesion', 'stick'], haftung: ['adhesion'], bett: ['bed'],
  sicherheit: ['safety'], zaun: ['fence'], rattern: ['chatter'], oberflache: ['surface', 'finish'], drehzahl: ['rpm', 'speed'], tiefe: ['depth'],
  kamera: ['camera'], verbindung: ['connection'], temperatur: ['temperature'], material: ['material'], kalibrieren: ['calibration', 'calibrate'], bewegt: ['move', 'motion'], bewegung: ['motion', 'movement']
};

function knowledgeTokens(text) {
  const base = String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/)
    .filter(token => token.length > 2 && !KNOWLEDGE_STOPWORDS.has(token));
  return [...new Set(base.flatMap(token => [token, ...(KNOWLEDGE_SYNONYMS[token] || [])]))];
}

// Welche Maschine ist gemeint? (aus dem Fragetext, wenn keine Anleitung geöffnet ist)
function knowledgeProfileFromText(text) {
  const t = String(text).toLowerCase();
  if (/ginger/.test(t)) return 'ginger';
  if (/ur\s?-?5|universal/.test(t)) return 'ur5';
  if (/weber|dxr|kuka|smartpad/.test(t)) return 'weber';
  if (/z(ü|ue|u)nd|cnc|fräs|fraes|vakuum|vacuum/.test(t)) return 'zuend';
  return '';
}

// Suche im Dokumentenindex: Abschnitte der Maschine, die gerade geöffnet ist, zählen stärker.
function searchKnowledgeDocuments(question) {
  const tokens = knowledgeTokens(question);
  if (!tokens.length) return [];
  const profile = activeGuide?.profile || knowledgeProfileFromText(question);
  const fromIndex = [];
  (knowledgeIndex?.docs || []).forEach(doc => {
    const boost = profile && doc.machines.includes(profile) ? 1.5 : 1;
    doc.sections.forEach(section => {
      const title = section.title.toLowerCase();
      const haystack = `${title} ${section.text.toLowerCase()}`;
      const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? (title.includes(token) ? 3 : 1) : 0), 0) * boost;
      if (score >= 2) fromIndex.push({ title: section.title, text: section.text, docTitle: doc.title, lang: doc.lang, url: knowledgeDocUrl(doc, section.anchor), score });
    });
  });
  const local = knowledgeArticles.map(a => {
    const text = `${a.title} ${a.machineName || ''} ${a.body}`;
    return { title: a.title, text: a.body, docTitle: a.machineName || 'Werkstatt-Anleitung', url: a.url || '', score: tokens.reduce((n, t) => n + (text.toLowerCase().includes(t) ? 1 : 0), 0) };
  }).filter(result => result.score > 0);
  return [...fromIndex, ...local].sort((a, b) => b.score - a.score).slice(0, 3);
}

// Fehlerhilfen: feste Antworten zuerst, danach die Fehlerbilder aus den Anleitungen (Tabellen "Problem / Lösung")
function findKnowledgeFaq(question) {
  const normalized = question.toLowerCase();
  const asked = activeGuide?.profile || knowledgeProfileFromText(question);
  // Feste Antworten gelten nur für ihre Maschine, sobald klar ist, welche gemeint ist.
  const fixed = KNOWLEDGE_FAQ.map(item => ({ item, score: asked && item.profile && item.profile !== asked ? 0 : item.keywords.reduce((sum, keyword) => sum + (normalized.includes(keyword) ? 2 : 0), 0) }))
    .sort((a, b) => b.score - a.score)[0];
  if (fixed && fixed.score > 0) return fixed;
  const tokens = knowledgeTokens(question);
  const profile = activeGuide?.profile || knowledgeProfileFromText(question);
  const best = (knowledgeIndex?.faq || []).filter(entry => !profile || entry.machines.includes(profile) || entry.machines.includes('all')).map(entry => {
    const asked = entry.question.toLowerCase();
    const answer = entry.answer.toLowerCase();
    // Treffer im Fehlerbild zählen mehr als Treffer in der Lösung.
    const score = tokens.reduce((sum, token) => sum + (asked.includes(token) ? 3 : answer.includes(token) ? 1 : 0), 0) * (profile && entry.machines.includes(profile) ? 1.5 : 1);
    return { entry, score };
  }).sort((a, b) => b.score - a.score)[0];
  if (best && best.score >= 3) {
    const doc = knowledgeIndex.docs.find(item => item.id === best.entry.docId);
    return { score: best.score, item: { title: best.entry.question, answer: best.entry.answer, link: doc ? { url: knowledgeDocUrl(doc, best.entry.anchor), label: doc.title } : null } };
  }
  return fixed;
}

function askKnowledgeQuestion(question) {
  const input = document.getElementById('knowledgeQuestion');
  if (input) input.value = question;
  submitKnowledgeQuestion();
}

async function submitKnowledgeQuestion() {
  const input = document.getElementById('knowledgeQuestion');
  const question = input?.value.trim();
  const conversation = document.getElementById('knowledgeConversation');
  if (!question || !conversation) return;
  conversation.insertAdjacentHTML('beforeend', `<div class="knowledge-message user">${knowledgeEscape(question)}</div>`);
  input.value = '';
  await loadKnowledgeIndex();
  const faq = findKnowledgeFaq(question);
  const results = searchKnowledgeDocuments(question);
  let answer;
  if (faq && faq.score > 0) {
    const source = faq.item.link
      ? `<a href="${knowledgeEscape(faq.item.link.url)}" target="_blank" rel="noopener noreferrer">Mehr dazu: ${knowledgeEscape(faq.item.link.label)}</a>`
      : knowledgeSourceLink(faq.item.source);
    answer = `<strong>${knowledgeEscape(faq.item.title)}</strong><p>${knowledgeEscape(faq.item.answer)}</p><div class="knowledge-source">${source}</div>`;
  } else if (results.length) {
    answer = `<strong>Passende Stellen in der Dokumentation</strong>${results.map(result => `<div class="knowledge-result"><b>${knowledgeEscape(result.title)}</b><p>${knowledgeEscape(result.text.slice(0, 420))}${result.text.length > 420 ? '…' : ''}</p>${result.url ? `<a href="${knowledgeEscape(result.url)}" target="_blank" rel="noopener noreferrer">${knowledgeEscape(result.docTitle)}${result.lang ? ' (' + knowledgeEscape(String(result.lang).toUpperCase()) + ')' : ''}</a>` : `<small>${knowledgeEscape(result.docTitle)}</small>`}</div>`).join('')}`;
  } else {
    answer = `<strong>Keine eindeutige Stelle gefunden.</strong><p>Nenne bitte die Maschine, den genauen Wortlaut der Meldung und ob Not-Aus, Türfreigabe und Statusanzeigen aktiv sind. Bei Gefahr oder unklarer Lage nicht weiterfahren.</p>`;
  }
  conversation.insertAdjacentHTML('beforeend', `<div class="knowledge-message assistant">${answer}</div>`);
  conversation.scrollTop = conversation.scrollHeight;
}

window.showKnowledgeBase = showKnowledgeBase;
window.showKnowledgeGuideMode = showKnowledgeGuideMode;
window.showKnowledgeChatMode = showKnowledgeChatMode;
window.startKnowledgeGuide = startKnowledgeGuide;
window.knowledgeFinishGuide = knowledgeFinishGuide;
window.knowledgeSuggestTutorial = knowledgeSuggestTutorial;
window.knowledgeSubmitSuggestion = knowledgeSubmitSuggestion;
window.renderKnowledgeLinksPage = renderKnowledgeLinksPage;
window.renderKnowledgeGuideStep = renderKnowledgeGuideStep;
window.knowledgeGuideDone = knowledgeGuideDone;
window.knowledgeGuideGo = knowledgeGuideGo;
window.knowledgeGuideNext = knowledgeGuideNext;
window.knowledgeGuidePrevious = knowledgeGuidePrevious;
window.askKnowledgeQuestion = askKnowledgeQuestion;
window.submitKnowledgeQuestion = submitKnowledgeQuestion;
