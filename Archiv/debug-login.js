// Minimale Login-Funktionen für Debugging
console.log("🔧 Login-Debugging aktiviert");

// Test-Funktionen
function testLogin() {
  console.log("✅ Login-Button funktioniert!");
  alert("Login-Button reagiert!");
}

function testAdminLogin() {
  console.log("✅ Admin-Login-Button funktioniert!");
  alert("Admin-Login-Button reagiert!");
}

// Debugging: Alle Event-Handler registrieren
document.addEventListener('DOMContentLoaded', function() {
  console.log("🔧 DOM geladen, Event-Handler werden registriert...");
  
  // Backup-Event-Handler für Buttons
  setTimeout(() => {
    const loginBtn = document.querySelector('.btn-primary');
    const adminBtn = document.querySelector('.btn-secondary');
    
    if (loginBtn) {
      loginBtn.addEventListener('click', testLogin);
      console.log("✅ Login-Button Event-Handler registriert");
    }
    
    if (adminBtn) {
      adminBtn.addEventListener('click', testAdminLogin);
      console.log("✅ Admin-Button Event-Handler registriert");
    }
  }, 100);
});
