// ==================== WARTUNG ====================
// Wartungsverlauf je Maschine (was wurde wann gemacht) mit Intervall und Fälligkeit.
// Die Fälligkeit wird an der Maschine gespeichert, damit Listen ohne zusätzliche Abfragen auskommen.
// Betriebsstunden seit der letzten Wartung werden nur auf Knopfdruck berechnet (eine Abfrage je Maschine).
(() => {
  'use strict';
  const TYPES = ['Wartung', 'Reinigung', 'Reparatur', 'Prüfung', 'Sonstiges'];
  let machine = null;
  let back = null;

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toDate = value => (value?.toDate ? value.toDate() : value ? new Date(value) : null);
  const fmt = value => { const d = toDate(value); return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('de-DE') : '—'; };
  const todayIso = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); };

  async function requireAdmin() {
    const user = window.firebase?.auth?.().currentUser;
    if (!user) throw Error('Bitte anmelden.');
    if ((await window.db.collection('users').doc(user.uid).get()).data()?.isAdmin !== true) throw Error('Nur Admins können Wartungen eintragen.');
    return user;
  }

  async function open(collection, id, backAction) {
    try {
      await requireAdmin();
      const doc = await window.db.collection(collection).doc(id).get();
      if (!doc.exists) throw Error('Maschine nicht gefunden.');
      machine = { ...doc.data(), id, collection };
      back = backAction || 'MachineHub.open()';
      const logs = await window.db.collection('maintenanceLogs').where('machineId', '==', id).limit(50).get();
      const rows = logs.docs.map(d => d.data()).filter(l => l.machineCollection === collection)
        .sort((a, b) => (toDate(b.doneAt)?.getTime() || 0) - (toDate(a.doneAt)?.getTime() || 0));
      render(rows);
    } catch (error) { window.toast.error(error.message || 'Wartung konnte nicht geöffnet werden.'); }
  }

  function render(rows) {
    const state = window.maintenanceState(machine);
    const history = rows.length ? rows.map(l => `<article class="maint-entry"><div class="maint-entry-head"><strong>${esc(l.type)}</strong><span>${fmt(l.doneAt)}</span></div>
        <p>${esc(l.description)}</p><small>${l.doneBy ? 'Durchgeführt von ' + esc(l.doneBy) : ''}</small></article>`).join('')
      : '<p class="printer-empty">Noch keine Wartung eingetragen.</p>';
    window.showModal(`<div class="modal-header"><h3>Wartung · ${esc(machine.name)}</h3><button class="btn btn-secondary" onclick="${back}">Zurück</button></div>
      <div class="modal-body">
        <div class="maint-summary ${state ? 'maint-' + state.level : ''}"><p>Letzte Wartung: <strong>${fmt(machine.lastMaintenanceAt)}</strong></p>
          <p>${state ? esc(state.label) : (Number(machine.maintenanceIntervalDays) > 0 ? `Intervall: alle ${esc(machine.maintenanceIntervalDays)} Tage – die Fälligkeit wird nach der ersten eingetragenen Wartung berechnet.` : 'Kein Intervall festgelegt')}</p></div>

        <fieldset class="hub-fieldset"><legend>Wartung eintragen</legend>
          <label class="form-label" for="maintDate">Datum</label><input id="maintDate" class="form-input" type="date" max="${todayIso()}" value="${todayIso()}">
          <label class="form-label" for="maintType">Art</label><select id="maintType" class="form-select">${TYPES.map(t => `<option>${t}</option>`).join('')}</select>
          <label class="form-label" for="maintText">Was wurde gemacht? *</label><textarea id="maintText" class="form-textarea" rows="3" maxlength="2000" placeholder="z. B. Linse und Spiegel gereinigt, Filter getauscht"></textarea>
          <label class="form-label" for="maintBy">Durchgeführt von</label><input id="maintBy" class="form-input" maxlength="160" value="${esc(window.currentUser?.name || '')}">
          ${['maintenance', 'broken'].includes(machine.status) ? '<label class="checkbox-label"><input type="checkbox" class="checkbox-input" id="maintRelease" checked> Maschine wieder auf „Verfügbar“ setzen</label>' : ''}
          <div class="safety-actions"><button class="btn btn-primary" onclick="MachineMaintenance.save()">Eintragen</button></div>
        </fieldset>

        <fieldset class="hub-fieldset"><legend>Intervall</legend>
          <p class="hub-hint">Die nächste Wartung wird aus dem Datum der letzten Wartung berechnet.</p>
          <label class="form-label" for="maintDays">Alle … Tage</label><input id="maintDays" class="form-input" type="number" min="0" step="1" value="${esc(machine.maintenanceIntervalDays ?? '')}" placeholder="z. B. 90">
          <label class="form-label" for="maintHours">Oder alle … Betriebsstunden (Richtwert)</label><input id="maintHours" class="form-input" type="number" min="0" step="1" value="${esc(machine.maintenanceIntervalHours ?? '')}" placeholder="z. B. 50">
          <div class="safety-actions"><button class="btn btn-secondary" onclick="MachineMaintenance.saveInterval()">Intervall speichern</button><button class="btn btn-secondary" onclick="MachineMaintenance.usage()">Betriebszeit seit letzter Wartung</button></div>
          <p id="maintUsage" class="hub-hint" role="status"></p>
        </fieldset>

        <h4>Verlauf</h4><div class="maint-list">${history}</div>
      </div>`, { clearStack: true, pushToStack: false });
  }

  async function save() {
    try {
      const user = await requireAdmin();
      const dateText = $('maintDate').value;
      const description = $('maintText').value.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText) || dateText > todayIso()) throw Error('Bitte ein gültiges Datum angeben (nicht in der Zukunft).');
      if (!description) throw Error('Bitte beschreiben, was gemacht wurde.');
      const done = new Date(dateText + 'T12:00:00');
      const stamp = window.firebase.firestore.Timestamp.fromDate(done);
      const days = Number(machine.maintenanceIntervalDays) > 0 ? Number(machine.maintenanceIntervalDays) : null;
      const next = days ? window.firebase.firestore.Timestamp.fromDate(new Date(done.getTime() + days * 86400000)) : null;
      const batch = window.db.batch();
      batch.set(window.db.collection('maintenanceLogs').doc(), {
        machineCollection: machine.collection, machineId: machine.id, machineName: machine.name || '',
        type: $('maintType').value, description, doneBy: $('maintBy').value.trim().slice(0, 160), doneAt: stamp,
        createdBy: user.uid, createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
      const update = { lastMaintenanceAt: stamp, nextMaintenanceAt: next, updatedAt: window.firebase.firestore.FieldValue.serverTimestamp() };
      if ($('maintRelease')?.checked) Object.assign(update, { status: 'available', lastStatusChangeBy: window.currentUser?.name || 'Admin', lastStatusChangeAt: window.firebase.firestore.FieldValue.serverTimestamp() });
      batch.update(window.db.collection(machine.collection).doc(machine.id), update);
      await batch.commit();
      window.toast.success('Wartung eingetragen.');
      await open(machine.collection, machine.id, back);
    } catch (error) { window.toast.error(error.message || 'Eintragen fehlgeschlagen.'); }
  }

  async function saveInterval() {
    try {
      await requireAdmin();
      const days = $('maintDays').value ? Number($('maintDays').value) : null;
      const hours = $('maintHours').value ? Number($('maintHours').value) : null;
      if ((days !== null && !(days > 0)) || (hours !== null && !(hours > 0))) throw Error('Bitte positive Zahlen eingeben oder das Feld leer lassen.');
      const last = toDate(machine.lastMaintenanceAt);
      const next = days && last ? window.firebase.firestore.Timestamp.fromDate(new Date(last.getTime() + days * 86400000)) : null;
      await window.db.collection(machine.collection).doc(machine.id).update({
        maintenanceIntervalDays: days, maintenanceIntervalHours: hours, nextMaintenanceAt: next,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
      window.toast.success('Intervall gespeichert.');
      await open(machine.collection, machine.id, back);
    } catch (error) { window.toast.error(error.message || 'Speichern fehlgeschlagen.'); }
  }

  // Nur auf Knopfdruck: Aufträge dieser Maschine seit der letzten Wartung zusammenrechnen.
  async function usage() {
    const target = $('maintUsage');
    try {
      await requireAdmin();
      target.textContent = 'Wird berechnet …';
      let query = window.db.collection('entries').where('machineId', '==', machine.id);
      const last = toDate(machine.lastMaintenanceAt);
      if (last) query = query.where('timestamp', '>', window.firebase.firestore.Timestamp.fromDate(last));
      const snap = await query.get();
      const entries = snap.docs.map(d => d.data()).filter(e => !e.machineCollection || e.machineCollection === machine.collection);
      const minutes = entries.reduce((sum, e) => sum + (Number(e.printTime) || Number(e.durationMinutes) || 0), 0);
      const hours = Math.round(minutes / 6) / 10;
      const limit = Number(machine.maintenanceIntervalHours) > 0 ? ` von ${machine.maintenanceIntervalHours} Std.` : '';
      target.textContent = `${entries.length} ${entries.length === 1 ? 'Auftrag' : 'Aufträge'} · ${String(hours).replace('.', ',')} Std.${limit} seit ${last ? fmt(last) : 'Beginn der Aufzeichnung'}.`;
    } catch (error) { target.textContent = ''; window.toast.error(error.message || 'Berechnung fehlgeschlagen.'); }
  }

  window.MachineMaintenance = { open, save, saveInterval, usage };
})();
