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
    
    // Update UI elements
    document.getElementById('totalPrintersCount').textContent = statusCounts.total;
    document.getElementById('availablePrintersCount').textContent = statusCounts.available;
    document.getElementById('printingPrintersCount').textContent = statusCounts.printing;
    document.getElementById('maintenancePrintersCount').textContent = statusCounts.maintenance;
    document.getElementById('brokenPrintersCount').textContent = statusCounts.broken;
}

/**
 * Load additional dashboard data
 */
async function loadUserDashboardData() {
    // Additional data loading can be added here
    console.log('User dashboard data loaded');
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
        
        showToast('Reservierungsanfrage erfolgreich gesendet. Ein Admin wird diese prüfen.', 'success');
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
        
        showToast('Equipment-Anfrage erfolgreich gesendet. Ein Admin wird diese prüfen.', 'success');
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
                <h3>Problem melden</h3>
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
                        <label class="form-label">Problemtyp</label>
                        <select id="problemType" class="form-select">
                            <option value="">Problemtyp auswählen...</option>
                            <option value="mechanical">Mechanisches Problem</option>
                            <option value="software">Software-Problem</option>
                            <option value="filament">Filament-Problem</option>
                            <option value="power">Stromversorgung</option>
                            <option value="quality">Druckqualität</option>
                            <option value="other">Sonstiges</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Schweregrad</label>
                        <select id="problemSeverity" class="form-select">
                            <option value="low">Niedrig - Funktioniert mit Einschränkungen</option>
                            <option value="medium">Mittel - Deutliche Beeinträchtigung</option>
                            <option value="high">Hoch - Nicht nutzbar</option>
                            <option value="critical">Kritisch - Sicherheitsrisiko</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Problembeschreibung</label>
                        <textarea id="problemDescription" class="form-textarea" placeholder="Beschreiben Sie das Problem so detailliert wie möglich..." rows="4"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeProblemReportForm()">Abbrechen</button>
                        <button type="button" class="btn btn-primary" onclick="submitProblemReport()">Problem melden</button>
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
 * Submit problem report
 */
async function submitProblemReport() {
    const formData = {
        printerId: document.getElementById('problemPrinter').value,
        problemType: document.getElementById('problemType').value,
        severity: document.getElementById('problemSeverity').value,
        description: document.getElementById('problemDescription').value.trim()
    };
    
    // Validation
    if (!formData.printerId || !formData.problemType || !formData.severity || !formData.description) {
        showToast('Bitte füllen Sie alle Felder aus', 'error');
        return;
    }
    
    try {
        // Get printer name
        const printerDoc = await window.db.collection('printers').doc(formData.printerId).get();
        const printerName = printerDoc.exists ? printerDoc.data().name : 'Unbekannter Drucker';
        
        // Submit problem report
        await window.db.collection('problemReports').add({
            userName: window.currentUser?.name || 'Unbekannter User',
            userKennung: window.currentUser?.kennung || '',
            printerId: formData.printerId,
            printerName: printerName,
            problemType: formData.problemType,
            severity: formData.severity,
            description: formData.description,
            status: 'open',
            reportedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // If severity is high or critical, automatically set printer to broken status
        if (formData.severity === 'high' || formData.severity === 'critical') {
            await window.db.collection('printers').doc(formData.printerId).update({
                status: 'broken',
                lastProblemReport: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        showToast('Problem erfolgreich gemeldet. Ein Admin wird sich darum kümmern.', 'success');
        closeProblemReportForm();
        
    } catch (error) {
        console.error('Error submitting problem report:', error);
        showToast('Fehler beim Melden des Problems', 'error');
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