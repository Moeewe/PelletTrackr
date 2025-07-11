/* ===== TOAST NOTIFICATIONS & LOADING SYSTEM ===== */
/* Toast und Loading Funktionen für bessere UX */

// Toast Notification System
class ToastManager {
    constructor() {
        this.container = null;
        this.createContainer();
    }

    createContainer() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ⓘ'
        };

        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${icons[type] || icons.info}</span>
                <span class="toast-message">${message}</span>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        this.container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.classList.remove('show');
                    setTimeout(() => toast.remove(), 300);
                }
            }, duration);
        }

        return toast;
    }

    success(message, duration = 4000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 6000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 5000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 4000) {
        return this.show(message, 'info', duration);
    }

    // Neue Bestätigungsdialog-Funktion
    confirm(message, confirmText = 'OK', cancelText = 'Abbrechen') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirmation-overlay';
            
            const dialog = document.createElement('div');
            dialog.className = 'confirmation-dialog';
            
            dialog.innerHTML = `
                <div class="confirmation-content">
                    <div class="confirmation-icon">⚠️</div>
                    <div class="confirmation-message">${message}</div>
                    <div class="confirmation-buttons">
                        <button class="btn btn-primary confirm-yes">${confirmText}</button>
                        <button class="btn btn-secondary confirm-no">${cancelText}</button>
                    </div>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // Animation
            setTimeout(() => {
                overlay.classList.add('show');
                dialog.classList.add('show');
            }, 10);
            
            const cleanup = (result) => {
                overlay.classList.remove('show');
                dialog.classList.remove('show');
                setTimeout(() => {
                    if (overlay.parentElement) {
                        overlay.remove();
                    }
                }, 300);
                resolve(result);
            };
            
            // Event listeners
            dialog.querySelector('.confirm-yes').onclick = () => cleanup(true);
            dialog.querySelector('.confirm-no').onclick = () => cleanup(false);
            overlay.onclick = (e) => {
                if (e.target === overlay) cleanup(false);
            };
            
            // ESC key support
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escHandler);
                    cleanup(false);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }
}

// Loading Indicator System
class LoadingManager {
    constructor() {
        this.overlay = null;
        this.activeLoaders = new Set();
        this.createOverlay();
    }

    createOverlay() {
        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.className = 'loading-overlay';
            this.overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Laden...</div>
                </div>
            `;
            document.body.appendChild(this.overlay);
        }
    }

    show(message = 'Laden...', id = 'default') {
        this.activeLoaders.add(id);
        const textElement = this.overlay.querySelector('.loading-text');
        if (textElement) {
            textElement.textContent = message;
        }
        this.overlay.classList.add('show');
        return id;
    }

    hide(id = 'default') {
        this.activeLoaders.delete(id);
        if (this.activeLoaders.size === 0) {
            this.overlay.classList.remove('show');
        }
    }

    hideAll() {
        this.activeLoaders.clear();
        this.overlay.classList.remove('show');
    }
}

// Button Loading State
function setButtonLoading(button, loading = true) {
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// Global instances
const toast = new ToastManager();
const loading = new LoadingManager();

// Global showToast function for backward compatibility
function showToast(message, type = 'info', duration = 5000) {
    return toast.show(message, type, duration);
}

// Make toast system globally available
window.toast = toast;
window.loading = loading;
window.showToast = showToast;
window.setButtonLoading = setButtonLoading;
window.withLoading = withLoading;
window.UXHelpers = UXHelpers;

// Firebase Operations mit Loading States
async function withLoading(operation, loadingMessage = 'Laden...', successMessage = null, errorMessage = null) {
    const loadingId = loading.show(loadingMessage);
    
    try {
        const result = await operation();
        
        if (successMessage) {
            toast.success(successMessage);
        }
        
        return result;
    } catch (error) {
        console.error('Operation failed:', error);
        
        const message = errorMessage || `Fehler: ${error.message || 'Unbekannter Fehler'}`;
        toast.error(message);
        
        throw error;
    } finally {
        loading.hide(loadingId);
    }
}

// Hilfsfunktionen für häufige Operationen
const UXHelpers = {
    // Login mit Loading
    async performLogin(loginFunction, button) {
        setButtonLoading(button, true);
        
        try {
            await withLoading(
                loginFunction,
                'Anmeldung läuft...',
                'Erfolgreich angemeldet!',
                'Anmeldung fehlgeschlagen'
            );
        } finally {
            setButtonLoading(button, false);
        }
    },

    // Firebase Operation mit Button Loading
    async performFirebaseOperation(operation, button, messages = {}) {
        if (button) setButtonLoading(button, true);
        
        try {
            return await withLoading(
                operation,
                messages.loading || 'Verarbeitung...',
                messages.success || 'Erfolgreich gespeichert!',
                messages.error || 'Fehler beim Speichern'
            );
        } finally {
            if (button) setButtonLoading(button, false);
        }
    },

    // Daten laden
    async loadData(loadFunction, loadingMessage = 'Daten werden geladen...') {
        return await withLoading(
            loadFunction,
            loadingMessage,
            null, // Kein Success Toast beim Laden
            'Fehler beim Laden der Daten'
        );
    }
};

// Enter-Taste Support für Formulare
function addEnterKeySupport(formElement, submitButton) {
    formElement.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            submitButton.click();
        }
    });
}

// Auto-init für Login-Form
document.addEventListener('DOMContentLoaded', function() {
    // Login Form Enter Support
    const loginForm = document.querySelector('.login-form');
    const loginButton = document.querySelector('#loginBtn');
    const adminButton = document.querySelector('#adminBtn');
    
    if (loginForm && loginButton) {
        addEnterKeySupport(loginForm, loginButton);
    }
    
    // Alle Formulare mit Enter-Support
    const forms = document.querySelectorAll('form, .form-container');
    forms.forEach(form => {
        const submitBtn = form.querySelector('.btn-primary, .btn[type="submit"]');
        if (submitBtn) {
            addEnterKeySupport(form, submitBtn);
        }
    });
});

// Export für andere Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { toast, loading, UXHelpers, setButtonLoading, addEnterKeySupport };
}

// ==================== CONNECTION DIAGNOSTICS ====================
// Diagnostic panel for Firebase connection issues

function createDiagnosticPanel() {
  const panel = document.createElement('div');
  panel.id = 'diagnosticPanel';
  panel.className = 'diagnostic-panel';
  panel.innerHTML = `
    <div class="diagnostic-header">
      <h3>🔧 System-Diagnose</h3>
      <button class="diagnostic-close" onclick="closeDiagnosticPanel()">&times;</button>
    </div>
    <div class="diagnostic-content">
      <div class="diagnostic-section">
        <h4>Firebase-Status</h4>
        <div class="diagnostic-status" id="firebaseStatus">
          <span class="status-indicator" id="firebaseIndicator">⏳</span>
          <span id="firebaseStatusText">Prüfe Verbindung...</span>
        </div>
        <button class="btn btn-secondary" onclick="testFirebaseConnection()">Verbindung testen</button>
      </div>
      
      <div class="diagnostic-section">
        <h4>Material-Loading</h4>
        <div class="diagnostic-status" id="materialStatus">
          <span class="status-indicator" id="materialIndicator">⏳</span>
          <span id="materialStatusText">Prüfe Status...</span>
        </div>
        <button class="btn btn-secondary" onclick="window.reloadMaterials && window.reloadMaterials()">Neu laden</button>
      </div>
      
      <div class="diagnostic-section">
        <h4>App-Status</h4>
        <div class="diagnostic-status" id="appStatus">
          <span class="status-indicator" id="appIndicator">⏳</span>
          <span id="appStatusText">Prüfe Status...</span>
        </div>
        <button class="btn btn-secondary" onclick="window.retryAppInitialization && window.retryAppInitialization()">App neu starten</button>
      </div>
      
      <div class="diagnostic-section">
        <h4>Debug-Informationen</h4>
        <textarea id="debugOutput" readonly></textarea>
        <button class="btn btn-tertiary" onclick="collectDebugInfo()">Debug-Info sammeln</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(panel);
  
  // Add CSS styles
  if (!document.getElementById('diagnosticStyles')) {
    const styles = document.createElement('style');
    styles.id = 'diagnosticStyles';
    styles.textContent = `
      .diagnostic-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 500px;
        max-width: 90vw;
        max-height: 80vh;
        background: white;
        border: 2px solid #000;
        border-radius: 0;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        overflow: hidden;
        display: none;
      }
      
      .diagnostic-header {
        background: #4CAF50;
        color: white;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .diagnostic-header h3 {
        margin: 0;
        font-size: 1.2rem;
      }
      
      .diagnostic-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .diagnostic-content {
        padding: 1.5rem;
        max-height: 60vh;
        overflow-y: auto;
      }
      
      .diagnostic-section {
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #eee;
      }
      
      .diagnostic-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
      
      .diagnostic-section h4 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        color: #333;
      }
      
      .diagnostic-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
      }
      
      .status-indicator {
        font-size: 1rem;
        min-width: 20px;
      }
      
      .status-indicator.success { color: #4CAF50; }
      .status-indicator.error { color: #FF5722; }
      .status-indicator.warning { color: #FFEB00; background: #333; padding: 2px 4px; border-radius: 2px; }
      .status-indicator.loading { color: #757575; }
      
      #debugOutput {
        width: 100%;
        height: 100px;
        border: 1px solid #ddd;
        border-radius: 0;
        padding: 0.5rem;
        font-family: monospace;
        font-size: 0.8rem;
        background: #f5f5f5;
        resize: vertical;
        margin-bottom: 0.5rem;
      }
    `;
    document.head.appendChild(styles);
  }
  
  // Initial status check
  updateDiagnosticStatus();
  
  return panel;
}

function showDiagnosticPanel() {
  let panel = document.getElementById('diagnosticPanel');
  if (!panel) {
    panel = createDiagnosticPanel();
  }
  
  panel.style.display = 'block';
  updateDiagnosticStatus();
}

function closeDiagnosticPanel() {
  const panel = document.getElementById('diagnosticPanel');
  if (panel) {
    panel.style.display = 'none';
  }
}

function updateDiagnosticStatus() {
  // Firebase Status
  const firebaseIndicator = document.getElementById('firebaseIndicator');
  const firebaseStatusText = document.getElementById('firebaseStatusText');
  
  if (window.db && window.firebase) {
    firebaseIndicator.textContent = '✅';
    firebaseIndicator.className = 'status-indicator success';
    firebaseStatusText.textContent = 'Firebase verbunden und bereit';
  } else if (typeof firebase === 'undefined') {
    firebaseIndicator.textContent = '❌';
    firebaseIndicator.className = 'status-indicator error';
    firebaseStatusText.textContent = 'Firebase SDK nicht geladen';
  } else {
    firebaseIndicator.textContent = '⚠️';
    firebaseIndicator.className = 'status-indicator warning';
    firebaseStatusText.textContent = 'Firebase wird initialisiert...';
  }
  
  // Material Status
  const materialIndicator = document.getElementById('materialIndicator');
  const materialStatusText = document.getElementById('materialStatusText');
  
  if (window.availableMaterials && window.availableMasterbatches) {
    materialIndicator.textContent = '✅';
    materialIndicator.className = 'status-indicator success';
    materialStatusText.textContent = `${window.availableMaterials.length} Materialien, ${window.availableMasterbatches.length} Masterbatches`;
  } else if (!window.db) {
    materialIndicator.textContent = '❌';
    materialIndicator.className = 'status-indicator error';
    materialStatusText.textContent = 'Warten auf Firebase-Verbindung';
  } else {
    materialIndicator.textContent = '⏳';
    materialIndicator.className = 'status-indicator loading';
    materialStatusText.textContent = 'Lade Daten...';
  }
  
  // App Status
  const appIndicator = document.getElementById('appIndicator');
  const appStatusText = document.getElementById('appStatusText');
  
  if (window.appInitialized && window.db) {
    appIndicator.textContent = '✅';
    appIndicator.className = 'status-indicator success';
    appStatusText.textContent = 'App vollständig initialisiert';
  } else if (window.appInitialized) {
    appIndicator.textContent = '⚠️';
    appIndicator.className = 'status-indicator warning';
    appStatusText.textContent = 'App gestartet, Firebase-Probleme';
  } else {
    appIndicator.textContent = '⏳';
    appIndicator.className = 'status-indicator loading';
    appStatusText.textContent = 'App wird initialisiert...';
  }
}

function collectDebugInfo() {
  const debugOutput = document.getElementById('debugOutput');
  if (!debugOutput) return;
  
  const info = [];
  info.push('=== PelletTrackr Debug Info ===');
  info.push(`Timestamp: ${new Date().toISOString()}`);
  info.push(`User Agent: ${navigator.userAgent}`);
  info.push(`URL: ${window.location.href}`);
  info.push('');
  
  info.push('=== Firebase Status ===');
  info.push(`Firebase SDK available: ${typeof firebase !== 'undefined'}`);
  info.push(`Firebase apps: ${firebase?.apps?.length || 0}`);
  info.push(`window.db available: ${!!window.db}`);
  info.push(`window.firebase available: ${!!window.firebase}`);
  info.push(`safeFirebaseOp available: ${typeof window.safeFirebaseOp === 'function'}`);
  info.push('');
  
  info.push('=== App Status ===');
  info.push(`App initialized: ${!!window.appInitialized}`);
  info.push(`Current user: ${window.currentUser?.name || 'Not logged in'}`);
  info.push(`Available materials: ${window.availableMaterials?.length || 0}`);
  info.push(`Available masterbatches: ${window.availableMasterbatches?.length || 0}`);
  info.push('');
  
  info.push('=== Functions Available ===');
  info.push(`loadMaterials: ${typeof loadMaterials === 'function'}`);
  info.push(`loadMasterbatches: ${typeof loadMasterbatches === 'function'}`);
  info.push(`reloadMaterials: ${typeof window.reloadMaterials === 'function'}`);
  info.push(`retryAppInitialization: ${typeof window.retryAppInitialization === 'function'}`);
  info.push(`debugFirebaseStatus: ${typeof window.debugFirebaseStatus === 'function'}`);
  
  debugOutput.value = info.join('\n');
  
  // Also log to console
  console.log(info.join('\n'));
}

// Add keyboard shortcut to show diagnostic panel
document.addEventListener('keydown', (e) => {
  // Ctrl+Shift+D or Cmd+Shift+D
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    showDiagnosticPanel();
  }
});

// Listen for Firebase events to update diagnostic panel
document.addEventListener('firebase-ready', () => {
  updateDiagnosticStatus();
});

document.addEventListener('firebase-error', () => {
  updateDiagnosticStatus();
});

// Global diagnostic functions
window.showDiagnosticPanel = showDiagnosticPanel;
window.closeDiagnosticPanel = closeDiagnosticPanel;
window.updateDiagnosticStatus = updateDiagnosticStatus;
