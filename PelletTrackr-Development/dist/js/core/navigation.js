// ==================== NAVIGATION MODULE ====================
// Screen-Management und Event-Listener Setup

/**
 * Navigate to appropriate home screen based on user type
 */
function navigateToHome() {
    try {
        if (!window.currentUser) {
            // Not logged in - go to login
            showScreen('loginScreen');
            console.log("🏠 Navigated to login (no user)");
            return;
        }
        
        if (window.currentUser.isAdmin) {
            // Admin user - go to admin dashboard
            showScreen('adminDashboard');
            console.log("🏠 Navigated to admin dashboard");
        } else {
            // Regular user - go to user dashboard
            showScreen('userDashboard');
            console.log("🏠 Navigated to user dashboard");
        }
        
        // Trigger haptic feedback on mobile
        if (window.mobileEnhancements) {
            window.mobileEnhancements.triggerHapticFeedback('light');
        }
        
    } catch (error) {
        console.error("❌ Error in home navigation:", error);
        // Fallback to login screen
        showScreen('loginScreen');
    }
}

function showScreen(screenId) {
  try {
    if (!screenId || typeof screenId !== 'string') {
      console.error("Invalid screen ID:", screenId);
      return false;
    }
    
    // Check if screen exists
    const targetScreen = document.getElementById(screenId);
    if (!targetScreen) {
      console.error(`Screen not found: ${screenId}`);
      return false;
    }
    
    // Alle Screens ausblenden
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    
    // Gewünschten Screen anzeigen
    targetScreen.classList.add('active');
    
    // Auto-load data when switching to specific screens
    if (screenId === 'userDashboard' && window.currentUser && !window.currentUser.isAdmin) {
        // Load user data when switching to user dashboard
        setTimeout(() => {
            try {
                // Ensure Firebase is ready before loading data
                if (!window.db) {
                    console.warn("⚠️ Firebase not ready when switching to userDashboard, will retry...");
                    // Retry after Firebase becomes available
                    const retryDataLoad = () => {
                        if (window.db) {
                            if (typeof loadUserStats === 'function') {
                                loadUserStats().catch(error => console.warn("User stats loading failed:", error));
                            }
                            if (typeof loadUserEntries === 'function') {
                                loadUserEntries().catch(error => console.warn("User entries loading failed:", error));
                            }
                        } else {
                            setTimeout(retryDataLoad, 500);
                        }
                    };
                    retryDataLoad();
                } else {
                    if (typeof loadUserStats === 'function') {
                        loadUserStats().catch(error => console.warn("User stats loading failed:", error));
                    }
                    if (typeof loadUserEntries === 'function') {
                        loadUserEntries().catch(error => console.warn("User entries loading failed:", error));
                    }
                }
            } catch (error) {
                console.warn("Error loading user data:", error);
            }
        }, 100);
    } else if (screenId === 'adminDashboard' && window.currentUser && window.currentUser.isAdmin) {
        // Load admin data when switching to admin dashboard
        setTimeout(() => {
            try {
                if (!window.db) {
                    console.warn("⚠️ Firebase not ready when switching to adminDashboard, will retry...");
                    const retryDataLoad = () => {
                        if (window.db) {
                            if (typeof loadAdminStats === 'function') {
                                loadAdminStats().catch(error => console.warn("Admin stats loading failed:", error));
                            }
                            if (typeof loadAllEntries === 'function') {
                                loadAllEntries().catch(error => console.warn("All entries loading failed:", error));
                            }
                        } else {
                            setTimeout(retryDataLoad, 500);
                        }
                    };
                    retryDataLoad();
                } else {
                    if (typeof loadAdminStats === 'function') {
                        loadAdminStats().catch(error => console.warn("Admin stats loading failed:", error));
                    }
                    if (typeof loadAllEntries === 'function') {
                        loadAllEntries().catch(error => console.warn("All entries loading failed:", error));
                    }
                    // Initialize notification badge system for admin
                    if (typeof initializeBadgeSystem === 'function') {
                        initializeBadgeSystem();
                    }
                }
            } catch (error) {
                console.warn("Error loading admin data:", error);
            }
        }, 100);
    } else if (screenId === 'adminAssets' && window.currentUser && window.currentUser.isAdmin) {
        // Load asset data when switching to admin assets
        setTimeout(() => {
            try {
                if (window.db) {
                    // Load asset statistics
                    if (typeof loadAssetStats === 'function') {
                        loadAssetStats().catch(error => console.warn("Asset stats loading failed:", error));
                    }
                    
                    // Initialize asset management systems
                    if (typeof initializePrinterManagement === 'function') {
                        initializePrinterManagement();
                    }
                }
            } catch (error) {
                console.warn("Error loading asset data:", error);
            }
        }, 100);
    } else if (screenId === 'userManager' && window.currentUser && window.currentUser.isAdmin) {
        // Load user management data when switching to user manager
        setTimeout(() => {
            try {
                if (window.db) {
                    // Load user statistics
                    if (typeof loadUserManagementStats === 'function') {
                        loadUserManagementStats().catch(error => console.warn("User management stats loading failed:", error));
                    }
                    
                    // Load users for management
                    if (typeof loadUsersForManagement === 'function') {
                        loadUsersForManagement().catch(error => console.warn("Users loading failed:", error));
                    }
                }
            } catch (error) {
                console.warn("Error loading user management data:", error);
            }
        }, 100);
    }
    
    console.log(`📱 Switched to screen: ${screenId}`);
    return true;
  } catch (error) {
    console.error("Error switching screens:", error);
    return false;
  }
}

// Dashboard-Initialisierung
function initializeUserDashboard() {
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
}

function initializeAdminDashboard() {
  console.log("⚙️ Initializing admin dashboard...");
  
  try {
    // Check admin access
    if (!window.currentUser || !window.currentUser.isAdmin) {
      console.error("❌ No admin privileges");
      window.toast?.error("Keine Admin-Berechtigung");
      showScreen('loginScreen');
      return false;
    }
    
    // Check Firebase availability
    if (!window.db) {
      console.warn("⚠️ Firebase not ready for admin dashboard, scheduling retry...");
      setTimeout(() => {
        if (window.db) {
          console.log("🔄 Retrying admin dashboard initialization...");
          initializeAdminDashboard();
        }
      }, 2000);
      return false;
    }
    
    // Load admin data with error handling
    const loadPromises = [];
    
    if (typeof loadAdminStats === 'function') {
      loadPromises.push(
        loadAdminStats().catch(error => {
          console.warn("Admin stats loading failed:", error);
          return null;
        })
      );
    } else {
      console.warn("⚠️ Admin-Stats-Funktion nicht verfügbar");
    }
    
    if (typeof loadAllEntries === 'function') {
      loadPromises.push(
        loadAllEntries().catch(error => {
          console.warn("All entries loading failed:", error);
          return null;
        })
      );
    } else {
      console.warn("⚠️ LoadAllEntries-Funktion nicht verfügbar");
    }
    
    if (typeof loadMaterials === 'function') {
      loadPromises.push(
        loadMaterials().catch(error => {
          console.warn("Materials loading failed for admin:", error);
          return null;
        })
      );
    }
    
    if (typeof loadMasterbatches === 'function') {
      loadPromises.push(
        loadMasterbatches().catch(error => {
          console.warn("Masterbatches loading failed for admin:", error);
          return null;
        })
      );
    }
    
    // Execute all loading operations
    if (loadPromises.length > 0) {
      Promise.allSettled(loadPromises)
        .then((results) => {
          const failed = results.filter(r => r.status === 'rejected').length;
          if (failed > 0) {
            console.warn(`⚠️ ${failed}/${results.length} admin loading operations failed`);
            window.toast?.warning("Einige Admin-Daten konnten nicht geladen werden");
          } else {
            console.log("✅ Admin dashboard loaded successfully");
          }
        })
        .catch(error => {
          console.error("❌ Admin dashboard loading failed:", error);
          window.toast?.error("Admin-Dashboard konnte nicht vollständig geladen werden");
        });
    }
    
    return true;
  } catch (error) {
    console.error("❌ Admin dashboard initialization failed:", error);
    window.toast?.error("Admin-Dashboard konnte nicht initialisiert werden");
    return false;
  }
}

// Enhanced event listeners setup with better error handling
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
