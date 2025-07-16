/**
 * Admin Problem Reports & Equipment Requests Management
 * Handles admin view of user-submitted problems and equipment requests
 */

// Global problem report state
let problemReports = [];
let problemReportsListener = null;
let adminEquipmentRequests = [];
let currentProblemFilter = 'all';
let adminEquipmentRequestsListener = null;

/**
 * Setup real-time listener for problem reports
 */
function setupProblemReportsListener() {
    // Clean up existing listener
    if (problemReportsListener) {
        problemReportsListener();
        problemReportsListener = null;
    }
    
    console.log('🔄 Setting up problem reports listener...');
    
    try {
        problemReportsListener = window.db.collection('problemReports')
            .orderBy('reportedAt', 'desc')
            .onSnapshot((snapshot) => {
                problemReports = [];
                snapshot.forEach((doc) => {
                    problemReports.push({
                        id: doc.id,
                        ...doc.data(),
                        reportedAt: doc.data().reportedAt?.toDate()
                    });
                });
                
                console.log('Live update: Loaded problem reports:', problemReports.length);
                console.log('📊 Problem Reports by status:', problemReports.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {}));
                
                // Manual badge synchronization - count only open problem reports
                const openReports = problemReports.filter(report => report.status === 'open');
                console.log(`🔄 Problem Reports Badge: ${openReports.length} open reports`);
                
                // Update badge directly if updateBadge function is available
                if (window.updateBadge && typeof window.updateBadge === 'function') {
                    window.updateBadge('problem-reports', openReports.length);
                    console.log(`✅ Problem Reports Badge manually updated: ${openReports.length}`);
                }
                
                renderProblemReports();
            }, (error) => {
                console.error('Error in problem reports listener:', error);
                showToast('Fehler beim Live-Update der Problem-Meldungen', 'error');
            });
        
        console.log("✅ Problem reports listener registered");
    } catch (error) {
        console.error("❌ Failed to setup problem reports listener:", error);
        // Fallback to manual loading
        loadProblemReports();
    }
}

/**
 * Setup real-time listener for equipment requests
 */
function setupEquipmentRequestsListener() {
    // Clean up existing listener
    if (adminEquipmentRequestsListener) {
        adminEquipmentRequestsListener();
        adminEquipmentRequestsListener = null;
    }
    
    try {
        // Start with fallback listener (no orderBy) to avoid index issues
        console.log('🔄 Starting with fallback equipment requests listener (no index required)...');
        setupEquipmentRequestsListenerFallback();
    } catch (error) {
        console.error("❌ Failed to setup equipment requests listener:", error);
        // Fallback to manual loading
        loadEquipmentRequests();
    }
}

/**
 * Setup equipment requests listener without orderBy (fallback for missing index)
 */
function setupEquipmentRequestsListenerFallback() {
    try {
        adminEquipmentRequestsListener = window.db.collection('requests')
            .where('type', '==', 'equipment')
            .onSnapshot((snapshot) => {
                adminEquipmentRequests = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    adminEquipmentRequests.push({
                        id: doc.id,
                        ...data,
                        requestedAt: data.createdAt?.toDate() || data.requestedAt?.toDate()
                    });
                });
                
                // Sort locally since we can't use orderBy
                adminEquipmentRequests.sort((a, b) => {
                    const aDate = a.requestedAt || new Date(0);
                    const bDate = b.requestedAt || new Date(0);
                    return bDate - aDate;
                });
                
                console.log('Live update (fallback): Loaded equipment requests:', adminEquipmentRequests.length);
                renderEquipmentRequests();
            }, (error) => {
                console.error('Error in fallback equipment requests listener:', error);
                showToast('Fehler beim Live-Update der Equipment-Anfragen', 'error');
            });
        
        console.log("✅ Equipment requests fallback listener registered");
    } catch (error) {
        console.error("❌ Failed to setup fallback equipment requests listener:", error);
        loadEquipmentRequests();
    }
}

/**
 * Show problem reports modal
 * Requires admin access
 */
function showProblemReports() {
    if (!window.checkAdminAccess()) {
        return;
    }
    
    const modalContent = `
        <div class="modal-header">
            <h3>Problem-Meldungen verwalten</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="card">
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label">Filter nach Status</label>
                        <select id="problemStatusFilter" class="form-input" onchange="filterProblemReports()">
                            <option value="all">Alle anzeigen</option>
                            <option value="open">Offen</option>
                            <option value="in_progress">In Bearbeitung</option>
                            <option value="resolved">Gelöst</option>
                        </select>
                    </div>
                    <div id="problemReportsList" class="problem-reports-container">
                        <div class="loading-state">Laden...</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
    setupProblemReportsListener();
    
    // Force initial render with current data
    setTimeout(() => {
        renderProblemReports();
    }, 100);
}

/**
 * Close problem reports modal
 */
function closeProblemReports() {
    // Clean up listeners
    if (problemReportsListener) {
        problemReportsListener();
        problemReportsListener = null;
    }
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
        'material': 'Material-Problem',
        'filament': 'Filament-Problem',
        'power': 'Stromversorgung',
        'quality': 'Druckqualität',
        'maintenance': 'Wartung erforderlich',
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
        // Removed manual reload - real-time listener will handle the update
        
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
        // Removed manual reload - real-time listener will handle the update
        
    } catch (error) {
        console.error('Error deleting problem report:', error);
        showToast('Fehler beim Löschen der Problem-Meldung', 'error');
    }
}

/**
 * Show equipment requests modal
 */
function showEquipmentRequests() {
    const modalContent = `
        <div class="modal-header">
            <h3>Equipment-Anfragen verwalten</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="card">
                <div class="card-body">
                    <div class="form-group">
                        <label class="form-label">Filter nach Status</label>
                        <select id="equipmentStatusFilter" class="form-input" onchange="filterEquipmentRequests()">
                            <option value="all">Alle anzeigen</option>
                            <option value="pending">Offen</option>
                            <option value="approved">Genehmigt</option>
                            <option value="given">Ausgegeben</option>
                            <option value="returned">Zurückgegeben</option>
                            <option value="rejected">Abgelehnt</option>
                        </select>
                    </div>
                    <div id="equipmentRequestsList" class="equipment-requests-container">
                        <!-- Equipment requests will be loaded here -->
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="cancelModal()">Abbrechen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
    setupEquipmentRequestsListener();
}

/**
 * Close equipment requests modal
 */
function closeEquipmentRequests() {
    // Clean up listeners
    if (adminEquipmentRequestsListener) {
        adminEquipmentRequestsListener();
        adminEquipmentRequestsListener = null;
    }
    closeModal();
}

/**
 * Load equipment requests from Firebase
 */
async function loadEquipmentRequests() {
    try {
        // Try with index first
        const querySnapshot = await window.db.collection('requests')
            .where('type', '==', 'equipment')
            .orderBy('createdAt', 'desc')
            .get();
        
        adminEquipmentRequests = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            adminEquipmentRequests.push({
                id: doc.id,
                ...data,
                requestedAt: data.createdAt?.toDate() || data.requestedAt?.toDate(),
                fromDate: data.fromDate?.toDate(),
                toDate: data.toDate?.toDate()
            });
        });
        
        renderEquipmentRequests();
        console.log('Loaded equipment requests:', adminEquipmentRequests.length);
        
    } catch (error) {
        console.error('Error loading equipment requests:', error);
        
        // If index error, try without orderBy as fallback
        if (error.code === 'failed-precondition' || error.message.includes('index') || error.message.includes('requires an index')) {
            console.log('🔄 Index not ready for loadEquipmentRequests, using fallback query...', error.code, error.message);
            try {
                const querySnapshot = await window.db.collection('requests')
                    .where('type', '==', 'equipment')
                    .get();
                
                adminEquipmentRequests = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    adminEquipmentRequests.push({
                        id: doc.id,
                        ...data,
                        requestedAt: data.createdAt?.toDate() || data.requestedAt?.toDate(),
                        fromDate: data.fromDate?.toDate(),
                        toDate: data.toDate?.toDate()
                    });
                });
                
                // Sort locally since we can't use orderBy
                adminEquipmentRequests.sort((a, b) => {
                    const aDate = a.requestedAt || new Date(0);
                    const bDate = b.requestedAt || new Date(0);
                    return bDate - aDate;
                });
                
                renderEquipmentRequests();
                console.log('✅ Fallback loaded equipment requests:', adminEquipmentRequests.length);
                
            } catch (fallbackError) {
                console.error('Error in fallback equipment requests loading:', fallbackError);
                showToast('Fehler beim Laden der Ausleih-Anfragen (Fallback)', 'error');
            }
        } else {
            showToast('Fehler beim Laden der Ausleih-Anfragen', 'error');
        }
    }
}

/**
 * Filter equipment requests by status
 */
function filterEquipmentRequests() {
    const filter = document.getElementById('equipmentStatusFilter').value;
    renderEquipmentRequests(filter);
}

/**
 * Render equipment requests
 */
function renderEquipmentRequests(statusFilter = 'all') {
    const container = document.getElementById('equipmentRequestsList');
    if (!container) return;
    
    let filteredRequests = adminEquipmentRequests;
    if (statusFilter !== 'all') {
        filteredRequests = adminEquipmentRequests.filter(request => request.status === statusFilter);
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
                <div class="request-location"><strong>Standort:</strong> ${request.equipmentLocation || 'Unbekannt'}</div>
                <div class="request-duration"><strong>Dauer:</strong> ${getDurationText(request.duration)}</div>
            </div>
            <div class="request-reason"><strong>Zweck:</strong> ${request.purpose || request.reason || 'Nicht angegeben'}</div>
            
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
        'pending': 'Offen',
        'approved': 'Genehmigt',
        'rejected': 'Abgelehnt',
        'active': 'Aktiv',
        'returned': 'Zurückgegeben'
    };
    return statusMap[status] || status;
}

/**
 * Update equipment request status and equipment availability
 */
async function updateEquipmentRequestStatus(requestId, newStatus) {
    try {
        // Immediate visual feedback
        const requestElement = document.querySelector(`[onclick*="updateEquipmentRequestStatus('${requestId}'"]`)?.closest('.request-item');
        if (requestElement) {
            requestElement.style.opacity = '0.6';
            requestElement.style.pointerEvents = 'none';
        }
        
        // Get the request to find the equipment ID
        const requestDoc = await window.db.collection('requests').doc(requestId).get();
        if (!requestDoc.exists) {
            throw new Error('Anfrage nicht gefunden');
        }
        
        const requestData = requestDoc.data();
        const equipmentId = requestData.equipmentId;
        
        // Debug logging to identify collection mismatch
        console.log('🔍 updateEquipmentRequestStatus Debug:', {
            requestId,
            equipmentId,
            requestData,
            newStatus,
            willUpdateEquipment: !!equipmentId
        });
        
        // Update request status
        await window.db.collection('requests').doc(requestId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update equipment status based on request status
        if (equipmentId) {
            let equipmentStatus = 'available';
            if (newStatus === 'approved' || newStatus === 'given') {
                equipmentStatus = 'rented';
            }
            
            // Verify equipment exists before updating
            const equipmentDoc = await window.db.collection('equipment').doc(equipmentId).get();
            if (equipmentDoc.exists) {
                await window.db.collection('equipment').doc(equipmentId).update({
                    status: equipmentStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ Equipment status updated successfully');
            } else {
                console.error('❌ Equipment not found in equipment collection:', equipmentId);
                console.log('🔍 Checking if ID exists in printers collection...');
                const printerDoc = await window.db.collection('printers').doc(equipmentId).get();
                if (printerDoc.exists) {
                    console.error('🚨 ISSUE: Equipment ID found in printers collection instead!', {
                        equipmentId,
                        printerData: printerDoc.data()
                    });
                } else {
                    console.error('🚨 Equipment ID not found in any collection:', equipmentId);
                }
            }
        }
        
        showToast('Status erfolgreich aktualisiert', 'success');
        
        // Small delay then refresh to ensure new state is visible
        setTimeout(() => {
            if (requestElement) {
                requestElement.style.opacity = '1';
                requestElement.style.pointerEvents = 'auto';
            }
        }, 500);
        
    } catch (error) {
        console.error('Error updating equipment request status:', error);
        showToast('Fehler beim Aktualisieren des Status', 'error');
    }
}

/**
 * Mark equipment as given and update equipment status
 */
async function markEquipmentAsGiven(requestId) {
    try {
        // Immediate visual feedback
        const requestElement = document.querySelector(`[onclick*="markEquipmentAsGiven('${requestId}')"]`)?.closest('.request-item');
        if (requestElement) {
            requestElement.style.opacity = '0.6';
            requestElement.style.pointerEvents = 'none';
        }
        
        // Get the request to find the equipment ID
        const requestDoc = await window.db.collection('requests').doc(requestId).get();
        if (!requestDoc.exists) {
            throw new Error('Anfrage nicht gefunden');
        }
        
        const requestData = requestDoc.data();
        const equipmentId = requestData.equipmentId;
        
        // Debug logging to identify collection mismatch
        console.log('🔍 markEquipmentAsGiven Debug:', {
            requestId,
            equipmentId,
            requestData,
            willUpdateEquipment: !!equipmentId
        });
        
        // Update request status
        await window.db.collection('requests').doc(requestId).update({
            status: 'given',
            givenAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Mark equipment as rented
        if (equipmentId) {
            // Verify equipment exists before updating
            const equipmentDoc = await window.db.collection('equipment').doc(equipmentId).get();
            if (equipmentDoc.exists) {
                await window.db.collection('equipment').doc(equipmentId).update({
                    status: 'rented',
                    rentedBy: requestData.userName,
                    rentedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ Equipment marked as rented successfully');
            } else {
                console.error('❌ Equipment not found in equipment collection:', equipmentId);
                console.log('🔍 Checking if ID exists in printers collection...');
                const printerDoc = await window.db.collection('printers').doc(equipmentId).get();
                if (printerDoc.exists) {
                    console.error('🚨 ISSUE: Equipment ID found in printers collection instead!', {
                        equipmentId,
                        printerData: printerDoc.data()
                    });
                } else {
                    console.error('🚨 Equipment ID not found in any collection:', equipmentId);
                }
            }
        }
        
        showToast('Equipment als ausgegeben markiert', 'success');
        
        // Small delay then refresh to ensure new state is visible
        setTimeout(() => {
            if (requestElement) {
                requestElement.style.opacity = '1';
                requestElement.style.pointerEvents = 'auto';
            }
        }, 500);
        
    } catch (error) {
        console.error('Error marking equipment as given:', error);
        showToast('Fehler beim Markieren als ausgegeben', 'error');
    }
}

/**
 * Mark equipment as returned and update equipment status
 */
async function markEquipmentAsReturned(requestId) {
    try {
        // Immediate visual feedback
        const requestElement = document.querySelector(`[onclick*="markEquipmentAsReturned('${requestId}')"]`)?.closest('.request-item');
        if (requestElement) {
            requestElement.style.opacity = '0.6';
            requestElement.style.pointerEvents = 'none';
        }
        
        // Get the request to find the equipment ID
        const requestDoc = await window.db.collection('requests').doc(requestId).get();
        if (!requestDoc.exists) {
            throw new Error('Anfrage nicht gefunden');
        }
        
        const requestData = requestDoc.data();
        const equipmentId = requestData.equipmentId;
        
        // Update request status
        await window.db.collection('requests').doc(requestId).update({
            status: 'returned',
            returnedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Mark equipment as available again
        if (equipmentId) {
            await window.db.collection('equipment').doc(equipmentId).update({
                status: 'available',
                rentedBy: null,
                rentedAt: null,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        showToast('Equipment als zurückgegeben markiert', 'success');
        
        // Small delay then refresh to ensure new state is visible
        setTimeout(() => {
            if (requestElement) {
                requestElement.style.opacity = '1';
                requestElement.style.pointerEvents = 'auto';
            }
        }, 500);
        
    } catch (error) {
        console.error('Error marking equipment as returned:', error);
        showToast('Fehler beim Markieren als zurückgegeben', 'error');
    }
}

/**
 * Delete equipment request and restore equipment availability
 */
async function deleteEquipmentRequest(requestId) {
    if (!confirm('Möchten Sie diese Equipment-Anfrage wirklich löschen?')) {
        return;
    }
    
    try {
        // Immediate visual feedback
        const requestElement = document.querySelector(`[onclick*="deleteEquipmentRequest('${requestId}')"]`)?.closest('.request-item');
        if (requestElement) {
            requestElement.style.opacity = '0.3';
            requestElement.style.pointerEvents = 'none';
        }
        
        // Get the request to find the equipment ID
        const requestDoc = await window.db.collection('requests').doc(requestId).get();
        if (requestDoc.exists) {
            const requestData = requestDoc.data();
            const equipmentId = requestData.equipmentId;
            
            // Debug logging to identify collection mismatch
            console.log('🔍 deleteEquipmentRequest Debug:', {
                requestId,
                equipmentId,
                requestData,
                willUpdateEquipment: !!equipmentId
            });
            
            // If request was active, mark equipment as available again
            if (requestData.status === 'given' || requestData.status === 'approved') {
                if (equipmentId) {
                    // Verify equipment exists before updating
                    const equipmentDoc = await window.db.collection('equipment').doc(equipmentId).get();
                    if (equipmentDoc.exists) {
                        await window.db.collection('equipment').doc(equipmentId).update({
                            status: 'available',
                            rentedBy: null,
                            rentedAt: null,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        console.log('✅ Equipment marked as available successfully');
                    } else {
                        console.error('❌ Equipment not found in equipment collection:', equipmentId);
                        console.log('🔍 Checking if ID exists in printers collection...');
                        const printerDoc = await window.db.collection('printers').doc(equipmentId).get();
                        if (printerDoc.exists) {
                            console.error('🚨 ISSUE: Equipment ID found in printers collection instead!', {
                                equipmentId,
                                printerData: printerDoc.data()
                            });
                        } else {
                            console.error('🚨 Equipment ID not found in any collection:', equipmentId);
                        }
                    }
                }
            }
        }
        
        await window.db.collection('requests').doc(requestId).delete();
        showToast('Equipment-Anfrage erfolgreich gelöscht', 'success');
        
        // Remove element immediately since it's deleted
        if (requestElement) {
            requestElement.remove();
        }
        
    } catch (error) {
        console.error('Error deleting equipment request:', error);
        showToast('Fehler beim Löschen der Equipment-Anfrage', 'error');
    }
} 

/**
 * Get duration text
 */
function getDurationText(duration) {
    const durationMap = {
        '1_hour': '1 Stunde',
        '2_hours': '2 Stunden',
        '3_hours': '3 Stunden',
        '4_hours': '4 Stunden',
        'half_day': 'Halber Tag',
        'full_day': 'Ganzer Tag',
        'week': '1 Woche',
        '2_weeks': '2 Wochen',
        'month': '1 Monat',
        'other': 'Andere'
    };
    return durationMap[duration] || duration || 'Nicht angegeben';
}

// ==================== GLOBAL EXPORTS ====================
// Admin Problem Reports-Funktionen global verfügbar machen
window.showProblemReports = showProblemReports;
window.closeProblemReports = closeProblemReports;
window.loadProblemReports = loadProblemReports;
window.updateProblemReportStatus = updateProblemStatus; // Alias for updateProblemStatus
window.updateProblemStatus = updateProblemStatus;
window.showEquipmentRequests = showEquipmentRequests;
window.closeEquipmentRequests = closeEquipmentRequests;
window.loadEquipmentRequests = loadEquipmentRequests;
window.updateEquipmentRequestStatus = updateEquipmentRequestStatus;
window.markEquipmentAsGiven = markEquipmentAsGiven;
window.markEquipmentAsReturned = markEquipmentAsReturned;
window.deleteEquipmentRequest = deleteEquipmentRequest;

console.log('🚨 Admin Problem Reports Module loaded'); 