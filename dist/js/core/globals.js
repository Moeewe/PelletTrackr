// ==================== GLOBAL VARIABLES ====================
// Zentrale Variablen für die gesamte App

// Global configuration
const CONFIG = {
    // Any global config settings
};

// Global listener registry for cleanup
const GLOBAL_LISTENERS = {
    firebase: [],
    components: {}
};

/**
 * Register a Firebase listener for cleanup
 */
function registerFirebaseListener(name, unsubscribe) {
    if (typeof unsubscribe === 'function') {
        GLOBAL_LISTENERS.firebase.push({ name, unsubscribe });
        console.log(`📝 Registered Firebase listener: ${name}`);
    }
}

/**
 * Clean up all Firebase listeners
 */
function cleanupAllFirebaseListeners() {
    console.log(`🧹 Cleaning up ${GLOBAL_LISTENERS.firebase.length} Firebase listeners...`);
    
    GLOBAL_LISTENERS.firebase.forEach(({ name, unsubscribe }) => {
        try {
            unsubscribe();
            console.log(`✅ Cleaned up listener: ${name}`);
        } catch (error) {
            console.warn(`⚠️ Error cleaning up listener ${name}:`, error);
        }
    });
    
    GLOBAL_LISTENERS.firebase = [];
}

/**
 * Register component cleanup function
 */
function registerComponentCleanup(componentName, cleanupFn) {
    if (typeof cleanupFn === 'function') {
        GLOBAL_LISTENERS.components[componentName] = cleanupFn;
        console.log(`📝 Registered component cleanup: ${componentName}`);
    }
}

/**
 * Clean up specific component
 */
function cleanupComponent(componentName) {
    const cleanupFn = GLOBAL_LISTENERS.components[componentName];
    if (cleanupFn) {
        try {
            cleanupFn();
            console.log(`✅ Cleaned up component: ${componentName}`);
        } catch (error) {
            console.warn(`⚠️ Error cleaning up component ${componentName}:`, error);
        }
    }
}

/**
 * Clean up all components
 */
function cleanupAllComponents() {
    Object.keys(GLOBAL_LISTENERS.components).forEach(componentName => {
        cleanupComponent(componentName);
    });
    GLOBAL_LISTENERS.components = {};
}

/**
 * Global cleanup function - call on logout or app reset
 */
function globalCleanup() {
    console.log("🧹 Performing global cleanup...");
    cleanupAllFirebaseListeners();
    cleanupAllComponents();
    
    // Clear any global data
    window.availableMaterials = null;
    window.availableMasterbatches = null;
    window.allUserEntries = null;
    window.allAdminEntries = null;
    window.allUsers = null;
    
    console.log("✅ Global cleanup completed");
}

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

// Global cleanup functions
window.registerFirebaseListener = registerFirebaseListener;
window.cleanupAllFirebaseListeners = cleanupAllFirebaseListeners;
window.registerComponentCleanup = registerComponentCleanup;
window.cleanupComponent = cleanupComponent;
window.globalCleanup = globalCleanup;
