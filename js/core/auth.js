// ==================== AUTHENTICATION MODULE ====================
// Login/Logout und Benutzer-Validierung

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
    
    // Prüfen ob Kennung bereits von jemand anderem verwendet wird
    const existingUser = await checkExistingKennung(kennung.toLowerCase(), name);
    if (existingUser) {
      loading.hide(loadingId);
      
      // Moderne Bestätigung verwenden
      const confirmMessage = `FH-Kennung bereits registriert!

Die Kennung "${kennung}" ist bereits für "${existingUser.name}" registriert.

Möchtest du dich als "${existingUser.name}" anmelden?`;
      
      const userChoice = await toast.confirm(
        confirmMessage,
        `Als "${existingUser.name}" anmelden`,
        'Andere Kennung verwenden'
      );
      
      if (userChoice) {
        // Als existierender User anmelden
        window.currentUser = {
          name: existingUser.name,
          kennung: kennung.toLowerCase(),
          isAdmin: false
        };
        document.getElementById('userWelcome').textContent = `Willkommen zurück, ${existingUser.name}!`;
        showScreen('userDashboard');
        initializeUserDashboard();
        toast.success(`Willkommen zurück, ${existingUser.name}!`);
      } else {
        toast.info('Bitte verwende eine andere FH-Kennung oder wende dich an den Administrator.');
        return;
      }
    } else {
      // Neue Kombination - User in Firestore speichern
      window.currentUser = {
        name: name,
        kennung: kennung.toLowerCase(),
        isAdmin: false
      };
      
      try {
        // User-Dokument in Firestore erstellen
        await window.db.collection('users').add({
          name: name,
          kennung: kennung.toLowerCase(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('Neuer User in Firestore erstellt:', kennung.toLowerCase());
      } catch (error) {
        console.warn('Fehler beim Erstellen des User-Dokuments:', error);
        // Trotzdem fortfahren - nicht kritisch für User-Login
      }
      
      document.getElementById('userWelcome').textContent = `Willkommen, ${name}!`;
      showScreen('userDashboard');
      initializeUserDashboard();
      toast.success(`Willkommen, ${name}!`);
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
    
    // Admin Dashboard anzeigen
    document.getElementById('adminWelcome').textContent = `Admin Dashboard - ${name}`;
    showScreen('adminDashboard');
    
    // Admin Dashboard initialisieren
    initializeAdminDashboard();
    
    setButtonLoading(adminButton, false);
    toast.success(`Willkommen im Admin-Bereich, ${name}!`);
  }, 800);
}

function logout() {
  console.log("👋 User logout initiated...");
  
  // Global cleanup of all listeners and components
  if (typeof window.globalCleanup === 'function') {
    window.globalCleanup();
  }
  
  // Legacy cleanup for specific components
  if (typeof cleanupUserDashboard === 'function') {
    cleanupUserDashboard();
  }
  
  // Clear user state
  window.currentUser = { name: '', kennung: '', isAdmin: false };
  
  // Reset app initialization flags
  if (typeof window.appInitialized !== 'undefined') {
    window.appInitialized = false;
  }
  
  // Clear form data
  const fieldsToReset = [
    'loginName', 'loginKennung', 'adminPassword',
    'material', 'materialMenge', 'masterbatch', 'masterbatchMenge',
    'jobName', 'jobNotes'
  ];
  
  fieldsToReset.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = '';
    }
  });
  
  // Reset cost preview
  const costPreview = document.getElementById('costPreview');
  if (costPreview) {
    costPreview.textContent = '0,00 €';
  }
  
  // Close all modals
  if (typeof closeAllModals === 'function') {
    closeAllModals();
  }
  
  // Clear any stored data
  try {
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('lastLogin');
  } catch (error) {
    console.warn("Could not clear storage:", error);
  }
  
  // Return to login screen
  showScreen('loginScreen');
  
  // Re-initialize app for next login
  setTimeout(() => {
    if (typeof window.retryAppInitialization === 'function') {
      window.retryAppInitialization();
    }
  }, 500);
  
  console.log("✅ Logout completed successfully");
}

// Benutzer-Validierung
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
