// ==================== NAVIGATION MODULE ====================
// Screen-Management und Event-Listener Setup

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
                console.log("✅ User data refreshed for dashboard view (retry)");
              } else {
                setTimeout(retryDataLoad, 1000); // Retry again if still not ready
              }
            };
            setTimeout(retryDataLoad, 1000);
            return;
          }
          
          if (typeof loadUserStats === 'function') {
            loadUserStats().catch(error => console.warn("User stats loading failed:", error));
          }
          if (typeof loadUserEntries === 'function') {
            loadUserEntries().catch(error => console.warn("User entries loading failed:", error));
          }
          console.log("✅ User data refreshed for dashboard view");
        } catch (error) {
          console.warn("Error refreshing user data:", error);
        }
      }, 100); // Short delay to ensure screen is fully loaded
    } else if (screenId === 'adminDashboard' && window.currentUser && window.currentUser.isAdmin) {
      // Load admin data when switching to admin dashboard
      setTimeout(() => {
        try {
          // Ensure Firebase is ready before loading data
          if (!window.db) {
            console.warn("⚠️ Firebase not ready when switching to adminDashboard, will retry...");
            const retryDataLoad = () => {
              if (window.db) {
                if (typeof loadAdminStats === 'function') {
                  loadAdminStats().catch(error => console.warn("Admin stats loading failed:", error));
                }
                if (typeof loadAllEntries === 'function') {
                  loadAllEntries().catch(error => console.warn("Admin entries loading failed:", error));
                }
                console.log("✅ Admin data refreshed for dashboard view (retry)");
              } else {
                setTimeout(retryDataLoad, 1000);
              }
            };
            setTimeout(retryDataLoad, 1000);
            return;
          }
          
          if (typeof loadAdminStats === 'function') {
            loadAdminStats().catch(error => console.warn("Admin stats loading failed:", error));
          }
          if (typeof loadAllEntries === 'function') {
            loadAllEntries().catch(error => console.warn("Admin entries loading failed:", error));
          }
          console.log("✅ Admin data refreshed for dashboard view");
        } catch (error) {
          console.warn("Error refreshing admin data:", error);
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

// Enhanced dashboard initialization with better error handling
function initializeUserDashboard() {
  console.log("🏠 Initializing user dashboard...");
  
  try {
    // Check if user is properly logged in
    if (!window.currentUser || !window.currentUser.name) {
      console.error("❌ No valid user session for dashboard");
      window.toast?.error("Benutzer-Session ungültig. Bitte melden Sie sich erneut an.");
      showScreen('loginScreen');
      return false;
    }
    
    // Check Firebase availability
    if (!window.db) {
      console.warn("⚠️ Firebase not ready, scheduling retry...");
      setTimeout(() => {
        if (window.db) {
          console.log("🔄 Retrying user dashboard initialization...");
          initializeUserDashboard();
        }
      }, 2000);
      return false;
    }
    
    // Load materials with error handling
    const loadMaterialsPromise = typeof loadMaterials === 'function' ? 
      loadMaterials().catch(error => {
        console.error("❌ Material loading failed:", error);
        return null;
      }) : Promise.resolve();
      
    const loadMasterbatchesPromise = typeof loadMasterbatches === 'function' ? 
      loadMasterbatches().catch(error => {
        console.error("❌ Masterbatch loading failed:", error);
        return null;
      }) : Promise.resolve();
    
    // Setup event listeners after materials load
    Promise.all([loadMaterialsPromise, loadMasterbatchesPromise])
      .then(() => {
        setupEventListeners();
        console.log("✅ User dashboard core setup completed");
      })
      .catch(error => {
        console.error("❌ Dashboard setup failed:", error);
        window.toast?.warning("Einige Dashboard-Funktionen sind möglicherweise nicht verfügbar");
      });
    
    // Note: User data (stats and entries) will be loaded automatically by showScreen() 
    // when switching to userDashboard view - no need to load here to avoid duplication
    
    return true;
  } catch (error) {
    console.error("❌ User dashboard initialization failed:", error);
    window.toast?.error("Dashboard konnte nicht initialisiert werden");
    return false;
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
  console.log("🔧 Setting up event listeners...");
  
  try {
    // Get form elements safely
    const elements = {
      materialMenge: document.getElementById("materialMenge"),
      masterbatchMenge: document.getElementById("masterbatchMenge"),
      material: document.getElementById("material"),
      masterbatch: document.getElementById("masterbatch")
    };
    
    console.log("📊 Form elements found:", {
      materialMenge: !!elements.materialMenge,
      masterbatchMenge: !!elements.masterbatchMenge,
      material: !!elements.material,
      masterbatch: !!elements.masterbatch
    });
    
    // Setup live cost calculation with error handling
    const safeCalculateCost = () => {
      try {
        if (typeof throttledCalculateCost === 'function') {
          throttledCalculateCost();
        } else if (typeof calculateCostPreview === 'function') {
          calculateCostPreview();
        }
      } catch (error) {
        console.warn("Cost calculation error:", error);
      }
    };
    
    // Material quantity listeners
    if (elements.materialMenge) {
      elements.materialMenge.addEventListener("input", safeCalculateCost);
      elements.materialMenge.addEventListener("keyup", safeCalculateCost);
      console.log("✅ Material quantity listeners set");
    }
    
    if (elements.masterbatchMenge) {
      elements.masterbatchMenge.addEventListener("input", safeCalculateCost);
      elements.masterbatchMenge.addEventListener("keyup", safeCalculateCost);
      console.log("✅ Masterbatch quantity listeners set");
    }
    
    // Material selection listeners
    if (elements.material) {
      elements.material.addEventListener("change", safeCalculateCost);
      console.log("✅ Material selection listener set");
    }
    
    if (elements.masterbatch) {
      elements.masterbatch.addEventListener("change", safeCalculateCost);
      console.log("✅ Masterbatch selection listener set");
    }
    
    // German number format validation with error handling
    const setupNumberValidation = (element, fieldName) => {
      if (!element) return;
      
      element.addEventListener("blur", function() {
        try {
          const value = this.value;
          if (value) {
            const parsed = parseGermanNumber(value);
            if (!isNaN(parsed) && parsed > 0) {
              this.value = parsed.toFixed(2).replace('.', ',');
              safeCalculateCost();
            }
          }
        } catch (error) {
          console.warn(`Number validation error for ${fieldName}:`, error);
        }
      });
    };
    
    setupNumberValidation(elements.materialMenge, "materialMenge");
    setupNumberValidation(elements.masterbatchMenge, "masterbatchMenge");
    
    // Initial cost calculation
    setTimeout(() => {
      safeCalculateCost();
    }, 1000);
    
    console.log("✅ Event listeners setup completed");
    return true;
  } catch (error) {
    console.error("❌ Event listeners setup failed:", error);
    return false;
  }
}
