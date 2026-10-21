// ==================== MASCHINEN (EINE VERWALTUNG) ====================
// Drucker und Produktionsmaschinen (Laser, CNC, Roboter …) sind im Alltag dasselbe: Fertigungsmaschinen.
// Diese Verwaltung zeigt und bearbeitet beide in einer Liste. Gespeichert wird weiterhin in den bisherigen
// Sammlungen ("printers" und "machines"), damit Aufträge, Tarife, Einweisungen und gedruckte QR-Codes unverändert
// funktionieren. Neu: Verknüpfung mit Materialien (Filament/Pellet, einzelne Materialien, Masterbatch).
(() => {
  'use strict';
  const COLLECTIONS = ['printers', 'machines'];
  // Art → Sammlung. Drucker bleiben in "printers", alles andere in "machines".
  const TYPES = [
    { key: 'filament', label: '3D-Drucker (Filament)', collection: 'printers', forms: ['filament'], uses: true },
    { key: 'pellet', label: '3D-Drucker (Pellet)', collection: 'printers', forms: ['pellet'], uses: true },
    { key: 'laser', label: 'Laser', collection: 'machines', jobTypes: ['Lasern'], forms: [], uses: false },
    { key: 'cnc', label: 'CNC-Fräse', collection: 'machines', jobTypes: ['CNC-Fräsen'], forms: [], uses: false },
    { key: 'weber_dxr', label: 'Großroboter (Weber DXR25)', collection: 'machines', jobTypes: ['Roboter', 'Weber DXR25'], forms: ['pellet'], uses: true },
    { key: 'ur5', label: 'Roboterarm (Universal Robots UR5)', collection: 'machines', jobTypes: ['Roboter', 'Universal Robots UR5'], forms: [], uses: true },
    { key: 'other', label: 'Sonstige Maschine', collection: 'machines', jobTypes: ['Weitere Fertigung'], forms: [], uses: false }
  ];
  const FORMS = { filament: 'Filament', pellet: 'Pellet' };
  const PAGE = 15;
  const state = { items: [], term: '', filter: 'all', limit: PAGE };
  let materials = [];
  let materialRestrict = false;
  let materialPicked = new Set();
  let equipmentList = [];
  let equipmentPicked = new Map();
  let autoUses = null; // automatisch gesetzter Wert für "Verbraucht Material" (nur solange nicht von Hand geändert)
  let autoForms = null; // zuletzt automatisch vorgewählte Formen (nur solange der Nutzer sie nicht geändert hat)

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const typeOf = item => {
    if (item.collection === 'printers') return TYPES.find(t => t.key === (item.type === 'pellet' ? 'pellet' : 'filament'));
    return TYPES.find(t => t.key === (item.machineType || item.category)) || TYPES.find(t => t.key === 'other');
  };

  async function requireAdmin() {
    const user = window.firebase?.auth?.().currentUser;
    if (!user) throw Error('Bitte anmelden.');
    const profile = await window.db.collection('users').doc(user.uid).get();
    if (profile.data()?.isAdmin !== true) throw Error('Nur Admins können Maschinen verwalten.');
    return user;
  }

  async function load() {
    const snaps = await Promise.all(COLLECTIONS.map(name => window.db.collection(name).get()));
    state.items = snaps.flatMap((snap, i) => snap.docs.map(doc => ({ ...doc.data(), id: doc.id, collection: COLLECTIONS[i] })))
      .filter(item => item.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }

  const shell = (title, body, footer) => window.showModal(
    `<div class="modal-header"><h3>${esc(title)}</h3><button class="close-btn" onclick="closeModal()">&times;</button></div>
     <div class="modal-body">${body}</div><div class="modal-footer">${footer}</div>`, { clearStack: true, pushToStack: false });

  // ---------- Startset: Maschinen der Werkstatt ----------
  // Nur gesicherte Angaben. Technische Daten (Arbeitsbereich, Werkzeuge) trägt die Werkstatt selbst ein.
  const LASER_SAFETY = 'CO₂-Laser zum Schneiden und Gravieren. Nicht lasern: PVC (setzt Chlor frei, ätzend, schädigt die Optik), ABS, Polycarbonat, Teflon sowie Schaum aus Polystyrol oder Polypropylen (Brand- bzw. Gesundheitsgefahr). Laser nie unbeaufsichtigt laufen lassen, Feuerlöscher griffbereit halten, Absaugung nach Herstellerangabe nutzen. Allgemeine Hinweise – bitte mit Herstellerunterlagen und Werkstattleitung abgleichen.';
  const STARTER = [
    { starterKey: 'zuend-cnc', match: /z(ü|ue|u)nd/i, name: 'Zünd CNC Cutter', model: 'Zünd G3 L-2500', machineType: 'cnc', jobTypes: ['CNC-Fräsen', 'Schneiden', 'Gravieren'],
      buildVolume: '1800 × 2500 mm, Arbeitshöhe 50 mm', trainingGroup: 'Einweisung Zünd CNC Cutter', trainingTypeName: 'Einweisung Zünd CNC Cutter',
      notes: 'Zünd Digital Cutter G3 L-2500 zum Schneiden, Fräsen und Gravieren. Verbraucht kein Werkstattmaterial. Arbeitshöhe 50 mm (Öffnungshöhe 60 mm). Fräsmodul RM-A 1 kW mit MQL, Werkzeugwechsler ARC (bis 8 Werkzeuge), einstellbares Vakuum, Absaugung CLEANTEX CTM 48 E, Kamera ICC. Software: Zünd Cut Center ab V3.5.6 oder MIND ab V6.1. Quelle: LARGER.slicer-Anleitung.',
      safetyText: 'Nur eingewiesene Personen. Schutzbrille tragen. Die Absaugung muss laufen, bevor gefräst wird. Niemals in den Arbeitsbereich greifen, solange die Maschine in Betrieb ist. Not-Aus-Taster erreichbar halten. Werkzeugzustand vor jedem Auftrag prüfen. Material mit dem Vakuum sicher fixieren. Maximale Materialdicke 50 mm. Normales Schneiden und 2D-Aufträge laufen über das Zünd Cut Center, das Grasshopper-Skript ist nur für 3D-Fräsen gedacht.' },
    { starterKey: 'trotec-speedy-500-1', match: /trotec/i, name: 'Trotec Speedy 500 (Laser 1)', model: 'Trotec Speedy 500', machineType: 'laser', jobTypes: ['Lasern', 'Schneiden', 'Gravieren'],
      buildVolume: 'ca. 1200 × 700 mm (bitte prüfen)', trainingGroup: 'Laserschein · Trotec Speedy 500', trainingTypeName: 'Laserschein · Trotec Speedy 500', safetyText: LASER_SAFETY },
    { starterKey: 'trotec-speedy-500-2', match: /trotec/i, name: 'Trotec Speedy 500 (Laser 2)', model: 'Trotec Speedy 500', machineType: 'laser', jobTypes: ['Lasern', 'Schneiden', 'Gravieren'],
      buildVolume: 'ca. 1200 × 700 mm (bitte prüfen)', trainingGroup: 'Laserschein · Trotec Speedy 500', trainingTypeName: 'Laserschein · Trotec Speedy 500', safetyText: LASER_SAFETY }
  ];
  // Was fehlt noch? Vorhandene Maschinen (auch von Hand angelegte) werden nicht doppelt angelegt.
  const starterPending = () => {
    const zuend = STARTER[0];
    const trotecs = STARTER.slice(1);
    const existingTrotec = state.items.filter(item => /trotec/i.test(item.name) || /trotec/i.test(item.model || '')).length;
    const missingZuend = !state.items.some(item => item.starterKey === zuend.starterKey || zuend.match.test(item.name));
    return [...(missingZuend ? [zuend] : []), ...trotecs.slice(Math.min(existingTrotec, trotecs.length))];
  };

  async function addStarter() {
    try {
      const user = await requireAdmin();
      const pending = starterPending();
      if (!pending.length) return;
      const batch = window.db.batch();
      pending.forEach(entry => {
        const { match, ...data } = entry;
        batch.set(window.db.collection('machines').doc(), {
          ...data, category: entry.machineType, status: 'available', active: true,
          requiresSafetyTraining: true, usesMaterial: false, materialTypes: [], materialIds: [], supportsMasterbatch: false,
          createdBy: user.uid, createdAt: window.firebase.firestore.FieldValue.serverTimestamp(), updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
      window.toast.success(`${pending.length} Maschine${pending.length === 1 ? '' : 'n'} angelegt. Bitte Arbeitsbereich und Details ergänzen.`);
      await open();
    } catch (error) { window.toast.error(error.message || 'Anlegen fehlgeschlagen.'); }
  }

  // ---------- Liste ----------
  function linkSummary(item) {
    const rule = window.machineMaterialRule(item);
    const forms = rule.types.map(t => FORMS[t] || t).join(' · ');
    const own = rule.ids.length ? `${rule.ids.length} ausgewählte Materialien` : '';
    return [forms, own].filter(Boolean).join(' · ');
  }

  function renderList() {
    const list = $('hubList');
    if (!list) return;
    const banner = $('hubStarter');
    if (banner) banner.hidden = !starterPending().length;
    const term = state.term.trim().toLowerCase();
    const normalize = status => window.MachineStatus.normalize(status);
    state.items.sort((a, b) => typeOf(a).label.localeCompare(typeOf(b).label, 'de') || a.name.localeCompare(b.name, 'de'));
    const searched = state.items.filter(item => !term || [item.name, item.model, item.location, typeOf(item)?.label].some(v => String(v || '').toLowerCase().includes(term)));
    const count = key => searched.filter(item => key === 'all' || normalize(item.status) === key).length;
    $('hubFilters').innerHTML = [['all', 'Alle'], ['available', 'Verfügbar'], ['in_use', 'In Betrieb'], ['maintenance', 'Wartung'], ['broken', 'Defekt']]
      .map(([key, label]) => `<button type="button" class="filter-chip ${state.filter === key ? 'active' : ''}" onclick="MachineHub.setFilter('${key}')">${label} (${count(key)})</button>`).join('');
    const shown = searched.filter(item => state.filter === 'all' || normalize(item.status) === state.filter);
    if (!state.items.length) { list.innerHTML = '<p class="printer-empty">Noch keine Maschinen angelegt. Mit „Maschine hinzufügen“ legst du die erste an.</p>'; return; }
    if (!shown.length) { list.innerHTML = '<p class="printer-empty">Keine passenden Maschinen.</p>'; return; }
    const visible = shown.slice(0, state.limit);
    let lastKind = '';
    list.innerHTML = visible.map(item => {
      const kind = typeOf(item).label;
      const heading = kind !== lastKind ? `<h4 class="printer-group">${esc(kind)}</h4>` : '';
      lastKind = kind;
      const guide = Array.isArray(item.guideSteps) && item.guideSteps.length ? 'Anleitung vorhanden' : 'Keine Anleitung';
      const maint = window.maintenanceState(item);
      const badge = maint && maint.level !== 'ok' ? `<span class="maint-badge maint-${maint.level}">${esc(maint.label)}</span>` : '';
      const equipment = Array.isArray(item.requiredEquipment) && item.requiredEquipment.length ? 'Equipment: ' + item.requiredEquipment.map(e => e.name).join(', ') : '';
      const details = [item.model, item.usesMaterial === false ? 'Ohne Werkstattmaterial' : linkSummary(item), item.requiresSafetyTraining ? (item.trainingGroup ? 'Einweisung: ' + item.trainingGroup : 'Einweisung nötig') : '', equipment, item.active === false ? 'Deaktiviert' : '', guide].filter(Boolean).join(' · ');
      const index = state.items.indexOf(item);
      return `${heading}<article class="printer-row ${item.active === false ? 'is-inactive' : ''}">
        <div class="printer-row-main"><h4 class="printer-row-name">${esc(item.name)}</h4><p class="printer-row-details">${esc(details)}${badge}</p></div>
        ${window.MachineStatus.buttons(item.collection, item.id, item.status)}
        <details class="printer-row-more"><summary>Mehr</summary><div class="printer-row-actions">
          <button class="btn btn-secondary btn-small" onclick="MachineHub.edit(${index})">Bearbeiten</button>
          <button class="btn btn-secondary btn-small" onclick="MachineHub.maintenance(${index})">Wartung</button>
          <button class="btn btn-secondary btn-small" onclick="MachineHub.tariff(${index})">Tarif</button>
          <button class="btn btn-secondary btn-small" onclick="MachineHub.train(${index})">Personen einweisen</button>
          <button class="btn btn-secondary btn-small" onclick="MachineHub.guide(${index})">Anleitung</button>
          <button class="btn btn-secondary btn-small" onclick="MachineHub.qr(${index})">QR / Etikett</button>
          <button class="btn btn-secondary btn-small" onclick="MachineHub.duplicate(${index})">Duplizieren</button>
          <button class="btn btn-danger btn-small" onclick="MachineHub.remove(${index})">Löschen</button>
        </div></details></article>`;
    }).join('') + (visible.length < shown.length
      ? `<div class="entry-show-more"><span>${visible.length} von ${shown.length} angezeigt</span><button type="button" class="btn btn-secondary" onclick="MachineHub.more()">${Math.min(PAGE, shown.length - visible.length)} weitere anzeigen</button></div>` : '');
  }

  async function open() {
    try {
      await requireAdmin();
      await load();
      Object.assign(state, { term: '', filter: 'all', limit: PAGE });
      shell('Maschinen verwalten',
        `<div class="printer-toolbar"><input type="text" id="hubSearch" class="search-input" placeholder="Maschine suchen …" autocomplete="off" oninput="MachineHub.search(this.value)">
         <div id="hubFilters" class="printer-filters" role="group" aria-label="Nach Status filtern"></div></div>
         <div id="hubStarter" class="form-hint" hidden><strong>Vorschlag:</strong> Zünd CNC Cutter und 2× Trotec Speedy 500 anlegen (ohne Werkstattmaterial, mit Einweisungspflicht). Du kannst alles danach bearbeiten.
           <div class="safety-actions"><button class="btn btn-primary btn-small" onclick="MachineHub.addStarter()">Jetzt anlegen</button></div></div>
         <div id="hubList" class="printer-list-compact"></div>`,
        '<button class="btn btn-primary" onclick="MachineHub.edit(-1)">Maschine hinzufügen</button><button class="btn btn-secondary" onclick="closeModal()">Schließen</button>');
      renderList();
    } catch (error) { window.toast.error(error.message || 'Maschinen konnten nicht geladen werden.'); }
  }

  // Status per Klick: Liste und Zähler aktuell halten
  document.addEventListener('machine:status', event => {
    const item = state.items.find(i => i.collection === event.detail.collection && i.id === event.detail.id);
    if (item) { item.status = event.detail.status; if ($('hubList')) renderList(); }
  });

  // ---------- Bearbeiten ----------
  async function fetchEquipment() {
    try {
      const snap = await window.db.collection('equipment').get();
      equipmentList = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name || doc.id })).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    } catch (_) { equipmentList = []; }
  }

  async function fetchMaterials() {
    if (materials.length) return;
    try {
      const snap = await window.db.collection('materials').get();
      materials = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name || doc.id, type: doc.data().type || '' }))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));
    } catch (_) { materials = []; }
  }

  function selectedForms() {
    return Object.keys(FORMS).filter(key => $('hubForm_' + key)?.checked);
  }

  function renderMaterialPicker() {
    const box = $('hubMaterialList');
    if (!box) return;
    $('hubRestrictBox').hidden = !materialRestrict;
    if (!materialRestrict) { box.innerHTML = ''; return; }
    const forms = selectedForms();
    const fitting = materials.filter(m => !forms.length || forms.includes(m.type));
    box.innerHTML = fitting.length ? fitting.map(m => `<label class="checkbox-label hub-material"><input type="checkbox" class="checkbox-input" data-material="${esc(m.id)}" ${materialPicked.has(m.id) ? 'checked' : ''} onchange="MachineHub.pickMaterial(this.dataset.material,this.checked)"><span>${esc(m.name)} <small>(${esc(FORMS[m.type] || m.type || '—')})</small></span></label>`).join('')
      : '<p class="printer-empty">Keine passenden Materialien angelegt.</p>';
  }

  function toggleMaterialFields() {
    const uses = $('hubUses')?.checked !== false;
    document.querySelectorAll('[data-hub-material]').forEach(el => { el.hidden = !uses; });
  }

  function onTypeChange() {
    const type = TYPES.find(t => t.key === $('hubType').value);
    document.querySelectorAll('[data-hub-printer-only]').forEach(el => { el.hidden = type.collection !== 'printers'; });
    const usesBox = $('hubUses');
    if (usesBox && autoUses !== 'locked' && (autoUses === null || usesBox.checked === autoUses)) { usesBox.checked = type.uses; autoUses = type.uses; }
    toggleMaterialFields();
    // Passende Materialform vorwählen, solange sie nicht von Hand geändert wurde
    const current = selectedForms().sort().join(',');
    if (!current || (autoForms !== null && current === autoForms)) {
      Object.keys(FORMS).forEach(form => { if ($('hubForm_' + form)) $('hubForm_' + form).checked = type.forms.includes(form); });
      autoForms = [...type.forms].sort().join(',');
    }
    renderMaterialPicker();
  }

  async function edit(index) {
    try {
      await requireAdmin();
      await Promise.all([fetchMaterials(), fetchEquipment()]);
      const item = index >= 0 ? state.items[index] : null;
      const current = item ? typeOf(item) : TYPES[0];
      const rule = window.machineMaterialRule(item || {});
      materialRestrict = rule.ids.length > 0;
      autoForms = item ? null : TYPES[0].forms.join(',');
      autoUses = item ? 'locked' : TYPES[0].uses; // bestehende Maschinen behalten ihren gespeicherten Wert
      materialPicked = new Set(rule.ids);
      equipmentPicked = new Map((item?.requiredEquipment || []).map(e => [e.id, e.name]));
      // Beim Bearbeiten nur Arten derselben Sammlung anbieten (Drucker bleiben Drucker).
      const typeOptions = TYPES.filter(t => !item || t.collection === item.collection)
        .map(t => `<option value="${t.key}" ${t.key === current.key ? 'selected' : ''}>${esc(t.label)}</option>`).join('');
      const forms = Object.entries(FORMS).map(([key, label]) =>
        `<label class="checkbox-label"><input type="checkbox" class="checkbox-input" id="hubForm_${key}" ${rule.types.includes(key) ? 'checked' : ''} onchange="MachineHub.formsChanged()"> ${label}</label>`).join('');
      shell(item ? 'Maschine bearbeiten' : 'Neue Maschine',
        `<div class="form-group"><label class="form-label" for="hubType">Art der Maschine</label><select id="hubType" class="form-select" onchange="MachineHub.typeChanged()">${typeOptions}</select>
           ${item ? '<small>Drucker lassen sich nicht in Laser, Fräsen oder Roboter umwandeln. Lege dafür eine neue Maschine an.</small>' : ''}</div>
         <div class="form-group"><label class="form-label" for="hubName">Name *</label><input id="hubName" class="form-input" maxlength="140" placeholder="z. B. Ginger One, Trotec Speedy 500" value="${esc(item?.name || '')}"></div>
         <div class="form-group"><label class="form-label" for="hubModel">Modell</label><input id="hubModel" class="form-input" maxlength="140" value="${esc(item?.model || '')}"></div>
         <div class="form-group"><label class="form-label" for="hubLocation">Standort</label><input id="hubLocation" class="form-input" maxlength="140" placeholder="z. B. Werkstatt Raum 1" value="${esc(item?.location || '')}"></div>
         <div class="form-group"><label class="form-label" for="hubVolume">Bauraum / Arbeitsbereich</label><input id="hubVolume" class="form-input" maxlength="80" placeholder="z. B. 300 × 300 × 400 mm" value="${esc(item?.buildVolume || '')}"></div>
         <div class="form-group" data-hub-printer-only><label class="form-label" for="hubPrice">Preis pro Stunde (alte Abrechnung)</label><input id="hubPrice" class="form-input" type="number" min="0" step="0.01" value="${esc(item?.pricePerHour ?? '')}"><small>Nur für die bisherige Regel. Aktuelle Preise legst du unter „Tarife &amp; Nutzergruppen“ fest.</small></div>
         <fieldset class="hub-fieldset"><legend>Material</legend>
           <label class="checkbox-label"><input type="checkbox" class="checkbox-input" id="hubUses" ${item?.usesMaterial === false ? '' : 'checked'} onchange="MachineHub.usesChanged()"> Verbraucht Werkstattmaterial (Filament, Pellets)</label>
           <p class="hub-hint" data-hub-material>Welche Materialformen kann die Maschine verarbeiten? Im Auftragsformular erscheinen dann nur passende Materialien.</p>
           <div class="hub-checks" data-hub-material>${forms}</div>
           <label class="checkbox-label" data-hub-material><input type="checkbox" class="checkbox-input" id="hubRestrict" ${materialRestrict ? 'checked' : ''} onchange="MachineHub.restrictChanged(this.checked)"> Nur bestimmte Materialien erlauben</label>
           <div id="hubRestrictBox" data-hub-material ${materialRestrict ? '' : 'hidden'}><div id="hubMaterialList" class="hub-material-list"></div></div>
           <label class="checkbox-label" data-hub-material><input type="checkbox" class="checkbox-input" id="hubMasterbatch" ${rule.masterbatch ? 'checked' : ''}> Masterbatch (Farbzusatz) möglich</label>
         </fieldset>
         ${equipmentList.length ? `<fieldset class="hub-fieldset"><legend>Benötigtes Equipment</legend>
           <p class="hub-hint">Z. B. ein Schlüssel oder Schutzbrille zum Ausleihen. Nutzer sehen den Hinweis im Auftragsformular und in der Anleitung.</p>
           <div class="hub-material-list">${equipmentList.map(e => `<label class="checkbox-label hub-material"><input type="checkbox" class="checkbox-input" ${equipmentPicked.has(e.id) ? 'checked' : ''} onchange="MachineHub.pickEquipment('${esc(e.id)}','${esc(e.name).replace(/'/g, '')}',this.checked)"><span>${esc(e.name)}</span></label>`).join('')}</div>
         </fieldset>` : ''}
         <fieldset class="hub-fieldset"><legend>Einweisung</legend>
           <label class="checkbox-label"><input type="checkbox" class="checkbox-input" id="hubTraining" ${item?.requiresSafetyTraining ? 'checked' : ''}> Einweisung erforderlich</label>
           <label class="form-label" for="hubTrainingName">Gemeinsame Einweisung (optional)</label>
           <input id="hubTrainingName" class="form-input" maxlength="160" list="hubTrainingGroups" placeholder="z. B. Laserschein Trotec Speedy 500" value="${esc(item?.trainingGroup ?? item?.trainingTypeName ?? '')}">
           <datalist id="hubTrainingGroups">${Array.from(new Set(state.items.map(m => m.trainingGroup).filter(Boolean))).map(g => `<option value="${esc(g)}"></option>`).join('')}</datalist>
           <p class="hub-hint">Maschinen mit demselben Namen teilen sich die Einweisung: Wer für eine eingewiesen ist, ist für alle dieser Gruppe eingewiesen (z. B. beide Trotec-Laser).</p>
         </fieldset>
         <div class="form-group"><label class="form-label" for="hubNotes">Notizen</label><textarea id="hubNotes" class="form-textarea" rows="3" maxlength="1000">${esc(item?.notes || '')}</textarea></div>
         <label class="checkbox-label"><input type="checkbox" class="checkbox-input" id="hubActive" ${item?.active === false ? '' : 'checked'}> Aktiv und für neue Aufträge auswählbar</label>
         <p class="hub-hint">Den Status (Verfügbar, In Betrieb, Wartung, Defekt) stellst du direkt in der Liste per Klick um.</p>`,
        `<button class="btn btn-primary" onclick="MachineHub.save(${index})">Speichern</button><button class="btn btn-secondary" onclick="MachineHub.open()">Zurück</button>`);
      onTypeChange();
    } catch (error) { window.toast.error(error.message || 'Maschine konnte nicht geöffnet werden.'); }
  }

  async function save(index) {
    try {
      const user = await requireAdmin();
      const item = index >= 0 ? state.items[index] : null;
      const type = TYPES.find(t => t.key === $('hubType').value);
      const name = $('hubName').value.trim();
      if (!name) throw Error('Bitte einen Namen eingeben.');
      if (item && type.collection !== item.collection) throw Error('Die Art passt nicht zur bestehenden Maschine.');
      const priceText = $('hubPrice')?.value;
      if (type.collection === 'printers' && priceText && !(Number(priceText) >= 0)) throw Error('Bitte einen gültigen Preis eingeben.');
      const uses = $('hubUses').checked;
      const forms = uses ? selectedForms() : [];
      const ids = uses && materialRestrict ? Array.from(materialPicked).filter(id => materials.some(m => m.id === id && (!forms.length || forms.includes(m.type)))) : [];
      if (uses && materialRestrict && !ids.length) throw Error('Bitte mindestens ein Material auswählen oder „Nur bestimmte Materialien erlauben“ ausschalten.');
      const data = {
        name, model: $('hubModel').value.trim(), location: $('hubLocation').value.trim(), notes: $('hubNotes').value.trim(),
        active: $('hubActive').checked, requiresSafetyTraining: $('hubTraining').checked, trainingGroup: $('hubTrainingName').value.trim(), trainingTypeName: $('hubTrainingName').value.trim(),
        requiredEquipment: Array.from(equipmentPicked, ([id, name]) => ({ id, name })),
        usesMaterial: uses, materialTypes: forms, materialIds: ids, supportsMasterbatch: uses && $('hubMasterbatch').checked,
        updatedBy: user.uid, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      };
      if (type.collection === 'printers') {
        Object.assign(data, { type: type.key, pricePerHour: priceText ? Number(priceText) : 0 });
      } else {
        Object.assign(data, { machineType: type.key, category: type.key, jobTypes: item?.jobTypes?.length && item.machineType === type.key ? item.jobTypes : type.jobTypes });
      }
      data.buildVolume = $('hubVolume').value.trim();
      const col = window.db.collection(type.collection);
      if (item) await col.doc(item.id).update(data);
      else await col.add({ ...data, status: 'available', createdBy: user.uid, createdAt: window.firebase.firestore.FieldValue.serverTimestamp() });
      window.toast.success('Maschine gespeichert.');
      window.loadPrinters?.(); // Auswahl im Auftragsformular aktualisieren
      await open();
    } catch (error) { window.toast.error(error.message || 'Speichern fehlgeschlagen.'); }
  }

  async function duplicate(index) {
    try {
      const user = await requireAdmin();
      const item = state.items[index];
      if (!item) return;
      const { id, collection, guideSteps, guideLinks, ...copy } = item;
      const ref = await window.db.collection(collection).add({
        ...copy, name: item.name + ' (Kopie)', status: 'available', createdBy: user.uid,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(), updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
      await load();
      window.toast.success('Maschine dupliziert. Bitte Namen anpassen.');
      edit(state.items.findIndex(i => i.id === ref.id && i.collection === collection));
    } catch (error) { window.toast.error(error.message || 'Duplizieren fehlgeschlagen.'); }
  }

  async function remove(index) {
    try {
      await requireAdmin();
      const item = state.items[index];
      if (!item) return;
      const ok = await window.toast.confirm(`„${item.name}“ wirklich löschen?\n\nBereits erfasste Aufträge, Einweisungen und Tarife bleiben erhalten, die Maschine ist dann aber nicht mehr auswählbar. Zum Ausblenden reicht „Bearbeiten → Aktiv“ ausschalten.`, 'Endgültig löschen', 'Abbrechen');
      if (!ok) return;
      await window.db.collection(item.collection).doc(item.id).delete();
      window.toast.success('Maschine gelöscht.');
      window.loadPrinters?.();
      await open();
    } catch (error) { window.toast.error(error.message || 'Löschen fehlgeschlagen.'); }
  }

  window.MachineHub = {
    open, edit, save, duplicate, remove, addStarter,
    maintenance: index => { const m = state.items[index]; if (m) window.MachineMaintenance.open(m.collection, m.id, 'MachineHub.open()'); },
    pickEquipment: (id, name, checked) => { checked ? equipmentPicked.set(id, name) : equipmentPicked.delete(id); },
    tariff: index => { const m = state.items[index]; if (m) window.Billing.openFor(m.collection, m.id); },
    train: index => { const m = state.items[index]; if (m) window.SafetyTraining.bulkForMachine(m.collection, m.id); },
    usesChanged: () => { toggleMaterialFields(); autoUses = 'locked'; },
    guide: index => { const m = state.items[index]; if (m) window.KnowledgeAdmin.editGuide(m.collection, m.id, 'MachineHub.open()'); },
    qr: index => { const m = state.items[index]; if (m) window.MachineLabels.open([`${m.collection}:${m.id}`]); },
    search: term => { state.term = term; state.limit = PAGE; renderList(); },
    setFilter: key => { state.filter = key; state.limit = PAGE; renderList(); },
    more: () => { state.limit += PAGE; renderList(); },
    typeChanged: onTypeChange,
    formsChanged: renderMaterialPicker,
    restrictChanged: checked => { materialRestrict = checked; if (checked && !materialPicked.size) materials.filter(m => !selectedForms().length || selectedForms().includes(m.type)).forEach(m => materialPicked.add(m.id)); renderMaterialPicker(); },
    pickMaterial: (id, checked) => { checked ? materialPicked.add(id) : materialPicked.delete(id); }
  };

  // Die bisherigen Einstiege führen jetzt alle in diese Verwaltung.
  window.showPrinterManager = open;
  window.MachineManager = { ...(window.MachineManager || {}), open, edit, qr: window.MachineHub.qr, guide: window.MachineHub.guide };
})();
