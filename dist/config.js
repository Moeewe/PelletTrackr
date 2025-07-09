// ==================== KONFIGURATION ====================

// APP-EINSTELLUNGEN
const APP_CONFIG = {
  // Branding
  appName: "FGF",
  appTitle: "3D-Druck Abrechnung",
  
  // Admin-Sicherheit
  adminPassword: "admin123", // WICHTIG: Passwort für Produktivumgebung ändern!
  
  // Stil-Einstellungen
  theme: {
    primaryColor: "#FFFF00", // Gelb für Highlights
    textColor: "#000000",
    backgroundColor: "#FFFFFF",
    borderColor: "#000000"
  },
  
  // Debugging
  debugMode: false // true für Entwicklung, false für Produktion
};

// Export für Module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APP_CONFIG;
}
