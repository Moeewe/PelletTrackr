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
        
        // Show appropriate dashboard
        if (session.user.isAdmin) {
          document.getElementById('adminWelcome').textContent = `Admin Dashboard - ${session.user.name}`;
          showScreen('adminDashboard');
          initializeAdminDashboard();
        } else {
          document.getElementById('userWelcome').textContent = `Willkommen zurück, ${session.user.name}!`;
          showScreen('userDashboard');
          initializeUserDashboard();
        }
        
        // Initialize payment requests
        if (typeof initializePaymentRequests === 'function') {
          initializePaymentRequests();
        }
        
        // Show welcome toast
        setTimeout(() => {
          toast.success(`Automatisch angemeldet als ${session.user.name}`);
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
    document.getElementById('adminWelcome').textContent = `Admin Dashboard - ${window.currentUser.name}`;
    showScreen('adminDashboard');
    initializeAdminDashboard();
    toast.info('Zur Admin-Ansicht gewechselt');
  } else if (currentScreen === 'adminDashboard') {
    // Switch to user view
    document.getElementById('userWelcome').textContent = `Willkommen, ${window.currentUser.name}!`;
    showScreen('userDashboard');
    initializeUserDashboard();
    toast.info('Zur Benutzer-Ansicht gewechselt');
  }
}

function showAdminLogin() {
  const passwordGroup = document.getElementById('passwordGroup');
  const adminBtn = document.querySelector('.btn-secondary');
  
  if (passwordGroup.style.display === 'none' || passwordGroup.style.display === '') {
    // Passwort-Feld anzeigen
    passwordGroup.style.display = 'block';
    adminBtn.textContent = 'Admin Login';
    adminBtn.onclick = loginAsAdmin;
  } else {
    // Passwort-Feld verstecken
    passwordGroup.style.display = 'none';
    adminBtn.textContent = 'Als Admin anmelden';
    adminBtn.onclick = showAdminLogin;
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
          isAdmin: false
        };
        
        // Save session
        saveSession(window.currentUser);
        
        document.getElementById('userWelcome').textContent = `Willkommen zurück, ${userResult.existingName}!`;
        showScreen('userDashboard');
        // Initialize payment requests BEFORE user dashboard to avoid race condition
        if (typeof initializePaymentRequests === 'function') {
          initializePaymentRequests();
        }
        initializeUserDashboard();
        toast.success(`Willkommen zurück, ${userResult.existingName}!`);
      } else {
        toast.info('Bitte verwende eine andere FH-Kennung oder wende dich an den Administrator.');
        return;
      }
    } else {
      // Erfolgreiche Anmeldung (neuer oder existierender User)
      window.currentUser = {
        name: userResult.name,
        kennung: kennung.toLowerCase(),
        isAdmin: false
      };
      
      // Save session
      saveSession(window.currentUser);
      
      const welcomeMessage = userResult.isExisting ? 
        `Willkommen zurück, ${userResult.name}!` : 
        `Willkommen, ${userResult.name}!`;
      
      document.getElementById('userWelcome').textContent = welcomeMessage;
      showScreen('userDashboard');
      // Initialize payment requests BEFORE user dashboard to avoid race condition
      if (typeof initializePaymentRequests === 'function') {
        initializePaymentRequests();
      }
      initializeUserDashboard();
      toast.success(welcomeMessage);
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
  
  // Kurze Verzögerung für UX
  setTimeout(() => {
    window.currentUser = {
      name: name,
      kennung: kennung.toLowerCase(),
      isAdmin: true
    };
    
    // Save session
    saveSession(window.currentUser);
    
    // Admin Dashboard anzeigen
    document.getElementById('adminWelcome').textContent = `Admin Dashboard - ${name}`;
    showScreen('adminDashboard');
    
    // Admin Dashboard initialisieren
    initializeAdminDashboard();
    
    // Initialize payment requests for admin
    if (typeof initializePaymentRequests === 'function') {
      initializePaymentRequests();
    }
    
    setButtonLoading(adminButton, false);
    toast.success(`Willkommen im Admin-Bereich, ${name}!`);
  }, 800);
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
    
    // 3. Prüfe auf Name-Konflikte
    if (existingUserData && existingUserData.name.toLowerCase() !== name.toLowerCase()) {
      console.log(`⚠️ Name-Konflikt: Existierend=${existingUserData.name}, Eingegeben=${name}`);
      return {
        conflict: true,
        existingName: existingUserData.name
      };
    }
    
    // Prüfe auch entries für Name-Konflikte
    const conflictingNames = Array.from(entriesNames).filter(entryName => 
      entryName.toLowerCase() !== name.toLowerCase()
    );
    
    if (conflictingNames.length > 0) {
      console.log(`⚠️ Name-Konflikt in entries: ${conflictingNames.join(', ')}`);
      return {
        conflict: true,
        existingName: conflictingNames[0]
      };
    }
    
    // 4. User existiert bereits - aktualisiere ihn
    if (existingUserDoc) {
      console.log(`✏️ Aktualisiere existierenden User`);
      await existingUserDoc.ref.update({
        name: name,
        lastLogin: new Date(),
        isAdmin: isAdmin,
        updatedAt: new Date()
      });
      
      return {
        conflict: false,
        isExisting: true,
        name: name,
        kennung: kennung
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
      kennung: kennung
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
