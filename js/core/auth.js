// ==================== AUTHENTIFIZIERUNG ====================
// Login/Logout System für PelletTrackr

// Login als normaler Benutzer
async function loginAsUser() {
    try {
        const name = document.getElementById('loginName').value.trim();
        const kennung = document.getElementById('loginKennung').value.trim();
        
        if (!name || !kennung) {
            safeShowToast('Bitte Name und FH-Kennung eingeben!', 'warning');
            return;
        }
        
        console.log('🔐 Benutzer-Login gestartet:', kennung);
        
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
                } else {
                    safeShowToast('Anmeldung fehlgeschlagen', 'error');
                }
            } catch (error) {
                console.error('❌ Login error:', error);
                safeShowToast('Fehler bei der Anmeldung: ' + error.message, 'error');
            }
        } else {
            console.log('⚠️ Verwende Legacy-Login');
            await legacyLoginAsUser(name, kennung);
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Benutzer-Login:', error);
        safeShowToast('Fehler bei der Anmeldung', 'error');
    }
}

// Login als Admin
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
        
        if (typeof secureAdminLogin === 'function') {
            try {
                const result = await secureAdminLogin(kennung, name, adminPassword);
                if (result.success) {
                    console.log('✅ Admin-Login erfolgreich');
                    window.currentUser = result.user;
                    saveSession(result.user);
                    showAdminDashboard();
                } else if (result.needsVerification) {
                    console.log('📧 E-Mail-Verifizierung erforderlich');
                } else {
                    safeShowToast('Admin-Anmeldung fehlgeschlagen', 'error');
                }
            } catch (error) {
                console.error('❌ Admin login error:', error);
                safeShowToast('Fehler bei der Admin-Anmeldung: ' + error.message, 'error');
            }
        } else {
            console.log('⚠️ Verwende Legacy-Admin-Login');
            await legacyLoginAsAdmin(name, kennung, adminPassword);
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Admin-Login:', error);
        safeShowToast('Fehler bei der Admin-Anmeldung', 'error');
    }
}

// Admin-Login anzeigen
function showAdminLogin() {
    const adminSection = document.getElementById('adminLoginSection');
    if (adminSection) {
        adminSection.style.display = 'block';
    }
}

// Session speichern
function saveSession(user) {
    try {
        const sessionData = {
            uid: user.uid,
            email: user.email,
            name: user.displayName || user.name,
            isAdmin: user.isAdmin || false,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('pelletTrackrSession', JSON.stringify(sessionData));
        console.log('💾 Session gespeichert');
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Session:', error);
    }
}

// Bestehende Session prüfen
async function checkExistingSession() {
    try {
        const sessionData = localStorage.getItem('pelletTrackrSession');
        if (!sessionData) {
            console.log('🔍 Keine bestehende Session gefunden');
            return false;
        }
        
        const session = JSON.parse(sessionData);
        const sessionAge = Date.now() - new Date(session.timestamp).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 Stunden
        
        if (sessionAge > maxAge) {
            console.log('⏰ Session abgelaufen');
            localStorage.removeItem('pelletTrackrSession');
            return false;
        }
        
        console.log('✅ Gültige Session gefunden:', session.name);
        window.currentUser = session;
        
        if (session.isAdmin) {
            showAdminDashboard();
        } else {
            showDashboard();
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Fehler beim Prüfen der Session:', error);
        return false;
    }
}

// Logout
function logout() {
    try {
        // Firebase Auth Logout
        if (window.auth && typeof window.auth.signOut === 'function') {
            window.auth.signOut();
        }
        
        // Session löschen
        localStorage.removeItem('pelletTrackrSession');
        window.currentUser = null;
        
        console.log('👋 Benutzer abgemeldet');
        
        // Zurück zum Login
        showLoginScreen();
        
    } catch (error) {
        console.error('❌ Fehler beim Logout:', error);
    }
}

// Dashboard anzeigen
function showDashboard() {
    const loginScreen = document.getElementById('loginScreen');
    const userDashboard = document.getElementById('userDashboard');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (loginScreen) loginScreen.classList.remove('active');
    if (userDashboard) userDashboard.classList.add('active');
    if (adminDashboard) adminDashboard.classList.remove('active');
    
    // Benutzername anzeigen
    const userNameElement = document.getElementById('userName');
    if (userNameElement && window.currentUser) {
        userNameElement.textContent = window.currentUser.name || 'Benutzer';
    }
}

// Admin-Dashboard anzeigen
function showAdminDashboard() {
    const loginScreen = document.getElementById('loginScreen');
    const userDashboard = document.getElementById('userDashboard');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (loginScreen) loginScreen.classList.remove('active');
    if (userDashboard) userDashboard.classList.remove('active');
    if (adminDashboard) adminDashboard.classList.add('active');
}

// Login-Screen anzeigen
function showLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const userDashboard = document.getElementById('userDashboard');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (loginScreen) loginScreen.classList.add('active');
    if (userDashboard) userDashboard.classList.remove('active');
    if (adminDashboard) adminDashboard.classList.remove('active');
    
    // Form zurücksetzen
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.reset();
    }
    
    // Admin-Sektion verstecken
    const adminSection = document.getElementById('adminLoginSection');
    if (adminSection) {
        adminSection.style.display = 'none';
    }
}

// Legacy-Funktionen (Fallback)
async function legacyLoginAsUser(name, kennung) {
    console.log('🔄 Verwende Legacy-Login für Benutzer');
    // Implementierung für Legacy-Login
}

async function legacyLoginAsAdmin(name, kennung, adminPassword) {
    console.log('🔄 Verwende Legacy-Login für Admin');
    // Implementierung für Legacy-Admin-Login
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

// Global exports
window.loginAsUser = loginAsUser;
window.loginAsAdmin = loginAsAdmin;
window.showAdminLogin = showAdminLogin;
window.logout = logout;
window.checkExistingSession = checkExistingSession;
window.showDashboard = showDashboard;
window.showAdminDashboard = showAdminDashboard;
window.showLoginScreen = showLoginScreen;
