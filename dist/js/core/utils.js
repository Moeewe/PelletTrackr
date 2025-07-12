// ==================== UTILITIES MODULE ====================
// Hilfsfunktionen für Formatierung und Validierung

// Währung formatieren
function formatCurrency(amount) {
  return (amount || 0).toFixed(2).replace('.', ',') + ' €';
}

// Admin-Zugriff prüfen
function checkAdminAccess() {
  if (!window.currentUser.isAdmin) {
    alert('Nur für Administratoren!');
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
