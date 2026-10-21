// ==================== STATUS PER KLICK ====================
// Maschinenstatus für Admins: vier Buttons statt Dropdown oder Durchschalten.
// Gilt für Drucker ("printing") und Produktionsmaschinen ("in_use"); gespeichert wird sofort beim Klick.
(function () {
  const IN_USE = { printers: 'printing', machines: 'in_use', equipment: 'in_use' };
  const LABELS = { available: 'Verfügbar', in_use: 'In Betrieb', maintenance: 'Wartung', broken: 'Defekt' };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const inUseValue = collection => IN_USE[collection] || 'in_use';
  // Ältere Daten nutzen "printing" und "in_use" gemischt – beides zählt als "In Betrieb".
  const normalize = status => (status === 'printing' ? 'in_use' : status || 'available');

  function buttons(collection, id, status) {
    const current = normalize(status);
    const group = `${collection}:${id}`;
    return `<div class="mstatus" role="group" aria-label="Status" data-status-group="${esc(group)}">${Object.entries(LABELS).map(([key, label]) =>
      `<button type="button" class="mstatus-btn mstatus-btn-${key} ${key === current ? 'active' : ''}" aria-pressed="${key === current}" onclick="MachineStatus.set('${esc(collection)}','${esc(id)}','${key}')">${label}</button>`).join('')}</div>`;
  }

  function paint(collection, id, key) {
    document.querySelectorAll(`[data-status-group="${CSS.escape(collection + ':' + id)}"] .mstatus-btn`).forEach(button => {
      const on = button.classList.contains('mstatus-btn-' + key);
      button.classList.toggle('active', on);
      button.setAttribute('aria-pressed', String(on));
    });
  }

  async function set(collection, id, key) {
    if (!window.currentUser?.isAdmin) return window.toast?.error('Nur Administratoren können den Status ändern.');
    const status = key === 'in_use' ? inUseValue(collection) : key;
    paint(collection, id, key);
    try {
      await window.db.collection(collection).doc(id).update({
        status,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        lastStatusChangeBy: window.currentUser?.name || 'Admin',
        lastStatusChangeAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
      document.dispatchEvent(new CustomEvent('machine:status', { detail: { collection, id, status } }));
    } catch (error) {
      window.toast?.error('Status konnte nicht gespeichert werden: ' + (error.message || error));
    }
  }

  window.MachineStatus = { buttons, set, normalize, label: status => LABELS[normalize(status)] || status };
})();
