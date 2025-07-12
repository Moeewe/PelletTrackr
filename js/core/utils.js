// ==================== UTILITIES MODULE ====================
// Hilfsfunktionen für Formatierung und Validierung

// Währung formatieren
function formatCurrency(amount, decimals = 2) {
  return (amount || 0).toFixed(decimals).replace('.', ',') + ' €';
}

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

// ==================== GLOBAL EXPORTS ====================
// Export functions to window for global access
window.formatCurrency = formatCurrency;
window.checkAdminAccess = checkAdminAccess;
window.parseGermanNumber = parseGermanNumber;
window.escapeQuotes = escapeQuotes;
