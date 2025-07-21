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
            
            // Update machine overview in admin dashboard
            if (typeof updateMachineOverview === 'function') {
                updateMachineOverview();
            }
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
            <h3>Drucker verwalten</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="card">
                <div class="card-body">
                    <div class="printer-controls">
                        <div class="control-row">
                            <div class="search-container">
                                <input type="text" id="printerSearchInput" placeholder="Drucker suchen..." class="search-input" onkeyup="searchPrinters()">
                            </div>
                        </div>
                    </div>
                    
                    <div id="printerGrid" class="printer-grid">
                        <div class="loading">Drucker werden geladen...</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-primary" onclick="showAddPrinterForm()">Drucker hinzufügen</button>
            <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
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
                <p>Verwenden Sie den Button unten, um Ihren ersten Drucker hinzuzufügen.</p>
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
                <div class="printer-detail">
                    <span class="printer-detail-label">Preis pro Stunde:</span>
                    <span class="printer-detail-value">${printer.pricePerHour ? printer.pricePerHour.toFixed(2) + ' €' : 'Nicht gesetzt'}</span>
                </div>
                ${printer.notes ? `
                <div class="printer-detail">
                    <span class="printer-detail-label">Notizen:</span>
                    <span class="printer-detail-value">${printer.notes}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="printer-actions">
                <button class="btn btn-secondary btn-small" onclick="editPrinter('${printer.id}')">
                    Bearbeiten
                </button>
                <button class="btn btn-info btn-small" onclick="duplicatePrinter('${printer.id}')">
                    Duplizieren
                </button>
                <button class="btn btn-primary btn-small" onclick="changePrinterStatus('${printer.id}')">
                    Status ändern
                </button>
                <button class="btn btn-danger btn-small" onclick="deletePrinter('${printer.id}')">
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
 * Search printers by name, model, or materials
 */
function searchPrinters() {
    const searchInput = document.getElementById('printerSearchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const filteredPrinters = printers.filter(printer => {
        return (
            (printer.name && printer.name.toLowerCase().includes(searchTerm)) ||
            (printer.model && printer.model.toLowerCase().includes(searchTerm)) ||
            (printer.materials && printer.materials.toLowerCase().includes(searchTerm)) ||
            (printer.buildVolume && printer.buildVolume.toLowerCase().includes(searchTerm))
        );
    });
    
    renderFilteredPrinterGrid(filteredPrinters);
}

/**
 * Render filtered printer grid
 */
function renderFilteredPrinterGrid(filteredPrinters) {
    const grid = document.getElementById('printerGrid');
    
    if (filteredPrinters.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <p>Keine Drucker gefunden.</p>
                <button class="btn btn-secondary" onclick="document.getElementById('printerSearchInput').value = ''; searchPrinters();">
                    Suche zurücksetzen
                </button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredPrinters.map(printer => `
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
                <div class="printer-detail">
                    <span class="printer-detail-label">Preis pro Stunde:</span>
                    <span class="printer-detail-value">${printer.pricePerHour ? printer.pricePerHour.toFixed(2) + ' €' : 'Nicht gesetzt'}</span>
                </div>
                ${printer.notes ? `
                <div class="printer-detail">
                    <span class="printer-detail-label">Notizen:</span>
                    <span class="printer-detail-value">${printer.notes}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="printer-actions">
                <button class="btn btn-secondary btn-small" onclick="editPrinter('${printer.id}')">
                    Bearbeiten
                </button>
                <button class="btn btn-info btn-small" onclick="duplicatePrinter('${printer.id}')">
                    Duplizieren
                </button>
                <button class="btn btn-primary btn-small" onclick="changePrinterStatus('${printer.id}')">
                    Status ändern
                </button>
                <button class="btn btn-danger btn-small" onclick="deletePrinter('${printer.id}')">
                    Löschen
                </button>
            </div>
        </div>
    `).join('');
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
    
    const formModalContent = `
        <div class="modal-header">
            <h3 id="printerFormTitle">Drucker hinzufügen</h3>
            <button class="close-btn" onclick="closePrinterForm()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="card">
                <div class="card-body">
                    <form id="printerForm" onsubmit="savePrinter(event)">
                        <div class="form-group">
                            <label for="printerName">Drucker-Name *</label>
                            <input type="text" id="printerName" class="form-input" required placeholder="z.B. Ginger Additive Beta 1.3">
                        </div>
                        
                        <div class="form-group">
                            <label for="printerModel">Modell</label>
                            <input type="text" id="printerModel" class="form-input" placeholder="z.B. Moritz, Loy, DXR25">
                        </div>
                        
                        <div class="form-group">
                            <label for="printerBuildVolume">Bauraum</label>
                            <input type="text" id="printerBuildVolume" class="form-input" placeholder="z.B. 1000x1000x1000">
                        </div>
                        
                        <div class="form-group">
                            <label for="printerStatus">Status</label>
                            <select id="printerStatus" class="form-select">
                                <option value="available">Verfügbar</option>
                                <option value="printing">In Betrieb</option>
                                <option value="maintenance">Wartung</option>
                                <option value="broken">Defekt</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="printerMaterials">Materialien</label>
                            <input type="text" id="printerMaterials" class="form-input" placeholder="z.B. PLA, PETg">
                        </div>
                        
                        <div class="form-group">
                            <label for="printerPricePerHour">Preis pro Stunde (€)</label>
                            <input type="number" id="printerPricePerHour" class="form-input" placeholder="z.B. 18,00" step="0.01" min="0">
                        </div>
                        
                        <div class="form-group">
                            <label for="printerNotes">Notizen</label>
                            <textarea id="printerNotes" class="form-textarea" rows="3" placeholder="Zusätzliche Informationen..."></textarea>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button type="submit" form="printerForm" class="btn btn-primary">Drucker speichern</button>
            <button class="btn btn-secondary" onclick="closePrinterForm()">Abbrechen</button>
        </div>
    `;
    
    showModalWithContent(formModalContent);
}

/**
 * Edit existing printer
 */
function editPrinter(printerId) {
    const printer = printers.find(p => p.id === printerId);
    if (!printer) return;
    
    currentEditingPrinter = printer;
    
    const formModalContent = `
        <div class="modal-header">
            <h3 id="printerFormTitle">Drucker bearbeiten</h3>
            <button class="close-btn" onclick="closePrinterForm()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="card">
                <div class="card-body">
                    <form id="printerForm" onsubmit="savePrinter(event)">
                        <div class="form-group">
                            <label for="printerName">Drucker-Name *</label>
                            <input type="text" id="printerName" class="form-input" required placeholder="z.B. Ginger Additive Beta 1.3" value="${printer.name || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="printerModel">Modell</label>
                            <input type="text" id="printerModel" class="form-input" placeholder="z.B. Moritz, Loy, DXR25" value="${printer.model || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="printerBuildVolume">Bauraum</label>
                            <input type="text" id="printerBuildVolume" class="form-input" placeholder="z.B. 1000x1000x1000" value="${printer.buildVolume || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="printerStatus">Status</label>
                            <select id="printerStatus" class="form-select">
                                <option value="available" ${printer.status === 'available' ? 'selected' : ''}>Verfügbar</option>
                                <option value="printing" ${printer.status === 'printing' ? 'selected' : ''}>In Betrieb</option>
                                <option value="maintenance" ${printer.status === 'maintenance' ? 'selected' : ''}>Wartung</option>
                                <option value="broken" ${printer.status === 'broken' ? 'selected' : ''}>Defekt</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="printerMaterials">Materialien</label>
                            <input type="text" id="printerMaterials" class="form-input" placeholder="z.B. PLA, PETg" value="${printer.materials || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="printerPricePerHour">Preis pro Stunde (€)</label>
                            <input type="number" id="printerPricePerHour" class="form-input" placeholder="z.B. 18,00" step="0.01" min="0" value="${printer.pricePerHour || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="printerNotes">Notizen</label>
                            <textarea id="printerNotes" class="form-textarea" rows="3" placeholder="Zusätzliche Informationen...">${printer.notes || ''}</textarea>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button type="submit" form="printerForm" class="btn btn-primary">Drucker speichern</button>
            <button class="btn btn-secondary" onclick="closePrinterForm()">Abbrechen</button>
        </div>
    `;
    
    showModalWithContent(formModalContent);
}

/**
 * Clear printer form
 */
function clearPrinterForm() {
    const form = document.getElementById('printerForm');
    if (form) {
        form.reset();
    }
}

/**
 * Close printer form modal
 */
function closePrinterForm() {
    showPrinterManager();
    currentEditingPrinter = null;
}

/**
 * Save printer (add or update)
 */
async function savePrinter(event) {
    if (event) {
        event.preventDefault();
    }
    
    const formData = {
        name: document.getElementById('printerName').value.trim(),
        model: document.getElementById('printerModel').value.trim(),
        buildVolume: document.getElementById('printerBuildVolume').value.trim(),
        status: document.getElementById('printerStatus').value,
        materials: document.getElementById('printerMaterials').value.trim(),
        pricePerHour: parseFloat(document.getElementById('printerPricePerHour').value) || 0,
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
 * Requires admin access
 */
async function changePrinterStatus(printerId) {
    if (!window.checkAdminAccess()) {
        return;
    }
    
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
window.showAddPrinterForm = showAddPrinterForm;
window.editPrinter = editPrinter;
window.savePrinter = savePrinter;
window.closePrinterForm = closePrinterForm;
window.searchPrinters = searchPrinters;
window.duplicatePrinter = duplicatePrinter;
window.changePrinterStatus = changePrinterStatus;
window.deletePrinter = deletePrinter;