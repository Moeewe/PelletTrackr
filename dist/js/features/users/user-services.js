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
            case 'printing':
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
 * Show printer status modal with clickable status cycling
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
                    <div class="printer-item">
                        <div class="printer-info">
                            <h4 class="printer-name">${printer.name}</h4>
                            <p class="printer-location">${printer.location || ''}</p>
                            ${printer.description && printer.description !== 'undefined' && printer.description !== 'Keine Beschreibung' ? `<p class="printer-description">${printer.description}</p>` : ''}
                        </div>
                        <div class="printer-status-controls">
                            <div class="status-grid">
                                <button class="status-btn status-available ${printer.status === 'available' ? 'active' : ''}" 
                                        onclick="cyclePrinterStatus('${printer.id}', 'available')">
                                    <span class="status-label">Verfügbar</span>
                                </button>
                                <button class="status-btn status-busy ${printer.status === 'printing' ? 'active' : ''}" 
                                        onclick="cyclePrinterStatus('${printer.id}', 'printing')">
                                    <span class="status-label">In Betrieb</span>
                                </button>
                                <button class="status-btn status-maintenance ${printer.status === 'maintenance' ? 'active' : ''}" 
                                        onclick="cyclePrinterStatus('${printer.id}', 'maintenance')">
                                    <span class="status-label">Wartung</span>
                                </button>
                                <button class="status-btn status-broken ${printer.status === 'broken' ? 'active' : ''}" 
                                        onclick="cyclePrinterStatus('${printer.id}', 'broken')">
                                    <span class="status-label">Defekt</span>
                                </button>
                            </div>
                            <button class="btn btn-problem-report" onclick="reportPrinterProblem('${printer.id}', '${printer.name}')">
                                Problem melden
                            </button>
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
 * Cycle printer status when user clicks on status button
 * Requires admin access for safety
 */
async function cyclePrinterStatus(printerId, newStatus) {
    // Check admin access
    if (!window.checkAdminAccess()) {
        return;
    }
    
    try {
        await window.db.collection('printers').doc(printerId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastStatusChangeBy: window.currentUser?.name || 'Unbekannt',
            lastStatusChangeAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local data
        const printerIndex = userPrinters.findIndex(p => p.id === printerId);
        if (printerIndex !== -1) {
            userPrinters[printerIndex].status = newStatus;
        }
        
        // Update the main interface status counts
        updatePrinterStatusDisplay();
        
        // Show success message
        const statusText = getStatusText(newStatus);
        toast.success(`Drucker-Status auf "${statusText}" gesetzt`);
        
        // Refresh the modal display
        showPrinterStatus();
        
    } catch (error) {
        console.error('Error updating printer status:', error);
        toast.error('Fehler beim Ändern des Drucker-Status');
    }
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
                    <label class="form-label">Material/Filament</label>
                    <input type="text" id="materialType" class="form-input" placeholder="z.B. PLA, PETG, TPU...">
                </div>
                <div class="form-group">
                    <label class="form-label">Name/Bezeichnung</label>
                    <input type="text" id="materialName" class="form-input" placeholder="z.B. PLA Schwarz, PETG Transparent...">
                </div>
                <div class="form-group">
                    <label class="form-label">Menge</label>
                    <input type="text" id="materialQuantity" class="form-input" placeholder="z.B. 1kg, 500g, 2 Spulen...">
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
                    <textarea id="materialReason" class="form-textarea" placeholder="Warum benötigen Sie dieses Material?" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Lieferant (optional)</label>
                    <input type="text" id="materialSupplier" class="form-input" placeholder="z.B. Prusament, eSUN...">
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
                                <button class="btn btn-primary" onclick="submitMaterialWish()">Wunsch senden</button>
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
                    <select id="equipmentType" class="form-select" onchange="updateEquipmentOptions()">
                        <option value="">Typ auswählen...</option>
                        <option value="keys">Schlüssel</option>
                        <option value="hardware">Hardware</option>
                        <option value="books">Bücher</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Gewünschtes Equipment</label>
                    <select id="equipmentName" class="form-select" disabled>
                        <option value="">Zuerst Equipment-Typ auswählen...</option>
                    </select>
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
    
    // Load equipment data for dynamic selection
    loadEquipmentForRequest();
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
 * Submit equipment request
 */
async function submitEquipmentRequest() {
    const equipmentType = document.getElementById('equipmentType').value;
    const equipmentName = document.getElementById('equipmentName').value;
    const duration = document.getElementById('equipmentDuration').value;
    const purpose = document.getElementById('equipmentPurpose').value;
    
    if (!equipmentType || !equipmentName || !duration || !purpose) {
        toast.error('Bitte alle Felder ausfüllen');
        return;
    }
    
    // Find equipment by name
    const selectedEquipment = availableEquipment.find(eq => eq.name === equipmentName);
    if (!selectedEquipment) {
        toast.error('Equipment nicht gefunden');
        return;
    }
    
    const requestData = {
        type: 'equipment',
        equipmentId: selectedEquipment.id,
        equipmentType: equipmentType,
        equipmentName: selectedEquipment.name,
        equipmentLocation: selectedEquipment.location,
        duration: duration,
        purpose: purpose,
        status: 'pending',
        userName: window.currentUser?.name || 'Unbekannter User',
        userKennung: window.currentUser?.kennung || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await window.db.collection('requests').add(requestData);
        
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
            reportedAt: firebase.firestore.FieldValue.serverTimestamp(),
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
 * Submit material wish - FIX: Move to materialOrders collection
 */
async function submitMaterialWish() {
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
            type: 'request',
            source: 'user', // Track this as user-created
            userName: window.currentUser?.name || 'Unbekannter User',
            userKennung: window.currentUser?.kennung || '',
            materialName: name,
            manufacturer: supplier || '',
            reason: reason,
            quantity: quantity,
            priority: priority,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Use materialOrders collection like admin orders
        await window.db.collection('materialOrders').add(requestData);
        
        toast.success('Material-Wunsch erfolgreich eingereicht');
        closeModal();
        
    } catch (error) {
        console.error('Error submitting material wish:', error);
        toast.error('Fehler beim Einreichen des Material-Wunschs');
    }
}

/**
 * Report a problem with a specific printer
 */
function reportPrinterProblem(printerId, printerName) {
    const modalContent = `
        <div class="modal-header">
            <h3>Problem melden</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form">
                <div class="printer-info-section">
                    <h4>Drucker: ${printerName}</h4>
                    <p style="color: #666; margin-bottom: 20px;">Melden Sie ein Problem mit diesem Drucker</p>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Problem-Typ</label>
                    <select id="problemType" class="form-select">
                        <option value="">Problem-Typ auswählen...</option>
                        <option value="mechanical">Mechanisches Problem</option>
                        <option value="software">Software Problem</option>
                        <option value="material">Material Problem</option>
                        <option value="quality">Druckqualität</option>
                        <option value="maintenance">Wartung erforderlich</option>
                        <option value="other">Sonstiges</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Schweregrad</label>
                    <select id="problemSeverity" class="form-select">
                        <option value="low">Niedrig - Drucker funktioniert, aber mit Einschränkungen</option>
                        <option value="medium" selected>Mittel - Drucker teilweise beeinträchtigt</option>
                        <option value="high">Hoch - Drucker nicht nutzbar</option>
                        <option value="critical">Kritisch - Sicherheitsrisiko oder Schäden</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Problem-Beschreibung</label>
                    <textarea id="problemDescription" class="form-textarea" placeholder="Beschreiben Sie das Problem so detailliert wie möglich..." rows="4"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Schritte zur Reproduktion (optional)</label>
                    <textarea id="problemSteps" class="form-textarea" placeholder="Wie kann das Problem reproduziert werden?" rows="3"></textarea>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
            <button class="btn btn-primary" onclick="submitPrinterProblemReport('${printerId}', '${printerName}')">Problem melden</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
}

/**
 * Submit printer problem report
 */
async function submitPrinterProblemReport(printerId, printerName) {
    const problemType = document.getElementById('problemType').value;
    const problemSeverity = document.getElementById('problemSeverity').value;
    const problemDescription = document.getElementById('problemDescription').value.trim();
    const problemSteps = document.getElementById('problemSteps').value.trim();
    
    if (!problemType || !problemDescription) {
        toast.error('Bitte Problem-Typ und Beschreibung ausfüllen');
        return;
    }
    
    try {
        const reportData = {
            printerId: printerId,
            printerName: printerName,
            problemType: problemType,
            severity: problemSeverity,
            description: problemDescription,
            reproductionSteps: problemSteps,
            reportedBy: window.currentUser.name,
            reportedByKennung: window.currentUser.kennung,
            status: 'open',
            reportedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await window.db.collection('problemReports').add(reportData);
        
        toast.success(`Problem für Drucker "${printerName}" erfolgreich gemeldet`);
        closeModal();
        
        // Optional: Set printer status to maintenance if severity is high or critical
        if (problemSeverity === 'high' || problemSeverity === 'critical') {
            const confirmMessage = `Das Problem wurde als ${problemSeverity === 'critical' ? 'kritisch' : 'schwerwiegend'} eingestuft. Soll der Drucker automatisch auf "Wartung" gesetzt werden?`;
            
            const userChoice = await toast.confirm(
                confirmMessage,
                'Status ändern',
                'Nein, danke'
            );
            
            if (userChoice && window.currentUser.isAdmin) {
                await cyclePrinterStatus(printerId, 'maintenance');
            }
        }
        
    } catch (error) {
        console.error('Error submitting problem report:', error);
        toast.error('Fehler beim Melden des Problems');
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

/**
 * Load equipment data for request
 */
let availableEquipment = [];

async function loadEquipmentForRequest() {
    if (!window.db) return;
    
    try {
        const snapshot = await window.db.collection('equipment').get();
        availableEquipment = [];
        snapshot.forEach((doc) => {
            const equipmentData = doc.data();
            // Only show available equipment
            if (equipmentData.status === 'available') {
                availableEquipment.push({
                    id: doc.id,
                    name: equipmentData.name,
                    category: equipmentData.category,
                    location: equipmentData.location
                });
            }
        });
    } catch (error) {
        console.error('Error loading equipment:', error);
    }
}

/**
 * Update equipment options based on selected type
 */
function updateEquipmentOptions() {
    const typeSelect = document.getElementById('equipmentType');
    const equipmentSelect = document.getElementById('equipmentName');
    
    if (!typeSelect || !equipmentSelect) return;
    
    const selectedType = typeSelect.value;
    
    // Clear current options
    equipmentSelect.innerHTML = '';
    
    if (!selectedType) {
        equipmentSelect.innerHTML = '<option value="">Zuerst Equipment-Typ auswählen...</option>';
        equipmentSelect.disabled = true;
        return;
    }
    
    // Filter equipment by selected category
    const filteredEquipment = availableEquipment.filter(item => item.category === selectedType);
    
    if (filteredEquipment.length === 0) {
        equipmentSelect.innerHTML = '<option value="">Kein Equipment in dieser Kategorie verfügbar</option>';
        equipmentSelect.disabled = true;
        return;
    }
    
    // Add default option
    equipmentSelect.innerHTML = '<option value="">Equipment auswählen...</option>';
    
    // Add equipment options
    filteredEquipment.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.name} (${item.location})`;
        equipmentSelect.appendChild(option);
    });
    
    equipmentSelect.disabled = false;
}

/**
 * Show user's equipment requests
 */
async function showMyEquipmentRequests() {
    const modalContent = `
        <div class="modal-header">
            <h3>Meine Ausleihen</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div id="myEquipmentRequestsList">
                Lade Ausleihen...
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
    
    try {
        const snapshot = await window.db.collection('requests')
            .where('type', '==', 'equipment')
            .where('userKennung', '==', window.currentUser.kennung)
            .get();
        
        const requests = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            requests.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate()
            });
        });
        
        // Sort locally by creation date (newest first)
        requests.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt - a.createdAt;
        });
        
        renderMyEquipmentRequests(requests);
        
    } catch (error) {
        console.error('Error loading equipment requests:', error);
        document.getElementById('myEquipmentRequestsList').innerHTML = `
            <div class="error-state">
                <p>Fehler beim Laden der Ausleihen</p>
            </div>
        `;
    }
}

/**
 * Render user's equipment requests
 */
function renderMyEquipmentRequests(requests) {
    const container = document.getElementById('myEquipmentRequestsList');
    
    if (requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine Ausleihen gefunden</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="entry-cards">';
    
    requests.forEach(request => {
        const date = request.createdAt ? request.createdAt.toLocaleDateString('de-DE') : 'Unbekannt';
        const statusText = getEquipmentStatusText(request.status);
        const statusClass = getEquipmentStatusClass(request.status);
        
        html += `
            <div class="entry-card">
                <div class="entry-card-header">
                    <h3 class="entry-job-title">${request.equipmentName}</h3>
                    <span class="entry-status-badge ${statusClass}">${statusText}</span>
                </div>
                
                <div class="entry-card-body">
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Datum</span>
                        <span class="entry-detail-value">${date}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Typ</span>
                        <span class="entry-detail-value">${request.equipmentType}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Dauer</span>
                        <span class="entry-detail-value">${getEquipmentDurationText(request.duration)}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Zweck</span>
                        <span class="entry-detail-value">${request.purpose}</span>
                    </div>
                    
                    ${request.equipmentLocation ? `
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Standort</span>
                        <span class="entry-detail-value">${request.equipmentLocation}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="entry-card-footer">
                    ${request.status === 'given' || request.status === 'active' ? `
                        <button class="btn btn-primary btn-sm" onclick="requestEquipmentReturn('${request.id}')">
                            Rückgabe anfragen
                        </button>
                    ` : ''}
                    ${request.status === 'pending' ? `
                        <button class="btn btn-danger btn-sm" onclick="deleteEquipmentRequest('${request.id}')">
                            Löschen
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Request return of equipment
 */
async function requestEquipmentReturn(requestId) {
    if (!confirm('Möchten Sie die Rückgabe dieses Equipments anfragen?')) {
        return;
    }
    
    try {
        await window.db.collection('requests').doc(requestId).update({
            status: 'return_requested',
            returnRequestedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        toast.success('Rückgabe-Anfrage gesendet');
        // Refresh the view if still on the equipment requests modal
        const equipmentRequestsList = document.getElementById('myEquipmentRequestsList');
        if (equipmentRequestsList) {
            refreshMyEquipmentRequests();
        }
        
    } catch (error) {
        console.error('Error requesting return:', error);
        toast.error('Fehler beim Senden der Rückgabe-Anfrage');
    }
}

/**
 * Delete equipment request
 */
async function deleteEquipmentRequest(requestId) {
    try {
        // First remove from display immediately with multiple selector strategies
        let requestElement = document.querySelector(`[onclick*="deleteEquipmentRequest('${requestId}')"]`)?.closest('.entry-card');
        
        // Fallback selector strategy
        if (!requestElement) {
            requestElement = document.querySelector(`[onclick="deleteEquipmentRequest('${requestId}')"]`)?.closest('.entry-card');
        }
        
        // Debug logging
        console.log(`🗑️ Delete Equipment Request: ${requestId}`, requestElement ? 'Element found' : 'Element NOT found');
        
        if (requestElement) {
            requestElement.style.opacity = '0.5';
            requestElement.style.pointerEvents = 'none';
            console.log('✅ Element made transparent');
        }
        
        await window.db.collection('requests').doc(requestId).delete();
        
        toast.success('Equipment-Anfrage gelöscht');
        
        // Refresh the view to get accurate count and auto-close if needed
        setTimeout(() => {
            refreshMyEquipmentRequests();
        }, 100);
        
    } catch (error) {
        console.error('Error deleting equipment request:', error);
        toast.error('Fehler beim Löschen der Equipment-Anfrage');
        
        // Restore element if deletion failed
        const requestElement = document.querySelector(`[onclick*="deleteEquipmentRequest('${requestId}')"]`)?.closest('.entry-card');
        if (requestElement) {
            requestElement.style.opacity = '1';
            requestElement.style.pointerEvents = 'auto';
        }
    }
}

/**
 * Refresh equipment requests without reopening modal
 */
async function refreshMyEquipmentRequests() {
    const container = document.getElementById('myEquipmentRequestsList');
    if (!container) return;
    
    try {
        container.innerHTML = 'Lade Ausleihen...';
        
        const snapshot = await window.db.collection('requests')
            .where('type', '==', 'equipment')
            .where('userKennung', '==', window.currentUser.kennung)
            .get();
        
        const requests = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            requests.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate()
            });
        });
        
        // Sort locally by creation date (newest first)
        requests.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt - a.createdAt;
        });
        
        renderMyEquipmentRequests(requests);
        
        // Check if modal should auto-close (no requests left)
        if (requests.length === 0) {
            setTimeout(() => {
                toast.info('Alle Ausleihen wurden entfernt');
                closeModal();
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error refreshing equipment requests:', error);
        container.innerHTML = `
            <div class="error-state">
                <p>Fehler beim Aktualisieren der Ausleihen</p>
            </div>
        `;
    }
}

/**
 * Get equipment status text
 */
function getEquipmentStatusText(status) {
    const statusMap = {
        'pending': 'OFFEN',
        'approved': 'GENEHMIGT', 
        'given': 'AUSGEGEBEN',
        'active': 'AKTIV',
        'return_requested': 'RÜCKGABE ANGEFRAGT',
        'returned': 'ZURÜCKGEGEBEN',
        'rejected': 'ABGELEHNT'
    };
    return statusMap[status] || status.toUpperCase();
}

/**
 * Get equipment status CSS class
 */
function getEquipmentStatusClass(status) {
    const classMap = {
        'pending': 'status-new',
        'approved': 'status-paid',
        'given': 'status-paid',
        'active': 'status-paid',
        'return_requested': 'status-unpaid',
        'returned': 'status-paid',
        'rejected': 'status-unpaid'
    };
    return classMap[status] || 'status-new';
}

/**
 * Get equipment duration text
 */
function getEquipmentDurationText(duration) {
    const durationMap = {
        '1_hour': '1 Stunde',
        '2_hours': '2 Stunden',
        'half_day': 'Halber Tag',
        'full_day': 'Ganzer Tag',
        'week': '1 Woche',
        'other': 'Andere'
    };
    return durationMap[duration] || duration;
}

/**
 * Show user's problem reports
 */
async function showMyProblemReports() {
    const modalContent = `
        <div class="modal-header">
            <h3>Meine Meldungen</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div id="myProblemReportsList">
                Lade Meldungen...
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
    
    try {
        const snapshot = await window.db.collection('problemReports')
            .where('reportedByKennung', '==', window.currentUser.kennung)
            .get();
        
        const reports = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            reports.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || data.reportedAt?.toDate()
            });
        });
        
        // Sort locally by creation date (newest first)
        reports.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt - a.createdAt;
        });
        
        renderMyProblemReports(reports);
        
    } catch (error) {
        console.error('Error loading problem reports:', error);
        document.getElementById('myProblemReportsList').innerHTML = `
            <div class="error-state">
                <p>Fehler beim Laden der Meldungen</p>
            </div>
        `;
    }
}

/**
 * Render user's problem reports
 */
function renderMyProblemReports(reports) {
    const container = document.getElementById('myProblemReportsList');
    
    if (reports.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine Meldungen gefunden</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="entry-cards">';
    
    reports.forEach(report => {
        const date = report.createdAt ? report.createdAt.toLocaleDateString('de-DE') : 'Unbekannt';
        const statusText = getProblemStatusText(report.status);
        const statusClass = getProblemStatusClass(report.status);
        const priorityText = getProblemPriorityText(report.priority || report.severity);
        
        html += `
            <div class="entry-card">
                <div class="entry-card-header">
                    <h3 class="entry-job-title">${report.device || 'Problem-Meldung'}</h3>
                    <span class="entry-status-badge ${statusClass}">${statusText}</span>
                </div>
                
                <div class="entry-card-body">
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Datum</span>
                        <span class="entry-detail-value">${date}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Typ</span>
                        <span class="entry-detail-value">${getProblemTypeText(report.type)}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Priorität</span>
                        <span class="entry-detail-value">${priorityText}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Beschreibung</span>
                        <span class="entry-detail-value">${report.description}</span>
                    </div>
                    
                    ${report.steps ? `
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Schritte</span>
                        <span class="entry-detail-value">${report.steps}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="entry-card-footer">
                    ${report.status === 'open' ? `
                        <button class="btn btn-secondary btn-sm" onclick="editProblemReport('${report.id}')">
                            Bearbeiten
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProblemReport('${report.id}')">
                            Löschen
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Edit problem report
 */
async function editProblemReport(reportId) {
    try {
        const doc = await window.db.collection('problemReports').doc(reportId).get();
        if (!doc.exists) {
            toast.error('Meldung nicht gefunden');
            return;
        }
        
        const report = doc.data();
        
        const modalContent = `
            <div class="modal-header">
                <h3>Meldung bearbeiten</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form">
                    <div class="form-group">
                        <label class="form-label">Problem-Typ</label>
                        <select id="editProblemType" class="form-select">
                            <option value="printer" ${report.type === 'printer' ? 'selected' : ''}>Drucker-Problem</option>
                            <option value="equipment" ${report.type === 'equipment' ? 'selected' : ''}>Equipment-Problem</option>
                            <option value="material" ${report.type === 'material' ? 'selected' : ''}>Material-Problem</option>
                            <option value="software" ${report.type === 'software' ? 'selected' : ''}>Software-Problem</option>
                            <option value="other" ${report.type === 'other' ? 'selected' : ''}>Sonstiges</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Betroffenes Gerät/Equipment</label>
                        <input type="text" id="editProblemDevice" class="form-input" value="${report.device || ''}" placeholder="z.B. Drucker XYZ, Equipment ABC">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Priorität</label>
                        <select id="editProblemPriority" class="form-select">
                            <option value="low" ${(report.priority || report.severity) === 'low' ? 'selected' : ''}>Niedrig</option>
                            <option value="medium" ${(report.priority || report.severity) === 'medium' ? 'selected' : ''}>Mittel</option>
                            <option value="high" ${(report.priority || report.severity) === 'high' ? 'selected' : ''}>Hoch</option>
                            <option value="urgent" ${(report.priority || report.severity) === 'urgent' || (report.priority || report.severity) === 'critical' ? 'selected' : ''}>Dringend</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Problembeschreibung</label>
                        <textarea id="editProblemDescription" class="form-textarea" rows="4">${report.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Schritte zur Reproduktion</label>
                        <textarea id="editProblemSteps" class="form-textarea" rows="3">${report.steps || ''}</textarea>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
                <button class="btn btn-primary" onclick="saveProblemReportEdit('${reportId}')">Speichern</button>
            </div>
        `;
        
        showModalWithContent(modalContent);
        
    } catch (error) {
        console.error('Error loading problem report for edit:', error);
        toast.error('Fehler beim Laden der Meldung');
    }
}

/**
 * Save problem report edit
 */
async function saveProblemReportEdit(reportId) {
    const type = document.getElementById('editProblemType').value;
    const device = document.getElementById('editProblemDevice').value;
    const priority = document.getElementById('editProblemPriority').value;
    const description = document.getElementById('editProblemDescription').value;
    const steps = document.getElementById('editProblemSteps').value;
    
    if (!type || !device || !description) {
        toast.error('Bitte alle Pflichtfelder ausfüllen');
        return;
    }
    
    try {
        await window.db.collection('problemReports').doc(reportId).update({
            type,
            device,
            priority,
            description,
            steps,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        toast.success('Meldung erfolgreich aktualisiert');
        closeModal();
        // Refresh the view if still on the problem reports modal
        setTimeout(() => {
            const problemReportsList = document.getElementById('myProblemReportsList');
            if (problemReportsList) {
                refreshMyProblemReports();
            }
        }, 100);
        
    } catch (error) {
        console.error('Error updating problem report:', error);
        toast.error('Fehler beim Aktualisieren der Meldung');
    }
}

/**
 * Delete problem report
 */
async function deleteProblemReport(reportId) {
    try {
        // First remove from display immediately with multiple selector strategies
        let reportElement = document.querySelector(`[onclick*="deleteProblemReport('${reportId}')"]`)?.closest('.entry-card');
        
        // Fallback selector strategy
        if (!reportElement) {
            reportElement = document.querySelector(`[onclick="deleteProblemReport('${reportId}')"]`)?.closest('.entry-card');
        }
        
        // Debug logging
        console.log(`🗑️ Delete Problem Report: ${reportId}`, reportElement ? 'Element found' : 'Element NOT found');
        
        if (reportElement) {
            reportElement.style.opacity = '0.5';
            reportElement.style.pointerEvents = 'none';
            console.log('✅ Element made transparent');
        }
        
        await window.db.collection('problemReports').doc(reportId).delete();
        
        toast.success('Problem-Meldung gelöscht');
        
        // Refresh the view to get accurate count and auto-close if needed
        setTimeout(() => {
            refreshMyProblemReports();
        }, 100);
        
    } catch (error) {
        console.error('Error deleting problem report:', error);
        toast.error('Fehler beim Löschen der Problem-Meldung');
        
        // Restore element if deletion failed
        const reportElement = document.querySelector(`[onclick*="deleteProblemReport('${reportId}')"]`)?.closest('.entry-card');
        if (reportElement) {
            reportElement.style.opacity = '1';
            reportElement.style.pointerEvents = 'auto';
        }
    }
}

/**
 * Refresh problem reports without reopening modal
 */
async function refreshMyProblemReports() {
    const container = document.getElementById('myProblemReportsList');
    if (!container) return;
    
    try {
        container.innerHTML = 'Lade Meldungen...';
        
        const snapshot = await window.db.collection('problemReports')
            .where('reportedByKennung', '==', window.currentUser.kennung)
            .get();
        
        const reports = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            reports.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || data.reportedAt?.toDate()
            });
        });
        
        // Sort locally by creation date (newest first)
        reports.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt - a.createdAt;
        });
        
        renderMyProblemReports(reports);
        
        // Check if modal should auto-close (no reports left)
        if (reports.length === 0) {
            setTimeout(() => {
                toast.info('Alle Meldungen wurden entfernt');
                closeModal();
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error refreshing problem reports:', error);
        container.innerHTML = `
            <div class="error-state">
                <p>Fehler beim Aktualisieren der Meldungen</p>
            </div>
        `;
    }
}

/**
 * Get problem status text
 */
function getProblemStatusText(status) {
    const statusMap = {
        'open': 'OFFEN',
        'in_progress': 'IN BEARBEITUNG',
        'resolved': 'GELÖST',
        'closed': 'GESCHLOSSEN'
    };
    return statusMap[status] || status.toUpperCase();
}

/**
 * Get problem status CSS class
 */
function getProblemStatusClass(status) {
    const classMap = {
        'open': 'status-new',
        'in_progress': 'status-unpaid',
        'resolved': 'status-paid',
        'closed': 'status-paid'
    };
    return classMap[status] || 'status-new';
}

/**
 * Get problem type text
 */
function getProblemTypeText(type) {
    const typeMap = {
        'printer': 'Drucker-Problem',
        'equipment': 'Equipment-Problem',
        'material': 'Material-Problem',
        'software': 'Software-Problem',
        'other': 'Sonstiges'
    };
    return typeMap[type] || type;
}

/**
 * Get problem priority text
 */
function getProblemPriorityText(priority) {
    const priorityMap = {
        'low': 'Niedrig',
        'medium': 'Mittel',
        'high': 'Hoch',
        'urgent': 'Dringend',
        'critical': 'Kritisch'
    };
    return priorityMap[priority] || priority;
}

/**
 * Show user's material requests
 */
async function showMyMaterialRequests() {
    const modalContent = `
        <div class="modal-header">
            <h3>Meine Wünsche</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div id="myMaterialRequestsList">
                Lade Wünsche...
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
    
    try {
        const snapshot = await window.db.collection('materialOrders')
            .where('source', '==', 'user')
            .where('userKennung', '==', window.currentUser.kennung)
            .get();
        
        const requests = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            requests.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate()
            });
        });
        
        // Sort locally by creation date (newest first)
        requests.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt - a.createdAt;
        });
        
        renderMyMaterialRequests(requests);
        
    } catch (error) {
        console.error('Error loading material requests:', error);
        document.getElementById('myMaterialRequestsList').innerHTML = `
            <div class="error-state">
                <p>Fehler beim Laden der Wünsche</p>
            </div>
        `;
    }
}

/**
 * Render user's material requests
 */
function renderMyMaterialRequests(requests) {
    const container = document.getElementById('myMaterialRequestsList');
    
    if (requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine Wünsche gefunden</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="entry-cards">';
    
    requests.forEach(request => {
        const date = request.createdAt ? request.createdAt.toLocaleDateString('de-DE') : 'Unbekannt';
        const statusText = getMaterialRequestStatusText(request.status);
        const statusClass = getMaterialRequestStatusClass(request.status);
        const priorityText = getMaterialPriorityText(request.priority);
        
        html += `
            <div class="entry-card">
                <div class="entry-card-header">
                    <h3 class="entry-job-title">${request.materialName || request.name || 'Material-Wunsch'}</h3>
                    <span class="entry-status-badge ${statusClass}">${statusText}</span>
                </div>
                
                <div class="entry-card-body">
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Datum</span>
                        <span class="entry-detail-value">${date}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Material</span>
                        <span class="entry-detail-value">${request.materialName || 'Nicht angegeben'}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Menge</span>
                        <span class="entry-detail-value">${request.quantity || 'Nicht angegeben'}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Priorität</span>
                        <span class="entry-detail-value">${priorityText}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Begründung</span>
                        <span class="entry-detail-value">${request.reason}</span>
                    </div>
                    
                    ${request.manufacturer ? `
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Hersteller</span>
                        <span class="entry-detail-value">${request.manufacturer}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="entry-card-footer">
                    ${request.status === 'pending' ? `
                        <button class="btn btn-secondary btn-sm" onclick="editMaterialRequest('${request.id}')">
                            Bearbeiten
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteMaterialRequest('${request.id}')">
                            Löschen
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Edit material request
 */
async function editMaterialRequest(requestId) {
    try {
        const doc = await window.db.collection('materialRequests').doc(requestId).get();
        if (!doc.exists) {
            toast.error('Wunsch nicht gefunden');
            return;
        }
        
        const request = doc.data();
        
        const modalContent = `
            <div class="modal-header">
                <h3>Wunsch bearbeiten</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form">
                    <div class="form-group">
                        <label class="form-label">Material/Filament</label>
                        <input type="text" id="editMaterialType" class="form-input" value="${request.type || ''}" placeholder="z.B. PLA, PETG, TPU...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Name/Bezeichnung</label>
                        <input type="text" id="editMaterialName" class="form-input" value="${request.name || ''}" placeholder="z.B. PLA Schwarz, PETG Transparent...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Menge</label>
                        <input type="text" id="editMaterialQuantity" class="form-input" value="${request.quantity || ''}" placeholder="z.B. 1kg, 500g, 2 Spulen...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Priorität</label>
                        <select id="editMaterialPriority" class="form-select">
                            <option value="low" ${request.priority === 'low' ? 'selected' : ''}>Niedrig</option>
                            <option value="medium" ${request.priority === 'medium' || !request.priority ? 'selected' : ''}>Mittel</option>
                            <option value="high" ${request.priority === 'high' ? 'selected' : ''}>Hoch</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Begründung</label>
                        <textarea id="editMaterialReason" class="form-textarea" rows="3">${request.reason || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Lieferant (optional)</label>
                        <input type="text" id="editMaterialSupplier" class="form-input" value="${request.supplier || ''}" placeholder="z.B. Prusament, eSUN...">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
                <button class="btn btn-primary" onclick="saveMaterialRequestEdit('${requestId}')">Speichern</button>
            </div>
        `;
        
        showModalWithContent(modalContent);
        
    } catch (error) {
        console.error('Error loading material request for edit:', error);
        toast.error('Fehler beim Laden des Wunsches');
    }
}

/**
 * Save material request edit
 */
async function saveMaterialRequestEdit(requestId) {
    const type = document.getElementById('editMaterialType').value;
    const name = document.getElementById('editMaterialName').value;
    const quantity = document.getElementById('editMaterialQuantity').value;
    const priority = document.getElementById('editMaterialPriority').value;
    const reason = document.getElementById('editMaterialReason').value;
    const supplier = document.getElementById('editMaterialSupplier').value;
    
    if (!type || !name || !quantity || !reason) {
        toast.error('Bitte alle Pflichtfelder ausfüllen');
        return;
    }
    
    try {
        await window.db.collection('materialRequests').doc(requestId).update({
            type,
            name,
            quantity,
            priority,
            reason,
            supplier,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        toast.success('Wunsch erfolgreich aktualisiert');
        closeModal();
        // Refresh the view if still on the material requests modal
        setTimeout(() => {
            const materialRequestsList = document.getElementById('myMaterialRequestsList');
            if (materialRequestsList) {
                refreshMyMaterialRequests();
            }
        }, 100);
        
    } catch (error) {
        console.error('Error updating material request:', error);
        toast.error('Fehler beim Aktualisieren des Wunsches');
    }
}

/**
 * Delete material request
 */
async function deleteMaterialRequest(requestId) {
    try {
        // First remove from display immediately with multiple selector strategies
        let requestElement = document.querySelector(`[onclick*="deleteMaterialRequest('${requestId}')"]`)?.closest('.entry-card');
        
        // Fallback selector strategy
        if (!requestElement) {
            requestElement = document.querySelector(`[onclick="deleteMaterialRequest('${requestId}')"]`)?.closest('.entry-card');
        }
        
        // Debug logging
        console.log(`🗑️ Delete Material Request: ${requestId}`, requestElement ? 'Element found' : 'Element NOT found');
        
        if (requestElement) {
            requestElement.style.opacity = '0.5';
            requestElement.style.pointerEvents = 'none';
            console.log('✅ Element made transparent');
        }
        
        await window.db.collection('materialOrders').doc(requestId).delete();
        
        toast.success('Material-Wunsch gelöscht');
        
        // Refresh the view to get accurate count and auto-close if needed
        setTimeout(() => {
            refreshMyMaterialRequests();
        }, 100);
        
    } catch (error) {
        console.error('Error deleting material request:', error);
        toast.error('Fehler beim Löschen des Material-Wunschs');
        
        // Restore element if deletion failed
        const requestElement = document.querySelector(`[onclick*="deleteMaterialRequest('${requestId}')"]`)?.closest('.entry-card');
        if (requestElement) {
            requestElement.style.opacity = '1';
            requestElement.style.pointerEvents = 'auto';
        }
    }
}

/**
 * Refresh material requests without reopening modal
 */
async function refreshMyMaterialRequests() {
    const container = document.getElementById('myMaterialRequestsList');
    if (!container) return;
    
    try {
        container.innerHTML = 'Lade Wünsche...';
        
        const snapshot = await window.db.collection('materialOrders')
            .where('source', '==', 'user')
            .where('userKennung', '==', window.currentUser.kennung)
            .get();
        
        const requests = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            requests.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate()
            });
        });
        
        // Sort locally by creation date (newest first)
        requests.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt - a.createdAt;
        });
        
        renderMyMaterialRequests(requests);
        
        // Check if modal should auto-close (no requests left)
        if (requests.length === 0) {
            setTimeout(() => {
                toast.info('Alle Material-Wünsche wurden entfernt');
                closeModal();
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error refreshing material requests:', error);
        container.innerHTML = `
            <div class="error-state">
                <p>Fehler beim Aktualisieren der Material-Wünsche</p>
            </div>
        `;
    }
}

/**
 * Get material request status text
 */
function getMaterialRequestStatusText(status) {
    const statusMap = {
        'pending': 'OFFEN',
        'approved': 'GENEHMIGT',
        'ordered': 'BESTELLT',
        'delivered': 'GELIEFERT',
        'rejected': 'ABGELEHNT'
    };
    return statusMap[status] || status.toUpperCase();
}

/**
 * Get material request status CSS class
 */
function getMaterialRequestStatusClass(status) {
    const classMap = {
        'pending': 'status-new',
        'approved': 'status-unpaid',
        'ordered': 'status-unpaid',
        'delivered': 'status-paid',
        'rejected': 'status-unpaid'
    };
    return classMap[status] || 'status-new';
}

/**
 * Get material priority text
 */
function getMaterialPriorityText(priority) {
    const priorityMap = {
        'low': 'Niedrig',
        'medium': 'Mittel',
        'high': 'Hoch'
    };
    return priorityMap[priority] || 'Mittel';
}

// Global functions
window.initializeUserServices = initializeUserServices;
window.cleanupUserServices = cleanupUserServices;
window.showPrinterStatus = showPrinterStatus;
window.cyclePrinterStatus = cyclePrinterStatus;
window.showEquipmentRequest = showEquipmentRequest;
window.updateEquipmentOptions = updateEquipmentOptions;
window.loadEquipmentForRequest = loadEquipmentForRequest;
window.submitEquipmentRequest = submitEquipmentRequest;
window.submitMaterialWish = submitMaterialWish;
window.showProblemReport = showProblemReport;
window.reportPrinterProblem = reportPrinterProblem;
window.submitPrinterProblemReport = submitPrinterProblemReport;
window.showMyEquipmentRequests = showMyEquipmentRequests;
window.requestEquipmentReturn = requestEquipmentReturn;
window.deleteEquipmentRequest = deleteEquipmentRequest;
window.showMyProblemReports = showMyProblemReports;
window.editProblemReport = editProblemReport;
window.saveProblemReportEdit = saveProblemReportEdit;
window.deleteProblemReport = deleteProblemReport;
window.showMyMaterialRequests = showMyMaterialRequests;
window.editMaterialRequest = editMaterialRequest;
window.saveMaterialRequestEdit = saveMaterialRequestEdit;
window.deleteMaterialRequest = deleteMaterialRequest;

console.log('👥 User Services Module loaded'); 