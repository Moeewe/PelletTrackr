/**
 * Printer Management System
 * Handles printer CRUD operations, status management, and UI interactions
 */

// Global printer management state
let printers = [];
let currentEditingPrinter = null;

/**
 * Initialize printer management system
 */
function initializePrinterManagement() {
    loadPrinters();
}

/**
 * Load printers from Firebase
 */
async function loadPrinters() {
    try {
        const querySnapshot = await db.collection('printers').get();
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
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('printerManagerModal').style.display = 'block';
    loadPrinters().then(() => {
        renderPrinterGrid();
    });
}

/**
 * Close printer manager modal
 */
function closePrinterManager() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('printerManagerModal').style.display = 'none';
}

// Initialize printer lazy loader
let printerLoader = null;

/**
 * Initialize printer lazy loading
 */
function initializePrinterLazyLoading() {
    printerLoader = new LazyLoader('printerGrid', {
        mobilePageSize: 5,
        desktopPageSize: 20,
        renderFunction: createPrinterElement,
        emptyStateMessage: 'Noch keine Drucker hinzugefügt.',
        searchFunction: (printer, searchTerm) => {
            return printer.name.toLowerCase().includes(searchTerm) ||
                   (printer.model && printer.model.toLowerCase().includes(searchTerm)) ||
                   (printer.materials && printer.materials.toLowerCase().includes(searchTerm)) ||
                   (printer.notes && printer.notes.toLowerCase().includes(searchTerm));
        }
    });
}

/**
 * Create printer element for lazy loading
 */
function createPrinterElement(printer) {
    const container = document.createElement('div');
    container.className = 'lazy-item';
    container.innerHTML = `
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
                <button class="btn btn-primary" onclick="changePrinterStatus('${printer.id}')">
                    Status ändern
                </button>
                <button class="btn btn-danger" onclick="deletePrinter('${printer.id}')">
                    Löschen
                </button>
            </div>
        </div>
    `;
    return container;
}

/**
 * Render printer grid with lazy loading
 */
function renderPrinterGrid() {
    if (!printerLoader) {
        initializePrinterLazyLoading();
    }
    
    printerLoader.setData(printers);
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
            await db.collection('printers').doc(currentEditingPrinter.id).update(formData);
            showToast('Drucker erfolgreich aktualisiert', 'success');
        } else {
            // Add new printer
            formData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('printers').add(formData);
            showToast('Drucker erfolgreich hinzugefügt', 'success');
        }
        
        closePrinterForm();
        await loadPrinters();
        renderPrinterGrid();
        
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
        await db.collection('printers').doc(printerId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast(`Status auf "${statusOptions[nextIndex].label}" geändert`, 'success');
        await loadPrinters();
        renderPrinterGrid();
        
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
        await db.collection('printers').doc(printerId).delete();
        showToast('Drucker erfolgreich gelöscht', 'success');
        await loadPrinters();
        renderPrinterGrid();
        
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

/**
 * Search printers
 */
function searchPrinters() {
    const searchInput = document.getElementById('printerSearchInput');
    if (searchInput && printerLoader) {
        printerLoader.search(searchInput.value);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize printer management when Firebase is ready
    if (window.firebase && db) {
        initializePrinterManagement();
    } else {
        // Wait for Firebase initialization
        document.addEventListener('firebase-ready', initializePrinterManagement);
    }
}); 