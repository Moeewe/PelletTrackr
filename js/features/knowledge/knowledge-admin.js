// Maschinen & Anleitungen (Admin): jede Maschine hat ihre eigene Anleitung, einen QR-Code und einen festen Link.
// Die Anleitung liegt direkt am Maschinen-Dokument (Feld "guideSteps"), damit Maschine und Tutorial nie auseinanderlaufen.
(() => {
  'use strict';
  const COLLECTIONS = ['printers', 'machines', 'equipment'];
  let rows = [];
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
      const cards = rows.map((row, i) => {
        const steps = Array.isArray(row.guideSteps) ? row.guideSteps.length : 0;
        return `<article class="safety-card"><h3>${esc(row.name)}</h3><p>${esc(window.machineKindLabel(row))}</p>
          <p>${steps ? `Anleitung: ${steps} Schritt${steps === 1 ? '' : 'e'}` : 'Noch keine eigene Anleitung'}</p>
          <div class="safety-actions"><button class="btn btn-primary" onclick="KnowledgeAdmin.editGuide(${i})">Anleitung</button>
          <button class="btn btn-secondary" onclick="MachineLabels.open(['${esc(row.collection)}:${esc(row.id)}'])">QR / Etikett</button>
          <button class="btn btn-secondary" onclick="KnowledgeAdmin.copyLink(${i})">Link kopieren</button></div></article>`;
      }).join('');
      shell('Maschinen & Anleitungen',
        '<p>Jede Maschine hat eine eigene Schritt-für-Schritt-Anleitung, einen QR-Code und einen festen Link. Der Link führt nach der Anmeldung direkt zur Maschine: Anleitung öffnen und Maschine für Aufträge vorauswählen.</p>' +
        (cards ? `<div class="safety-grid">${cards}</div>` : '<p>Noch keine Maschinen angelegt.</p>') +
        '<p><small>Neue Maschinen legst du unter „Drucker verwalten“, „Produktionsmaschinen verwalten“ oder „Equipment verwalten“ an.</small></p>');
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
      await window.db.collection(row.collection).doc(row.id).update({
        guideSteps: steps,
        guideUpdatedBy: user.uid,
        guideUpdatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
      window.toast.success(steps.length ? 'Anleitung gespeichert.' : 'Anleitung entfernt.');
      const target = back; back = null;
      const match = /^([A-Za-z]+)\.([A-Za-z]+)\(\)$/.exec(target || '');
      if (match && typeof window[match[1]]?.[match[2]] === 'function') return window[match[1]][match[2]]();
      await open();
    } catch (error) { window.toast.error(error.message); }
  }

  async function copyLink(index) {
    const link = machineLink(rows[index]);
    try { await navigator.clipboard.writeText(link); window.toast.success('Link kopiert.'); }
    catch (_) { window.prompt('Link zur Maschine:', link); }
  }

  window.KnowledgeAdmin = { open, editGuide, saveGuide, copyLink };
})();
