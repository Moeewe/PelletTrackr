// ==================== MATERIALBESTAND ====================
// Optionaler Lagerbestand je Material (kg) mit Mindestbestand. Neue Aufträge buchen das verbrauchte Material
// automatisch ab (Cloud Function "bookMaterialStock"); Zugänge und Inventur trägt der Admin hier ein.
(() => {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const kg = value => (Math.round(Number(value) * 1000) / 1000).toString().replace('.', ',') + ' kg';
  let material = null;

  async function requireAdmin() {
    const user = window.firebase?.auth?.().currentUser;
    if (!user) throw Error('Bitte anmelden.');
    if ((await window.db.collection('users').doc(user.uid).get()).data()?.isAdmin !== true) throw Error('Nur Admins können den Bestand ändern.');
    return user;
  }

  // Kurztext für Listen: "Bestand 12,5 kg" bzw. "Bestand niedrig …"
  function summary(data) {
    if (typeof data?.stockKg !== 'number') return { text: 'Kein Bestand geführt', low: false };
    const low = typeof data.minStockKg === 'number' && data.stockKg <= data.minStockKg;
    return { text: `Bestand ${kg(data.stockKg)}${low ? ' – niedrig' : ''}`, low };
  }

  async function open(id) {
    try {
      await requireAdmin();
      const doc = await window.db.collection('materials').doc(id).get();
      if (!doc.exists) throw Error('Material nicht gefunden.');
      material = { ...doc.data(), id };
      const info = summary(material);
      window.showModal(`<div class="modal-header"><h3>Bestand · ${esc(material.name)}</h3><button class="close-btn" onclick="closeModal()">&times;</button></div>
        <div class="modal-body">
          <div class="maint-summary ${info.low ? 'maint-overdue' : ''}"><p><strong>${esc(info.text)}</strong></p>
            ${typeof material.minStockKg === 'number' ? `<p>Mindestbestand: ${kg(material.minStockKg)}</p>` : ''}</div>
          <p class="hub-hint">Neue Aufträge ziehen das verbrauchte Material automatisch ab (nicht bei eigenem Material). Ist kein Bestand eingetragen, wird nichts gebucht.</p>
          <fieldset class="hub-fieldset"><legend>Zugang buchen</legend>
            <label class="form-label" for="stockIn">Menge (kg)</label><input id="stockIn" class="form-input" type="number" min="0" step="0.001" inputmode="decimal">
            <div class="safety-actions"><button class="btn btn-primary" onclick="MaterialStock.add()">Zugang buchen</button></div></fieldset>
          <fieldset class="hub-fieldset"><legend>Inventur</legend>
            <label class="form-label" for="stockSet">Bestand jetzt (kg)</label><input id="stockSet" class="form-input" type="number" min="0" step="0.001" inputmode="decimal" value="${typeof material.stockKg === 'number' ? material.stockKg : ''}">
            <label class="form-label" for="stockMin">Mindestbestand (kg, optional)</label><input id="stockMin" class="form-input" type="number" min="0" step="0.001" inputmode="decimal" value="${typeof material.minStockKg === 'number' ? material.minStockKg : ''}">
            <div class="safety-actions"><button class="btn btn-secondary" onclick="MaterialStock.set()">Bestand speichern</button></div></fieldset>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" onclick="MaterialStock.close()">Zurück zu den Materialien</button></div>`);
    } catch (error) { window.toast.error(error.message || 'Bestand konnte nicht geöffnet werden.'); }
  }

  const close = () => (typeof window.showMaterialManager === 'function' ? window.showMaterialManager() : window.closeModal());

  async function add() {
    try {
      await requireAdmin();
      const amount = Number(document.getElementById('stockIn').value);
      if (!(amount > 0)) throw Error('Bitte eine Menge größer als 0 eingeben.');
      const base = typeof material.stockKg === 'number' ? material.stockKg : 0;
      await window.db.collection('materials').doc(material.id).update({
        stockKg: Math.round((base + amount) * 1000) / 1000, stockUpdatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
      window.toast.success(`${kg(amount)} gebucht.`);
      await open(material.id);
    } catch (error) { window.toast.error(error.message || 'Buchen fehlgeschlagen.'); }
  }

  async function set() {
    try {
      await requireAdmin();
      const stockText = document.getElementById('stockSet').value;
      const minText = document.getElementById('stockMin').value;
      if (stockText === '' ) throw Error('Bitte den aktuellen Bestand eingeben.');
      const stock = Number(stockText);
      const min = minText === '' ? null : Number(minText);
      if (!(stock >= 0) || (min !== null && !(min >= 0))) throw Error('Bitte gültige, nicht negative Zahlen eingeben.');
      await window.db.collection('materials').doc(material.id).update({
        stockKg: Math.round(stock * 1000) / 1000, minStockKg: min, stockUpdatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
      window.toast.success('Bestand gespeichert.');
      await open(material.id);
    } catch (error) { window.toast.error(error.message || 'Speichern fehlgeschlagen.'); }
  }

  window.MaterialStock = { open, add, set, close, summary };
})();
