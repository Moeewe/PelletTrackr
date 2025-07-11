// ==================== GLOBAL VARIABLES ====================
// Zentrale Variablen für die gesamte App

// Global configuration
const CONFIG = {
    // Any global config settings
};

// Global state
let currentUser = null;

/**
 * Close all modals and overlays
 */
function closeAllModals() {
    // Hide overlay
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    // Hide all modal dialogs
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    
    // Clean up any dynamic modals
    const dynamicModals = document.querySelectorAll('.modal[id*="Modal"]');
    dynamicModals.forEach(modal => {
        if (modal.id === 'newReservationModal') {
            modal.remove();
        }
    });
    
    // Reset any global modal states
    if (typeof selectedTimeSlot !== 'undefined') {
        selectedTimeSlot = null;
    }
    if (typeof currentEditingPrinter !== 'undefined') {
        currentEditingPrinter = null;
    }
}

// Globale Variablen
window.currentUser = { name: '', kennung: '', isAdmin: false };
window.ADMIN_PASSWORD = 'fgf2024admin'; // In production sollte das in einer sicheren Konfiguration stehen

// Globale Daten für Suche und Sortierung
window.allUserEntries = [];
window.allAdminEntries = [];
window.allUsers = [];
window.allAdmins = [];
