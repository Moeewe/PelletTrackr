// ==================== UTILITIES MODULE ====================
// Hilfsfunktionen für Formatierung und Validierung

// Währung formatieren
function formatCurrency(amount, decimals = 2) {
  return (amount || 0).toFixed(decimals).replace('.', ',') + ' €';
}

// Verständliche Maschinenart statt interner Namen wie "printers" oder "weber_dxr".
function machineKindLabel(machine) {
  if (!machine) return 'Maschine';
  const kinds = { laser: 'Laser', cnc: 'CNC-Fräse', weber_dxr: 'Großroboter', ur5: 'Roboterarm', other: 'Weitere Fertigung' };
  const typed = kinds[String(machine.machineType || machine.category || '').toLowerCase()];
  if (typed) return typed;
  if (Array.isArray(machine.jobTypes) && machine.jobTypes.length) return machine.jobTypes.join(' · ');
  if (machine.collection === 'printers') {
    const material = String(machine.type || '').toLowerCase();
    return material === 'pellet' ? '3D-Drucker (Pellet)' : material === 'filament' ? '3D-Drucker (Filament)' : '3D-Drucker';
  }
  if (machine.collection === 'equipment') return 'Equipment (zum Ausleihen)';
  if (machine.collection === 'safetyTrainingTypes') return 'Unterweisungsart';
  return 'Maschine';
}
window.machineKindLabel = machineKindLabel;

// Verknüpfung Maschine ↔ Material: welche Materialformen (Filament/Pellet) und welche Materialien
// eine Maschine verarbeitet und ob Masterbatch (Farbzusatz) möglich ist. Ältere Drucker haben nur "type".
function machineMaterialRule(machine) {
  const types = Array.isArray(machine?.materialTypes) && machine.materialTypes.length
    ? machine.materialTypes : (machine?.type ? [machine.type] : []);
  return {
    types,
    ids: Array.isArray(machine?.materialIds) ? machine.materialIds : [],
    masterbatch: machine?.supportsMasterbatch !== false,
    // false = die Maschine verbraucht kein Werkstattmaterial (z. B. Laser); ältere Maschinen ohne Angabe gelten als "ja"
    uses: machine?.usesMaterial !== false
  };
}
window.machineMaterialRule = machineMaterialRule;
// Passt ein Material zur Maschine? (keine Einschränkung = alle Materialien)
window.materialFitsMachine = function (material, rule) {
  if (!rule) return true;
  if (rule.ids.length) return rule.ids.includes(material.id);
  return !rule.types.length || rule.types.includes(material.type);
};

// Admin-Zugriff prüfen
function checkAdminAccess() {
  if (!window.currentUser || !window.currentUser.isAdmin) {
    if (window.toast && typeof window.toast.warning === 'function') {
      window.toast.warning('Nur für Administratoren!');
    } else {
      alert('Nur für Administratoren!');
    }
    return false;
  }
  return true;
}

// Deutsche Zahlenformate parsen
function parseGermanNumber(str) {
  if (typeof str !== 'string') return parseFloat(str) || 0;
  return parseFloat(str.replace(',', '.')) || 0;
}

// Anführungszeichen escapen für HTML-Attribute
function escapeQuotes(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

// ==================== GLOBAL EXPOSURE ====================
// Utility-Funktionen global verfügbar machen

window.formatCurrency = formatCurrency;
window.checkAdminAccess = checkAdminAccess;
window.parseGermanNumber = parseGermanNumber;
window.escapeQuotes = escapeQuotes;

// Native alert() blockiert besonders auf dem Handy; stattdessen als Toast anzeigen.
// Fällt auf das Original zurück, solange das Toast-System noch nicht geladen ist.
(function () {
  const nativeAlert = window.alert.bind(window);
  window.alert = function (message) {
    const toast = window.toast;
    if (!toast || typeof toast.error !== 'function') return nativeAlert(message);
    const text = String(message ?? '');
    if (/fehler|fehlgeschlagen|nicht gefunden/i.test(text)) toast.error(text);
    else if (/erfolgreich|gesendet|genehmigt/i.test(text)) toast.success(text);
    else toast.warning(text);
  };
})();
