// ==================== SICHERE AUTHENTIFIZIERUNG ====================
// Firebase Authentication mit E-Mail-Verifizierung

let auth = null;
let currentFirebaseUser = null;

// Firebase Auth initialisieren
function initializeSecureAuth() {
    try {
        console.log('🔐 Initialisiere sichere Authentifizierung...');
        
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase SDK nicht verfügbar');
            return false;
        }
        
        auth = firebase.auth();
        
        // Auth State Listener
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('✅ Benutzer authentifiziert:', user.email);
                currentFirebaseUser = user;
                handleAuthenticatedUser(user);
            } else {
                console.log('🔓 Benutzer nicht authentifiziert');
                currentFirebaseUser = null;
                handleUserLogout();
            }
        });
        
        console.log('✅ Sichere Authentifizierung initialisiert');
        return true;
        
    } catch (error) {
        console.error('❌ Fehler bei Auth-Initialisierung:', error);
        return false;
    }
}

// Sichere Login-Funktion mit E-Mail-Verifizierung
async function secureLoginWithKennung(kennung, name, isAdmin = false) {
    try {
        console.log('🔐 Sichere Anmeldung für:', kennung);
        
        // 1. FH-Kennung validieren
        if (!isValidFHKennung(kennung)) {
            throw new Error('Ungültige FH-Kennung');
        }
        
        // 2. E-Mail-Adresse erstellen
        const email = `${kennung}@fh-muenster.de`;
        const password = generateSecurePassword(kennung);
        
        let userCredential;
        
        // 3. Versuche Login oder erstelle neuen Benutzer
        try {
            userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log('✅ Login erfolgreich');
        } catch (loginError) {
            if (loginError.code === 'auth/user-not-found') {
                console.log('🆕 Benutzer nicht gefunden, erstelle neuen Account...');
                userCredential = await auth.createUserWithEmailAndPassword(email, password);
                
                // E-Mail-Verifizierung senden
                await userCredential.user.sendEmailVerification({
                    url: window.location.origin,
                    handleCodeInApp: true
                });
                
                console.log('📧 E-Mail-Verifizierung gesendet');
            } else {
                throw loginError;
            }
        }
        
        // 4. Benutzerprofil in Firestore aktualisieren
        await updateUserProfile(userCredential.user, {
            name,
            kennung: kennung.toLowerCase(),
            isAdmin,
            emailVerified: userCredential.user.emailVerified
        });
        
        // 5. Prüfe E-Mail-Verifizierung
        if (!userCredential.user.emailVerified) {
            console.log('⚠️ E-Mail noch nicht verifiziert');
            showEmailVerificationPrompt(userCredential.user);
            return { success: false, needsVerification: true, user: userCredential.user };
        }
        
        console.log('✅ E-Mail verifiziert, Login vollständig');
        return { success: true, user: userCredential.user };
        
    } catch (error) {
        console.error('❌ Fehler bei sicherer Anmeldung:', error);
        throw error;
    }
}

// E-Mail-Verifizierung prüfen und UI anzeigen
function showEmailVerificationPrompt(user) {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>E-Mail-Verifizierung erforderlich</h2>
                </div>
                <div class="modal-body">
                    <div class="verification-message">
                        <p>📧 Eine E-Mail wurde an <strong>${user.email}</strong> gesendet.</p>
                        <p>Bitte bestätigen Sie Ihre E-Mail-Adresse, um Zugang zum System zu erhalten.</p>
                        
                        <div class="verification-actions">
                            <button class="btn btn-primary" onclick="resendVerificationEmail()">
                                E-Mail erneut senden
                            </button>
                            <button class="btn btn-secondary" onclick="checkEmailVerification()">
                                Verifizierung prüfen
                            </button>
                            <button class="btn btn-danger" onclick="logoutAndReturnToLogin()">
                                Abbrechen
                            </button>
                        </div>
                        
                        <div class="verification-tips">
                            <h4>Hinweise:</h4>
                            <ul>
                                <li>Prüfen Sie Ihren Spam-Ordner</li>
                                <li>E-Mail-Adresse: ${user.email}</li>
                                <li>Absender: noreply@fgf-muenster.de</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }
}

// E-Mail-Verifizierung erneut senden
async function resendVerificationEmail() {
    try {
        if (currentFirebaseUser) {
            await currentFirebaseUser.sendEmailVerification({
                url: window.location.origin,
                handleCodeInApp: true
            });
            safeShowToast('E-Mail-Verifizierung erneut gesendet', 'success');
        }
    } catch (error) {
        console.error('❌ Fehler beim erneuten Senden:', error);
        safeShowToast('Fehler beim Senden der E-Mail', 'error');
    }
}

// E-Mail-Verifizierung prüfen
async function checkEmailVerification() {
    try {
        if (currentFirebaseUser) {
            // Token aktualisieren
            await currentFirebaseUser.reload();
            
            if (currentFirebaseUser.emailVerified) {
                console.log('✅ E-Mail verifiziert!');
                safeShowToast('E-Mail erfolgreich verifiziert!', 'success');
                
                // Modal schließen und Dashboard anzeigen
                closeModal();
                showDashboard();
            } else {
                safeShowToast('E-Mail noch nicht verifiziert. Bitte prüfen Sie Ihr Postfach.', 'warning');
            }
        }
    } catch (error) {
        console.error('❌ Fehler beim Prüfen der Verifizierung:', error);
        safeShowToast('Fehler beim Prüfen der Verifizierung', 'error');
    }
}

// Logout und zurück zum Login
function logoutAndReturnToLogin() {
    auth.signOut().then(() => {
        closeModal();
        showScreen('loginScreen');
        safeShowToast('Anmeldung abgebrochen', 'info');
    });
}

// Authentifizierten Benutzer verarbeiten
async function handleAuthenticatedUser(user) {
    try {
        console.log('👤 Verarbeite authentifizierten Benutzer:', user.email);
        
        // Prüfe E-Mail-Verifizierung
        if (!user.emailVerified) {
            console.log('⚠️ E-Mail nicht verifiziert, zeige Verifizierungs-Prompt');
            showEmailVerificationPrompt(user);
            return;
        }
        
        // Lade Benutzerprofil
        const profile = await getUserProfile(user.uid);
        
        // Globale Benutzerdaten setzen
        window.currentUser = {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            ...profile
        };
        
        console.log('✅ Benutzer vollständig authentifiziert:', window.currentUser);
        
        // Dashboard anzeigen
        showDashboard();
        
    } catch (error) {
        console.error('❌ Fehler bei Benutzerverarbeitung:', error);
        safeShowToast('Fehler beim Laden des Benutzerprofils', 'error');
    }
}

// Benutzer-Logout verarbeiten
function handleUserLogout() {
    console.log('🔓 Benutzer-Logout verarbeitet');
    
    // Globale Daten zurücksetzen
    window.currentUser = null;
    currentFirebaseUser = null;
    
    // Login-Screen anzeigen
    showScreen('loginScreen');
}

// Hilfsfunktionen
function isValidFHKennung(kennung) {
    return /^[a-z]{2}\d{6}$/.test(kennung.toLowerCase());
}

function generateSecurePassword(kennung) {
    // Generiere sicheres Passwort basierend auf FH-Kennung
    const hash = btoa(kennung + 'PelletTrackr2025').replace(/[^a-zA-Z0-9]/g, '');
    return hash.substring(0, 12) + '!';
}

function getSecureAdminPassword() {
    return 'fgf2025admin';
}

// Benutzerprofil in Firestore aktualisieren
async function updateUserProfile(firebaseUser, userData) {
    try {
        const userRef = window.db.collection('users').doc(firebaseUser.uid);
        
        await userRef.set({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...userData
        }, { merge: true });
        
        console.log('✅ Benutzerprofil aktualisiert');
        
    } catch (error) {
        console.error('❌ Fehler beim Aktualisieren des Benutzerprofils:', error);
        throw error;
    }
}

// Benutzerprofil aus Firestore laden
async function getUserProfile(uid) {
    try {
        const doc = await window.db.collection('users').doc(uid).get();
        
        if (doc.exists) {
            return doc.data();
        } else {
            console.warn('⚠️ Benutzerprofil nicht gefunden:', uid);
            return null;
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Laden des Benutzerprofils:', error);
        return null;
    }
}

// Sichere Admin-Login-Funktion
async function secureAdminLogin(kennung, name, adminPassword) {
    try {
        console.log('🔐 Sichere Admin-Anmeldung für:', kennung);
        
        // Admin-Passwort prüfen
        if (adminPassword !== getSecureAdminPassword()) {
            throw new Error('Ungültiges Admin-Passwort');
        }
        
        // Normale Login-Funktion mit Admin-Flag
        return await secureLoginWithKennung(kennung, name, true);
        
    } catch (error) {
        console.error('❌ Fehler bei Admin-Login:', error);
        throw error;
    }
}

// ===== GLOBALE EXPORTS =====

window.initializeSecureAuth = initializeSecureAuth;
window.secureLoginWithKennung = secureLoginWithKennung;
window.secureAdminLogin = secureAdminLogin;
window.resendVerificationEmail = resendVerificationEmail;
window.checkEmailVerification = checkEmailVerification;
window.logoutAndReturnToLogin = logoutAndReturnToLogin; 