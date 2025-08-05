// ==================== AUTHENTIFIZIERUNG ====================
// Login/Logout Management mit E-Mail-Verifizierung

// Session-Management
function checkExistingSession() {
    try {
        const session = localStorage.getItem('userSession');
        if (session) {
            const userData = JSON.parse(session);
            const now = new Date().getTime();
            
            // Session ist 30 Minuten gültig
            if (now - userData.timestamp < 30 * 60 * 1000) {
                window.currentUser = userData.user;
                console.log('✅ Bestehende Session gefunden');
                return true;
            } else {
                localStorage.removeItem('userSession');
                console.log('⏰ Session abgelaufen');
            }
        }
        return false;
    } catch (error) {
        console.error('❌ Fehler beim Prüfen der Session:', error);
        return false;
    }
}

function saveSession(userData) {
    try {
        const session = {
            user: userData,
            timestamp: new Date().getTime()
        };
        localStorage.setItem('userSession', JSON.stringify(session));
        console.log('💾 Session gespeichert');
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Session:', error);
    }
}

// Login-Funktionen mit E-Mail-Verifizierung
async function loginAsUser() {
    try {
        const name = document.getElementById('loginName').value.trim();
        const kennung = document.getElementById('loginKennung').value.trim();
        
        if (!name || !kennung) {
            safeShowToast('Bitte Name und FH-Kennung eingeben!', 'warning');
            return;
        }
        
        console.log('🔐 Benutzer-Login gestartet:', kennung);
        
        // Verwende sichere Authentifizierung falls verfügbar
        if (typeof secureLoginWithKennung === 'function') {
            try {
                const result = await secureLoginWithKennung(kennung, name, false);
                
                if (result.success) {
                    console.log('✅ Login erfolgreich');
                    window.currentUser = result.user;
                    saveSession(result.user);
                    showDashboard();
                } else if (result.needsVerification) {
                    console.log('📧 E-Mail-Verifizierung erforderlich');
                    // Verifizierungs-Prompt wird bereits angezeigt
                } else {
                    safeShowToast('Anmeldung fehlgeschlagen', 'error');
                }
                
            } catch (error) {
                console.error('❌ Login error:', error);
                safeShowToast('Fehler bei der Anmeldung: ' + error.message, 'error');
            }
        } else {
            // Fallback zu Legacy-Login
            console.log('⚠️ Verwende Legacy-Login');
            await legacyLoginAsUser(name, kennung);
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Benutzer-Login:', error);
        safeShowToast('Fehler bei der Anmeldung', 'error');
    }
}

async function loginAsAdmin() {
    try {
        const name = document.getElementById('loginName').value.trim();
        const kennung = document.getElementById('loginKennung').value.trim();
        const adminPassword = document.getElementById('adminPassword').value.trim();
        
        if (!name || !kennung || !adminPassword) {
            safeShowToast('Bitte alle Felder ausfüllen!', 'warning');
            return;
        }
        
        console.log('🔐 Admin-Login gestartet:', kennung);
        
        // Verwende sichere Authentifizierung falls verfügbar
        if (typeof secureAdminLogin === 'function') {
            try {
                const result = await secureAdminLogin(kennung, name, adminPassword);
                
                if (result.success) {
                    console.log('✅ Admin-Login erfolgreich');
                    window.currentUser = { ...result.user, isAdmin: true };
                    saveSession(window.currentUser);
                    showAdminDashboard();
                } else if (result.needsVerification) {
                    console.log('📧 E-Mail-Verifizierung erforderlich');
                    // Verifizierungs-Prompt wird bereits angezeigt
                } else {
                    safeShowToast('Admin-Anmeldung fehlgeschlagen', 'error');
                }
                
            } catch (error) {
                console.error('❌ Admin login error:', error);
                safeShowToast('Fehler bei der Admin-Anmeldung: ' + error.message, 'error');
            }
        } else {
            // Fallback zu Legacy-Admin-Login
            console.log('⚠️ Verwende Legacy-Admin-Login');
            await legacyLoginAsAdmin(name, kennung, adminPassword);
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Admin-Login:', error);
        safeShowToast('Fehler bei der Admin-Anmeldung', 'error');
    }
}

// Legacy-Funktionen (Fallback)
async function legacyLoginAsUser(name, kennung) {
    try {
        console.log('🔄 Legacy Benutzer-Login:', kennung);
        
        // Prüfe ob Benutzer existiert
        const existingUser = await checkExistingKennung(kennung);
        
        if (existingUser) {
            // Aktualisiere bestehenden Benutzer
            await updateExistingUser(existingUser.id, { name });
            window.currentUser = { ...existingUser, name };
        } else {
            // Erstelle neuen Benutzer
            const newUser = await createNewUser(name, kennung);
            window.currentUser = newUser;
        }
        
        saveSession(window.currentUser);
        showDashboard();
        
    } catch (error) {
        console.error('❌ Legacy Login error:', error);
        safeShowToast('Fehler bei der Anmeldung', 'error');
    }
}

async function legacyLoginAsAdmin(name, kennung, adminPassword) {
    try {
        console.log('🔄 Legacy Admin-Login:', kennung);
        
        // Prüfe Admin-Passwort
        if (adminPassword !== window.ADMIN_PASSWORD) {
            safeShowToast('Ungültiges Admin-Passwort!', 'error');
            return;
        }
        
        // Prüfe ob Admin existiert
        const existingUser = await checkExistingKennung(kennung);
        
        if (existingUser) {
            // Aktualisiere bestehenden Admin
            await updateExistingUser(existingUser.id, { name, isAdmin: true });
            window.currentUser = { ...existingUser, name, isAdmin: true };
        } else {
            // Erstelle neuen Admin
            const newAdmin = await createNewUser(name, kennung, true);
            window.currentUser = newAdmin;
        }
        
        saveSession(window.currentUser);
        showAdminDashboard();
        
    } catch (error) {
        console.error('❌ Legacy Admin login error:', error);
        safeShowToast('Fehler bei der Admin-Anmeldung', 'error');
    }
}

// Admin-UI anzeigen
function showAdminLogin() {
    const adminLoginSection = document.getElementById('adminLoginSection');
    if (adminLoginSection) {
        adminLoginSection.style.display = 'block';
        document.getElementById('adminPassword').focus();
    }
}

// Logout-Funktion
function logout() {
    try {
        console.log('🔓 Logout gestartet');
        
        // Firebase Auth Logout falls verfügbar
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().then(() => {
                console.log('✅ Firebase Auth Logout erfolgreich');
            }).catch((error) => {
                console.error('❌ Firebase Auth Logout error:', error);
            });
        }
        
        // Session löschen
        localStorage.removeItem('userSession');
        window.currentUser = null;
        
        // UI zurücksetzen
        showScreen('loginScreen');
        
        console.log('✅ Logout erfolgreich');
        
    } catch (error) {
        console.error('❌ Fehler beim Logout:', error);
    }
}

// Hilfsfunktionen
async function checkExistingKennung(kennung) {
    try {
        const snapshot = await window.db.collection('users')
            .where('kennung', '==', kennung.toLowerCase())
            .limit(1)
            .get();
            
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error('❌ Fehler beim Prüfen der FH-Kennung:', error);
        return null;
    }
}

async function createNewUser(name, kennung, isAdmin = false) {
    try {
        const userData = {
            name,
            kennung: kennung.toLowerCase(),
            isAdmin,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const docRef = await window.db.collection('users').add(userData);
        return { id: docRef.id, ...userData };
        
    } catch (error) {
        console.error('❌ Fehler beim Erstellen des Benutzers:', error);
        throw error;
    }
}

async function updateExistingUser(userId, updates) {
    try {
        await window.db.collection('users').doc(userId).update({
            ...updates,
            updatedAt: new Date()
        });
    } catch (error) {
        console.error('❌ Fehler beim Aktualisieren des Benutzers:', error);
        throw error;
    }
}

// Safe Toast-Funktion
function safeShowToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else if (window.toast && typeof window.toast[type] === 'function') {
        window.toast[type](message);
    } else {
        console.log(`Toast (${type}): ${message}`);
    }
}

// ===== GLOBALE EXPORTS =====

window.loginAsUser = loginAsUser;
window.loginAsAdmin = loginAsAdmin;
window.showAdminLogin = showAdminLogin;
window.logout = logout;
