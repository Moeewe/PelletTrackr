// ==================== AUTHENTICATION MODULE ====================
// Login/Logout und Benutzer-Validierung

// Auto-Login Session Management
const SESSION_KEY = 'pelletTrackr_session';

// Check for existing session on page load
function checkExistingSession() {
  const savedSession = localStorage.getItem(SESSION_KEY);
  if (savedSession) {
    try {
      const session = JSON.parse(savedSession);
      const sessionAge = Date.now() - session.timestamp;
      
      // Session valid for 7 days (7 * 24 * 60 * 60 * 1000)
      if (sessionAge < 604800000) {
        console.log('🔄 Auto-Login: Restoring session for', session.user.name);
        
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
        
        // Show appropriate dashboard
        if (session.user.isAdmin) {
          document.getElementById('adminWelcome').textContent = `Admin Dashboard - ${session.user.name}`;
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
      console.error('❌ Auto-Login: Error parsing session:', error);
      localStorage.removeItem(SESSION_KEY);
    }
  }
  return false;
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
        
        // Update user prints label instead of welcome message
        updateUserPrintsLabel();
        showScreen('userDashboard');
        // Initialize payment requests BEFORE user dashboard to avoid race condition
        if (typeof initializePaymentRequests === 'function') {
          initializePaymentRequests();
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
      
      // Save session if remember me is checked
      const rememberMe = document.getElementById('rememberMe');
      if (rememberMe && rememberMe.checked) {
        saveSession(window.currentUser);
      }
      
      // Update user prints label instead of welcome message
      updateUserPrintsLabel();
      showScreen('userDashboard');
      // Initialize payment requests BEFORE user dashboard to avoid race condition
      if (typeof initializePaymentRequests === 'function') {
        initializePaymentRequests();
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
        const userChoice = confirm(
          `Es existiert bereits ein Benutzer mit der FH-Kennung "${kennung}" aber anderem Namen "${userResult.existingName}".\n\n` +
          'Möchtest du dich als existierender Benutzer anmelden?'
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

function logout() {
  // Clean up payment request listeners
  if (typeof userPaymentRequestsListener !== 'undefined' && userPaymentRequestsListener) {
    userPaymentRequestsListener();
    userPaymentRequestsListener = null;
  }
  if (typeof paymentRequestsListener !== 'undefined' && paymentRequestsListener) {
    paymentRequestsListener();
    paymentRequestsListener = null;
  }
  
  // Clear session
  localStorage.removeItem(SESSION_KEY);
  
  window.currentUser = { name: '', kennung: '', isAdmin: false };
  showScreen('loginScreen');
  
  // Felder zurücksetzen
  document.getElementById('loginName').value = '';
  document.getElementById('loginKennung').value = '';
  document.getElementById('adminPassword').value = '';
  
  // Uncheck remember me
  const rememberMe = document.getElementById('rememberMe');
  if (rememberMe) {
    rememberMe.checked = false;
  }
  
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
