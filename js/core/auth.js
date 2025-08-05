// ==================== AUTHENTIFIZIERUNG ====================
// Integration mit sicherer Firebase Auth + Legacy-Support

// Session-Management
const SESSION_KEY = 'userSession';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 Stunden

// Prüfe existierende Session beim App-Start
function checkExistingSession() {
  const sessionData = localStorage.getItem(SESSION_KEY);
  
  if (sessionData) {
    try {
      const session = JSON.parse(sessionData);
      const now = Date.now();
      
      if (session.timestamp && (now - session.timestamp) < SESSION_DURATION) {
        console.log('🕒 Auto-Login: Session gefunden, lade Benutzer...');
        
        // Restore user session
        window.currentUser = session.user;
        
        // Pre-fill form fields
        document.getElementById('loginName').value = session.user.name;
        document.getElementById('loginKennung').value = session.user.kennung;
        
        // Check remember me checkbox
        const rememberMe = document.getElementById('rememberMe');
        if (rememberMe) {
          rememberMe.checked = true;
        }
        
        // Update welcome message
        if (typeof updateWelcomeMessage === 'function') {
          updateWelcomeMessage();
        }
        
        // Show appropriate dashboard
        if (session.user.isAdmin) {
          showScreen('adminDashboard');
          initializeAdminDashboard();
        } else {
          showScreen('userDashboard');
          initializeUserDashboard();
        }
        
        // Update admin UI elements
        updateAdminUI();
        
        // Initialize payment requests
        if (typeof initializePaymentRequests === 'function') {
          initializePaymentRequests();
        }
        
        // Initialize notification badges for user
        if (typeof initNotificationBadges === 'function') {
          initNotificationBadges();
        }
        
        // Show welcome toast without name
        setTimeout(() => {
          toast.success('Automatisch angemeldet');
        }, 500);
        
        return true;
      } else {
        console.log('🕒 Auto-Login: Session expired, clearing localStorage');
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (error) {
      console.error('❌ Session parsing error:', error);
      localStorage.removeItem(SESSION_KEY);
    }
  }
  
  return false;
}

// Speichere Session
function saveSession(user) {
  const session = {
    user: user,
    timestamp: Date.now()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  console.log('💾 Session gespeichert für:', user.name);
}

// Toggle zwischen User und Admin View
function toggleAdminView() {
  const currentScreen = getCurrentScreen();
  
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

// Zeige Admin-Login-Felder
function showAdminLogin() {
  const passwordGroup = document.getElementById('passwordGroup');
  const adminPassword = document.getElementById('adminPassword');
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const adminBtn = document.getElementById('adminBtn');

  if (passwordGroup.style.display === 'none' || passwordGroup.style.display === '') {
    // Show admin login
    passwordGroup.style.display = 'block';
    adminPassword.focus();
    loginForm.classList.add('admin-mode');
    loginBtn.style.display = 'none';
    adminBtn.textContent = 'Als Benutzer anmelden';
  } else {
    // Hide admin login
    passwordGroup.style.display = 'none';
    adminPassword.value = '';
    loginForm.classList.remove('admin-mode');
    loginBtn.style.display = 'block';
    adminBtn.textContent = 'Als Admin anmelden';
  }
}

// ===== SICHERE AUTHENTIFIZIERUNG =====

// Sichere Benutzer-Anmeldung mit Firebase Auth
async function loginAsUser() {
  const name = document.getElementById('loginName').value.trim();
  const kennung = document.getElementById('loginKennung').value.trim();
  
  if (!name || !kennung) {
    toast.warning('Bitte Name und FH-Kennung eingeben!');
    return;
  }
  
  // Prüfe ob sichere Auth verfügbar ist
  if (typeof secureLoginWithKennung === 'function') {
    try {
      const loadingId = loading.show('Anmeldung läuft...');
      
      // Verwende sichere Authentifizierung
      const result = await secureLoginWithKennung(kennung, name, false);
      
      if (result.success) {
        // Erfolgreiche Anmeldung
        window.currentUser = {
          name: name,
          kennung: kennung.toLowerCase(),
          isAdmin: result.user.isAdmin || false,
          uid: result.user.uid,
          emailVerified: result.user.emailVerified
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
        initializeUserDashboard();
        updateAdminUI();
        
        // Initialize features
        if (typeof initializePaymentRequests === 'function') {
          initializePaymentRequests();
        }
        
        if (typeof initNotificationBadges === 'function') {
          initNotificationBadges();
        }
        
        loading.hide(loadingId);
        toast.success('Anmeldung erfolgreich');
        
      } else {
        loading.hide(loadingId);
        toast.error('Anmeldung fehlgeschlagen');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      loading.hideAll();
      toast.error('Fehler bei der Anmeldung: ' + error.message);
    }
  } else {
    // Fallback auf Legacy-Authentifizierung
    await legacyLoginAsUser(name, kennung);
  }
}

// Sichere Admin-Anmeldung
async function loginAsAdmin() {
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
  
  // Prüfe ob sichere Auth verfügbar ist
  if (typeof secureAdminLogin === 'function') {
    try {
      setButtonLoading(adminButton, true);
      const loadingId = loading.show('Admin-Anmeldung läuft...');
      
      // Verwende sichere Admin-Authentifizierung
      const result = await secureAdminLogin(kennung, name, password);
      
      if (result.success) {
        // Erfolgreiche Admin-Anmeldung
        window.currentUser = {
          name: name,
          kennung: kennung.toLowerCase(),
          isAdmin: true,
          uid: result.user.uid,
          emailVerified: result.user.emailVerified
        };
        
        // Save session if remember me is checked
        const rememberMe = document.getElementById('rememberMe');
        if (rememberMe && rememberMe.checked) {
          saveSession(window.currentUser);
        }
        
        // Admin Dashboard anzeigen
        showScreen('adminDashboard');
        initializeAdminDashboard();
        updateAdminUI();
        
        // Initialize features
        if (typeof initializePaymentRequests === 'function') {
          initializePaymentRequests();
        }
        
        loading.hide(loadingId);
        setButtonLoading(adminButton, false);
        toast.success('Admin-Anmeldung erfolgreich');
        
      } else {
        loading.hide(loadingId);
        setButtonLoading(adminButton, false);
        toast.error('Admin-Anmeldung fehlgeschlagen');
      }
      
    } catch (error) {
      console.error('Admin login error:', error);
      loading.hideAll();
      toast.error('Fehler bei der Admin-Anmeldung: ' + error.message);
      setButtonLoading(adminButton, false);
    }
  } else {
    // Fallback auf Legacy-Admin-Authentifizierung
    await legacyLoginAsAdmin(name, kennung, password, adminButton);
  }
}

// ===== LEGACY AUTHENTIFIZIERUNG (FALLBACK) =====

// Legacy Benutzer-Anmeldung
async function legacyLoginAsUser(name, kennung) {
  try {
    const loadingId = loading.show('Anmeldung läuft...');
    
    // Try to find or create user
    const userResult = await findOrCreateUser(kennung.toLowerCase(), name, false);
    
    if (userResult.conflict) {
      const confirmMessage = `Es existiert bereits ein Benutzer mit der FH-Kennung "${kennung}" aber anderem Namen "${userResult.existingName}".\n\n` +
        'Möchtest du dich als existierender Benutzer anmelden?';
      
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
        loading.hide(loadingId);
        toast.success('Anmeldung erfolgreich');
      } else {
        toast.info('Bitte verwende eine andere FH-Kennung oder wende dich an den Administrator.');
        loading.hide(loadingId);
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
      loading.hide(loadingId);
      toast.success('Anmeldung erfolgreich');
    }
  } catch (error) {
    console.error('❌ Fehler beim User-Management:', error);
    loading.hideAll();
    toast.error('Login error: ' + error.message);
  }
}

// Legacy Admin-Anmeldung
async function legacyLoginAsAdmin(name, kennung, password, adminButton) {
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

// ===== UTILITY FUNCTIONS =====

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

// Logout function
function logout() {
  // Clear session
  localStorage.removeItem(SESSION_KEY);
  
  // Reset current user
  window.currentUser = null;
  
  // Show login screen
  showScreen('loginScreen');
  
  // Reset form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.reset();
  }
  
  // Hide admin elements
  updateAdminUI();
  
  // Show logout message
  toast.info('Abgemeldet');
  
  console.log('✅ Benutzer abgemeldet');
}

// ===== LEGACY FUNCTIONS (für Kompatibilität) =====

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
    const usersSnapshot = await window.db.collection('users').where('kennung', '==', kennung).get();
    
    if (!usersSnapshot.empty) {
      const existingUser = usersSnapshot.docs[0].data();
      
      if (existingUser.name.toLowerCase() !== currentName.toLowerCase()) {
        return {
          exists: true,
          existingName: existingUser.name,
          isAdmin: existingUser.isAdmin || false
        };
      }
    }
    
    return { exists: false };
  } catch (error) {
    console.error('❌ Fehler beim Prüfen der FH-Kennung:', error);
    throw error;
  }
}

// ===== INITIALISIERUNG =====

// Setup login form handlers
document.addEventListener('DOMContentLoaded', () => {
  setupLoginKeyHandlers();
});

// Export functions for global access
window.checkExistingSession = checkExistingSession;
window.saveSession = saveSession;
window.toggleAdminView = toggleAdminView;
window.updateAdminUI = updateAdminUI;
window.showAdminLogin = showAdminLogin;
window.loginAsUser = loginAsUser;
window.loginAsAdmin = loginAsAdmin;
window.logout = logout;
window.findOrCreateUser = findOrCreateUser;
window.checkExistingKennung = checkExistingKennung;
