/**
 * User Dashboard System
 * Handles printer status display, user reservations, equipment requests, and problem reporting
 */

// Global user dashboard state
let userPrintersListener = null;
let userProblemReportsListener = null;

/**
 * Initialize user dashboard
 */
function initializeUserDashboard() {
    console.log('Initializing user dashboard...');
    setupUserPrintersListener();
    loadUserDashboardData();
}

/**
 * Setup real-time listener for printers (user view)
 */
function setupUserPrintersListener() {
    if (userPrintersListener) {
        userPrintersListener();
    }
    
    userPrintersListener = window.db.collection('printers').onSnapshot((snapshot) => {
        const printers = [];
        snapshot.forEach((doc) => {
            printers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        updatePrinterStatusCard(printers);
    }, (error) => {
        console.error('Error in user printers listener:', error);
    });
}

/**
 * Update printer status card with real-time data
 */
function updatePrinterStatusCard(printers) {
    const statusCounts = {
        total: printers.length,
        available: printers.filter(p => p.status === 'available').length,
        printing: printers.filter(p => p.status === 'printing').length,
        maintenance: printers.filter(p => p.status === 'maintenance').length,
        broken: printers.filter(p => p.status === 'broken').length
    };
    
    // Update printer icon with total count
    const printerIcon = document.querySelector('.printer-icon');
    if (printerIcon) {
        printerIcon.textContent = statusCounts.total;
    }
    
    // Update status counts in the new structure
    const statusElements = {
        available: document.getElementById('availablePrinters'),
        printing: document.getElementById('printingPrinters'),
        maintenance: document.getElementById('maintenancePrinters'),
        broken: document.getElementById('brokenPrinters')
    };
    
    Object.keys(statusElements).forEach(status => {
        if (statusElements[status]) {
            statusElements[status].textContent = statusCounts[status];
        }
    });
    
    // Store printer data globally for details view
    window.userPrintersData = printers;
}

/**
 * Load additional dashboard data
 */
async function loadUserDashboardData() {
    // Additional data loading can be added here
    console.log('User dashboard data loaded');
}

/**
 * Show detailed printer information modal
 */
function showPrinterDetails() {
    const printers = window.userPrintersData || [];
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Drucker-Übersicht</h3>
                <button class="modal-close" onclick="closePrinterDetails()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="printer-details-grid">
                    ${generatePrinterDetailsHTML(printers)}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.id = 'printerDetailsModal';
}

/**
 * Generate HTML for printer details
 */
function generatePrinterDetailsHTML(printers) {
    if (printers.length === 0) {
        return '<p>Keine Drucker-Daten verfügbar.</p>';
    }
    
    return printers.map(printer => {
        const statusClass = `printer-status-${printer.status}`;
        const statusText = getStatusText(printer.status);
        const statusIcon = getStatusIcon(printer.status);
        
        return `
            <div class="printer-detail-card ${statusClass}">
                <div class="printer-detail-header">
                    <h4 class="printer-name">${printer.name || 'Unbekannter Drucker'}</h4>
                    <div class="printer-status-badge">
                        <span class="status-icon">${statusIcon}</span>
                        <span class="status-text">${statusText}</span>
                    </div>
                </div>
                <div class="printer-detail-body">
                    <div class="printer-info-row">
                        <span class="info-label">Modell:</span>
                        <span class="info-value">${printer.model || 'Nicht angegeben'}</span>
                    </div>
                    <div class="printer-info-row">
                        <span class="info-label">Bauraum:</span>
                        <span class="info-value">${printer.buildVolume || 'Nicht angegeben'}</span>
                    </div>
                    <div class="printer-info-row">
                        <span class="info-label">Materialien:</span>
                        <span class="info-value">${printer.materials || 'Nicht angegeben'}</span>
                    </div>
                    ${printer.notes ? `
                        <div class="printer-info-row">
                            <span class="info-label">Hinweise:</span>
                            <span class="info-value">${printer.notes}</span>
                        </div>
                    ` : ''}
                </div>
                ${printer.status === 'available' ? `
                    <div class="printer-detail-footer">
                        <button class="btn btn-primary btn-sm" onclick="reservePrinter('${printer.id}')">
                            Reservieren
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Get status text in German
 */
function getStatusText(status) {
    const statusMap = {
        available: 'Verfügbar',
        printing: 'In Betrieb',
        maintenance: 'Wartung',
        broken: 'Defekt'
    };
    return statusMap[status] || 'Unbekannt';
}

/**
 * Get status icon
 */
function getStatusIcon(status) {
    const iconMap = {
        available: '✅',
        printing: '🔄',
        maintenance: '🔧',
        broken: '❌'
    };
    return iconMap[status] || '❓';
}

/**
 * Close printer details modal
 */
function closePrinterDetails() {
    const modal = document.getElementById('printerDetailsModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Reserve a specific printer
 */
function reservePrinter(printerId) {
    closePrinterDetails();
    showUserReservationForm();
    
    // Pre-select the printer in the reservation form
    setTimeout(() => {
        const printerSelect = document.getElementById('userReservationPrinter');
        if (printerSelect) {
            printerSelect.value = printerId;
        }
    }, 100);
}

/**
 * Show user reservation form
 */
function showUserReservationForm() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Drucker reservieren</h3>
                <button class="modal-close" onclick="closeUserReservationForm()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="userReservationForm" class="form">
                    <div class="form-group">
                        <label class="form-label">Drucker auswählen</label>
                        <select id="userReservationPrinter" class="form-select">
                            <option value="">Drucker auswählen...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Datum</label>
                        <input type="date" id="userReservationDate" class="form-input" min="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Startzeit</label>
                            <input type="time" id="userReservationStartTime" class="form-input">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Endzeit</label>
                            <input type="time" id="userReservationEndTime" class="form-input">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Projektbeschreibung</label>
                        <textarea id="userReservationNotes" class="form-textarea" placeholder="Beschreibe kurz dein Projekt..." rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeUserReservationForm()">Abbrechen</button>
                        <button type="button" class="btn btn-primary" onclick="submitUserReservation()">Reservierung anfragen</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.id = 'userReservationModal';
    
    // Populate printer dropdown with available printers
    populateUserPrinterDropdown();
}

/**
 * Close user reservation form
 */
function closeUserReservationForm() {
    const modal = document.getElementById('userReservationModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Populate printer dropdown for users
 */
async function populateUserPrinterDropdown() {
    const select = document.getElementById('userReservationPrinter');
    if (!select) return;
    
    try {
        const querySnapshot = await window.db.collection('printers').where('status', '==', 'available').get();
        
        select.innerHTML = '<option value="">Drucker auswählen...</option>';
        
        querySnapshot.forEach((doc) => {
            const printer = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${printer.name} (${printer.model || 'Unbekannt'})`;
            select.appendChild(option);
        });
        
        if (querySnapshot.empty) {
            select.innerHTML = '<option value="">Keine verfügbaren Drucker</option>';
        }
        
    } catch (error) {
        console.error('Error loading printers:', error);
        select.innerHTML = '<option value="">Fehler beim Laden</option>';
    }
}

/**
 * Submit user reservation
 */
async function submitUserReservation() {
    const formData = {
        printerId: document.getElementById('userReservationPrinter').value,
        date: document.getElementById('userReservationDate').value,
        startTime: document.getElementById('userReservationStartTime').value,
        endTime: document.getElementById('userReservationEndTime').value,
        notes: document.getElementById('userReservationNotes').value.trim()
    };
    
    // Validation
    if (!formData.printerId || !formData.date || !formData.startTime || !formData.endTime) {
        showToast('Bitte füllen Sie alle Pflichtfelder aus', 'error');
        return;
    }
    
    // Create DateTime objects
    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);
    
    if (endDateTime <= startDateTime) {
        showToast('Endzeit muss nach Startzeit liegen', 'error');
        return;
    }
    
    // Check if time is in the future
    const now = new Date();
    if (startDateTime <= now) {
        showToast('Reservierung muss in der Zukunft liegen', 'error');
        return;
    }
    
    try {
        // Get printer name
        const printerDoc = await window.db.collection('printers').doc(formData.printerId).get();
        const printerName = printerDoc.exists ? printerDoc.data().name : 'Unbekannter Drucker';
        
        await window.db.collection('reservations').add({
            userName: window.currentUser?.name || 'Unbekannter User',
            userKennung: window.currentUser?.kennung || '',
            printerId: formData.printerId,
            printerName: printerName,
            startTime: firebase.firestore.Timestamp.fromDate(startDateTime),
            endTime: firebase.firestore.Timestamp.fromDate(endDateTime),
            notes: formData.notes,
            status: 'pending', // User reservations need admin approval
            requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast(`✅ Reservierungsanfrage erfolgreich gesendet!\n\nDrucker: ${printerName}\nDatum: ${formData.date}\nZeit: ${formData.startTime} - ${formData.endTime}\n\nEin Admin wird deine Anfrage prüfen und bestätigen.`, 'success', 8000);
        closeUserReservationForm();
        
    } catch (error) {
        console.error('Error submitting reservation:', error);
        showToast('Fehler beim Senden der Anfrage', 'error');
    }
}

/**
 * Show user equipment request form
 */
function showUserEquipmentRequest() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Equipment ausleihen</h3>
                <button class="modal-close" onclick="closeUserEquipmentRequest()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="userEquipmentRequestForm" class="form">
                    <div class="form-group">
                        <label class="form-label">Equipment-Typ</label>
                        <select id="userEquipmentType" class="form-select" onchange="updateEquipmentList()">
                            <option value="">Typ auswählen...</option>
                            <option value="keys">Schlüssel</option>
                            <option value="tools">Werkzeuge</option>
                            <option value="accessories">Zubehör</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Equipment auswählen</label>
                        <select id="userEquipmentItem" class="form-select">
                            <option value="">Zuerst Typ auswählen...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Benötigt von</label>
                        <input type="date" id="userEquipmentFromDate" class="form-input" min="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Benötigt bis</label>
                        <input type="date" id="userEquipmentToDate" class="form-input" min="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Verwendungszweck</label>
                        <textarea id="userEquipmentReason" class="form-textarea" placeholder="Wofür benötigen Sie das Equipment?" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeUserEquipmentRequest()">Abbrechen</button>
                        <button type="button" class="btn btn-primary" onclick="submitUserEquipmentRequest()">Anfrage senden</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.id = 'userEquipmentRequestModal';
}

/**
 * Close user equipment request form
 */
function closeUserEquipmentRequest() {
    const modal = document.getElementById('userEquipmentRequestModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Update equipment list based on selected type
 */
async function updateEquipmentList() {
    const typeSelect = document.getElementById('userEquipmentType');
    const itemSelect = document.getElementById('userEquipmentItem');
    
    if (!typeSelect.value) {
        itemSelect.innerHTML = '<option value="">Zuerst Typ auswählen...</option>';
        return;
    }
    
    try {
        const querySnapshot = await window.db.collection('equipment')
            .where('category', '==', typeSelect.value)
            .where('status', '==', 'available')
            .get();
        
        itemSelect.innerHTML = '<option value="">Equipment auswählen...</option>';
        
        querySnapshot.forEach((doc) => {
            const equipment = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = equipment.name;
            itemSelect.appendChild(option);
        });
        
        if (querySnapshot.empty) {
            itemSelect.innerHTML = '<option value="">Kein verfügbares Equipment</option>';
        }
        
    } catch (error) {
        console.error('Error loading equipment:', error);
        itemSelect.innerHTML = '<option value="">Fehler beim Laden</option>';
    }
}

/**
 * Submit user equipment request
 */
async function submitUserEquipmentRequest() {
    const formData = {
        equipmentId: document.getElementById('userEquipmentItem').value,
        fromDate: document.getElementById('userEquipmentFromDate').value,
        toDate: document.getElementById('userEquipmentToDate').value,
        reason: document.getElementById('userEquipmentReason').value.trim()
    };
    
    // Validation
    if (!formData.equipmentId || !formData.fromDate || !formData.toDate || !formData.reason) {
        showToast('Bitte füllen Sie alle Felder aus', 'error');
        return;
    }
    
    const fromDate = new Date(formData.fromDate);
    const toDate = new Date(formData.toDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (fromDate < today) {
        showToast('Startdatum muss heute oder in der Zukunft liegen', 'error');
        return;
    }
    
    if (toDate <= fromDate) {
        showToast('Enddatum muss nach dem Startdatum liegen', 'error');
        return;
    }
    
    try {
        // Get equipment name
        const equipmentDoc = await window.db.collection('equipment').doc(formData.equipmentId).get();
        const equipmentName = equipmentDoc.exists ? equipmentDoc.data().name : 'Unbekanntes Equipment';
        
        await window.db.collection('equipmentRequests').add({
            userName: window.currentUser?.name || 'Unbekannter User',
            userKennung: window.currentUser?.kennung || '',
            equipmentId: formData.equipmentId,
            equipmentName: equipmentName,
            fromDate: firebase.firestore.Timestamp.fromDate(fromDate),
            toDate: firebase.firestore.Timestamp.fromDate(toDate),
            reason: formData.reason,
            status: 'pending',
            requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast(`✅ Equipment-Anfrage erfolgreich gesendet!\n\nEquipment: ${equipmentName}\nZeitraum: ${formData.fromDate} bis ${formData.toDate}\n\nEin Admin wird deine Anfrage prüfen und das Equipment bereitstellen.`, 'success', 8000);
        closeUserEquipmentRequest();
        
    } catch (error) {
        console.error('Error submitting equipment request:', error);
        showToast('Fehler beim Senden der Anfrage', 'error');
    }
}

/**
 * Show problem report form
 */
function showProblemReportForm() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Drucker-Status melden</h3>
                <button class="modal-close" onclick="closeProblemReportForm()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="problemReportForm" class="form">
                    <div class="form-group">
                        <label class="form-label">Betroffener Drucker</label>
                        <select id="problemPrinter" class="form-select">
                            <option value="">Drucker auswählen...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Meldungstyp</label>
                        <select id="problemType" class="form-select">
                            <option value="">Meldungstyp auswählen...</option>
                            <optgroup label="Probleme melden">
                                <option value="mechanical">Mechanisches Problem</option>
                                <option value="software">Software-Problem</option>
                                <option value="filament">Filament-Problem</option>
                                <option value="power">Stromversorgung</option>
                                <option value="quality">Druckqualität</option>
                                <option value="maintenance_needed">Wartung erforderlich</option>
                                <option value="other_problem">Sonstiges Problem</option>
                            </optgroup>
                            <optgroup label="Status-Updates">
                                <option value="repaired">Drucker repariert</option>
                                <option value="maintenance_done">Wartung abgeschlossen</option>
                                <option value="ready_for_use">Bereit für Nutzung</option>
                            </optgroup>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Auswirkung/Status</label>
                        <select id="problemSeverity" class="form-select">
                            <option value="available">Verfügbar - Drucker funktioniert einwandfrei</option>
                            <option value="printing">In Betrieb - Wird gerade verwendet</option>
                            <option value="maintenance">Wartung - Funktioniert mit Einschränkungen</option>
                            <option value="broken">Defekt - Nicht nutzbar</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Beschreibung</label>
                        <textarea id="problemDescription" class="form-textarea" placeholder="Beschreiben Sie die Situation, das Problem oder die durchgeführte Reparatur..." rows="4"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeProblemReportForm()">Abbrechen</button>
                        <button type="button" class="btn btn-primary" onclick="submitProblemReport()">Meldung senden</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.id = 'problemReportModal';
    
    // Populate printer dropdown
    populateProblemPrinterDropdown();
}

/**
 * Close problem report form
 */
function closeProblemReportForm() {
    const modal = document.getElementById('problemReportModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Populate printer dropdown for problem reports
 */
async function populateProblemPrinterDropdown() {
    const select = document.getElementById('problemPrinter');
    if (!select) return;
    
    try {
        const querySnapshot = await window.db.collection('printers').get();
        
        select.innerHTML = '<option value="">Drucker auswählen...</option>';
        
        querySnapshot.forEach((doc) => {
            const printer = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${printer.name} (${printer.model || 'Unbekannt'})`;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading printers:', error);
        select.innerHTML = '<option value="">Fehler beim Laden</option>';
    }
}

/**
 * Submit problem report or status update
 */
async function submitProblemReport() {
    const formData = {
        printerId: document.getElementById('problemPrinter').value,
        problemType: document.getElementById('problemType').value,
        newStatus: document.getElementById('problemSeverity').value,
        description: document.getElementById('problemDescription').value.trim()
    };
    
    // Validation
    if (!formData.printerId || !formData.problemType || !formData.newStatus || !formData.description) {
        showToast('Bitte füllen Sie alle Felder aus', 'error');
        return;
    }
    
    try {
        // Get printer name
        const printerDoc = await window.db.collection('printers').doc(formData.printerId).get();
        const printerName = printerDoc.exists ? printerDoc.data().name : 'Unbekannter Drucker';
        
        // Determine if this is a problem report or status update
        const isStatusUpdate = ['repaired', 'maintenance_done', 'ready_for_use'].includes(formData.problemType);
        const reportType = isStatusUpdate ? 'status_update' : 'problem';
        
        // Submit report/update
        await window.db.collection('problemReports').add({
            userName: window.currentUser?.name || 'Unbekannter User',
            userKennung: window.currentUser?.kennung || '',
            printerId: formData.printerId,
            printerName: printerName,
            problemType: formData.problemType,
            reportType: reportType,
            requestedStatus: formData.newStatus,
            description: formData.description,
            status: 'open',
            reportedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update printer status directly based on new status
        await window.db.collection('printers').doc(formData.printerId).update({
            status: formData.newStatus,
            lastStatusUpdate: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdatedBy: window.currentUser?.name || 'Unbekannter User',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const actionText = isStatusUpdate ? 'Status-Update' : 'Problem-Meldung';
        const statusText = {
            'available': 'Verfügbar',
            'printing': 'In Betrieb', 
            'maintenance': 'Wartung erforderlich',
            'broken': 'Defekt/Nicht nutzbar'
        }[formData.newStatus] || formData.newStatus;
        
        showToast(`✅ ${actionText} erfolgreich gesendet!\n\nDrucker: ${printerName}\nNeuer Status: ${statusText}\n\nDanke für deine Meldung! Der Drucker-Status wurde entsprechend aktualisiert.`, 'success', 8000);
        closeProblemReportForm();
        
    } catch (error) {
        console.error('Error submitting report:', error);
        showToast('Fehler beim Melden', 'error');
    }
}

/**
 * Cleanup user dashboard listeners
 */
function cleanupUserDashboard() {
    if (userPrintersListener) {
        userPrintersListener();
        userPrintersListener = null;
    }
    if (userProblemReportsListener) {
        userProblemReportsListener();
        userProblemReportsListener = null;
    }
}

// ==================== GLOBAL EXPORTS ====================
// Export functions to window for global access
window.showPrinterDetails = showPrinterDetails;
window.closePrinterDetails = closePrinterDetails;
window.reservePrinter = reservePrinter;
window.showUserReservationForm = showUserReservationForm;
window.closeUserReservationForm = closeUserReservationForm;
window.submitUserReservation = submitUserReservation;
window.showUserEquipmentRequest = showUserEquipmentRequest;
window.closeUserEquipmentRequest = closeUserEquipmentRequest;
window.submitUserEquipmentRequest = submitUserEquipmentRequest;
window.showProblemReportForm = showProblemReportForm;
window.closeProblemReportForm = closeProblemReportForm;
window.submitProblemReport = submitProblemReport; 