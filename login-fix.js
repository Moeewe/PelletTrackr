// ==================== LOGIN FUNKTIONEN FIX ====================
// Diese Datei behebt die nicht reagierenden Login-Buttons

console.log("🔧 Login-Fix wird geladen...");

// Globale Variable für currentUser (falls nicht vorhanden)
if (typeof currentUser === 'undefined') {
  window.currentUser = { name: '', kennung: '', isAdmin: false };
}

// Stelle sicher, dass die Login-Funktionen verfügbar sind
window.loginAsUser = function() {
  console.log("🔐 User-Login ausgelöst");
  
  const name = document.getElementById('loginName').value.trim();
  const kennung = document.getElementById('loginKennung').value.trim();
  
  console.log("Login-Daten:", { name, kennung });
  
  if (!name || !kennung) {
    alert('Bitte Name und FH-Kennung eingeben!');
    return;
  }
  
  // User-Login durchführen
  currentUser = {
    name: name,
    kennung: kennung.toLowerCase(),
    isAdmin: false
  };
  
  console.log("CurrentUser gesetzt:", currentUser);
  
  const welcomeElement = document.getElementById('userWelcome');
  if (welcomeElement) {
    welcomeElement.textContent = `Willkommen, ${name}!`;
  }
  
  showScreen('userDashboard');
  
  // User Dashboard initialisieren (falls verfügbar)
  setTimeout(() => {
    if (typeof initializeUserDashboard === 'function') {
      console.log("🔄 Initialisiere User Dashboard");
      initializeUserDashboard();
    } else {
      console.warn("initializeUserDashboard nicht verfügbar");
    }
  }, 100);
};

window.showAdminLogin = function() {
  console.log("🔐 Admin-Login Umschalter ausgelöst");
  
  const passwordGroup = document.getElementById('passwordGroup');
  const adminBtn = document.querySelector('.btn-secondary');
  
  if (!passwordGroup || !adminBtn) {
    console.error("Passwort-Gruppe oder Admin-Button nicht gefunden");
    return;
  }
  
  if (passwordGroup.style.display === 'none' || passwordGroup.style.display === '') {
    passwordGroup.style.display = 'block';
    adminBtn.textContent = 'Admin Login';
    adminBtn.onclick = window.loginAsAdmin;
    console.log("Admin-Login-Feld angezeigt");
  } else {
    passwordGroup.style.display = 'none';
    adminBtn.textContent = 'Als Admin anmelden';
    adminBtn.onclick = window.showAdminLogin;
    console.log("Admin-Login-Feld versteckt");
  }
};

window.loginAsAdmin = function() {
  console.log("🔐 Admin-Login ausgelöst");
  
  const name = document.getElementById('loginName').value.trim();
  const kennung = document.getElementById('loginKennung').value.trim();
  const password = document.getElementById('adminPassword').value;
  
  console.log("Admin-Login-Daten:", { name, kennung, passwordLength: password.length });
  
  if (!name || !kennung) {
    alert('Bitte Name und FH-Kennung eingeben!');
    return;
  }
  
  if (password !== 'fgf2024admin') {
    alert('Falsches Admin-Passwort!');
    return;
  }
  
  // Admin-Login durchführen
  currentUser = {
    name: name,
    kennung: kennung.toLowerCase(),
    isAdmin: true
  };
  
  console.log("Admin CurrentUser gesetzt:", currentUser);
  
  const welcomeElement = document.getElementById('adminWelcome');
  if (welcomeElement) {
    welcomeElement.textContent = `Admin Dashboard - ${name}`;
  }
  
  showScreen('adminDashboard');
  
  // Admin Dashboard initialisieren (falls verfügbar)
  setTimeout(() => {
    if (typeof initializeAdminDashboard === 'function') {
      console.log("🔄 Initialisiere Admin Dashboard");
      initializeAdminDashboard();
    } else {
      console.warn("initializeAdminDashboard nicht verfügbar");
    }
  }, 100);
};

// Stelle sicher, dass showScreen verfügbar ist
window.showScreen = function(screenId) {
  console.log("📱 Zeige Screen:", screenId);
  
  // Alle Screens ausblenden
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => {
    screen.classList.remove('active');
  });
  
  // Gewünschten Screen anzeigen
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.add('active');
    console.log("✅ Screen gewechselt zu:", screenId);
  } else {
    console.error("❌ Screen nicht gefunden:", screenId);
  }
};

window.logout = function() {
  console.log("🚪 Logout ausgelöst");
  currentUser = { name: '', kennung: '', isAdmin: false };
  
  // Passwort-Feld verstecken und Button zurücksetzen
  const passwordGroup = document.getElementById('passwordGroup');
  const adminBtn = document.querySelector('.btn-secondary');
  
  if (passwordGroup) {
    passwordGroup.style.display = 'none';
  }
  
  if (adminBtn) {
    adminBtn.textContent = 'Als Admin anmelden';
    adminBtn.onclick = window.showAdminLogin;
  }
  
  // Felder leeren
  const nameField = document.getElementById('loginName');
  const kennungField = document.getElementById('loginKennung');
  const passwordField = document.getElementById('adminPassword');
  
  if (nameField) nameField.value = '';
  if (kennungField) kennungField.value = '';
  if (passwordField) passwordField.value = '';
  
  showScreen('loginScreen');
};

// Backup-Event-Handler für Buttons registrieren
function setupLoginButtons() {
  console.log("🔧 Repariere Login-Buttons...");
  
  const loginBtn = document.querySelector('.btn-primary');
  const adminBtn = document.querySelector('.btn-secondary');
  
  if (loginBtn) {
    // Entferne alte Event-Handler und setze neue
    loginBtn.onclick = window.loginAsUser;
    loginBtn.removeAttribute('onclick');
    loginBtn.setAttribute('onclick', 'loginAsUser()');
    console.log("✅ Login-Button repariert");
  } else {
    console.error("❌ Login-Button nicht gefunden");
  }
  
  if (adminBtn) {
    adminBtn.onclick = window.showAdminLogin;
    adminBtn.removeAttribute('onclick');
    adminBtn.setAttribute('onclick', 'showAdminLogin()');
    console.log("✅ Admin-Button repariert");
  } else {
    console.error("❌ Admin-Button nicht gefunden");
  }
}

// DOM Ready Event
document.addEventListener('DOMContentLoaded', function() {
  console.log("🔧 Login-Fix: DOM bereit");
  
  // Passwort-Gruppe initial verstecken
  const passwordGroup = document.getElementById('passwordGroup');
  if (passwordGroup) {
    passwordGroup.style.display = 'none';
  }
  
  // Buttons reparieren
  setupLoginButtons();
  
  // Backup: Buttons nochmal nach kurzer Zeit reparieren
  setTimeout(setupLoginButtons, 250);
  setTimeout(setupLoginButtons, 500);
  setTimeout(setupLoginButtons, 1000);
  
  // Initialer Login-Screen
  showScreen('loginScreen');
});

// Backup: Event-Handler auch über window.onload registrieren
window.addEventListener('load', function() {
  console.log("🔧 Window loaded - weitere Backup-Reparatur");
  setTimeout(setupLoginButtons, 100);
});

console.log("✅ Login-Fix geladen");
