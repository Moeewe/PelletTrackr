/**
 * Secure Authentication System
 * Firebase Auth mit E-Mail-Verifizierung und Admin-Rollen
 */

// Initialize secure authentication
function initializeSecureAuth() {
    try {
        console.log('🔐 Initialisiere Secure Auth...');
        
        if (!window.auth) {
            console.error('❌ Firebase Auth nicht verfügbar');
            return false;
        }
        
        // Set up auth state listener
        window.auth.onAuthStateChanged((user) => {
            console.log('🔍 Auth State Changed:', user ? 'User logged in' : 'No user');
            if (user) {
                handleAuthenticatedUser(user);
            } else {
                console.log('👤 Kein Benutzer angemeldet');
            }
        });
        
        console.log('✅ Secure Auth initialisiert');
        return true;
        
    } catch (error) {
        console.error('❌ Secure Auth Initialisierung fehlgeschlagen:', error);
        return false;
    }
}

// Handle authenticated user
async function handleAuthenticatedUser(user) {
    try {
        console.log('👤 Authentifizierter Benutzer:', user.email);
        
        // Check email verification
        if (!user.emailVerified) {
            console.log('⚠️ E-Mail noch nicht verifiziert');
            showEmailVerificationPrompt(user);
            return;
        }
        
        console.log('✅ E-Mail verifiziert, Benutzer vollständig authentifiziert');
        
        // Update user profile in Firestore
        await updateUserProfile(user, {
            emailVerified: true,
            lastLogin: new Date()
        });
        
        // Check admin status from custom claims
        const token = await user.getIdTokenResult();
        const isAdmin = token.claims?.admin === true;
        
        console.log('🔍 Admin-Status:', isAdmin);
        
        // Show appropriate dashboard
        if (isAdmin) {
            showAdminDashboard();
        } else {
            showUserDashboard();
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Verarbeiten des authentifizierten Benutzers:', error);
    }
}

// User registration
async function registerNewUser(kennung, name) {
    try {
        console.log('🆕 Registriere neuen Benutzer:', kennung);
        
        if (!isValidFHKennung(kennung)) {
            throw new Error('Ungültige FH-Kennung');
        }
        
        const email = `${kennung}@fh-muenster.de`;
        const password = generateSecurePassword(kennung);
        
        console.log('📧 Erstelle Account für:', email);
        
        // Create new user
        const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
        
        // Send email verification
        await userCredential.user.sendEmailVerification({
            url: window.location.origin,
            handleCodeInApp: true
        });
        
        // Update user profile
        await updateUserProfile(userCredential.user, {
            name,
            kennung: kennung.toLowerCase(),
            isAdmin: false,
            emailVerified: false,
            createdAt: new Date()
        });
        
        console.log('✅ Benutzer erfolgreich registriert');
        safeShowToast('Account erstellt! Bitte bestätigen Sie Ihre E-Mail-Adresse.', 'success');
        
        return { success: true, user: userCredential.user };
        
    } catch (error) {
        console.error('❌ Fehler bei Benutzerregistrierung:', error);
        
        if (error.code === 'auth/email-already-in-use') {
            throw new Error('E-Mail-Adresse bereits registriert. Bitte melden Sie sich an.');
        } else {
            throw error;
        }
    }
}

// Secure login with FH-Kennung
async function secureLoginWithKennung(kennung, name, isAdmin = false) {
    try {
        console.log('🔐 Sichere Anmeldung für:', kennung);
        
        if (!isValidFHKennung(kennung)) {
            throw new Error('Ungültige FH-Kennung');
        }
        
        const email = `${kennung}@fh-muenster.de`;
        const password = generateSecurePassword(kennung);
        
        console.log('📧 Versuche Login mit:', email);
        
        // Try to sign in
        const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
        console.log('✅ Login erfolgreich');
        
        // Update user profile
        await updateUserProfile(userCredential.user, {
            name,
            kennung: kennung.toLowerCase(),
            lastLogin: new Date()
        });
        
        // Check email verification
        if (!userCredential.user.emailVerified) {
            console.log('⚠️ E-Mail noch nicht verifiziert');
            showEmailVerificationPrompt(userCredential.user);
            return { success: false, needsVerification: true, user: userCredential.user };
        }
        
        console.log('✅ E-Mail verifiziert, Login vollständig');
        return { success: true, user: userCredential.user };
        
    } catch (error) {
        console.error('❌ Fehler bei sicherer Anmeldung:', error);
        
        if (error.code === 'auth/user-not-found') {
            throw new Error('Account nicht gefunden. Bitte registrieren Sie sich zuerst.');
        } else if (error.code === 'auth/wrong-password') {
            throw new Error('Falsches Passwort. Bitte überprüfen Sie Ihre Eingaben.');
        } else if (error.code === 'auth/invalid-login-credentials') {
            throw new Error('Ungültige Anmeldedaten. Bitte überprüfen Sie Ihre Eingaben.');
        } else {
            throw error;
        }
    }
}

// Password reset
async function resetPassword(kennung) {
    try {
        console.log('🔑 Passwort zurücksetzen für:', kennung);
        
        if (!isValidFHKennung(kennung)) {
            throw new Error('Ungültige FH-Kennung');
        }
        
        const email = `${kennung}@fh-muenster.de`;
        
        // Send password reset email
        await window.auth.sendPasswordResetEmail(email, {
            url: window.location.origin
        });
        
        console.log('📧 Passwort-Reset E-Mail gesendet');
        safeShowToast('Passwort-Reset E-Mail wurde gesendet. Bitte prüfen Sie Ihren Posteingang.', 'success');
        
    } catch (error) {
        console.error('❌ Fehler beim Passwort-Reset:', error);
        
        if (error.code === 'auth/user-not-found') {
            throw new Error('Account nicht gefunden. Bitte registrieren Sie sich zuerst.');
        } else {
            throw error;
        }
    }
}

// Admin authentication (secure)
async function secureAdminLogin(kennung, name, adminPassword) {
    try {
        console.log('🔐 Sichere Admin-Anmeldung für:', kennung);
        
        // Verify admin password (this should be done server-side in production)
        const correctAdminPassword = 'fgf2025admin';
        if (adminPassword !== correctAdminPassword) {
            throw new Error('Ungültiges Admin-Passwort');
        }
        
        // First, login as regular user
        const loginResult = await secureLoginWithKennung(kennung, name, false);
        
        if (!loginResult.success) {
            return loginResult;
        }
        
        // Set admin custom claim (this should be done server-side)
        const user = loginResult.user;
        await setAdminClaim(user.uid);
        
        console.log('✅ Admin-Login erfolgreich');
        return { success: true, user: user, isAdmin: true };
        
    } catch (error) {
        console.error('❌ Fehler bei Admin-Login:', error);
        throw error;
    }
}

// Set admin claim (this should be done server-side)
async function setAdminClaim(uid) {
    try {
        // In production, this should be done via Cloud Functions
        // For now, we'll use a simple approach
        console.log('🔧 Setze Admin-Status für:', uid);
        
        // Update user profile with admin flag
        await updateUserProfile({ uid }, {
            isAdmin: true,
            adminGrantedAt: new Date()
        });
        
    } catch (error) {
        console.error('❌ Fehler beim Setzen des Admin-Status:', error);
    }
}

// Validate FH-Kennung format
function isValidFHKennung(kennung) {
    if (!kennung || typeof kennung !== 'string') {
        return false;
    }
    
    // Remove spaces and convert to lowercase
    const cleanKennung = kennung.trim().toLowerCase();
    
    // Check format: 2-3 letters + 6 digits (e.g., mw202350)
    const kennungPattern = /^[a-z]{2,3}\d{6}$/;
    
    return kennungPattern.test(cleanKennung);
}

// Generate secure password from kennung
function generateSecurePassword(kennung) {
    const cleanKennung = kennung.trim().toLowerCase();
    return `FGF_${cleanKennung}_2025!`;
}

// Update user profile in Firestore
async function updateUserProfile(user, additionalData = {}) {
    try {
        if (!window.db) {
            console.error('❌ Firestore nicht verfügbar');
            return;
        }
        
        const userData = {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            lastUpdated: new Date(),
            ...additionalData
        };
        
        await window.db.collection('users').doc(user.uid).set(userData, { merge: true });
        console.log('✅ Benutzerprofil aktualisiert');
        
    } catch (error) {
        console.error('❌ Fehler beim Aktualisieren des Benutzerprofils:', error);
    }
}

// Show email verification prompt
function showEmailVerificationPrompt(user) {
    console.log('📧 Zeige E-Mail-Verifizierung...');
    
    // Create verification modal
    const modal = document.getElementById('modal');
    if (modal) {
        modal.innerHTML = `
            <div class="modal-content">
                <h2>E-Mail-Verifizierung erforderlich</h2>
                <p>Bitte bestätigen Sie Ihre E-Mail-Adresse: <strong>${user.email}</strong></p>
                <p>Prüfen Sie Ihren Posteingang und klicken Sie auf den Bestätigungslink.</p>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="resendVerificationEmail()">E-Mail erneut senden</button>
                    <button class="btn btn-secondary" onclick="checkEmailVerification()">Verifizierung prüfen</button>
                    <button class="btn btn-danger" onclick="logoutAndReturnToLogin()">Abbrechen</button>
                </div>
            </div>
        `;
        modal.classList.add('active');
    }
}

// Resend verification email
async function resendVerificationEmail() {
    try {
        const user = window.auth.currentUser;
        if (!user) {
            throw new Error('Kein Benutzer angemeldet');
        }
        
        await user.sendEmailVerification({
            url: window.location.origin,
            handleCodeInApp: true
        });
        
        console.log('📧 E-Mail-Verifizierung erneut gesendet');
        safeShowToast('E-Mail-Verifizierung wurde erneut gesendet', 'success');
        
    } catch (error) {
        console.error('❌ Fehler beim erneuten Senden der E-Mail:', error);
        safeShowToast('Fehler beim Senden der E-Mail: ' + error.message, 'error');
    }
}

// Check email verification
async function checkEmailVerification() {
    try {
        const user = window.auth.currentUser;
        if (!user) {
            throw new Error('Kein Benutzer angemeldet');
        }
        
        // Reload user to get latest email verification status
        await user.reload();
        
        if (user.emailVerified) {
            console.log('✅ E-Mail verifiziert');
            safeShowToast('E-Mail erfolgreich verifiziert!', 'success');
            
            // Close modal and proceed
            const modal = document.getElementById('modal');
            if (modal) {
                modal.classList.remove('active');
            }
            
            // Handle authenticated user
            handleAuthenticatedUser(user);
            
        } else {
            console.log('⚠️ E-Mail noch nicht verifiziert');
            safeShowToast('E-Mail noch nicht verifiziert. Bitte prüfen Sie Ihren Posteingang.', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Prüfen der E-Mail-Verifizierung:', error);
        safeShowToast('Fehler beim Prüfen der Verifizierung: ' + error.message, 'error');
    }
}

// Logout and return to login
function logoutAndReturnToLogin() {
    try {
        window.auth.signOut();
        console.log('👋 Benutzer abgemeldet');
        
        // Close modal
        const modal = document.getElementById('modal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        // Show login screen
        showLoginScreen();
        
    } catch (error) {
        console.error('❌ Fehler beim Abmelden:', error);
    }
}

// Show login screen
function showLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const userDashboard = document.getElementById('userDashboard');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (loginScreen) loginScreen.classList.add('active');
    if (userDashboard) userDashboard.classList.remove('active');
    if (adminDashboard) adminDashboard.classList.remove('active');
}

// Show user dashboard
function showUserDashboard() {
    const loginScreen = document.getElementById('loginScreen');
    const userDashboard = document.getElementById('userDashboard');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (loginScreen) loginScreen.classList.remove('active');
    if (userDashboard) userDashboard.classList.add('active');
    if (adminDashboard) adminDashboard.classList.remove('active');
}

// Show admin dashboard
function showAdminDashboard() {
    const loginScreen = document.getElementById('loginScreen');
    const userDashboard = document.getElementById('userDashboard');
    const adminDashboard = document.getElementById('adminDashboard');
    
    if (loginScreen) loginScreen.classList.remove('active');
    if (userDashboard) userDashboard.classList.remove('active');
    if (adminDashboard) adminDashboard.classList.add('active');
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
window.initializeSecureAuth = initializeSecureAuth;
window.secureLoginWithKennung = secureLoginWithKennung;
window.registerNewUser = registerNewUser;
window.resetPassword = resetPassword;
window.secureAdminLogin = secureAdminLogin;
window.resendVerificationEmail = resendVerificationEmail;
window.checkEmailVerification = checkEmailVerification;
window.logoutAndReturnToLogin = logoutAndReturnToLogin; 