// ==================== NAVIGATION MODULE ====================
// Version: 1.0.1 - Verbesserte Live-Kostenberechnung
// Screen-Management und Event-Listener Setup

function showScreen(screenId) {
  // Alle Screens ausblenden
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });

  // Gewünschten Screen anzeigen
  document.getElementById(screenId).classList.add('active');
}

// Show appropriate dashboard based on user type
function showDashboard() {
  if (window.currentUser && window.currentUser.isAdmin) {
    showAdminDashboard();
  } else {
    showUserDashboard();
  }
}

// Show user dashboard
function showUserDashboard() {
  showScreen('userDashboard');
  initializeUserDashboard();
  updateUserPrintsLabel();
  updateWelcomeMessage();
  updateAdminUI();
}

// Show admin dashboard
function showAdminDashboard() {
  showScreen('adminDashboard');
  initializeAdminDashboard();
  updateWelcomeMessage();
  updateAdminUI();
}

// Show login screen
function showLoginScreen() {
  showScreen('loginScreen');
  // Reset form fields
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  if (loginEmail) loginEmail.value = '';
  if (loginPassword) loginPassword.value = '';
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

      // Always show personalized label (both mobile and desktop)
      userPrintsLabel.textContent = `Aufträge von ${firstName}`;
    }
  } catch (error) {
    console.warn('Could not update user prints label:', error);
  }
}

// Update welcome message in header
function updateWelcomeMessage() {
  try {
    if (window.currentUser && window.currentUser.name) {
      const isMobile = window.innerWidth <= 768;

      // Find or create welcome message element
      let welcomeElement = document.querySelector('.welcome-message');
      if (!welcomeElement) {
        welcomeElement = document.createElement('span');
        welcomeElement.className = 'welcome-message';

        // Insert before the user-info div (works for both user and admin dashboards)
        const userInfo = document.querySelector('.user-info');
        if (userInfo && userInfo.parentNode) {
          userInfo.parentNode.insertBefore(welcomeElement, userInfo);
        }
      }

      if (isMobile) {
        welcomeElement.style.display = 'none';
      } else {
        welcomeElement.style.display = 'inline-block';

        // Show welcome message without admin status
        welcomeElement.textContent = `Willkommen, ${window.currentUser.name}!`;

        // Make welcome message clickable for profile modal
        if (typeof makeWelcomeMessageClickable === 'function') {
          makeWelcomeMessageClickable();
        }
      }

      console.log('✅ Welcome message updated:', welcomeElement.textContent);
    }
  } catch (error) {
    console.warn('Could not update welcome message:', error);
  }
}

// Helper function to wait for updateMachineOverview (fallback implementation)
function waitForUpdateMachineOverview(callback, maxAttempts = 10) {
  let attempts = 0;
  const checkFunction = () => {
    attempts++;
    if (typeof updateMachineOverview === 'function') {
      console.log('🔄 updateMachineOverview function found after', attempts, 'attempts');
      callback();
    } else if (attempts < maxAttempts) {
      console.log('⏳ Waiting for updateMachineOverview function... (attempt', attempts, '/', maxAttempts, ')');
      setTimeout(checkFunction, 500);
    } else {
      console.warn('⚠️ updateMachineOverview function not available after', maxAttempts, 'attempts');
    }
  };
  checkFunction();
}

// Dashboard-Initialisierung
function initializeUserDashboard() {
  // Show/hide admin elements based on user type
  updateAdminUI();

  // Update machine overview for user dashboard
  waitForUpdateMachineOverview(() => {
    console.log('🔄 updateMachineOverview called from initializeUserDashboard');
    updateMachineOverview();
  });

  // Warten bis alle Funktionen verfügbar sind
  if (typeof loadAllFormData === 'function') {
    console.log("🔄 Lade alle Formulardaten...");
    loadAllFormData().then(() => {
      console.log("✅ Alle Formulardaten geladen");
      setupEventListeners();
    }).catch(error => {
      console.error("❌ Fehler beim Laden der Formulardaten:", error);
      // Fallback zu einzelnen Funktionen
      if (typeof loadMaterials === 'function' && typeof loadMasterbatches === 'function') {
        loadMaterials().then(() => {
          loadMasterbatches().then(() => {
            setupEventListeners();
          });
        });
      }
    });
  } else if (typeof loadMaterials === 'function' && typeof loadMasterbatches === 'function') {
    // Fallback für ältere Versionen
    console.log("🔄 Fallback: Lade Materialien und Masterbatches...");
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
  } else {
    console.warn("⚠️ User Services Funktion noch nicht verfügbar");
    setTimeout(() => {
      if (typeof initializeUserServices === 'function') {
        console.log('🔄 initializeUserServices called with delay');
        initializeUserServices();
      }
    }, 500);
  }

  // Notification badges für User initialisieren
  if (typeof initNotificationBadges === 'function') {
    initNotificationBadges();
  }

  // Personal training records are loaded on demand in the profile, not on the dashboard.
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

  // Update welcome message for admin dashboard
  updateWelcomeMessage();

  // Update machine overview after a delay to ensure printer data is loaded
  waitForUpdateMachineOverview(() => {
    console.log('🔄 updateMachineOverview called from initializeAdminDashboard');
    updateMachineOverview();
  });
}

// Event Listeners einrichten
function setupEventListeners() {
  console.log("🔧 Event Listeners werden eingerichtet...");

  // Update user prints label with user's name (after dashboard is loaded)
  updateUserPrintsLabel();

  // Update welcome message
  updateWelcomeMessage();

  // Add resize listener for responsive label updates
  window.addEventListener('resize', function() {
    if (window.currentUser && window.currentUser.name) {
      updateUserPrintsLabel();
      updateWelcomeMessage();
    }
  });

  // Live-Kostenberechnung
  const materialMenge = document.getElementById("materialMenge");
  const masterbatchMenge = document.getElementById("masterbatchMenge");
  const material = document.getElementById("material");
  const masterbatch = document.getElementById("masterbatch");
  const printer = document.getElementById("printer");
  const printTime = document.getElementById("printTime");
  const ownMaterialUsed = document.getElementById("ownMaterialUsed");

  console.log("📊 Elemente gefunden:", {
    materialMenge: !!materialMenge,
    masterbatchMenge: !!masterbatchMenge,
    material: !!material,
    masterbatch: !!masterbatch,
    printer: !!printer,
    printTime: !!printTime,
    ownMaterialUsed: !!ownMaterialUsed
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
  if (printer) {
    printer.addEventListener("change", calculateCostPreview);
    console.log("✅ Printer Change Event Listener gesetzt");
  }
  if (printTime) {
    printTime.addEventListener("input", throttledCalculateCost);
    printTime.addEventListener("keyup", throttledCalculateCost);
    console.log("✅ Print Time Event Listeners gesetzt");
  }
  if (ownMaterialUsed) {
    ownMaterialUsed.addEventListener("change", calculateCostPreview);
    console.log("✅ Own Material Used Change Event Listener gesetzt");
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

// Screen navigation functions
function showPrinterStatus() {
    showScreen('printerStatus');
    console.log('🖨️ Printer Status Screen angezeigt');
}

function showUserEntries() {
    showScreen('userEntries');
    console.log('📋 User Entries Screen angezeigt');
}

function showAllEntries() {
    showScreen('allEntries');
    console.log('📋 All Entries Screen angezeigt');
}

function showMaterialOrders() {
    showScreen('materialOrders');
    console.log('📦 Material Orders Screen angezeigt');
}

function showEquipmentManagement() {
    showScreen('equipmentManagement');
    console.log('🔧 Equipment Management Screen angezeigt');
}

function showPaymentRequests() {
    showScreen('paymentRequests');
    console.log('💰 Payment Requests Screen angezeigt');
}

function showUserManagement() {
    showScreen('userManagement');
    console.log('👥 User Management Screen angezeigt');
}

function showAssetManagement() {
    showScreen('assetManagement');
    console.log('📊 Asset Management Screen angezeigt');
}

// Global exports
window.showScreen = showScreen;
window.showDashboard = showDashboard;
window.showUserDashboard = showUserDashboard;
window.showAdminDashboard = showAdminDashboard;
window.showLoginScreen = showLoginScreen;
window.updateAdminUI = updateAdminUI;
window.updateUserPrintsLabel = updateUserPrintsLabel;
window.updateWelcomeMessage = updateWelcomeMessage;
window.waitForUpdateMachineOverview = waitForUpdateMachineOverview;
window.initializeUserDashboard = initializeUserDashboard;
window.initializeAdminDashboard = initializeAdminDashboard;
window.setupEventListeners = setupEventListeners;
window.toggleAdminView = toggleAdminView;
window.showPrinterStatus = showPrinterStatus;
window.showUserEntries = showUserEntries;
window.showAllEntries = showAllEntries;
window.showMaterialOrders = showMaterialOrders;
window.showEquipmentManagement = showEquipmentManagement;
window.showPaymentRequests = showPaymentRequests;
window.showUserManagement = showUserManagement;
window.showAssetManagement = showAssetManagement;
