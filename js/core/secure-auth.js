// ==================== SICHERE AUTHENTIFIZIERUNG ====================
// Firebase Authentication mit Rollen-basierter Zugriffskontrolle

// ===== FIREBASE AUTH CONFIGURATION =====

// Firebase Auth Instanz
let auth = null;
let currentUser = null;

// Initialisiere Firebase Auth
function initializeSecureAuth() {
  if (typeof firebase !== 'undefined' && firebase.auth) {
    auth = firebase.auth();
    console.log('🔐 Sichere Authentifizierung initialisiert');
    
    // Auth State Listener
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        console.log('✅ Benutzer authentifiziert:', user.email);
        await handleAuthenticatedUser(user);
      } else {
        console.log('❌ Benutzer abgemeldet');
        handleUserLogout();
      }
    });
    
    return true;
  } else {
    console.error('❌ Firebase Auth nicht verfügbar');
    return false;
  }
}

// ===== SICHERE LOGIN-FUNKTIONEN =====

// FH-Kennung-basierte Registrierung/Login
async function secureLoginWithKennung(kennung, name, isAdmin = false) {
  try {
    // 1. Validiere FH-Kennung
    if (!isValidFHKennung(kennung)) {
      throw new Error('Ungültige FH-Kennung');
    }
    
    // 2. Erstelle Firebase Auth Email
    const email = `${kennung}@fh-muenster.de`;
    
    // 3. Generiere sicheres Passwort basierend auf FH-Kennung
    const password = generateSecurePassword(kennung);
    
    // 4. Versuche Login/Registrierung
    let userCredential;
    
    try {
      // Versuche Login
      userCredential = await auth.signInWithEmailAndPassword(email, password);
      console.log('✅ Login erfolgreich');
    } catch (loginError) {
      if (loginError.code === 'auth/user-not-found') {
        // Benutzer existiert nicht - registriere
        userCredential = await auth.createUserWithEmailAndPassword(email, password);
        console.log('✅ Registrierung erfolgreich');
        
        // Sende E-Mail-Verifizierung
        await userCredential.user.sendEmailVerification();
        console.log('📧 E-Mail-Verifizierung gesendet');
      } else {
        throw loginError;
      }
    }
    
    // 5. Aktualisiere Benutzerdaten in Firestore
    await updateUserProfile(userCredential.user, {
      name: name,
      kennung: kennung.toLowerCase(),
      isAdmin: isAdmin,
      emailVerified: userCredential.user.emailVerified
    });
    
    return {
      success: true,
      user: userCredential.user,
      isNewUser: !userCredential.user.emailVerified
    };
    
  } catch (error) {
    console.error('❌ Login-Fehler:', error);
    throw error;
  }
}

// Admin-Login mit Passwort
async function secureAdminLogin(kennung, name, adminPassword) {
  try {
    // 1. Validiere Admin-Passwort
    if (adminPassword !== getSecureAdminPassword()) {
      throw new Error('Ungültiges Admin-Passwort');
    }
    
    // 2. Führe sicheren Login durch
    const result = await secureLoginWithKennung(kennung, name, true);
    
    // 3. Setze Admin-Status
    await updateUserProfile(result.user, { isAdmin: true });
    
    return result;
    
  } catch (error) {
    console.error('❌ Admin-Login-Fehler:', error);
    throw error;
  }
}

// ===== BENUTZERPROFIL-MANAGEMENT =====

// Aktualisiere Benutzerprofil in Firestore
async function updateUserProfile(firebaseUser, userData) {
  try {
    const userRef = window.db.collection('users').doc(firebaseUser.uid);
    
    const profileData = {
      ...userData,
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      lastLogin: new Date(),
      updatedAt: new Date()
    };
    
    // Prüfe ob Benutzer existiert
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      // Aktualisiere existierenden Benutzer
      await userRef.update(profileData);
      console.log('✏️ Benutzerprofil aktualisiert');
    } else {
      // Erstelle neuen Benutzer
      profileData.createdAt = new Date();
      await userRef.set(profileData);
      console.log('➕ Neues Benutzerprofil erstellt');
    }
    
    return profileData;
    
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren des Benutzerprofils:', error);
    throw error;
  }
}

// Hole Benutzerprofil aus Firestore
async function getUserProfile(uid) {
  try {
    const userDoc = await window.db.collection('users').doc(uid).get();
    
    if (userDoc.exists) {
      return userDoc.data();
    } else {
      throw new Error('Benutzerprofil nicht gefunden');
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Laden des Benutzerprofils:', error);
    throw error;
  }
}

// ===== AUTHENTIFIZIERTER BENUTZER HANDLER =====

async function handleAuthenticatedUser(firebaseUser) {
  try {
    // 1. Lade Benutzerprofil
    const userProfile = await getUserProfile(firebaseUser.uid);
    
    // 2. Setze globalen Benutzer
    currentUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      emailVerified: firebaseUser.emailVerified,
      ...userProfile
    };
    
    window.currentUser = currentUser;
    
    // 3. Prüfe E-Mail-Verifizierung
    if (!firebaseUser.emailVerified && !userProfile.isAdmin) {
      showEmailVerificationPrompt();
      return;
    }
    
    // 4. Zeige entsprechendes Dashboard
    if (userProfile.isAdmin) {
      showScreen('adminDashboard');
      initializeAdminDashboard();
    } else {
      showScreen('userDashboard');
      initializeUserDashboard();
    }
    
    // 5. Update UI
    updateAdminUI();
    updateWelcomeMessage();
    
    // 6. Initialisiere Features
    initializeUserFeatures();
    
    console.log('✅ Benutzer erfolgreich angemeldet:', currentUser);
    
  } catch (error) {
    console.error('❌ Fehler beim Verarbeiten des authentifizierten Benutzers:', error);
    await auth.signOut();
  }
}

function handleUserLogout() {
  // 1. Lösche Session
  localStorage.removeItem('userSession');
  
  // 2. Reset globale Variablen
  currentUser = null;
  window.currentUser = null;
  
  // 3. Zeige Login-Screen
  showScreen('loginScreen');
  
  // 4. Reset UI
  resetUI();
  
  console.log('✅ Benutzer abgemeldet');
}

// ===== SICHERHEITS-FUNKTIONEN =====

// Validiere FH-Kennung
function isValidFHKennung(kennung) {
  const pattern = /^[a-z]{2}[0-9]{4}$/i;
  return pattern.test(kennung);
}

// Generiere sicheres Passwort
function generateSecurePassword(kennung) {
  // Kombiniere FH-Kennung mit Salt für sicheres Passwort
  const salt = 'FGF_3D_DRUCK_2025';
  const combined = kennung.toLowerCase() + salt;
  
  // Einfache Hash-Funktion (in Produktion sollte crypto.subtle verwendet werden)
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `FGF_${Math.abs(hash).toString(36)}_${kennung.toLowerCase()}`;
}

// Hole sicheres Admin-Passwort
function getSecureAdminPassword() {
  // In Produktion sollte das aus einer sicheren Quelle kommen
  return 'fgf2025admin';
}

// E-Mail-Verifizierung anzeigen
function showEmailVerificationPrompt() {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>E-Mail-Verifizierung erforderlich</h2>
      </div>
      <div class="modal-body">
        <p>Bitte überprüfen Sie Ihre E-Mails und bestätigen Sie Ihre E-Mail-Adresse.</p>
        <p>E-Mail: ${currentUser.email}</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="resendVerificationEmail()">E-Mail erneut senden</button>
        <button class="btn btn-secondary" onclick="logout()">Abmelden</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// E-Mail-Verifizierung erneut senden
async function resendVerificationEmail() {
  try {
    await auth.currentUser.sendEmailVerification();
    toast.success('E-Mail-Verifizierung erneut gesendet');
  } catch (error) {
    console.error('❌ Fehler beim Senden der E-Mail-Verifizierung:', error);
    toast.error('Fehler beim Senden der E-Mail');
  }
}

// ===== UI-FUNKTIONEN =====

function initializeUserFeatures() {
  // Initialisiere Features basierend auf Benutzerrolle
  if (typeof initializePaymentRequests === 'function') {
    initializePaymentRequests();
  }
  
  if (typeof initNotificationBadges === 'function') {
    initNotificationBadges();
  }
  
  if (typeof updateUserPrintsLabel === 'function') {
    updateUserPrintsLabel();
  }
}

function resetUI() {
  // Reset alle UI-Elemente
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.reset();
  }
  
  // Verstecke Admin-Elemente
  updateAdminUI();
}

// ===== GLOBALE EXPORTS =====

window.initializeSecureAuth = initializeSecureAuth;
window.secureLoginWithKennung = secureLoginWithKennung;
window.secureAdminLogin = secureAdminLogin;
window.resendVerificationEmail = resendVerificationEmail; 