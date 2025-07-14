/**
 * Printer Management System
 * Handles printer CRUD operations, status management, and UI interactions
 */

// Global printer management state
let printers = [];
let currentEditingPrinter = null;
let printersListener = null;

/**
 * Initialize printer management system
 */
function initializePrinterManagement() {
    try {
        if (!window.db) {
            console.warn("❌ Firebase not available for printer management");
            return false;
        }
        
        console.log("🖨️ Initializing printer management...");
        loadPrinters();
        
        // Register component cleanup
        if (typeof window.registerComponentCleanup === 'function') {
            window.registerComponentCleanup('printer-management', () => {
                if (printersListener) {
                    printersListener();
                    printersListener = null;
                }
            });
        }
        
        return true;
    } catch (error) {
        console.error("❌ Printer management initialization failed:", error);
        return false;
    }
}

/**
 * Setup real-time listener for printers
 */
function setupPrintersListener() {
    // Clean up existing listener
    if (printersListener) {
        printersListener();
        printersListener = null;
    }
    
    try {
        printersListener = window.db.collection('printers').onSnapshot((snapshot) => {
            printers = [];
            snapshot.forEach((doc) => {
                printers.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log('Live update: Loaded printers:', printers.length);
            renderPrinterGrid();
        }, (error) => {
            console.error('Error in printers listener:', error);
            showToast('Fehler beim Live-Update der Drucker', 'error');
        });
        
        // Register listener for global cleanup
        if (typeof window.registerFirebaseListener === 'function') {
            window.registerFirebaseListener('printer-management', printersListener);
        }
        
        console.log("✅ Printer listener registered");
    } catch (error) {
        console.error("❌ Failed to setup printer listener:", error);
    }
}

/**
 * Load printers from Firebase (fallback)
 */
async function loadPrinters() {
    try {
        const querySnapshot = await window.db.collection('printers').get();
        printers = [];
        
        querySnapshot.forEach((doc) => {
            printers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Loaded printers:', printers.length);
    } catch (error) {
        console.error('Error loading printers:', error);
        showToast('Fehler beim Laden der Drucker', 'error');
    }
}

/**
 * Show printer manager modal
 */
function showPrinterManager() {
    const modalContent = `
        <div class="modal-header">
            <h3>Drucker-Verwaltung</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div id="printerManagerContent">
                <div class="modal-controls">
                    <button class="btn btn-primary" onclick="showAddPrinterForm()">
                        Neuer Drucker
                    </button>
                </div>
                
                <div class="printer-grid" id="printerGrid">
                    <div class="loading">Drucker werden geladen...</div>
                </div>
            </div>
        </div>
    `;
    
    showModalWithContent(modalContent);
    
    // Setup real-time listener
    setupPrintersListener();
}

/**
 * Close printer manager modal
 */
function closePrinterManager() {
    try {
        const overlay = document.getElementById('overlay');
        const modal = document.getElementById('printerManagerModal');
        
        if (overlay) overlay.style.display = 'none';
        if (modal) modal.style.display = 'none';
        
        // Clean up real-time listener
        if (printersListener) {
            printersListener();
            printersListener = null;
            console.log("🧹 Printer listener cleaned up on modal close");
        }
    } catch (error) {
        console.error("Error closing printer manager:", error);
    }
}

/**
 * Render printer grid
 */
function renderPrinterGrid() {
    const grid = document.getElementById('printerGrid');
    
    if (printers.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <p>Noch keine Drucker hinzugefügt.</p>
                <button class="btn btn-primary" onclick="showAddPrinterForm()">
                    Ersten Drucker hinzufügen
                </button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = printers.map(printer => `
        <div class="printer-card">
            <div class="printer-header">
                <div>
                    <h4 class="printer-name">${printer.name}</h4>
                    <p class="printer-model">${printer.model || 'Unbekanntes Modell'}</p>
                </div>
                <span class="printer-status ${printer.status}">${getStatusText(printer.status)}</span>
            </div>
            
            <div class="printer-details">
                <div class="printer-detail">
                    <span class="printer-detail-label">Bauraum:</span>
                    <span class="printer-detail-value">${printer.buildVolume || 'Nicht angegeben'}</span>
                </div>
                <div class="printer-detail">
                    <span class="printer-detail-label">Materialien:</span>
                    <span class="printer-detail-value">${printer.materials || 'Nicht angegeben'}</span>
                </div>
                ${printer.notes ? `
                <div class="printer-detail">
                    <span class="printer-detail-label">Notizen:</span>
                    <span class="printer-detail-value">${printer.notes}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="printer-actions">
                <button class="btn btn-secondary" onclick="editPrinter('${printer.id}')">
                    Bearbeiten
                </button>
                <button class="btn btn-info" onclick="duplicatePrinter('${printer.id}')">
                    Duplizieren
                </button>
                <button class="btn btn-primary" onclick="changePrinterStatus('${printer.id}')">
                    Status ändern
                </button>
                <button class="btn btn-danger" onclick="deletePrinter('${printer.id}')">
                    Löschen
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Get localized status text
 */
function getStatusText(status) {
    const statusMap = {
        'available': 'Verfügbar',
        'printing': 'In Betrieb', 
        'maintenance': 'Wartung',
        'broken': 'Defekt'
    };
    return statusMap[status] || status;
}

/**
 * Duplicate a printer
 */
async function duplicatePrinter(printerId) {
    const printer = printers.find(p => p.id === printerId);
    if (!printer) {
        showToast('Drucker nicht gefunden', 'error');
        return;
    }
    
    try {
        // Create duplicate with modified name
        const duplicateData = {
            ...printer,
            name: `${printer.name} (Kopie)`,
            status: 'available', // Reset status to available
            notes: printer.notes ? `${printer.notes}\n\nDupliziert von: ${printer.name}` : `Dupliziert von: ${printer.name}`,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Remove the original ID
        delete duplicateData.id;
        
        await window.db.collection('printers').add(duplicateData);
        
        showToast(`Drucker "${printer.name}" erfolgreich dupliziert`, 'success');
        
        // Real-time listener will automatically update the UI
        
    } catch (error) {
        console.error('Error duplicating printer:', error);
        showToast('Fehler beim Duplizieren des Druckers', 'error');
    }
}

/**
 * Show add printer form
 */
function showAddPrinterForm() {
    currentEditingPrinter = null;
    document.getElementById('printerFormTitle').textContent = 'Drucker hinzufügen';
    clearPrinterForm();
    document.getElementById('printerFormModal').style.display = 'block';
}

/**
 * Edit existing printer
 */
function editPrinter(printerId) {
    const printer = printers.find(p => p.id === printerId);
    if (!printer) return;
    
    currentEditingPrinter = printer;
    document.getElementById('printerFormTitle').textContent = 'Drucker bearbeiten';
    
    // Populate form
    document.getElementById('printerName').value = printer.name || '';
    document.getElementById('printerModel').value = printer.model || '';
    document.getElementById('printerBuildVolume').value = printer.buildVolume || '';
    document.getElementById('printerStatus').value = printer.status || 'available';
    document.getElementById('printerMaterials').value = printer.materials || '';
    document.getElementById('printerNotes').value = printer.notes || '';
    
    document.getElementById('printerFormModal').style.display = 'block';
}

/**
 * Clear printer form
 */
function clearPrinterForm() {
    document.getElementById('printerForm').reset();
}

/**
 * Close printer form modal
 */
function closePrinterForm() {
    document.getElementById('printerFormModal').style.display = 'none';
    currentEditingPrinter = null;
}

/**
 * Save printer (add or update)
 */
async function savePrinter() {
    const formData = {
        name: document.getElementById('printerName').value.trim(),
        model: document.getElementById('printerModel').value.trim(),
        buildVolume: document.getElementById('printerBuildVolume').value.trim(),
        status: document.getElementById('printerStatus').value,
        materials: document.getElementById('printerMaterials').value.trim(),
        notes: document.getElementById('printerNotes').value.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Validation
    if (!formData.name) {
        showToast('Bitte geben Sie einen Drucker-Namen ein', 'error');
        return;
    }
    
    try {
        if (currentEditingPrinter) {
            // Update existing printer
            await window.db.collection('printers').doc(currentEditingPrinter.id).update(formData);
            showToast('Drucker erfolgreich aktualisiert', 'success');
        } else {
            // Add new printer
            formData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await window.db.collection('printers').add(formData);
            showToast('Drucker erfolgreich hinzugefügt', 'success');
        }
        
        closePrinterForm();
        // Real-time listener will automatically update the UI
        
    } catch (error) {
        console.error('Error saving printer:', error);
        showToast('Fehler beim Speichern des Druckers', 'error');
    }
}

/**
 * Change printer status quickly
 */
async function changePrinterStatus(printerId) {
    const printer = printers.find(p => p.id === printerId);
    if (!printer) return;
    
    const statusOptions = [
        { value: 'available', label: 'Verfügbar' },
        { value: 'printing', label: 'In Betrieb' },
        { value: 'maintenance', label: 'Wartung' },
        { value: 'broken', label: 'Defekt' }
    ];
    
    const currentIndex = statusOptions.findIndex(opt => opt.value === printer.status);
    const nextIndex = (currentIndex + 1) % statusOptions.length;
    const newStatus = statusOptions[nextIndex].value;
    
    try {
        await window.db.collection('printers').doc(printerId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast(`Status auf "${statusOptions[nextIndex].label}" geändert`, 'success');
        // Real-time listener will automatically update the UI
        
    } catch (error) {
        console.error('Error updating printer status:', error);
        showToast('Fehler beim Ändern des Status', 'error');
    }
}

/**
 * Delete printer
 */
async function deletePrinter(printerId) {
    const printer = printers.find(p => p.id === printerId);
    if (!printer) return;
    
    if (!confirm(`Möchten Sie den Drucker "${printer.name}" wirklich löschen?`)) {
        return;
    }
    
    try {
        await window.db.collection('printers').doc(printerId).delete();
        showToast('Drucker erfolgreich gelöscht', 'success');
        // Real-time listener will automatically update the UI
        
    } catch (error) {
        console.error('Error deleting printer:', error);
        showToast('Fehler beim Löschen des Druckers', 'error');
    }
}

/**
 * Get available printers for reservations
 */
function getAvailablePrinters() {
    return printers.filter(p => p.status === 'available');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize printer management when Firebase is ready
    if (window.firebase && window.db) {
        initializePrinterManagement();
    } else {
        // Wait for Firebase initialization
        document.addEventListener('firebase-ready', initializePrinterManagement);
    }
});

// Export functions to global scope
window.showPrinterManager = showPrinterManager;
window.closePrinterManager = closePrinterManager;