// Maschinen & Anleitungen (Admin): jede Maschine hat ihre eigene Anleitung, einen QR-Code und einen festen Link.
// Die Anleitung liegt direkt am Maschinen-Dokument (Feld "guideSteps"), damit Maschine und Tutorial nie auseinanderlaufen.
(() => {
  'use strict';
  const COLLECTIONS = ['printers', 'machines', 'equipment'];
  let rows = [];
  const state = { suggestions: [] };
  let back = null;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function checkAdmin() {
    const user = window.firebase?.auth?.().currentUser;
    if (!user) throw Error('Bitte anmelden.');
    if ((await window.db.collection('users').doc(user.uid).get()).data()?.isAdmin !== true) throw Error('Nur Admins können Anleitungen pflegen.');
    return user;
  }

  // Fester Link zur Maschine: öffnet nach der Anmeldung die Anleitung und wählt die Maschine für Aufträge vor.
  const machineLink = row => window.MachineLabels?.machineUrl(row)
    || `${(window.APP_PUBLIC_URL || window.location.origin).replace(/\/$/, '')}/?maschinenGuide=${row.collection}:${row.id}`;

  function shell(title, body, backAction) {
    window.showModal(`<div class="modal-header safety-header"><h2>${esc(title)}</h2>${backAction
      ? `<button class="btn btn-secondary" onclick="${backAction}">Zurück</button>`
      : '<button class="btn btn-secondary" onclick="closeModal()">Schließen</button>'}</div><div class="modal-body safety-manager">${body}</div>`,
      { clearStack: true, pushToStack: false });
  }

  // "Titel | https://…" oder nur "https://…" je Zeile
  function parseLinks(text) {
    const links = [];
    for (const line of String(text || '').split(/\n+/).map(l => l.trim()).filter(Boolean)) {
      const [first, ...rest] = line.split('|');
      const url = (rest.length ? rest.join('|') : first).trim();
      let title = rest.length ? first.trim() : '';
      if (!/^https:\/\/[^\s]{4,500}$/.test(url)) throw Error('Links müssen mit https:// beginnen: ' + line.slice(0, 60));
      if (!title) { try { title = new URL(url).hostname.replace(/^www\./, ''); } catch (_) { title = url; } }
      links.push({ title: title.slice(0, 160), url });
    }
    if (links.length > 20) throw Error('Bitte höchstens 20 Links je Maschine anlegen.');
    return links;
  }
  const linksToText = links => (links || []).map(l => `${l.title} | ${l.url}`).join('\n');

  async function load() {
    const snaps = await Promise.all(COLLECTIONS.map(name => window.db.collection(name).get()));
    rows = snaps.flatMap((snap, i) => snap.docs
      .filter(doc => doc.data().name && doc.data().active !== false)
      .map(doc => ({ ...doc.data(), id: doc.id, collection: COLLECTIONS[i] })))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }

  async function open() {
    try {
      await checkAdmin();
      await load();
      let suggestions = [];
      try {
        const pending = await window.db.collection('tutorialSuggestions').where('status', '==', 'pending').limit(50).get();
        suggestions = pending.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (_) { suggestions = []; }
      state.suggestions = suggestions;
      const suggestionCards = suggestions.map((item, i) => `<article class="safety-card"><h4>${esc(item.machineName || 'Maschine')}</h4>
          <p><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.title || item.url)}</a></p>
          ${item.note ? `<p>${esc(item.note)}</p>` : ''}<p><small>Vorgeschlagen von ${esc(item.userName || 'Nutzer')}</small></p>
          <div class="safety-actions"><button class="btn btn-primary" onclick="KnowledgeAdmin.reviewSuggestion(${i},true)">Übernehmen</button>
          <button class="btn btn-secondary" onclick="KnowledgeAdmin.reviewSuggestion(${i},false)">Ablehnen</button></div></article>`).join('');
      const cards = rows.map((row, i) => {
        const steps = Array.isArray(row.guideSteps) ? row.guideSteps.length : 0;
        const links = Array.isArray(row.guideLinks) ? row.guideLinks.length : 0;
        return `<article class="safety-card"><h3>${esc(row.name)}</h3><p>${esc(window.machineKindLabel(row))}</p>
          <p>${steps ? `Anleitung: ${steps} Schritt${steps === 1 ? '' : 'e'}` : 'Noch keine eigene Anleitung'}${links ? ` · ${links} Link${links === 1 ? '' : 's'}` : ''}</p>
          <div class="safety-actions"><button class="btn btn-primary" onclick="KnowledgeAdmin.editGuide(${i})">Anleitung</button>
          <button class="btn btn-secondary" onclick="MachineLabels.open(['${esc(row.collection)}:${esc(row.id)}'])">QR / Etikett</button>
          <button class="btn btn-secondary" onclick="KnowledgeAdmin.copyLink(${i})">Link kopieren</button></div></article>`;
      }).join('');
      shell('Maschinen & Anleitungen',
        (suggestionCards ? `<h3>Vorschläge von Nutzern (${suggestions.length})</h3><div class="safety-grid">${suggestionCards}</div><h3>Alle Maschinen</h3>` : '') +
        '<p>Jede Maschine hat eine eigene Schritt-für-Schritt-Anleitung, Links zu Videos und Dokumenten, einen QR-Code und einen festen Link. Der Link führt nach der Anmeldung direkt zur Maschine: Anleitung öffnen und Maschine für Aufträge vorauswählen.</p>' +
        (cards ? `<div class="safety-grid">${cards}</div>` : '<p>Noch keine Maschinen angelegt.</p>') +
        '<p><small>Neue Maschinen legst du unter „Maschinen verwalten“ an, ausleihbares Equipment unter „Equipment verwalten“.</small></p>');
    } catch (error) { window.toast.error(error.message); }
  }

  // collectionOrIndex: Zeilennummer in der Liste oder (bei Aufruf aus anderen Verwaltungen) Sammlung + id
  async function editGuide(collectionOrIndex, id, backAction) {
    try {
      await checkAdmin();
      let row;
      if (typeof collectionOrIndex === 'number') { row = rows[collectionOrIndex]; back = null; }
      else {
        const doc = await window.db.collection(collectionOrIndex).doc(id).get();
        if (!doc.exists) throw Error('Maschine nicht gefunden.');
        row = { ...doc.data(), id, collection: collectionOrIndex };
        rows = [row]; back = backAction || null;
      }
      const steps = (row.guideSteps || []).join('\n');
      shell('Anleitung · ' + row.name,
        `<p>Ein Schritt pro Zeile. Beginne am besten mit einem kurzen Titel, danach ein Punkt und die Details, zum Beispiel:<br><em>Tür schließen. Prüfe, dass niemand im Sicherheitsbereich ist und die Tür verriegelt.</em></p>
         <label>Schritte<textarea id="guideSteps" class="form-input" rows="12" placeholder="Maschine einschalten. Hauptschalter auf I stellen …">${esc(steps)}</textarea></label>
         <p><small>Ohne eigene Schritte zeigt die Hilfe für bekannte Maschinen (Weber, UR5, Ginger) die allgemeine Anleitung.</small></p>
         <label>Links zu Videos & Dokumenten (optional)<textarea id="guideLinks" class="form-input" rows="5" placeholder="Einführungsvideo | https://www.youtube.com/watch?v=…&#10;Bedienungsanleitung | https://…">${esc(linksToText(row.guideLinks))}</textarea></label>
         <p><small>Pro Zeile ein Link, nach Wunsch mit Titel: <em>Titel | https://…</em>. Nutzer können zusätzlich selbst Tutorials vorschlagen; die Vorschläge erscheinen oben in „Maschinen &amp; Anleitungen“.</small></p>
         <div class="safety-actions"><button class="btn btn-primary" onclick="KnowledgeAdmin.saveGuide(0)">Speichern</button>
         <button class="btn btn-secondary" onclick="MachineLabels.open(['${esc(row.collection)}:${esc(row.id)}'])">QR / Etikett</button></div>`,
        back || 'KnowledgeAdmin.open()');
    } catch (error) { window.toast.error(error.message); }
  }

  async function saveGuide(index) {
    try {
      const user = await checkAdmin();
      const row = rows[index];
      const steps = document.getElementById('guideSteps').value.split(/\n+/).map(line => line.trim()).filter(Boolean);
      if (steps.length > 40) throw Error('Bitte höchstens 40 Schritte anlegen.');
      if (steps.some(step => step.length > 600)) throw Error('Ein Schritt ist zu lang (höchstens 600 Zeichen).');
      const links = parseLinks(document.getElementById('guideLinks')?.value);
      await window.db.collection(row.collection).doc(row.id).update({
        guideSteps: steps,
        guideLinks: links,
        guideUpdatedBy: user.uid,
        guideUpdatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
      window.toast.success(steps.length || links.length ? 'Gespeichert.' : 'Anleitung und Links entfernt.');
      const target = back; back = null;
      const match = /^(?:([A-Za-z]+)\.)?([A-Za-z]+)\(\)$/.exec(target || '');
      const fn = match ? (match[1] ? window[match[1]]?.[match[2]] : window[match[2]]) : null;
      if (typeof fn === 'function') return fn();
      await open();
    } catch (error) { window.toast.error(error.message); }
  }

  async function reviewSuggestion(index, approve) {
    try {
      const user = await checkAdmin();
      const item = state.suggestions[index];
      if (!item) return;
      const batch = window.db.batch();
      if (approve) {
        const machine = window.db.collection(item.machineCollection).doc(item.machineId);
        if (!(await machine.get()).exists) throw Error('Die Maschine gibt es nicht mehr.');
        batch.update(machine, { guideLinks: window.firebase.firestore.FieldValue.arrayUnion({ title: item.title || new URL(item.url).hostname.replace(/^www\./, ''), url: item.url }) });
      }
      batch.update(window.db.collection('tutorialSuggestions').doc(item.id), { status: approve ? 'approved' : 'rejected', reviewedBy: user.uid });
      await batch.commit();
      window.toast.success(approve ? 'Link übernommen.' : 'Vorschlag abgelehnt.');
      await open();
    } catch (error) { window.toast.error(error.message); }
  }

  async function copyLink(index) {
    const link = machineLink(rows[index]);
    try { await navigator.clipboard.writeText(link); window.toast.success('Link kopiert.'); }
    catch (_) { window.prompt('Link zur Maschine:', link); }
  }

  window.KnowledgeAdmin = { open, editGuide, saveGuide, copyLink, reviewSuggestion };
})();
