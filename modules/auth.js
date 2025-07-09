// ==================== AUTHENTICATION MODULE ====================

/**
 * Zeigt das Admin-Login-Feld an oder versteckt es
 */
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

/**
 * Prüft ob eine FH-Kennung bereits existiert und von einer anderen Person verwendet wird
 * @param {string} kennung - Die zu prüfende FH-Kennung
 * @param {string} currentName - Der aktuelle Name des Users
 * @returns {Object|null} Existierende User-Daten oder null
 */
async function checkExistingKennung(kennung, currentName) {
  try {
    // Alle Drucke mit dieser Kennung abrufen
    const snapshot = await db.collection('entries').where('kennung', '==', kennung).get();
    
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

/**
 * Login als normaler User
 */
async function loginAsUser() {
  const name = document.getElementById('loginName').value.trim();
  const kennung = document.getElementById('loginKennung').value.trim();
  
  if (!name || !kennung) {
    alert('Bitte Name und FH-Kennung eingeben!');
    return;
  }
  
  // Prüfen ob Kennung bereits von jemand anderem verwendet wird
  const existingUser = await checkExistingKennung(kennung.toLowerCase(), name);
  if (existingUser) {
    const userChoice = confirm(
      `⚠️ FH-Kennung bereits registriert!\n\n` +
      `Die Kennung "${kennung}" ist bereits für "${existingUser.name}" registriert.\n\n` +
      `Möchtest du:\n` +
      `✅ OK = Als "${existingUser.name}" anmelden\n` +
      `❌ Abbrechen = Andere Kennung verwenden`
    );
    
    if (userChoice) {
      // Als existierender User anmelden
      currentUser = {
        name: existingUser.name,
        kennung: kennung.toLowerCase(),
        isAdmin: false
      };
      document.getElementById('userWelcome').textContent = `Willkommen zurück, ${existingUser.name}!`;
    } else {
      alert('Bitte verwende eine andere FH-Kennung oder wende dich an den Administrator.');
      return;
    }
  } else {
    // Neue Kombination - User in Firestore speichern
    currentUser = {
      name: name,
      kennung: kennung.toLowerCase(),
      isAdmin: false
    };
    
    try {
      // User-Dokument in Firestore erstellen
      await db.collection('users').add({
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
  }
  
  showScreen('userDashboard');
  
  // User Dashboard initialisieren
  initializeUserDashboard();
}

/**
 * Login als Administrator
 */
function loginAsAdmin() {
  const name = document.getElementById('loginName').value.trim();
  const kennung = document.getElementById('loginKennung').value.trim();
  const password = document.getElementById('adminPassword').value;
  
  if (!name || !kennung) {
    alert('Bitte Name und FH-Kennung eingeben!');
    return;
  }
  
  if (password !== ADMIN_PASSWORD) {
    alert('Falsches Admin-Passwort!');
    return;
  }
  
  currentUser = {
    name: name,
    kennung: kennung.toLowerCase(),
    isAdmin: true
  };
  
  // Admin Dashboard anzeigen
  document.getElementById('adminWelcome').textContent = `Admin Dashboard - ${name}`;
  showScreen('adminDashboard');
  
  // Admin Dashboard initialisieren
  initializeAdminDashboard();
}

/**
 * Benutzer ausloggen
 */
function logout() {
  currentUser = { name: '', kennung: '', isAdmin: false };
  showScreen('loginScreen');
  
  // Felder zurücksetzen
  document.getElementById('loginName').value = '';
  document.getElementById('loginKennung').value = '';
  document.getElementById('adminPassword').value = '';
}

// Export für Modulverwendung
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showAdminLogin,
    checkExistingKennung,
    loginAsUser,
    loginAsAdmin,
    logout
  };
}
