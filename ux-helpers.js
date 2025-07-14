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
            
            // Dialog mit flachem, eckigem Icon
            dialog.innerHTML = `
                <div class="confirmation-content">
                    <div class="confirmation-header">
                        <div class="confirmation-icon flat-warning">!</div>
                    </div>
                    <div class="confirmation-message">${message}</div>
                    <div class="confirmation-buttons">
                        <button class="btn btn-secondary confirm-no">${cancelText}</button>
                        <button class="btn btn-primary confirm-yes">${confirmText}</button>
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
