// ==================== AUTHENTICATION MODULE ====================
// Login/Logout und Benutzer-Validierung

// Auto-Login Session Management
const SESSION_KEY = 'pelletTrackr_session';

async function linkLegacyProfileAfterVerification(user, profile, kennung) {
  if (!user?.emailVerified || !kennung || typeof firebase.functions !== 'function') return profile;
  try {
    await user.getIdToken(true);
    const callable = firebase.functions('europe-west1').httpsCallable('linkLegacyAccount');
    const result = await callable({ kennung: String(kennung).trim().toLowerCase() });
    if (!result.data?.linked) return profile;
    const linkedDoc = await window.db.collection('users').doc(user.uid).get();
    return linkedDoc.exists ? linkedDoc.data() : profile;
  } catch (error) {
    console.warn('Legacy-Konto konnte noch nicht verknüpft werden:', error);
    if (error.code === 'functions/not-found' || error.code === 'functions/unavailable') {
      safeShowToast('Das Altprofil-Backend ist noch nicht bereit. Die Anmeldung funktioniert, die Altdaten werden später verknüpft.', 'warning');
    } else if (error.code === 'functions/failed-precondition') {
      safeShowToast(error.message || 'Die Zuordnung der Altdaten muss administrativ geprüft werden.', 'warning');
    }
    return profile;
  }
}

// Check for existing session on page load
let authRestoreStarted = false;
function checkExistingSession() {
  if (authRestoreStarted) return true;
  authRestoreStarted = true;
  // Stored display data never grants access. Wait for Firebase's verified session.
  localStorage.removeItem(SESSION_KEY);
  showScreen('loginScreen');
  setupLoginKeyHandlers();
  let unsubscribe;
  unsubscribe = firebase.auth().onAuthStateChanged(async user => {
    if (unsubscribe) unsubscribe();
    if (!user) return;
    try {
      if (!user.emailVerified) {
        await firebase.auth().signOut();
        safeShowToast('Bitte bestätige zuerst deine E-Mail-Adresse.', 'warning');
        return;
      }
      const doc = await window.db.collection('users').doc(user.uid).get();
      if (firebase.auth().currentUser?.uid !== user.uid) return;
      let profile = doc.exists ? doc.data() : {};
      profile = await linkLegacyProfileAfterVerification(user, profile, profile.kennung || profile.legacyKennung || profile.requestedKennung);
      window.currentUser = {
        uid:user.uid, email:user.email, name:profile.name || user.displayName || extractUsernameFromEmail(user.email),
        username:profile.username || extractUsernameFromEmail(user.email),
        kennung:profile.kennung || profile.legacyKennung || extractUsernameFromEmail(user.email), isAdmin:profile.isAdmin === true
      };
      showDashboard();
    } catch (error) { safeShowToast('Dein Benutzerprofil konnte nicht geladen werden. Bitte erneut anmelden.', 'error'); }
  });
  return true;
}

// Save session to localStorage
function saveSession(user) {
  const session = {
    user: user,
    timestamp: Date.now()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

// Admin view toggle functionality
function toggleAdminView() {
  if (!window.currentUser || !window.currentUser.isAdmin) {
    toast.error('Nur Administratoren können die Ansicht wechseln');
    return;
  }

  const currentScreen = document.querySelector('.screen.active').id;

  if (currentScreen === 'userDashboard') {
    // Switch to admin view
    showScreen('adminDashboard');
    initializeAdminDashboard();
    updateAdminUI();
    toast.info('Zur Admin-Ansicht gewechselt');
  } else if (currentScreen === 'adminDashboard') {
    // Switch to user view
    showScreen('userDashboard');
    initializeUserDashboard();
    updateAdminUI();
    toast.info('Zur Benutzer-Ansicht gewechselt');
  }
}

// Show/hide admin UI elements based on user admin status
function updateAdminUI() {
  const isAdmin = window.currentUser && window.currentUser.isAdmin;

  // User Dashboard Admin Elements
  const userAdminBadge = document.getElementById('userAdminBadge');
  const adminToggleBtn = document.getElementById('adminToggleBtn');

  if (userAdminBadge) {
    userAdminBadge.style.display = isAdmin ? 'inline-block' : 'none';
  }

  if (adminToggleBtn) {
    adminToggleBtn.style.display = isAdmin ? 'inline-block' : 'none';
  }

  console.log(`🔧 Admin UI updated: isAdmin=${isAdmin}`);
}

function showAdminLogin() {
  const passwordGroup = document.getElementById('passwordGroup');
  const adminPassword = document.getElementById('adminPassword');
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const adminBtn = document.getElementById('adminBtn');
  const adminLoginBtn = document.getElementById('adminLoginBtn');

  if (passwordGroup.style.display === 'none' || passwordGroup.style.display === '') {
    // Show admin login
    passwordGroup.style.display = 'block';
    adminPassword.focus();
    loginForm.classList.add('admin-mode');

    // Hide normal login button completely
    loginBtn.style.display = 'none';

    // Show admin login button
    adminLoginBtn.style.display = 'block';

    // Change admin button text
    adminBtn.textContent = 'Zurück zu User Login';
  } else {
    // Hide admin login
    passwordGroup.style.display = 'none';
    adminPassword.value = '';
    loginForm.classList.remove('admin-mode');

    // Show normal login button again
    loginBtn.style.display = 'block';

    // Hide admin login button
    adminLoginBtn.style.display = 'none';

    // Change admin button text back
    adminBtn.textContent = 'Als Admin anmelden';
  }
}

async function loginAsUser() {
  const name = document.getElementById('loginName').value.trim();
  const kennung = document.getElementById('loginKennung').value.trim();
  const loginButton = document.getElementById('loginBtn');

  if (!name || !kennung) {
    toast.warning('Bitte Name und FH-Kennung eingeben!');
            return;
        }

  setButtonLoading(loginButton, true);

  try {
    const loadingId = loading.show('Anmeldung läuft...');

    // Verbesserte Benutzerprüfung und -verwaltung
    const userResult = await findOrCreateUser(kennung.toLowerCase(), name, false);

    if (userResult.conflict) {
      loading.hide(loadingId);

      // Moderne Bestätigung verwenden
      const confirmMessage = `Die Kennung "${kennung}" ist bereits für "${userResult.existingName}" registriert.

Möchtest du dich als "${userResult.existingName}" anmelden?`;

      const userChoice = await toast.confirm(
        confirmMessage,
        'Anmelden',
        'Zurück'
      );

      if (userChoice) {
        // Als existierender User anmelden
        window.currentUser = {
          name: userResult.existingName,
          kennung: kennung.toLowerCase(),
          isAdmin: userResult.isAdmin || false
        };

              // Save session if remember me is checked
      const rememberMe = document.getElementById('rememberMe');
      if (rememberMe && rememberMe.checked) {
        saveSession(window.currentUser);
      }

        // Update user prints label and welcome message
        updateUserPrintsLabel();
        if (typeof updateWelcomeMessage === 'function') {
          updateWelcomeMessage();
        }
        showScreen('userDashboard');
        // Initialize payment requests BEFORE user dashboard to avoid race condition
        if (typeof initializePaymentRequests === 'function') {
          initializePaymentRequests();
        }

        // Initialize notification badges for user
        if (typeof initNotificationBadges === 'function') {
          initNotificationBadges();
        }

        initializeUserDashboard();
        // Update admin UI elements
        updateAdminUI();
        toast.success('Anmeldung erfolgreich');
      } else {
        toast.info('Bitte verwende eine andere FH-Kennung oder wende dich an den Administrator.');
        return;
      }
    } else {
      // Erfolgreiche Anmeldung (neuer oder existierender User)
      window.currentUser = {
        name: userResult.name,
        kennung: kennung.toLowerCase(),
        isAdmin: userResult.isAdmin || false
      };

      // Save session
      saveSession(window.currentUser);

      // Update user prints label and welcome message
      updateUserPrintsLabel();
      if (typeof updateWelcomeMessage === 'function') {
        updateWelcomeMessage();
      }
      showScreen('userDashboard');
      // Initialize payment requests BEFORE user dashboard to avoid race condition
      if (typeof initializePaymentRequests === 'function') {
        initializePaymentRequests();
      }

      // Initialize notification badges for user
      if (typeof initNotificationBadges === 'function') {
        initNotificationBadges();
      }

      initializeUserDashboard();
      // Update admin UI elements
      updateAdminUI();
      toast.success('Anmeldung erfolgreich');
    }

    loading.hide(loadingId);
  } catch (error) {
    console.error('Login error:', error);
    loading.hideAll();
    toast.error('Fehler bei der Anmeldung: ' + error.message);
  } finally {
    setButtonLoading(loginButton, false);
  }
}

function loginAsAdmin() {
  const name = document.getElementById('loginName').value.trim();
  const kennung = document.getElementById('loginKennung').value.trim();
  const password = document.getElementById('adminPassword').value;
  const adminButton = document.getElementById('adminBtn');

  if (!name || !kennung) {
    toast.warning('Bitte Name und FH-Kennung eingeben!');
            return;
        }

  if (password !== ADMIN_PASSWORD) {
    toast.error('Falsches Admin-Passwort!');
    return;
  }

  // Admin-Login mit Loading-Effekt
  setButtonLoading(adminButton, true);

  // Load real user data from database
  setTimeout(async () => {
    try {
      const loadingId = loading.show('Admin-Anmeldung läuft...');

      // Try to find or create user with admin privileges
      const userResult = await findOrCreateUser(kennung.toLowerCase(), name, true);

      if (userResult.conflict) {
        const userChoice = await toast.confirm(
          `Es existiert bereits ein Benutzer mit der FH-Kennung "${kennung}" aber anderem Namen "${userResult.existingName}".\n\n` +
          'Möchtest du dich als existierender Benutzer anmelden?',
          'Ja, anmelden',
          'Abbrechen'
        );

        if (userChoice) {
          // Login as existing user with admin privileges
          window.currentUser = {
            name: userResult.existingName,
            kennung: kennung.toLowerCase(),
            isAdmin: true
          };
        } else {
          toast.info('Bitte verwende eine andere FH-Kennung oder wende dich an den Administrator.');
          loading.hide(loadingId);
          setButtonLoading(adminButton, false);
          return;
        }
      } else {
        // Successful admin login with real user data
        window.currentUser = {
          name: userResult.name,
          kennung: kennung.toLowerCase(),
          isAdmin: true
        };
      }

      // Save session if remember me is checked
      const rememberMe = document.getElementById('rememberMe');
      if (rememberMe && rememberMe.checked) {
        saveSession(window.currentUser);
      }

      // Admin Dashboard anzeigen
      showScreen('adminDashboard');

      // Admin Dashboard initialisieren
      initializeAdminDashboard();

      // Update admin UI elements
      updateAdminUI();

      // Initialize payment requests for admin
      if (typeof initializePaymentRequests === 'function') {
        initializePaymentRequests();
      }

      loading.hide(loadingId);
      setButtonLoading(adminButton, false);
      toast.success('Admin-Anmeldung erfolgreich');

    } catch (error) {
      console.error('Admin login error:', error);
      loading.hideAll();
      toast.error('Fehler bei der Admin-Anmeldung: ' + error.message);
      setButtonLoading(adminButton, false);
    }
  }, 800);
}

// Add Enter key handlers for login forms
function setupLoginKeyHandlers() {
  const loginName = document.getElementById('loginName');
  const loginKennung = document.getElementById('loginKennung');
  const adminPassword = document.getElementById('adminPassword');

  // User login with Enter
  loginName.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      loginKennung.focus();
    }
  });

  loginKennung.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const passwordGroup = document.getElementById('passwordGroup');
      if (passwordGroup.style.display === 'none' || passwordGroup.style.display === '') {
        loginAsUser();
      } else {
        adminPassword.focus();
      }
    }
  });

  // Admin login with Enter
  adminPassword.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      loginAsAdmin();
    }
  });
}

async function logout() {
  window.SafetyTraining?.cleanup();
  if (typeof cleanupNotificationBadges === 'function') cleanupNotificationBadges();
  if (typeof userPaymentRequestsListener !== 'undefined' && userPaymentRequestsListener) {
    userPaymentRequestsListener(); userPaymentRequestsListener = null;
  }
  if (typeof paymentRequestsListener !== 'undefined' && paymentRequestsListener) {
    paymentRequestsListener(); paymentRequestsListener = null;
  }
  localStorage.removeItem(SESSION_KEY);
  window.currentUser = {name:'', kennung:'', isAdmin:false};
  if (typeof closeModal === 'function') closeModal();
  showScreen('loginScreen');
  ['loginName','loginKennung','adminPassword','loginEmail','loginPassword'].forEach(id => {
    const el=document.getElementById(id); if (el) el.value='';
  });
  try { await firebase.auth().signOut(); }
  catch (error) { safeShowToast('Abmeldung nicht vollständig. Bitte die Seite schließen.', 'error'); return; }
  toast.info('Erfolgreich abgemeldet');
}

// Benutzer-Validierung
/**
 * Sucht oder erstellt einen User und prüft auf Name-Konflikte
 * @param {string} kennung - FH-Kennung des Users
 * @param {string} name - Name des Users
 * @param {boolean} isAdmin - Ob der User Admin-Rechte hat
 * @returns {Object} Ergebnis der User-Suche/Erstellung
 */
async function findOrCreateUser(kennung, name, isAdmin = false) {
  try {
    console.log(`🔍 Suche User: kennung=${kennung}, name=${name}, isAdmin=${isAdmin}`);

    // 1. Prüfe users Collection
    const usersSnapshot = await window.db.collection('users').where('kennung', '==', kennung).get();
    let existingUserDoc = null;
    let existingUserData = null;

    if (!usersSnapshot.empty) {
      existingUserDoc = usersSnapshot.docs[0];
      existingUserData = existingUserDoc.data();
      console.log(`📋 Existierender User gefunden in users:`, existingUserData);
    }

    // 2. Prüfe entries Collection für Name-Konflikte
    const entriesSnapshot = await window.db.collection('entries').where('kennung', '==', kennung).get();
    const entriesNames = new Set();

    if (!entriesSnapshot.empty) {
      entriesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.name) {
          entriesNames.add(data.name);
        }
      });
      console.log(`📝 Namen aus entries für ${kennung}:`, Array.from(entriesNames));
    }

    // 3. Prüfe auf Name-Konflikte (only for significant differences)
    if (existingUserData && existingUserData.name.toLowerCase() !== name.toLowerCase()) {
      // Allow minor differences (like capitalization or whitespace)
      const normalizedExisting = existingUserData.name.trim().toLowerCase().replace(/\s+/g, ' ');
      const normalizedInput = name.trim().toLowerCase().replace(/\s+/g, ' ');

      if (normalizedExisting !== normalizedInput) {
        console.log(`⚠️ Name-Konflikt: Existierend=${existingUserData.name}, Eingegeben=${name}`);
        return {
          conflict: true,
          existingName: existingUserData.name,
          isAdmin: existingUserData.isAdmin || false
        };
    } else {
        // Minor difference - use existing name but continue
        console.log(`📝 Name normalisiert: ${name} → ${existingUserData.name}`);
        name = existingUserData.name;  // Use the existing properly formatted name
      }
    }

    // Prüfe auch entries für Name-Konflikte (only for significant differences)
    const conflictingNames = Array.from(entriesNames).filter(entryName => {
      const normalizedEntry = entryName.trim().toLowerCase().replace(/\s+/g, ' ');
      const normalizedInput = name.trim().toLowerCase().replace(/\s+/g, ' ');
      return normalizedEntry !== normalizedInput;
    });

    if (conflictingNames.length > 0) {
      console.log(`⚠️ Name-Konflikt in entries: ${conflictingNames.join(', ')}`);

      const adminStatus = existingUserData ? (existingUserData.isAdmin || false) : false;

      return {
        conflict: true,
        existingName: conflictingNames[0],
        isAdmin: adminStatus
      };
    }

    // 4. User existiert bereits - aktualisiere ihn
    if (existingUserDoc) {
      console.log(`✏️ Aktualisiere existierenden User`);
      await existingUserDoc.ref.update({
        name: name,
        lastLogin: new Date(),
        updatedAt: new Date()
      });

      return {
        conflict: false,
        isExisting: true,
        name: name,
        kennung: kennung,
        isAdmin: existingUserData.isAdmin || false  // Use existing admin status from database
      };
    }

    // 5. Erstelle neuen User
    console.log(`➕ Erstelle neuen User`);
    const newUserData = {
      name: name,
      kennung: kennung,
      isAdmin: isAdmin,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: new Date(),
      email: `${kennung}@fh-muenster.de` // Standard-Email
    };

    await window.db.collection('users').add(newUserData);
    console.log(`✅ Neuer User erstellt:`, newUserData);

    return {
      conflict: false,
      isExisting: false,
      name: name,
      kennung: kennung,
      isAdmin: isAdmin
    };

    } catch (error) {
    console.error('❌ Fehler beim User-Management:', error);
    throw error;
  }
}

// Legacy-Funktion für Rückwärtskompatibilität
async function checkExistingKennung(kennung, currentName) {
  try {
    // Alle Drucke mit dieser Kennung abrufen
    const snapshot = await window.db.collection('entries').where('kennung', '==', kennung).get();

    if (!snapshot.empty) {
      // Erste Drucke prüfen um zu sehen ob ein anderer Name verwendet wird
      const existingNames = new Set();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.name && data.name.toLowerCase() !== currentName.toLowerCase()) {
          existingNames.add(data.name);
        }
      });

      if (existingNames.size > 0) {
        // Ersten anderen Namen zurückgeben
        return {
          name: Array.from(existingNames)[0]
        };
      }
    }

    return null; // Keine Konflikte gefunden
  } catch (error) {
    console.error('Fehler beim Prüfen der FH-Kennung:', error);
    return null;
  }
}

// UI-Management-Funktionen für neue Login-Struktur
function showLoginSection() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registrationForm').style.display = 'none';
    document.getElementById('passwordResetForm').style.display = 'none';
}

function showRegistrationSection() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registrationForm').style.display = 'block';
    document.getElementById('passwordResetForm').style.display = 'none';

    // Focus auf erstes Feld
    setTimeout(() => {
        const nameInput = document.getElementById('regName');
        if (nameInput) nameInput.focus();
    }, 100);
}

function showPasswordResetSection() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registrationForm').style.display = 'none';
    document.getElementById('passwordResetForm').style.display = 'block';

    // Focus auf Email-Feld
    setTimeout(() => {
        const emailInput = document.getElementById('resetEmail');
        if (emailInput) emailInput.focus();
    }, 100);
}

// Fehlende hideAllSections-Funktion hinzufügen
function hideAllSections() {
    const loginForm = document.getElementById('loginForm');
    const registrationForm = document.getElementById('registrationForm');
    const passwordResetForm = document.getElementById('passwordResetForm');

    if (loginForm) loginForm.style.display = 'none';
    if (registrationForm) registrationForm.style.display = 'none';
    if (passwordResetForm) passwordResetForm.style.display = 'none';
}

// Event-Listener für Enter-Taste in Login-Formularen
function setupLoginKeyHandlers() {
    // Login-Formular
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');

    if (loginEmail) {
        loginEmail.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                loginPassword.focus();
            }
        });
    }

    if (loginPassword) {
        loginPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                loginWithEmail();
            }
        });
    }

    // Registrierungs-Formular
    const regName = document.getElementById('regName');
    const regEmail = document.getElementById('regEmail');
    const regPassword = document.getElementById('regPassword');
    const regPasswordConfirm = document.getElementById('regPasswordConfirm');

    if (regName) {
        regName.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (regEmail) regEmail.focus();
            }
        });
    }

    if (regEmail) {
        regEmail.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (regPassword) regPassword.focus();
            }
        });
    }

    if (regPassword) {
        regPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (regPasswordConfirm) regPasswordConfirm.focus();
            }
        });
    }

    if (regPasswordConfirm) {
        regPasswordConfirm.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                registerUser();
            }
        });
    }

    // Passwort-Reset-Formular
    const resetEmail = document.getElementById('resetEmail');

    if (resetEmail) {
        resetEmail.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                resetPassword();
            }
        });
    }
}

// Hilfsfunktionen für Email-Login
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function extractUsernameFromEmail(email) {
    if (!email || !email.includes('@')) {
        return 'user';
    }
    return email.split('@')[0];
}

// Neue Login-Funktion mit Email/Passwort
let emailLoginInFlight = false;
async function loginWithEmail() {
    if (emailLoginInFlight) return;
    emailLoginInFlight = true;
    const button = document.getElementById('loginBtn');
    if (button) button.disabled = true;
    try { await performEmailLogin(); }
    finally { emailLoginInFlight = false; if (button) button.disabled = false; }
}

async function performEmailLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        safeShowToast('Bitte alle Felder ausfüllen!', 'warning');
        return;
    }

    if (!isValidEmail(email)) {
        safeShowToast('Bitte gültige E-Mail-Adresse eingeben!', 'warning');
        return;
    }

    console.log('🔐 Email-Login gestartet für:', email);

    // Check if Firebase is available
    if (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
        try {
            // Firebase Auth Login
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            if (!user.emailVerified) {
                safeShowToast('Bitte bestätige zuerst deine E-Mail-Adresse über den zugesandten Link.', 'warning');
                await firebase.auth().signOut();
                return;
            }

            // Username aus Email extrahieren
            const username = extractUsernameFromEmail(email);

            // Adminrechte ausschließlich aus dem bestätigten Benutzerprofil lesen.
            const isAdmin = await checkAdminStatus(user.uid);
            const profileDoc = await window.db.collection('users').doc(user.uid).get();
            let profile = profileDoc.exists ? profileDoc.data() : {};
            const typedKennung = document.getElementById('loginKennung')?.value.trim().toLowerCase();
            const migrationKennung = typedKennung || profile.kennung || profile.legacyKennung || profile.requestedKennung;

            // A verified user can claim only the legacy account matching their FH ID.
            // The callable performs all matching and writes with server privileges.
            profile = await linkLegacyProfileAfterVerification(user, profile, migrationKennung);

            // User-Objekt erstellen
            const userData = {
                name: profile.name || user.displayName || username,
                email: email,
                username: username,
                kennung: profile.kennung || profile.legacyKennung || username,
                isAdmin: isAdmin,
                uid: user.uid,
                emailVerified: user.emailVerified
            };

            // Keep the active Firebase user available to all dashboard modules.
            window.currentUser = userData;

            // Session speichern
            saveSession(userData);

            // Dashboard anzeigen (nach Admin-Status-Prüfung)
            if (isAdmin) {
                showAdminDashboard();
            } else {
                showUserDashboard();
            }

            safeShowToast('Erfolgreich angemeldet', 'success');

        } catch (error) {
            handleLoginError(error);
        }
    } else {
        console.log('⚠️ Firebase nicht verfügbar, verwende Legacy-Login');
        // Fallback zu Legacy-Login
        safeShowToast('Anmeldung derzeit nicht verfügbar. Bitte die Seite neu laden.', 'error');
    }
}

// Registrierungs-Funktion
async function registerUser() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const kennung = document.getElementById('regKennung').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;

    // Validierung
    if (!name || !email || !kennung || !password || !passwordConfirm) {
        safeShowToast('Bitte alle Felder ausfüllen!', 'warning');
        return;
    }

    if (!isValidEmail(email)) {
        safeShowToast('Bitte gültige E-Mail-Adresse eingeben!', 'warning');
        return;
    }

    if (password !== passwordConfirm) {
        safeShowToast('Passwörter stimmen nicht überein!', 'warning');
        return;
    }

    if (password.length < 6) {
        safeShowToast('Passwort muss mindestens 6 Zeichen lang sein!', 'warning');
        return;
    }

    console.log('🆕 Registrierung gestartet für:', email);

    // Check if Firebase is available
    if (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
        try {
            // Firebase Auth Registrierung
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Profil aktualisieren
            await user.updateProfile({
                displayName: name
            });

            // Email-Verifizierung senden
            await user.sendEmailVerification();

            // Firestore User-Dokument erstellen
            await createUserProfile(user.uid, {
                name: name,
                email: email,
                username: extractUsernameFromEmail(email),
                requestedKennung: kennung,
                isAdmin: false,
                createdAt: new Date()
            });

            await firebase.auth().signOut();

            safeShowToast('Account erstellt! Bitte bestätigen Sie Ihre E-Mail-Adresse.', 'success');
            showLoginSection();

        } catch (error) {
            handleRegistrationError(error);
        }
    } else {
        safeShowToast('Registrierung nicht verfügbar', 'error');
    }
}

// Passwort-Reset-Funktion
async function resetPassword() {
    const email = document.getElementById('resetEmail').value.trim();

    if (!email || !isValidEmail(email)) {
        safeShowToast('Bitte gültige E-Mail-Adresse eingeben!', 'warning');
        return;
    }

    console.log('🔄 Passwort-Reset gestartet für:', email);

    // Check if Firebase is available
    if (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
        try {
            await firebase.auth().sendPasswordResetEmail(email);
            safeShowToast('Passwort-Reset E-Mail gesendet!', 'success');
            showLoginSection();

        } catch (error) {
            safeShowToast('Fehler beim Senden der E-Mail: ' + error.message, 'error');
        }
    } else {
        safeShowToast('Passwort-Reset nicht verfügbar', 'error');
    }
}

// Error-Handling für Login
function handleLoginError(error) {
    console.error('❌ Login error:', error);

    switch (error.code) {
        case 'auth/invalid-login-credentials':
        case 'auth/invalid-credential':
            safeShowToast('E-Mail oder Passwort nicht erkannt. Der frühere Zugang mit FH-Kennung benötigt ein separat eingerichtetes E-Mail-Konto. Nutze bei Bedarf „Passwort vergessen“.', 'error');
            break;
        case 'auth/user-not-found':
            safeShowToast('Benutzer nicht gefunden. Bitte registrieren Sie sich.', 'error');
            break;
        case 'auth/wrong-password':
            safeShowToast('Falsches Passwort', 'error');
            break;
        case 'auth/invalid-email':
            safeShowToast('Ungültige E-Mail-Adresse', 'error');
            break;
        case 'auth/too-many-requests':
            safeShowToast('Zu viele Versuche. Bitte warten Sie einen Moment.', 'error');
            break;
        default:
            safeShowToast('Login fehlgeschlagen: ' + error.message, 'error');
    }
}

// Error-Handling für Registrierung
function handleRegistrationError(error) {
    console.error('❌ Registration error:', error);

    switch (error.code) {
        case 'auth/email-already-in-use':
            safeShowToast('E-Mail-Adresse bereits registriert. Bitte melden Sie sich an.', 'error');
            break;
        case 'auth/weak-password':
            safeShowToast('Passwort zu schwach. Mindestens 6 Zeichen.', 'error');
            break;
        case 'auth/invalid-email':
            safeShowToast('Ungültige E-Mail-Adresse', 'error');
            break;
        default:
            safeShowToast('Registrierung fehlgeschlagen: ' + error.message, 'error');
    }
}

// Firebase User Profile Management
async function createUserProfile(uid, userData) {
    try {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            await firebase.firestore().collection('users').doc(uid).set({
                ...userData,
                lastLogin: new Date(),
                emailVerified: false
            });
        }
    } catch (error) {
        console.error('Error creating user profile:', error);
        throw error;
    }
}

// Admin Status Check
async function checkAdminStatus(uid) {
    try {
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            const userDoc = await firebase.firestore().collection('users').doc(uid).get();
            if (userDoc.exists) {
                return userDoc.data().isAdmin || false;
            }
        }
        return false;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Legacy Login Fallback
async function legacyLoginWithEmail() {
    safeShowToast('Bitte mit einem registrierten E-Mail-Konto anmelden.', 'error');
}

// Global exports
window.loginAsUser = loginAsUser;
window.loginWithEmail = loginWithEmail;
window.registerUser = registerUser;
window.resetPassword = resetPassword;
window.showRegistrationSection = showRegistrationSection;
window.showPasswordResetSection = showPasswordResetSection;
window.showLoginSection = showLoginSection;
window.hideAllSections = hideAllSections;
window.logout = logout;
window.checkExistingSession = checkExistingSession;
window.extractUsernameFromEmail = extractUsernameFromEmail;
window.isValidEmail = isValidEmail;
window.generateSecurePasswordFromEmail = generateSecurePasswordFromEmail;
window.safeShowToast = safeShowToast;
window.handleLoginError = handleLoginError;
window.handleRegistrationError = handleRegistrationError;
window.createUserProfile = createUserProfile;
window.checkAdminStatus = checkAdminStatus;
window.legacyLoginWithEmail = legacyLoginWithEmail;
window.setupLoginKeyHandlers = setupLoginKeyHandlers;
