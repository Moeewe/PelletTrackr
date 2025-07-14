/**
 * Admin Problem Reports & Equipment Requests Management
 * Handles admin view of user-submitted problems and equipment requests
 */

// Global state
let problemReports = [];
let equipmentRequests = [];

/**
 * Show problem reports modal
 */
function showProblemReports() {
    const modalContent = `
        <div class="modal-header">
            <h3>Problem-Meldungen</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="table-controls">
                <select id="problemStatusFilter" class="sort-select" onchange="filterProblemReports()">
                    <option value="all">Alle anzeigen</option>
                    <option value="open">Offen</option>
                    <option value="in_progress">In Bearbeitung</option>
                    <option value="resolved">Gelöst</option>
                </select>
            </div>
            <div id="problemReportsList" class="problem-reports-container">
                <!-- Problem reports will be loaded here -->
            </div>
        </div>
    `;
    
    showModalWithContent(modalContent);
    loadProblemReports();
}

/**
 * Close problem reports modal
 */
function closeProblemReports() {
    closeModal();
}

/**
 * Load problem reports from Firebase
 */
async function loadProblemReports() {
    try {
        const querySnapshot = await window.db.collection('problemReports')
            .orderBy('reportedAt', 'desc')
            .get();
        
        problemReports = [];
        querySnapshot.forEach((doc) => {
            problemReports.push({
                id: doc.id,
                ...doc.data(),
                reportedAt: doc.data().reportedAt?.toDate()
            });
        });
        
        renderProblemReports();
        console.log('Loaded problem reports:', problemReports.length);
        
    } catch (error) {
        console.error('Error loading problem reports:', error);
        showToast('Fehler beim Laden der Problem-Meldungen', 'error');
    }
}

/**
 * Filter problem reports by status
 */
function filterProblemReports() {
    const filter = document.getElementById('problemStatusFilter').value;
    renderProblemReports(filter);
}

/**
 * Render problem reports
 */
function renderProblemReports(statusFilter = 'all') {
    const container = document.getElementById('problemReportsList');
    if (!container) return;
    
    let filteredReports = problemReports;
    if (statusFilter !== 'all') {
        filteredReports = problemReports.filter(report => report.status === statusFilter);
    }
    
    if (filteredReports.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine Problem-Meldungen gefunden.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredReports.map(report => `
        <div class="problem-report-item ${report.status}">
            <div class="problem-header">
                <div class="problem-user">
                    <strong>${report.userName}</strong> (${report.userKennung})
                </div>
                <div class="problem-date">${report.reportedAt ? report.reportedAt.toLocaleDateString() : 'Unbekanntes Datum'}</div>
            </div>
            <div class="problem-details">
                <div class="problem-printer"><strong>Drucker:</strong> ${report.printerName}</div>
                <div class="problem-type"><strong>Typ:</strong> ${getProblemTypeText(report.problemType)}</div>
                <div class="problem-severity">
                    <strong>Schweregrad:</strong> 
                    <span class="severity-indicator ${report.severity}">${getSeverityText(report.severity)}</span>
                </div>
            </div>
            <div class="problem-description">${report.description}</div>
            ${report.status === 'open' ? `
                <div class="problem-actions">
                    <button class="btn btn-primary" onclick="updateProblemStatus('${report.id}', 'in_progress')">In Bearbeitung</button>
                    <button class="btn btn-success" onclick="updateProblemStatus('${report.id}', 'resolved')">Als gelöst markieren</button>
                    <button class="btn btn-danger" onclick="deleteProblemReport('${report.id}')">Löschen</button>
                </div>
            ` : report.status === 'in_progress' ? `
                <div class="problem-actions">
                    <button class="btn btn-success" onclick="updateProblemStatus('${report.id}', 'resolved')">Als gelöst markieren</button>
                    <button class="btn btn-secondary" onclick="updateProblemStatus('${report.id}', 'open')">Zurück zu offen</button>
                    <button class="btn btn-danger" onclick="deleteProblemReport('${report.id}')">Löschen</button>
                </div>
            ` : `
                <div class="problem-actions">
                    <button class="btn btn-secondary" onclick="updateProblemStatus('${report.id}', 'open')">Wieder öffnen</button>
                    <button class="btn btn-danger" onclick="deleteProblemReport('${report.id}')">Löschen</button>
                </div>
            `}
        </div>
    `).join('');
}

/**
 * Get problem type text
 */
function getProblemTypeText(type) {
    const typeMap = {
        'mechanical': 'Mechanisches Problem',
        'software': 'Software-Problem',
        'filament': 'Filament-Problem',
        'power': 'Stromversorgung',
        'quality': 'Druckqualität',
        'other': 'Sonstiges'
    };
    return typeMap[type] || type;
}

/**
 * Get severity text
 */
function getSeverityText(severity) {
    const severityMap = {
        'low': 'Niedrig',
        'medium': 'Mittel',
        'high': 'Hoch',
        'critical': 'Kritisch'
    };
    return severityMap[severity] || severity;
}

/**
 * Update problem report status
 */
async function updateProblemStatus(reportId, newStatus) {
    try {
        await window.db.collection('problemReports').doc(reportId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // If resolved, also update printer status if it was broken
        if (newStatus === 'resolved') {
            const report = problemReports.find(r => r.id === reportId);
            if (report && (report.severity === 'high' || report.severity === 'critical')) {
                await window.db.collection('printers').doc(report.printerId).update({
                    status: 'available',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        showToast('Status erfolgreich aktualisiert', 'success');
        loadProblemReports();
        
    } catch (error) {
        console.error('Error updating problem status:', error);
        showToast('Fehler beim Aktualisieren des Status', 'error');
    }
}

/**
 * Delete problem report
 */
async function deleteProblemReport(reportId) {
    if (!confirm('Möchten Sie diese Problem-Meldung wirklich löschen?')) {
        return;
    }
    
    try {
        await window.db.collection('problemReports').doc(reportId).delete();
        showToast('Problem-Meldung erfolgreich gelöscht', 'success');
        loadProblemReports();
        
    } catch (error) {
        console.error('Error deleting problem report:', error);
        showToast('Fehler beim Löschen', 'error');
    }
}

/**
 * Show equipment requests modal
 */
function showEquipmentRequests() {
    document.getElementById('overlay').style.display = 'block';
    
    // Create modal dynamically
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Ausleih-Anfragen</h3>
                <button class="modal-close" onclick="closeEquipmentRequests()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="table-controls">
                    <select id="equipmentRequestStatusFilter" class="sort-select" onchange="filterEquipmentRequests()">
                        <option value="all">Alle anzeigen</option>
                        <option value="pending">Ausstehend</option>
                        <option value="approved">Genehmigt</option>
                        <option value="rejected">Abgelehnt</option>
                        <option value="active">Aktiv</option>
                        <option value="returned">Zurückgegeben</option>
                    </select>
                </div>
                <div id="equipmentRequestsList" class="equipment-requests-container">
                    <!-- Equipment requests will be loaded here -->
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.id = 'equipmentRequestsModal';
    
    loadEquipmentRequests();
}

/**
 * Close equipment requests modal
 */
function closeEquipmentRequests() {
    document.getElementById('overlay').style.display = 'none';
    const modal = document.getElementById('equipmentRequestsModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Load equipment requests from Firebase
 */
async function loadEquipmentRequests() {
    try {
        const querySnapshot = await window.db.collection('equipmentRequests')
            .orderBy('requestedAt', 'desc')
            .get();
        
        equipmentRequests = [];
        querySnapshot.forEach((doc) => {
            equipmentRequests.push({
                id: doc.id,
                ...doc.data(),
                requestedAt: doc.data().requestedAt?.toDate(),
                fromDate: doc.data().fromDate?.toDate(),
                toDate: doc.data().toDate?.toDate()
            });
        });
        
        renderEquipmentRequests();
        console.log('Loaded equipment requests:', equipmentRequests.length);
        
    } catch (error) {
        console.error('Error loading equipment requests:', error);
        showToast('Fehler beim Laden der Ausleih-Anfragen', 'error');
    }
}

/**
 * Filter equipment requests by status
 */
function filterEquipmentRequests() {
    const filter = document.getElementById('equipmentRequestStatusFilter').value;
    renderEquipmentRequests(filter);
}

/**
 * Render equipment requests
 */
function renderEquipmentRequests(statusFilter = 'all') {
    const container = document.getElementById('equipmentRequestsList');
    if (!container) return;
    
    let filteredRequests = equipmentRequests;
    if (statusFilter !== 'all') {
        filteredRequests = equipmentRequests.filter(request => request.status === statusFilter);
    }
    
    if (filteredRequests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine Ausleih-Anfragen gefunden.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredRequests.map(request => `
        <div class="equipment-request-item ${request.status}">
            <div class="request-header">
                <div class="request-user">
                    <strong>${request.userName}</strong> (${request.userKennung})
                </div>
                <div class="request-date">${request.requestedAt ? request.requestedAt.toLocaleDateString() : 'Unbekanntes Datum'}</div>
            </div>
            <div class="request-details">
                <div class="request-equipment"><strong>Equipment:</strong> ${request.equipmentName}</div>
                <div class="request-period">
                    <strong>Zeitraum:</strong> 
                    ${request.fromDate ? request.fromDate.toLocaleDateString() : 'Unbekannt'} - 
                    ${request.toDate ? request.toDate.toLocaleDateString() : 'Unbekannt'}
                </div>
            </div>
            <div class="request-reason"><strong>Grund:</strong> ${request.reason}</div>
            
            ${request.status === 'pending' ? `
                <div class="request-actions">
                    <button class="btn btn-success" onclick="updateEquipmentRequestStatus('${request.id}', 'approved')">Genehmigen</button>
                    <button class="btn btn-danger" onclick="updateEquipmentRequestStatus('${request.id}', 'rejected')">Ablehnen</button>
                    <button class="btn btn-delete" onclick="deleteEquipmentRequest('${request.id}')">Löschen</button>
                </div>
            ` : request.status === 'approved' ? `
                <div class="request-actions">
                    <button class="btn btn-primary" onclick="markEquipmentAsGiven('${request.id}')">Als ausgegeben markieren</button>
                    <button class="btn btn-secondary" onclick="updateEquipmentRequestStatus('${request.id}', 'rejected')">Doch ablehnen</button>
                    <button class="btn btn-delete" onclick="deleteEquipmentRequest('${request.id}')">Löschen</button>
                </div>
            ` : request.status === 'active' ? `
                <div class="request-actions">
                    <button class="btn btn-success" onclick="markEquipmentAsReturned('${request.id}')">Als zurückgegeben markieren</button>
                    <button class="btn btn-delete" onclick="deleteEquipmentRequest('${request.id}')">Löschen</button>
                </div>
            ` : `
                <div class="request-actions">
                    <div class="request-status">Status: ${getRequestStatusText(request.status)}</div>
                    <button class="btn btn-delete" onclick="deleteEquipmentRequest('${request.id}')">Löschen</button>
                </div>
            `}
        </div>
    `).join('');
}

/**
 * Get request status text
 */
function getRequestStatusText(status) {
    const statusMap = {
        'pending': 'Ausstehend',
        'approved': 'Genehmigt',
        'rejected': 'Abgelehnt',
        'active': 'Aktiv',
        'returned': 'Zurückgegeben'
    };
    return statusMap[status] || status;
}

/**
 * Update equipment request status
 */
async function updateEquipmentRequestStatus(requestId, newStatus) {
    try {
        await window.db.collection('equipmentRequests').doc(requestId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Status erfolgreich aktualisiert', 'success');
        loadEquipmentRequests();
        
    } catch (error) {
        console.error('Error updating equipment request status:', error);
        showToast('Fehler beim Aktualisieren des Status', 'error');
    }
}

/**
 * Mark equipment as given out
 */
async function markEquipmentAsGiven(requestId) {
    try {
        const request = equipmentRequests.find(r => r.id === requestId);
        if (!request) return;
        
        // Update equipment status to borrowed
        await window.db.collection('equipment').doc(request.equipmentId).update({
            status: 'borrowed',
            borrowedBy: request.userName,
            borrowedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update request status to active
        await window.db.collection('equipmentRequests').doc(requestId).update({
            status: 'active',
            givenOutAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Equipment als ausgegeben markiert', 'success');
        loadEquipmentRequests();
        
    } catch (error) {
        console.error('Error marking equipment as given:', error);
        showToast('Fehler beim Markieren als ausgegeben', 'error');
    }
}

/**
 * Mark equipment as returned
 */
async function markEquipmentAsReturned(requestId) {
    try {
        const request = equipmentRequests.find(r => r.id === requestId);
        if (!request) return;
        
        // Update equipment status to available
        await window.db.collection('equipment').doc(request.equipmentId).update({
            status: 'available',
            borrowedBy: firebase.firestore.FieldValue.delete(),
            borrowedAt: firebase.firestore.FieldValue.delete(),
            returnedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update request status to returned
        await window.db.collection('equipmentRequests').doc(requestId).update({
            status: 'returned',
            returnedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Equipment als zurückgegeben markiert', 'success');
        loadEquipmentRequests();
        
    } catch (error) {
        console.error('Error marking equipment as returned:', error);
        showToast('Fehler beim Markieren als zurückgegeben', 'error');
    }
} 

/**
 * Delete equipment request
 */
async function deleteEquipmentRequest(requestId) {
    if (!confirm('Möchten Sie diese Ausleih-Anfrage wirklich löschen?')) {
        return;
    }

    try {
        await window.db.collection('equipmentRequests').doc(requestId).delete();
        showToast('Ausleih-Anfrage erfolgreich gelöscht', 'success');
        loadEquipmentRequests();
    } catch (error) {
        console.error('Error deleting equipment request:', error);
        showToast('Fehler beim Löschen', 'error');
    }
} 

// ==================== GLOBAL EXPORTS ====================
// Admin Problem Reports-Funktionen global verfügbar machen
window.showProblemReports = showProblemReports;
window.closeProblemReports = closeProblemReports;
window.loadProblemReports = loadProblemReports;
window.updateProblemReportStatus = updateProblemReportStatus;
window.showEquipmentRequests = showEquipmentRequests;
window.closeEquipmentRequests = closeEquipmentRequests;
window.loadEquipmentRequests = loadEquipmentRequests;
window.updateEquipmentRequestStatus = updateEquipmentRequestStatus;
window.markEquipmentAsGiven = markEquipmentAsGiven;
window.markEquipmentAsReturned = markEquipmentAsReturned;
window.deleteEquipmentRequest = deleteEquipmentRequest;

console.log("🚨 Admin Problem Reports Module geladen"); 