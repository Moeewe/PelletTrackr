// ==================== APP INITIALISIERUNG ====================
// Zentrale Initialisierung für PelletTrackr

// Global variables
let currentUser = null;
let isAdmin = false;
let isInitialized = false;

// Initialize Firebase first
function initializeFirebaseFirst() {
    try {
        console.log('🔧 Initialisiere Firebase zuerst...');
        
        // Check if Firebase SDK is available
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase SDK nicht verfügbar');
            return false;
        }
        
        // Initialize Firebase if not already done
        if (firebase.apps.length === 0) {
            console.log('🔄 Initialisiere Firebase App "FGF-3D-Druck"...');
            firebase.initializeApp({
                apiKey: "AIzaSyBaaMwmjxyytxHLinmigccF30-1Wl0tzD0",
                authDomain: "fgf-3d-druck.firebaseapp.com",
                databaseURL: "https://fgf-3d-druck-default-rtdb.europe-west1.firebasedatabase.app",
                projectId: "fgf-3d-druck",
                storageBucket: "fgf-3d-druck.firebasestorage.app",
                messagingSenderId: "37190466890",
                appId: "1:37190466890:web:cfb25f3c2f6bb62006d5b3"
            }, "FGF-3D-Druck");
            console.log('✅ Firebase App "FGF-3D-Druck" initialisiert');
        } else {
            console.log('⚠️ Firebase App bereits initialisiert');
        }
        
        // Get the correct Firebase app instance
        const firebaseApp = firebase.app("FGF-3D-Druck");
        
        // Initialize Firestore with the correct app
        const db = firebaseApp.firestore();
        window.db = db;
        
        // Initialize Auth with the correct app
        const auth = firebaseApp.auth();
        window.auth = auth;
        
        console.log('✅ Firebase "FGF-3D-Druck" vollständig initialisiert');
        return true;
        
    } catch (error) {
        console.error('❌ Firebase-Initialisierung fehlgeschlagen:', error);
        return false;
    }
}

// Test Firebase connection
async function testFirebaseConnection() {
    try {
        console.log('🔍 Teste Firebase-Verbindung...');
        
        if (!window.db) {
            console.error('❌ Firestore nicht verfügbar');
            return false;
        }
        
        // Test read operation
        const testDoc = await window.db.collection('test').limit(1).get();
        console.log('✅ Firebase-Verbindung erfolgreich');
        return true;
        
    } catch (error) {
        console.error('❌ Firebase-Verbindung fehlgeschlagen:', error);
        return false;
    }
}

// Initialize app
async function initializeApp() {
    try {
        console.log('🚀 Starte PelletTrackr-Initialisierung...');
        
        // Show loading indicator
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'flex';
        }
        
        // Initialize Firebase first
        if (!initializeFirebaseFirst()) {
            throw new Error('Firebase-Initialisierung fehlgeschlagen');
        }
        
        // Test connection
        const connectionOk = await testFirebaseConnection();
        if (!connectionOk) {
            console.warn('⚠️ Firebase-Verbindung nicht optimal, aber App wird fortgesetzt');
        }
        
        // Initialize other modules
        console.log('🔧 Initialisiere Module...');
        
        // Initialize auth system
        if (typeof initializeSecureAuth === 'function') {
            console.log('🔐 Initialisiere Secure Auth...');
            initializeSecureAuth();
        }
        
        // Initialize equipment system
        if (typeof setupEquipmentListener === 'function') {
            console.log('🔧 Initialisiere Equipment System...');
            setupEquipmentListener();
        }
        
        // Initialize other listeners
        console.log('📡 Initialisiere Listener...');
        
        // Check existing session
        if (typeof checkExistingSession === 'function') {
            console.log('🔍 Prüfe bestehende Session...');
            await checkExistingSession();
        }
        
        // Hide loading indicator
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        console.log('✅ PelletTrackr erfolgreich initialisiert');
        isInitialized = true;
        
    } catch (error) {
        console.error('❌ App-Initialisierung fehlgeschlagen:', error);
        
        // Hide loading indicator on error
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        // Show error message
        if (typeof safeShowToast === 'function') {
            safeShowToast('App-Initialisierung fehlgeschlagen: ' + error.message, 'error');
        }
    }
}

// Safe showToast function
function safeShowToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else if (window.toast && typeof window.toast[type] === 'function') {
        window.toast[type](message);
    } else {
        console.log(`Toast (${type}): ${message}`);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM geladen, starte Initialisierung...');
    initializeApp();
});

// Global exports
window.initializeApp = initializeApp;
window.testFirebaseConnection = testFirebaseConnection;
window.safeShowToast = safeShowToast;
