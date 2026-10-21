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
            if (typeof window.waitForUpdateMachineOverview === 'function') {
                window.waitForUpdateMachineOverview(() => updateMachineOverview());
            } else if (typeof updateMachineOverview === 'function') {
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
    // Drucker sind nur für angemeldete Nutzer lesbar (Firestore-Regeln).
    if (!window.firebase?.auth?.().currentUser) return;
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
let printerStatusFilter = 'all';

function showPrinterManager() {
    printerStatusFilter = 'all';
    const modalContent = `
        <div class="modal-header">
            <h3>Drucker verwalten</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="printer-toolbar">
                <input type="text" id="printerSearchInput" placeholder="Drucker suchen …" class="search-input" oninput="renderPrinterGrid()" autocomplete="off">
                <div id="printerFilters" class="printer-filters" role="group" aria-label="Nach Status filtern"></div>
            </div>
            <div id="printerGrid" class="printer-list-compact">
                <p class="printer-empty">Drucker werden geladen …</p>
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
 * Render printer list: kompakte Zeilen, Status per Klick, weitere Aktionen unter "Mehr"
 */
function setPrinterFilter(filter) {
    printerStatusFilter = filter;
    renderPrinterGrid();
}

function renderPrinterGrid() {
    const grid = document.getElementById('printerGrid');
    if (!grid) return;

    const normalize = status => window.MachineStatus ? window.MachineStatus.normalize(status) : (status || 'available');
    const term = (document.getElementById('printerSearchInput')?.value || '').trim().toLowerCase();
    const sorted = [...printers].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'de'));
    const matchesSearch = printer => !term || [printer.name, printer.model, printer.materials, printer.buildVolume]
        .some(value => String(value || '').toLowerCase().includes(term));
    const searched = sorted.filter(matchesSearch);
    const count = key => searched.filter(printer => key === 'all' || normalize(printer.status) === key).length;

    const filters = document.getElementById('printerFilters');
    if (filters) {
        filters.innerHTML = [['all', 'Alle'], ['available', 'Verfügbar'], ['in_use', 'In Betrieb'], ['maintenance', 'Wartung'], ['broken', 'Defekt']]
            .map(([key, label]) => `<button type="button" class="filter-chip ${printerStatusFilter === key ? 'active' : ''}" onclick="setPrinterFilter('${key}')">${label} (${count(key)})</button>`).join('');
    }

    if (printers.length === 0) {
        grid.innerHTML = '<p class="printer-empty">Noch keine Drucker angelegt. Mit „Drucker hinzufügen“ legst du den ersten an.</p>';
        return;
    }

    const shown = searched.filter(printer => printerStatusFilter === 'all' || normalize(printer.status) === printerStatusFilter);
    if (!shown.length) {
        grid.innerHTML = '<p class="printer-empty">Keine passenden Drucker.</p>';
        return;
    }

    const kind = printer => printer.type === 'pellet' ? 'Pellet-Drucker' : printer.type === 'filament' ? 'Filament-Drucker' : '3D-Drucker';
    grid.innerHTML = shown.map(printer => {
        const details = [printer.model, kind(printer), printer.pricePerHour ? printer.pricePerHour.toFixed(2).replace('.', ',') + ' € / Std.' : ''].filter(Boolean).join(' · ');
        return `
        <article class="printer-row">
            <div class="printer-row-main">
                <h4 class="printer-row-name">${escapePrinterHtml(printer.name)}</h4>
                <p class="printer-row-details">${escapePrinterHtml(details)}</p>
            </div>
            ${window.MachineStatus ? window.MachineStatus.buttons('printers', printer.id, printer.status) : ''}
            <details class="printer-row-more">
                <summary>Mehr</summary>
                <div class="printer-row-actions">
                    <button class="btn btn-secondary btn-small" onclick="editPrinter('${printer.id}')">Bearbeiten</button>
                    <button class="btn btn-secondary btn-small" onclick="KnowledgeAdmin.editGuide('printers','${printer.id}','showPrinterManager()')">Anleitung</button>
                    <button class="btn btn-secondary btn-small" onclick="MachineLabels.open(['printers:${printer.id}'])">QR / Etikett</button>
                    <button class="btn btn-secondary btn-small" onclick="duplicatePrinter('${printer.id}')">Duplizieren</button>
                    <button class="btn btn-danger btn-small" onclick="deletePrinter('${printer.id}')">Löschen</button>
                </div>
            </details>
        </article>`;
    }).join('');
}

function escapePrinterHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
 * Search printers (Kompatibilität)
 */
function searchPrinters() { renderPrinterGrid(); }

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
                            <label for="printerType">Drucker-Typ *</label>
                            <select id="printerType" class="form-select" required>
                                <option value="">Typ auswählen...</option>
                                <option value="pellet">Pellet Drucker</option>
                                <option value="filament">Filament Drucker</option>
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
                            <label for="printerType">Drucker-Typ *</label>
                            <select id="printerType" class="form-select" required>
                                <option value="">Typ auswählen...</option>
                                <option value="pellet" ${printer.type === 'pellet' ? 'selected' : ''}>Pellet Drucker</option>
                                <option value="filament" ${printer.type === 'filament' ? 'selected' : ''}>Filament Drucker</option>
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
        type: document.getElementById('printerType').value,
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
 * Set printer status directly
 * Requires admin access
 */
async function setPrinterStatus(printerId, newStatus) {
    if (!window.checkAdminAccess()) {
        return;
    }
    
    const printer = printers.find(p => p.id === printerId);
    if (!printer) return;
    
    const statusLabels = {
        'available': 'Verfügbar',
        'printing': 'In Betrieb',
        'maintenance': 'Wartung',
        'broken': 'Defekt'
    };
    
    try {
        await window.db.collection('printers').doc(printerId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast(`Status auf "${statusLabels[newStatus]}" geändert`, 'success');
        // Real-time listener will automatically update the UI
        
    } catch (error) {
        console.error('Error updating printer status:', error);
        showToast('Fehler beim Ändern des Status', 'error');
    }
}

/**
 * Change printer status quickly (legacy function)
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
    
    const confirmed = await window.toast.confirm(
        `Möchten Sie den Drucker "${printer.name}" wirklich löschen?`,
        'Ja, löschen',
        'Abbrechen'
    );
    if (!confirmed) {
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
window.setPrinterStatus = setPrinterStatus;
window.showAddPrinterForm = showAddPrinterForm;
window.editPrinter = editPrinter;
window.savePrinter = savePrinter;
window.closePrinterForm = closePrinterForm;
window.searchPrinters = searchPrinters;
window.duplicatePrinter = duplicatePrinter;
window.changePrinterStatus = changePrinterStatus;
window.deletePrinter = deletePrinter;