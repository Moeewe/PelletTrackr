// ==================== ENTRY FORM ASSIST ====================
// Macht das Auftragsformular für Nutzer einfacher:
// - zeigt nur Felder, die für die gewählte Maschine/Material nötig sind
// - belegt Maschine und Material vom letzten Auftrag vor
// - wählt per QR-Code gescannte Maschine vor
// - zeigt den Zustand der Services direkt auf den Karten
(function () {
  const $ = id => document.getElementById(id);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  let prefilledFor = null;

  function setHidden(id, hidden) {
    const node = $(id);
    if (node) node.hidden = hidden;
  }

  // ---------- Felder ein-/ausblenden ----------
  function syncAmountFields() {
    setHidden('materialAmountGroup', !$('material')?.value);
    setHidden('masterbatchAmountGroup', !$('masterbatch')?.value);
  }

  document.addEventListener('change', event => {
    if (event.target && ['material', 'masterbatch'].includes(event.target.id)) syncAmountFields();
  });

  // Live-Kostenvorschau: unabhängig von der Initialisierungsreihenfolge per Event-Delegation.
  let previewTimer = null;
  const livePreview = delay => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => window.Billing?.preview?.(), delay);
  };
  const typedFields = ['printTime', 'materialMenge', 'masterbatchMenge'];
  const pickedFields = ['printer', 'material', 'masterbatch', 'ownMaterialUsed'];
  document.addEventListener('input', event => {
    if (typedFields.includes(event.target?.id)) livePreview(300);
  });
  document.addEventListener('change', event => {
    if (pickedFields.includes(event.target?.id) || typedFields.includes(event.target?.id)) livePreview(0);
  });

  // Hinweis zur gewählten Maschine: Wartung/Defekt und fehlende Einweisung (nur Hinweis, kein Sperren).
  let trainingCache = { uid: null, list: [] };
  async function ownTrainings() {
    const uid = window.firebase?.auth?.().currentUser?.uid;
    if (!uid) return [];
    if (trainingCache.uid !== uid) {
      try {
        const snap = await window.db.collection('safetyTrainings').where('userId', '==', uid).get();
        trainingCache = { uid, list: snap.docs.map(doc => doc.data()) };
      } catch (_) { trainingCache = { uid, list: [] }; }
    }
    return trainingCache.list;
  }
  async function updateMachineHint() {
    const hint = $('machineHint');
    const option = $('printer')?.selectedOptions?.[0];
    if (!hint) return;
    if (!option?.value) { hint.hidden = true; return; }
    const messages = [];
    if (option.dataset.status === 'maintenance') messages.push('Diese Maschine ist gerade in Wartung.');
    if (option.dataset.status === 'broken') messages.push('Diese Maschine ist als defekt gemeldet.');
    if (option.dataset.training === '1') {
      const [collection, id] = option.value.split('/');
      const trainings = await ownTrainings();
      if (!trainings.some(t => t.status === 'active' && t.machineCollection === collection && t.machineId === id)) {
        messages.push('Für diese Maschine ist eine Einweisung nötig – bei dir ist noch keine eingetragen. Frag bitte in der Werkstatt.');
      }
    }
    hint.textContent = messages.join(' ');
    hint.hidden = !messages.length;
  }
  document.addEventListener('change', event => { if (event.target?.id === 'printer') updateMachineHint(); });

  // Tarif der gewählten Maschine: ohne Materialabrechnung / ohne Zeitabrechnung entfallen Felder.
  document.addEventListener('billing:quote', event => {
    const tariff = event.detail?.tariff || {};
    const noMaterial = tariff.materialRule === 'none';
    setHidden('materialRow', noMaterial);
    setHidden('ownMaterialRow', noMaterial);
    setHidden('printTimeGroup', ['flat', 'free'].includes(tariff.mode));
    syncAmountFields();
  });

  function showHint(text) {
    const hint = $('entryPrefillHint');
    if (!hint) return;
    hint.textContent = text;
    hint.hidden = !text;
  }

  async function waitFor(condition, tries = 20, delay = 300) {
    for (let i = 0; i < tries; i++) {
      if (condition()) return true;
      await wait(delay);
    }
    return false;
  }

  function selectOption(select, value) {
    if (!select || !value) return false;
    const exists = Array.from(select.options).some(option => option.value === value);
    if (exists) select.value = value;
    return exists;
  }

  function fire(select) {
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ---------- Vorbelegung ----------
  async function applyDefaults(machineValue, last) {
    const printer = $('printer');
    if (!selectOption(printer, machineValue)) return false;
    fire(printer);
    if (last?.material) {
      // Das Materialangebot wird nach der Maschinenwahl neu geladen.
      await wait(400);
      await waitFor(() => $('material').options.length > 1);
      if (selectOption($('material'), last.material)) fire($('material'));
    }
    if (last?.masterbatch && selectOption($('masterbatch'), last.masterbatch)) {
      fire($('masterbatch'));
      $('formMore').open = true;
    }
    syncAmountFields();
    window.Billing?.preview?.();
    return true;
  }

  async function prefillFromScan() {
    const ref = window.pendingMachineRef;
    if (!ref) return;
    const ready = await waitFor(() => $('printer')?.options.length > 1, 40, 300);
    if (!ready) return;
    window.pendingMachineRef = null;
    if (await applyDefaults(`${ref.collection}/${ref.id}`, null)) {
      showHint(ref.source === 'guide' ? 'Maschine aus der Anleitung übernommen.' : 'Maschine per QR-Code ausgewählt.');
      $('printer').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  async function prefillFromLastEntry() {
    const uid = window.currentUser?.uid;
    if (!uid || prefilledFor === uid || window.pendingMachineRef) return;
    const last = window.allUserEntries?.[0];
    const untouched = $('printer')?.options.length > 1 && !$('printer').value && !$('material')?.value;
    if (!last || !untouched) return;
    prefilledFor = uid;
    const machineValue = last.machineCollection && last.machineId ? `${last.machineCollection}/${last.machineId}` : '';
    if (machineValue && await applyDefaults(machineValue, last)) {
      showHint('Vom letzten Auftrag übernommen – bitte nur Zeit und Menge ergänzen.');
    }
  }

  document.addEventListener('machine:scanned', prefillFromScan);
  setInterval(() => {
    if (!$('userDashboard')?.classList.contains('active')) return;
    prefillFromScan();
    prefillFromLastEntry();
  }, 1500);

  // Nach dem Speichern: Formular leeren und für den nächsten Auftrag erneut vorbelegen.
  const originalClear = window.clearForm;
  if (typeof originalClear === 'function') {
    window.clearForm = function () {
      originalClear.apply(this, arguments);
      syncAmountFields();
      showHint('');
      setTimeout(() => { prefilledFor = null; }, 2500);
    };
  }

  // Nach Abmeldung nächster Nutzer wieder frisch vorbelegen.
  document.addEventListener('click', event => {
    if (event.target?.closest?.('[onclick*="logout"]')) { prefilledFor = null; showHint(''); }
  });

  // ---------- Zustand der Services ----------
  const statusText = {
    'user-equipment-requests': n => n === 1 ? '1 Ausleihe offen' : `${n} Ausleihen offen`,
    'user-problem-reports': n => n === 1 ? '1 Meldung in Bearbeitung' : `${n} Meldungen in Bearbeitung`,
    'user-material-requests': n => n === 1 ? '1 Wunsch offen' : `${n} Wünsche offen`
  };

  window.updateServiceStatus = function (badgeId, count) {
    const text = statusText[badgeId];
    document.querySelectorAll(`[data-status-for="${badgeId}"]`).forEach(node => {
      node.textContent = text && count > 0 ? text(count) : 'Nichts offen';
      node.classList.toggle('service-status-active', count > 0);
    });
  };
})();
