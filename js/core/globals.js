// ==================== GLOBAL VARIABLES ====================
// Zentrale Variablen für die gesamte App

// Globale Variablen - Aktualisiert für Email/Passwort-System
window.currentUser = { name: '', email: '', username: '', isAdmin: false };
window.ADMIN_PASSWORD = 'fgf2025admin'; // In production sollte das in einer sicheren Konfiguration stehen

// Globale Daten für Suche und Sortierung
window.allUserEntries = [];
window.allAdminEntries = [];
window.allUsers = [];
window.allAdmins = [];

// Global helper functions für Email-Login
function extractUsernameFromEmail(email) {
    if (!email || !email.includes('@')) {
        return email || 'user';
    }
    return email.split('@')[0];
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function generateSecurePasswordFromEmail(email) {
    if (!email) return 'defaultPassword123';

    const username = extractUsernameFromEmail(email);
    const hash = btoa(username + Date.now()).slice(0, 8);
    return `${username}${hash}!`;
}

// Safe showToast function
function safeShowToast(message, type = 'info') {
    try {
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else if (typeof toast !== 'undefined' && toast[type]) {
            toast[type](message);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    } catch (error) {
        console.error('❌ Fehler beim Anzeigen der Toast-Nachricht:', error);
    }
}
