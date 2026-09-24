// ==================== KNOWLEDGE BASE & HELP ASSISTANT ====================
// Source-bound help for LARGER.slicer machine documentation.

const KNOWLEDGE_REPOSITORY = 'https://github.com/Moeewe/LARGER.slicer';
const KNOWLEDGE_SOURCES = [
  {
    id: 'overview',
    label: 'LARGER.slicer – Übersicht',
    raw: 'https://raw.githubusercontent.com/Moeewe/LARGER.slicer/main/README.md',
    url: `${KNOWLEDGE_REPOSITORY}/blob/main/README.md`
  },
  {
    id: 'weber',
    label: 'Weber DXR25 – Schnellstart und Bedienung',
    raw: 'https://raw.githubusercontent.com/Moeewe/LARGER.slicer/main/EXAMPLE%20FILES/00%20-%20WEBER%20%3A%20GINGER%20%5BRobotic%5D%203D%20Printing/00%20-%20WEBER%20-%20DXR25%20-%20README/README%20Weber%20DXR25%20PRINTER%20QUICK%20START%20GUIDE%20GERMAN.md',
    url: `${KNOWLEDGE_REPOSITORY}/blob/main/EXAMPLE%20FILES/00%20-%20WEBER%20%3A%20GINGER%20%5BRobotic%5D%203D%20Printing/00%20-%20WEBER%20-%20DXR25%20-%20README/README%20Weber%20DXR25%20PRINTER%20QUICK%20START%20GUIDE%20GERMAN.md`
  },
  {
    id: 'kuka',
    label: 'KUKA – Fehlerbehebung',
    raw: 'https://raw.githubusercontent.com/Moeewe/LARGER.slicer/main/LARGERslicer/documentations/KUKA_ROBOT_TROUBLESHOOTING.md',
    url: `${KNOWLEDGE_REPOSITORY}/blob/main/LARGERslicer/documentations/KUKA_ROBOT_TROUBLESHOOTING.md`
  },
  {
    id: 'ginger',
    label: 'Ginger – Quick Start Guide',
    raw: 'https://raw.githubusercontent.com/Moeewe/LARGER.slicer/main/EXAMPLE%20FILES/00%20-%20WEBER%20%3A%20GINGER%20%5BRobotic%5D%203D%20Printing/00%20-%20GINGER%20-%20ONE%20-%20README/README%20GINGER%2000%20QUICK%20START%20GUIDE.md',
    url: `${KNOWLEDGE_REPOSITORY}/blob/main/EXAMPLE%20FILES/00%20-%20WEBER%20%3A%20GINGER%20%5BRobotic%5D%203D%20Printing/00%20-%20GINGER%20-%20ONE%20-%20README/README%20GINGER%2000%20QUICK%20START%20GUIDE.md`
  },
  {
    id: 'ur5',
    label: 'UR5 – Quick Start Guide',
    raw: 'https://raw.githubusercontent.com/Moeewe/LARGER.slicer/main/EXAMPLE%20FILES/00%20-%20UNIVERSAL%20ROBOTS%20-%20UR5/README%20UR5%2000%20QUICK%20START%20GUIDE.md',
    url: `${KNOWLEDGE_REPOSITORY}/blob/main/EXAMPLE%20FILES/00%20-%20UNIVERSAL%20ROBOTS%20-%20UR5/README%20UR5%2000%20QUICK%20START%20GUIDE.md`
  }
];

let knowledgeSources = KNOWLEDGE_SOURCES;

function isKnowledgeMarkdown(path) {
  return typeof path === 'string' && path.toLowerCase().endsWith('.md');
}

function knowledgeSourceLinkList() {
  return knowledgeSources.map(source => `<a href="${source.url}" target="_blank" rel="noopener noreferrer">${knowledgeEscape(source.label)}</a>`).join('');
}

const KNOWLEDGE_GUIDES = {
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

let knowledgeDocuments = [];
let knowledgeMachines = [];
let knowledgeArticles = [];
let knowledgeRepositorySources = KNOWLEDGE_SOURCES;
let activeGuide = null;
let activeGuideStep = 0;

function knowledgeEscape(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function knowledgeSourceLink(sourceId) {
  const source = KNOWLEDGE_SOURCES.find(item => item.id === sourceId) || KNOWLEDGE_SOURCES[0];
  return `<a href="${source.url}" target="_blank" rel="noopener noreferrer">Quelle: ${knowledgeEscape(source.label)}</a>`;
}

function knowledgeProfileForMachine(machine) {
  const type=String(machine?.machineType||machine?.category||'').toLowerCase();
  if(type==='ur5') return 'ur5';
  if(type==='weber_dxr') return 'weber';
  const text = `${machine?.name || ''} ${machine?.model || ''} ${machine?.category || ''}`.toLowerCase();
  if (/ur\s?-?5|universal robots?/.test(text)) return 'ur5';
  if (/weber|dxr|kuka/.test(text)) return 'weber';
  if (/ginger/.test(text)) return 'ginger';
  if (/ur\s?-?5|universal robot/.test(text)) return 'ur5';
  return '';
}

function knowledgeStatusLabel(status) {
  const map = { available: 'Verfügbar', printing: 'In Betrieb', in_use: 'In Betrieb', maintenance: 'Wartung', broken: 'Defekt', borrowed: 'Ausgeliehen', rented: 'Ausgeliehen' };
  return map[status] || status || 'Status unbekannt';
}

async function loadKnowledgeMachines() {
  if (!window.db) return;
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
  } catch (error) {
    console.warn('Maschinen konnten für die Wissensdatenbank nicht geladen werden:', error);
    knowledgeMachines = [];
  }
}

function splitKnowledgeDocument(source, markdown) {
  return markdown.split(/\n(?=#{1,4}\s)/).map(section => {
    const lines = section.trim().split('\n');
    const title = (lines[0] || source.label).replace(/^#+\s*/, '');
    const text = lines.slice(1).join(' ').replace(/[`*_>#|\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    return { sourceId: source.id, sourceLabel: source.label, sourceUrl: source.url, title, text };
  }).filter(section => section.text.length > 40);
}

async function loadKnowledgeDocuments() {
  const cacheKey = 'pelletTrackr_knowledge_v3';
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached && Date.now() - cached.timestamp < 6 * 60 * 60 * 1000 && Array.isArray(cached.documents)) {
      knowledgeDocuments = cached.documents;
      knowledgeSources = Array.isArray(cached.sources) && cached.sources.length ? cached.sources : KNOWLEDGE_SOURCES;
      knowledgeRepositorySources = knowledgeSources;
      return;
    }
  } catch (_) { /* ignore invalid cache */ }

  let repositorySources = KNOWLEDGE_SOURCES;
  try {
    const treeResponse = await fetch('https://api.github.com/repos/Moeewe/LARGER.slicer/git/trees/main?recursive=1');
    if (treeResponse.ok) {
      const tree = await treeResponse.json();
      const markdownFiles = (tree.tree || []).filter(item => item.type === 'blob' && isKnowledgeMarkdown(item.path)).slice(0, 80);
      if (markdownFiles.length) {
        repositorySources = markdownFiles.map(item => {
          const encodedPath = item.path.split('/').map(encodeURIComponent).join('/');
          return {
            id: `repo:${item.path}`,
            label: item.path,
            raw: `https://raw.githubusercontent.com/Moeewe/LARGER.slicer/main/${encodedPath}`,
            url: `${KNOWLEDGE_REPOSITORY}/blob/main/${encodedPath}`
          };
        });
        knowledgeSources = repositorySources;
        knowledgeRepositorySources = repositorySources;
      }
    }
  } catch (error) {
    console.warn('GitHub-Dateiliste nicht verfügbar, verwende Kern-Dokumente:', error);
  }

  knowledgeRepositorySources = repositorySources;
  knowledgeSources = repositorySources;
}

async function loadRelevantKnowledgeDocuments(question) {
  const terms=knowledgeTokens(question);
  const loaded=new Set(knowledgeDocuments.map(section=>section.sourceId));
  let candidates=knowledgeRepositorySources.map(source=>({source,score:terms.reduce((n,term)=>n+(source.label.toLowerCase().includes(term)?1:0),0)}))
    .filter(item=>item.score>0&&!loaded.has(item.source.id)).sort((a,b)=>b.score-a.score).slice(0,4);
  if(!candidates.length) candidates=knowledgeRepositorySources.filter(source=>!loaded.has(source.id)).slice(0,3).map(source=>({source,score:0}));
  const results=await Promise.allSettled(candidates.map(async ({source})=>{
    const response=await fetch(source.raw); if(!response.ok)throw Error(`HTTP ${response.status}`);
    return splitKnowledgeDocument(source,await response.text());
  }));
  knowledgeDocuments.push(...results.flatMap(result=>result.status==='fulfilled'?result.value:[]));
  if(knowledgeDocuments.length) try {localStorage.setItem('pelletTrackr_knowledge_v3',JSON.stringify({timestamp:Date.now(),documents:knowledgeDocuments,sources:knowledgeSources}));} catch (_) { /* cache optional */ }
}

function knowledgeMachineOptions() {
  const dynamicOptions = knowledgeMachines.map(machine => {
    const profile = knowledgeProfileForMachine(machine);
    return `<option value="machine:${knowledgeEscape(machine.collection)}:${knowledgeEscape(machine.id)}" ${profile ? '' : 'disabled'}>${knowledgeEscape(machine.name)} — ${knowledgeEscape(knowledgeStatusLabel(machine.status))}${profile ? '' : ' (keine Anleitung zugeordnet)'}</option>`;
  }).join('');
  return `${dynamicOptions}<optgroup label="Roboter-Anleitungen"><option value="profile:weber">Großroboter · Weber DXR25 / DXR-Steuerung</option><option value="profile:ur5">Kleiner Roboterarm · Universal Robots UR5 / UR5slicer</option></optgroup><optgroup label="Weitere Anleitungen"><option value="profile:ginger">Ginger</option></optgroup>`;
}

async function showKnowledgeBase() {
  await Promise.all([loadKnowledgeMachines(), loadKnowledgeDocuments()]);
  showModalWithContent(`<div class="modal-header"><h2>Wissensdatenbank & Hilfe</h2><button class="close-btn" onclick="closeModal()">&times;</button></div>
    <div class="modal-body knowledge-base">
      <div class="knowledge-disclaimer"><strong>Sicherheit:</strong> Bedien- und Wiederanlaufanweisungen gelten nur für eingewiesene Personen. Bei Gefahr, unklarer Lage oder möglicher Kollision sofort stoppen und die Werkstattleitung hinzuziehen.</div>
      <div class="knowledge-mode-buttons"><button class="btn btn-primary" onclick="showKnowledgeGuideMode()">Geführte Anleitung</button><button class="btn btn-secondary" onclick="showKnowledgeChatMode()">Wie kann ich helfen?</button></div>
      <details class="knowledge-readme-links"><summary>READMEs &amp; technische Anleitungen öffnen (${knowledgeSources.length})</summary><div>${knowledgeSourceLinkList()}</div></details>
      <details class="knowledge-readme-links"><summary>Werkstatt-Anleitungen (${knowledgeArticles.length})</summary><div>${knowledgeArticles.map(a=>`<article><strong>${knowledgeEscape(a.title)}</strong>${a.machineName?` · ${knowledgeEscape(a.machineName)}`:''}<p>${knowledgeEscape(a.body)}</p>${a.url?`<a href="${knowledgeEscape(a.url)}" target="_blank" rel="noopener noreferrer">Anleitung öffnen</a>`:''}</article>`).join('')||'<p>Noch keine ergänzenden Anleitungen hinterlegt.</p>'}</div></details>
      <div id="knowledgeContent"></div>
    </div>
    <div class="modal-footer"><span class="knowledge-sync-state">${knowledgeDocuments.length ? `${knowledgeDocuments.length} Dokumentabschnitte zwischengespeichert` : `${knowledgeSources.length} README-Quellen verfügbar; Inhalte werden passend zur Frage geladen`}</span><button class="btn btn-secondary" onclick="closeModal()">Schließen</button></div>`);
  showKnowledgeGuideMode();
}

function showKnowledgeGuideMode() {
  activeGuide = null; activeGuideStep = 0;
  const target = document.getElementById('knowledgeContent');
  if (!target) return;
  target.innerHTML = `<div class="knowledge-panel"><h3>Welche Maschine willst du heute ansteuern?</h3><p>Wähle eine angelegte Maschine oder eine allgemeine Maschinenanleitung.</p><select id="knowledgeMachineSelect" class="form-select"><option value="">Maschine auswählen ...</option>${knowledgeMachineOptions()}</select><button class="btn btn-primary" onclick="startKnowledgeGuide()">Anleitung starten</button></div>`;
}

function startKnowledgeGuide() {
  const value = document.getElementById('knowledgeMachineSelect')?.value || '';
  let profile = value.startsWith('profile:') ? value.split(':')[1] : '';
  let machine = null;
  if (value.startsWith('machine:')) {
    const [, collection, id] = value.split(':');
    machine = knowledgeMachines.find(item => item.collection === collection && item.id === id);
    profile = knowledgeProfileForMachine(machine);
  }
  if (!profile || !KNOWLEDGE_GUIDES[profile]) {
    const matches=knowledgeArticles.filter(a=>!machine || !a.machineName || `${machine.name} ${machine.model||''} ${machine.jobTypes||''}`.toLocaleLowerCase('de').includes(a.machineName.toLocaleLowerCase('de')));
    if(machine && matches.length) {
      activeGuide={title:machine.name,profile:'admin',machine,source:'overview',steps:matches.flatMap(a=>a.body.split(/\n+/).map(s=>s.trim()).filter(Boolean).map(s=>`${a.title}: ${s}`))};
      activeGuideStep=0; renderKnowledgeGuideStep(); return;
    }
    if (window.toast) window.toast.warning('Für diese Maschine ist noch keine passende Anleitung hinterlegt. Die verfügbaren READMEs findest du oben im Abschnitt „READMEs & technische Anleitungen“.');
    return;
  }
  activeGuide = { ...KNOWLEDGE_GUIDES[profile], profile, machine };
  activeGuideStep = 0;
  renderKnowledgeGuideStep();
}

function renderKnowledgeGuideStep() {
  const target = document.getElementById('knowledgeContent');
  if (!target || !activeGuide) return;
  const total = activeGuide.steps.length;
  const isLast = activeGuideStep === total - 1;
  target.innerHTML = `<div class="knowledge-panel"><div class="knowledge-progress">Schritt ${activeGuideStep + 1} von ${total}</div><h3>${knowledgeEscape(activeGuide.machine?.name || activeGuide.title)}</h3><div class="knowledge-step">${knowledgeEscape(activeGuide.steps[activeGuideStep])}</div><div class="knowledge-step-actions"><button class="btn btn-secondary" onclick="knowledgeGuidePrevious()" ${activeGuideStep === 0 ? 'disabled' : ''}>Zurück</button>${isLast ? '<button class="btn btn-success" onclick="showKnowledgeGuideMode()">Abschließen</button>' : '<button class="btn btn-primary" onclick="knowledgeGuideNext()">Erledigt, weiter</button>'}</div><div class="knowledge-source">${knowledgeSourceLink(activeGuide.source)}</div></div>`;
}

function knowledgeGuideNext() { if (activeGuide && activeGuideStep < activeGuide.steps.length - 1) { activeGuideStep++; renderKnowledgeGuideStep(); } }
function knowledgeGuidePrevious() { if (activeGuide && activeGuideStep > 0) { activeGuideStep--; renderKnowledgeGuideStep(); } }

function showKnowledgeChatMode() {
  const target = document.getElementById('knowledgeContent');
  if (!target) return;
  target.innerHTML = `<div class="knowledge-panel"><h3>Wie kann ich dir helfen?</h3><div id="knowledgeConversation" class="knowledge-conversation"><div class="knowledge-message assistant">Beschreibe die Maschine und das Problem. Ich suche ausschließlich in den hinterlegten Anleitungen und verlinke die Quelle.</div></div><div class="knowledge-suggestions"><button onclick="askKnowledgeQuestion('Der Weber Roboter bewegt sich nicht mehr')">Weber bewegt sich nicht</button><button onclick="askKnowledgeQuestion('Der Roboter ist in den Sicherheitsbereich gefahren')">Sicherheitsbereich</button><button onclick="askKnowledgeQuestion('Die erste Schicht haftet bei Ginger nicht')">Ginger: Haftung</button><button onclick="askKnowledgeQuestion('Der Upload zum UR5 hängt')">UR5: Upload</button></div><div class="knowledge-chat-input"><input id="knowledgeQuestion" class="form-input" placeholder="z. B. Der Roboter bewegt sich nicht mehr" onkeydown="if(event.key === 'Enter'){ submitKnowledgeQuestion(); }"><button class="btn btn-primary" onclick="submitKnowledgeQuestion()">Fragen</button></div></div>`;
}

function knowledgeTokens(text) {
  return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9äöüß]+/).filter(token => token.length > 2);
}

function searchKnowledgeDocuments(question) {
  const tokens = knowledgeTokens(question);
  const repository=knowledgeDocuments.map(section => {
    const haystack = `${section.title} ${section.text}`.toLowerCase();
    const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? (section.title.toLowerCase().includes(token) ? 3 : 1) : 0), 0);
    return { ...section, score };
  }).filter(result => result.score > 0);
  const local=knowledgeArticles.map(a=>{const text=`${a.title} ${a.machineName||''} ${a.body}`;return {title:a.title,text,sourceLabel:a.machineName||'Werkstatt-Anleitung',sourceUrl:a.url||'',score:tokens.reduce((n,t)=>n+(text.toLowerCase().includes(t)?1:0),0)};}).filter(a=>a.score>0);
  return [...repository,...local].sort((a,b)=>b.score-a.score).slice(0,3);
}

function findKnowledgeFaq(question) {
  const normalized = question.toLowerCase();
  return KNOWLEDGE_FAQ.map(item => ({ item, score: item.keywords.reduce((sum, keyword) => sum + (normalized.includes(keyword) ? 2 : 0), 0) }))
    .sort((a, b) => b.score - a.score)[0];
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
  const faq = findKnowledgeFaq(question);
  let results = searchKnowledgeDocuments(question);
  if ((!faq || faq.score===0) && (!results.length || results.every(result=>result.score<2))) {
    const pending=document.createElement('div'); pending.className='knowledge-message assistant'; pending.textContent='Ich suche in den passenden READMEs …'; conversation.appendChild(pending);
    await loadRelevantKnowledgeDocuments(question); pending.remove(); results=searchKnowledgeDocuments(question);
  }
  let answer;
  if (faq && faq.score > 0) {
    answer = `<strong>${knowledgeEscape(faq.item.title)}</strong><p>${knowledgeEscape(faq.item.answer)}</p><div class="knowledge-source">${knowledgeSourceLink(faq.item.source)}</div>`;
  } else if (results.length) {
    answer = `<strong>Passende Stellen in der Dokumentation</strong>${results.map(result => `<div class="knowledge-result"><b>${knowledgeEscape(result.title)}</b><p>${knowledgeEscape(result.text.slice(0, 500))}${result.text.length > 500 ? '…' : ''}</p><a href="${result.sourceUrl}" target="_blank" rel="noopener noreferrer">${knowledgeEscape(result.sourceLabel)}</a></div>`).join('')}<p>Wenn das noch nicht passt, nenne bitte Maschine, angezeigte Fehlermeldung und den letzten ausgeführten Schritt.</p>`;
  } else {
    answer = `<strong>Keine eindeutige Stelle gefunden.</strong><p>Nenne bitte die Maschine, den genauen Wortlaut der Meldung und ob Not-Aus, Türfreigabe und Statusanzeigen aktiv sind. Bei Gefahr oder unklarer Lage nicht weiterfahren.</p><div class="knowledge-source">${knowledgeSourceLink('overview')}</div>`;
  }
  conversation.insertAdjacentHTML('beforeend', `<div class="knowledge-message assistant">${answer}</div>`);
  conversation.scrollTop = conversation.scrollHeight;
}

window.showKnowledgeBase = showKnowledgeBase;
window.showKnowledgeGuideMode = showKnowledgeGuideMode;
window.showKnowledgeChatMode = showKnowledgeChatMode;
window.startKnowledgeGuide = startKnowledgeGuide;
window.knowledgeGuideNext = knowledgeGuideNext;
window.knowledgeGuidePrevious = knowledgeGuidePrevious;
window.askKnowledgeQuestion = askKnowledgeQuestion;
window.submitKnowledgeQuestion = submitKnowledgeQuestion;
