// ==================== AUTHENTIFIZIERUNG ====================
// Vereinfachtes Login/Logout System für PelletTrackr

// Login als Benutzer (einfach)
async function loginAsUser() {
    try {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        
        if (!email || !password) {
            safeShowToast('Bitte E-Mail und Passwort eingeben!', 'warning');
            return;
        }
        
        console.log('🔐 Login gestartet für:', email);
        
        if (typeof secureLoginWithEmail === 'function') {
            try {
                const result = await secureLoginWithEmail(email, password);
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
            await legacyLoginAsUser(email, password);
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Login:', error);
        safeShowToast('Fehler bei der Anmeldung', 'error');
    }
}

// Registriere neuen Benutzer
async function registerUser() {
    try {
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        
        if (!name || !email) {
            safeShowToast('Bitte Name und E-Mail-Adresse eingeben!', 'warning');
            return;
        }
        
        console.log('🆕 Benutzerregistrierung gestartet:', email);
        
        if (typeof registerNewUser === 'function') {
            try {
                const result = await registerNewUser(name, email);
                if (result.success) {
                    console.log('✅ Registrierung erfolgreich');
                    safeShowToast('Account erstellt! Bitte bestätigen Sie Ihre E-Mail-Adresse.', 'success');
                    hideAllSections();
                }
            } catch (error) {
                console.error('❌ Registrierung error:', error);
                safeShowToast('Fehler bei der Registrierung: ' + error.message, 'error');
            }
        } else {
            safeShowToast('Registrierung nicht verfügbar', 'error');
        }
        
    } catch (error) {
        console.error('❌ Fehler bei der Registrierung:', error);
        safeShowToast('Fehler bei der Registrierung', 'error');
    }
}

// Passwort zurücksetzen
async function resetUserPassword() {
    try {
        const email = document.getElementById('loginEmail').value.trim();
        
        if (!email) {
            safeShowToast('Bitte E-Mail-Adresse eingeben!', 'warning');
            return;
        }
        
        console.log('🔑 Passwort-Reset gestartet für:', email);
        
        if (typeof resetPasswordByEmail === 'function') {
            try {
                await resetPasswordByEmail(email);
                console.log('✅ Passwort-Reset erfolgreich');
                safeShowToast('Passwort-Reset E-Mail wurde gesendet.', 'success');
                hideAllSections();
            } catch (error) {
                console.error('❌ Passwort-Reset error:', error);
                safeShowToast('Fehler beim Passwort-Reset: ' + error.message, 'error');
            }
        } else {
            safeShowToast('Passwort-Reset nicht verfügbar', 'error');
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Passwort-Reset:', error);
        safeShowToast('Fehler beim Passwort-Reset', 'error');
    }
}

// Registrierung anzeigen
function showRegistration() {
    hideAllSections();
    const registrationSection = document.getElementById('registrationSection');
    if (registrationSection) {
        registrationSection.style.display = 'block';
    }
}

// Passwort-Reset anzeigen
function showPasswordReset() {
    hideAllSections();
    const passwordResetSection = document.getElementById('passwordResetSection');
    if (passwordResetSection) {
        passwordResetSection.style.display = 'block';
    }
}

// Alle Sektionen verstecken
function hideAllSections() {
    const sections = ['registrationSection', 'passwordResetSection'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
        }
    });
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

// Dashboard anzeigen (automatische Admin-Erkennung)
function showDashboard() {
    const loginScreen = document.getElementById('loginScreen');
    const userDashboard = document.getElementById('userDashboard');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (loginScreen) loginScreen.classList.remove('active');
    
    // Automatische Admin-Erkennung
    if (window.currentUser && window.currentUser.isAdmin) {
        console.log('👑 Admin-Dashboard wird angezeigt');
        if (userDashboard) userDashboard.classList.remove('active');
        if (adminDashboard) adminDashboard.classList.add('active');
    } else {
        console.log('👤 Benutzer-Dashboard wird angezeigt');
        if (userDashboard) userDashboard.classList.add('active');
        if (adminDashboard) adminDashboard.classList.remove('active');
    }
    
    // Benutzername anzeigen
    const userNameElement = document.getElementById('userName');
    if (userNameElement && window.currentUser) {
        userNameElement.textContent = window.currentUser.name || window.currentUser.displayName || 'Benutzer';
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
    
    // Alle Sektionen verstecken
    hideAllSections();
}

// Legacy-Funktionen (Fallback)
async function legacyLoginAsUser(email, password) {
    console.log('🔄 Verwende Legacy-Login für Benutzer');
    // Implementierung für Legacy-Login
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
window.registerUser = registerUser;
window.resetUserPassword = resetUserPassword;
window.showRegistration = showRegistration;
window.showPasswordReset = showPasswordReset;
window.logout = logout;
window.checkExistingSession = checkExistingSession;
window.showDashboard = showDashboard;
window.showAdminDashboard = showAdminDashboard;
window.showLoginScreen = showLoginScreen;
