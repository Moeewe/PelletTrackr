// ==================== NAVIGATION MODULE ====================
// Screen-Management und Event-Listener Setup

function showScreen(screenId) {
  // Alle Screens ausblenden
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  
  // Gewünschten Screen anzeigen
  document.getElementById(screenId).classList.add('active');
}

// Update admin UI elements based on current user
function updateAdminUI() {
  const userAdminBadge = document.getElementById('userAdminBadge');
  const adminToggleBtn = document.getElementById('adminToggleBtn');
  
  if (window.currentUser && window.currentUser.isAdmin) {
    // Show admin badge and toggle button for admin users
    if (userAdminBadge) {
      userAdminBadge.style.display = 'inline-block';
    }
    if (adminToggleBtn) {
      adminToggleBtn.style.display = 'inline-block';
    }
  } else {
    // Hide admin elements for regular users
    if (userAdminBadge) {
      userAdminBadge.style.display = 'none';
    }
    if (adminToggleBtn) {
      adminToggleBtn.style.display = 'none';
    }
  }
}

// Update user prints label with user's first name
function updateUserPrintsLabel() {
  try {
    const userPrintsLabel = document.getElementById('userPrintsLabel');
    if (userPrintsLabel && window.currentUser && window.currentUser.name) {
      // Extract first name (everything before the first space)
      const firstName = window.currentUser.name.split(' ')[0];
      userPrintsLabel.textContent = `${firstName}'s Drucke`;
    }
  } catch (error) {
    console.warn('Could not update user prints label:', error);
  }
}

// Dashboard-Initialisierung
function initializeUserDashboard() {
  // Show/hide admin elements based on user type
  updateAdminUI();
  
  // Update user prints label with user's name
  updateUserPrintsLabel();
  
  // Warten bis alle Funktionen verfügbar sind
  if (typeof loadMaterials === 'function' && typeof loadMasterbatches === 'function') {
    loadMaterials().then(() => {
      loadMasterbatches().then(() => {
        setupEventListeners();
      });
    });
  } else {
    console.warn("⚠️ Material-Loading-Funktionen noch nicht verfügbar, versuche in 500ms erneut");
    setTimeout(() => {
      initializeUserDashboard();
    }, 500);
    return;
  }
  
  // Stats und Entries laden (diese sind weniger kritisch)
  if (typeof loadUserStats === 'function') {
    loadUserStats();
  }
  if (typeof loadUserEntries === 'function') {
    loadUserEntries();
  }
  
  // User Services initialisieren
  if (typeof initializeUserServices === 'function') {
    initializeUserServices();
  }
}

function initializeAdminDashboard() {
  // Warten bis Admin-Funktionen verfügbar sind
  if (typeof loadAdminStats === 'function') {
    loadAdminStats();
  } else {
    console.warn("⚠️ Admin-Stats-Funktion noch nicht verfügbar");
    setTimeout(() => {
      if (typeof loadAdminStats === 'function') loadAdminStats();
    }, 500);
  }
  
  if (typeof loadAllEntries === 'function') {
    loadAllEntries();
  } else {
    console.warn("⚠️ LoadAllEntries-Funktion noch nicht verfügbar");
    setTimeout(() => {
      if (typeof loadAllEntries === 'function') loadAllEntries();
    }, 500);
  }
  
  // Notification badges für Admin initialisieren
  if (typeof initializeNotificationBadges === 'function') {
    initializeNotificationBadges();
  }
}

// Event Listeners einrichten
function setupEventListeners() {
  console.log("🔧 Event Listeners werden eingerichtet...");
  
  // Live-Kostenberechnung
  const materialMenge = document.getElementById("materialMenge");
  const masterbatchMenge = document.getElementById("masterbatchMenge");
  const material = document.getElementById("material");
  const masterbatch = document.getElementById("masterbatch");
  
  console.log("📊 Elemente gefunden:", {
    materialMenge: !!materialMenge,
    masterbatchMenge: !!masterbatchMenge,
    material: !!material,
    masterbatch: !!masterbatch
  });
  
  if (materialMenge) {
    materialMenge.addEventListener("input", throttledCalculateCost);
    materialMenge.addEventListener("keyup", throttledCalculateCost);
    console.log("✅ Material Menge Event Listeners gesetzt");
  }
  if (masterbatchMenge) {
    masterbatchMenge.addEventListener("input", throttledCalculateCost);
    masterbatchMenge.addEventListener("keyup", throttledCalculateCost);
    console.log("✅ Masterbatch Menge Event Listeners gesetzt");
  }
  if (material) {
    material.addEventListener("change", calculateCostPreview);
    console.log("✅ Material Change Event Listener gesetzt");
  }
  if (masterbatch) {
    masterbatch.addEventListener("change", calculateCostPreview);
    console.log("✅ Masterbatch Change Event Listener gesetzt");
  }
  
  // Eingabevalidierung für deutsche Zahlenformate
  if (materialMenge) {
    materialMenge.addEventListener("blur", function() {
      var value = this.value;
      if (value) {
        var parsed = parseGermanNumber(value);
        if (parsed > 0) {
          this.value = parsed.toFixed(2).replace('.', ',');
          calculateCostPreview(); // Preisberechnung nach Formatierung
        }
      }
    });
  }
  
  if (masterbatchMenge) {
    masterbatchMenge.addEventListener("blur", function() {
      var value = this.value;
      if (value) {
        var parsed = parseGermanNumber(value);
        if (parsed > 0) {
          this.value = parsed.toFixed(2).replace('.', ',');
          calculateCostPreview(); // Preisberechnung nach Formatierung
        }
      }
    });
  }
  
  // Initialer Aufruf um sicherzustellen, dass alles funktioniert
  setTimeout(() => {
    calculateCostPreview();
  }, 1000);
}
