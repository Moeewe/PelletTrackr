/**
 * User Services System
 * Handles printer status, scheduling, equipment requests, problem reports, and material requests
 */

// Global state for user services
let userPrinters = [];
let userPrinterListener = null;

/**
 * Initialize user services
 */
function initializeUserServices() {
    console.log('🔧 Initializing user services...');
    
    // Setup printer status listener
    setupUserPrinterListener();
    
    // Load initial data
    loadPrinterStatus();
    
    console.log('✅ User services initialized');
}

/**
 * Setup real-time listener for printer status
 */
function setupUserPrinterListener() {
    if (!window.db) {
        setTimeout(setupUserPrinterListener, 500);
        return;
    }
    
    // Clean up existing listener
    if (userPrinterListener) {
        userPrinterListener();
        userPrinterListener = null;
    }
    
    try {
        userPrinterListener = window.db.collection('printers').onSnapshot((snapshot) => {
            userPrinters = [];
            snapshot.forEach((doc) => {
                userPrinters.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            updatePrinterStatusDisplay();
        });
        
        console.log('✅ User printer listener registered');
    } catch (error) {
        console.error('❌ Failed to setup user printer listener:', error);
    }
}

/**
 * Load and display printer status
 */
function loadPrinterStatus() {
    if (!window.db) return;
    
    window.db.collection('printers').get().then((snapshot) => {
        userPrinters = [];
        snapshot.forEach((doc) => {
            userPrinters.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        updatePrinterStatusDisplay();
    }).catch((error) => {
        console.error('Error loading printer status:', error);
    });
}

/**
 * Update printer status display
 */
function updatePrinterStatusDisplay() {
    const counts = {
        available: 0,
        in_use: 0,
        maintenance: 0,
        broken: 0
    };
    
    userPrinters.forEach(printer => {
        switch (printer.status) {
            case 'available':
                counts.available++;
                break;
            case 'in_use':
                counts.in_use++;
                break;
            case 'maintenance':
                counts.maintenance++;
                break;
            case 'broken':
                counts.broken++;
                break;
        }
    });
    
    // Update UI
    const availableEl = document.getElementById('userPrintersAvailable');
    const inUseEl = document.getElementById('userPrintersInUse');
    const maintenanceEl = document.getElementById('userPrintersMaintenance');
    const brokenEl = document.getElementById('userPrintersBroken');
    
    if (availableEl) availableEl.textContent = counts.available;
    if (inUseEl) inUseEl.textContent = counts.in_use;
    if (maintenanceEl) maintenanceEl.textContent = counts.maintenance;
    if (brokenEl) brokenEl.textContent = counts.broken;
}

/**
 * Show printer status modal
 */
function showPrinterStatus() {
    const modalContent = `
        <div class="modal-header">
            <h3>Drucker Status</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="printer-list">
                ${userPrinters.map(printer => `
                    <div class="printer-item status-${printer.status}">
                        <div class="printer-info">
                            <h4 class="printer-name">${printer.name}</h4>
                            <p class="printer-location">${printer.location}</p>
                            <p class="printer-description">${printer.description || 'Keine Beschreibung'}</p>
                        </div>
                        <div class="printer-status">
                            <span class="status-badge status-${printer.status}">
                                ${getStatusText(printer.status)}
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
}

/**
 * Show scheduling modal
 */
function showScheduling() {
    const modalContent = `
        <div class="modal-header">
            <h3>Drucker Terminbuchung</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form">
                <div class="form-group">
                    <label class="form-label">Drucker auswählen</label>
                    <select id="schedulePrinter" class="form-select">
                        <option value="">Drucker wählen...</option>
                        ${userPrinters.filter(p => p.status === 'available').map(printer => `
                            <option value="${printer.id}">${printer.name} - ${printer.location}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Datum</label>
                    <input type="date" id="scheduleDate" class="form-input" min="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label class="form-label">Uhrzeit (von)</label>
                    <input type="time" id="scheduleTimeFrom" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Uhrzeit (bis)</label>
                    <input type="time" id="scheduleTimeTo" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Zweck</label>
                    <textarea id="schedulePurpose" class="form-textarea" placeholder="Wofür benötigen Sie den Drucker?" rows="3"></textarea>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
            <button class="btn btn-primary" onclick="submitScheduleRequest()">Termin anfragen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
}

/**
 * Show equipment request modal
 */
function showEquipmentRequest() {
    const modalContent = `
        <div class="modal-header">
            <h3>Equipment Anfrage</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form">
                <div class="form-group">
                    <label class="form-label">Equipment-Typ</label>
                    <select id="equipmentType" class="form-select">
                        <option value="">Typ auswählen...</option>
                        <option value="keys">Schlüssel</option>
                        <option value="hardware">Hardware</option>
                        <option value="books">Bücher</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Gewünschtes Equipment</label>
                    <input type="text" id="equipmentName" class="form-input" placeholder="z.B. Laborschlüssel, Zangensatz, etc.">
                </div>
                <div class="form-group">
                    <label class="form-label">Benötigungsdauer</label>
                    <select id="equipmentDuration" class="form-select">
                        <option value="">Dauer wählen...</option>
                        <option value="1_hour">1 Stunde</option>
                        <option value="2_hours">2 Stunden</option>
                        <option value="half_day">Halber Tag</option>
                        <option value="full_day">Ganzer Tag</option>
                        <option value="week">1 Woche</option>
                        <option value="other">Andere</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Zweck / Begründung</label>
                    <textarea id="equipmentPurpose" class="form-textarea" placeholder="Wofür benötigen Sie das Equipment?" rows="3"></textarea>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
            <button class="btn btn-primary" onclick="submitEquipmentRequest()">Anfrage stellen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
}

/**
 * Show problem report modal
 */
function showProblemReport() {
    const modalContent = `
        <div class="modal-header">
            <h3>Problem melden</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form">
                <div class="form-group">
                    <label class="form-label">Problem-Typ</label>
                    <select id="problemType" class="form-select">
                        <option value="">Typ auswählen...</option>
                        <option value="printer">Drucker-Problem</option>
                        <option value="equipment">Equipment-Problem</option>
                        <option value="material">Material-Problem</option>
                        <option value="software">Software-Problem</option>
                        <option value="other">Sonstiges</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Betroffenes Gerät/Equipment</label>
                    <input type="text" id="problemDevice" class="form-input" placeholder="z.B. Drucker XYZ, Equipment ABC">
                </div>
                <div class="form-group">
                    <label class="form-label">Priorität</label>
                    <select id="problemPriority" class="form-select">
                        <option value="low">Niedrig</option>
                        <option value="medium" selected>Mittel</option>
                        <option value="high">Hoch</option>
                        <option value="urgent">Dringend</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Problembeschreibung</label>
                    <textarea id="problemDescription" class="form-textarea" placeholder="Beschreiben Sie das Problem detailliert..." rows="4"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Schritte zur Reproduktion</label>
                    <textarea id="problemSteps" class="form-textarea" placeholder="Wie kann das Problem reproduziert werden?" rows="3"></textarea>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
            <button class="btn btn-primary" onclick="submitProblemReport()">Problem melden</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
}

/**
 * Show material request modal
 */
function showMaterialRequest() {
    const modalContent = `
        <div class="modal-header">
            <h3>Material-Wunsch</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form">
                <div class="form-group">
                    <label class="form-label">Material-Typ</label>
                    <select id="materialType" class="form-select">
                        <option value="">Typ auswählen...</option>
                        <option value="filament">Filament</option>
                        <option value="masterbatch">Masterbatch</option>
                        <option value="tools">Werkzeuge</option>
                        <option value="parts">Ersatzteile</option>
                        <option value="other">Sonstiges</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Gewünschtes Material</label>
                    <input type="text" id="materialName" class="form-input" placeholder="z.B. PLA Schwarz, PETG Transparent">
                </div>
                <div class="form-group">
                    <label class="form-label">Geschätzte Menge</label>
                    <input type="text" id="materialQuantity" class="form-input" placeholder="z.B. 1kg, 5 Stück">
                </div>
                <div class="form-group">
                    <label class="form-label">Priorität</label>
                    <select id="materialPriority" class="form-select">
                        <option value="low">Niedrig</option>
                        <option value="medium" selected>Mittel</option>
                        <option value="high">Hoch</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Begründung</label>
                    <textarea id="materialReason" class="form-textarea" placeholder="Warum wird dieses Material benötigt?" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Lieferantenvorschlag (optional)</label>
                    <input type="text" id="materialSupplier" class="form-input" placeholder="z.B. Amazon, Conrad, etc.">
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
            <button class="btn btn-primary" onclick="submitMaterialRequest()">Wunsch einreichen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
}

/**
 * Submit schedule request
 */
async function submitScheduleRequest() {
    const printerId = document.getElementById('schedulePrinter').value;
    const date = document.getElementById('scheduleDate').value;
    const timeFrom = document.getElementById('scheduleTimeFrom').value;
    const timeTo = document.getElementById('scheduleTimeTo').value;
    const purpose = document.getElementById('schedulePurpose').value;
    
    if (!printerId || !date || !timeFrom || !timeTo || !purpose) {
        toast.error('Bitte alle Felder ausfüllen');
        return;
    }
    
    try {
        const scheduleData = {
            printerId,
            date,
            timeFrom,
            timeTo,
            purpose,
            requestedBy: window.currentUser.name,
            requestedByKennung: window.currentUser.kennung,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await window.db.collection('scheduleRequests').add(scheduleData);
        
        toast.success('Terminanfrage erfolgreich gesendet');
        closeModal();
        
    } catch (error) {
        console.error('Error submitting schedule request:', error);
        toast.error('Fehler beim Senden der Terminanfrage');
    }
}

/**
 * Submit equipment request
 */
async function submitEquipmentRequest() {
    const type = document.getElementById('equipmentType').value;
    const name = document.getElementById('equipmentName').value;
    const duration = document.getElementById('equipmentDuration').value;
    const purpose = document.getElementById('equipmentPurpose').value;
    
    if (!type || !name || !duration || !purpose) {
        toast.error('Bitte alle Felder ausfüllen');
        return;
    }
    
    try {
        const requestData = {
            type,
            name,
            duration,
            purpose,
            requestedBy: window.currentUser.name,
            requestedByKennung: window.currentUser.kennung,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await window.db.collection('equipmentRequests').add(requestData);
        
        toast.success('Equipment-Anfrage erfolgreich gesendet');
        closeModal();
        
    } catch (error) {
        console.error('Error submitting equipment request:', error);
        toast.error('Fehler beim Senden der Equipment-Anfrage');
    }
}

/**
 * Submit problem report
 */
async function submitProblemReport() {
    const type = document.getElementById('problemType').value;
    const device = document.getElementById('problemDevice').value;
    const priority = document.getElementById('problemPriority').value;
    const description = document.getElementById('problemDescription').value;
    const steps = document.getElementById('problemSteps').value;
    
    if (!type || !device || !description) {
        toast.error('Bitte alle Pflichtfelder ausfüllen');
        return;
    }
    
    try {
        const reportData = {
            type,
            device,
            priority,
            description,
            steps,
            reportedBy: window.currentUser.name,
            reportedByKennung: window.currentUser.kennung,
            status: 'open',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await window.db.collection('problemReports').add(reportData);
        
        toast.success('Problem erfolgreich gemeldet');
        closeModal();
        
    } catch (error) {
        console.error('Error submitting problem report:', error);
        toast.error('Fehler beim Melden des Problems');
    }
}

/**
 * Submit material request
 */
async function submitMaterialRequest() {
    const type = document.getElementById('materialType').value;
    const name = document.getElementById('materialName').value;
    const quantity = document.getElementById('materialQuantity').value;
    const priority = document.getElementById('materialPriority').value;
    const reason = document.getElementById('materialReason').value;
    const supplier = document.getElementById('materialSupplier').value;
    
    if (!type || !name || !quantity || !reason) {
        toast.error('Bitte alle Pflichtfelder ausfüllen');
        return;
    }
    
    try {
        const requestData = {
            type,
            name,
            quantity,
            priority,
            reason,
            supplier,
            requestedBy: window.currentUser.name,
            requestedByKennung: window.currentUser.kennung,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await window.db.collection('materialRequests').add(requestData);
        
        toast.success('Material-Wunsch erfolgreich eingereicht');
        closeModal();
        
    } catch (error) {
        console.error('Error submitting material request:', error);
        toast.error('Fehler beim Einreichen des Material-Wunsches');
    }
}

/**
 * Get status text for display
 */
function getStatusText(status) {
    const statusMap = {
        'available': 'Verfügbar',
        'in_use': 'In Betrieb',
        'maintenance': 'Wartung',
        'broken': 'Defekt'
    };
    return statusMap[status] || status;
}

/**
 * Cleanup user services listeners
 */
function cleanupUserServices() {
    if (userPrinterListener) {
        userPrinterListener();
        userPrinterListener = null;
    }
}

// Global functions
window.initializeUserServices = initializeUserServices;
window.cleanupUserServices = cleanupUserServices;
window.showPrinterStatus = showPrinterStatus;
window.showScheduling = showScheduling;
window.showEquipmentRequest = showEquipmentRequest;
window.showProblemReport = showProblemReport;
window.showMaterialRequest = showMaterialRequest;
window.submitScheduleRequest = submitScheduleRequest;
window.submitEquipmentRequest = submitEquipmentRequest;
window.submitProblemReport = submitProblemReport;
window.submitMaterialRequest = submitMaterialRequest;

console.log('👥 User Services Module loaded'); 