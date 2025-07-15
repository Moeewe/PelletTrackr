/**
 * Notification Badge System
 * Monitors user requests and shows red badges in admin area for unprocessed items
 */

// Global notification state
let notificationListeners = [];
// Global notification counts
let notificationCounts = {
    paymentRequests: 0,
    materialRequests: 0,
    brokenPrinters: 0,
    problemReports: 0,
    printerStatusChanges: 0,
    printerDefectReports: 0
};

/**
 * Initialize all notification badges
 */
function initNotificationBadges() {
    try {
        setupPaymentRequestsBadge();
        setupMaterialRequestsBadge();
        setupBrokenPrintersBadge();
        setupProblemReportsBadge();
        setupPrinterStatusChangesBadge();
        setupPrinterDefectReportsBadge();
        console.log('✅ Notification badges initialized');
    } catch (error) {
        console.error('❌ Error initializing notification badges:', error);
    }
}

/**
 * Setup problem reports badge
 */
function setupProblemReportsBadge() {
    if (!window.db) {
        setTimeout(setupProblemReportsBadge, 500);
        return;
    }
    
    const listener = window.db.collection('problemReports')
        .where('status', '==', 'open')
        .onSnapshot((snapshot) => {
            notificationCounts.problemReports = snapshot.size;
            updateBadge('problem-reports', notificationCounts.problemReports);
        });
    
    notificationListeners.push(listener);
}

/**
 * Setup equipment requests badge
 */
function setupEquipmentRequestsBadge() {
    if (!window.db) {
        setTimeout(setupEquipmentRequestsBadge, 500);
        return;
    }
    
    const listener = window.db.collection('equipmentRequests')
        .where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
            notificationCounts.equipmentRequests = snapshot.size;
            updateBadge('equipment-requests', notificationCounts.equipmentRequests);
        });
    
    notificationListeners.push(listener);
}

/**
 * Setup material requests badge
 */
function setupMaterialRequestsBadge() {
    if (!window.db) {
        setTimeout(setupMaterialRequestsBadge, 500);
        return;
    }
    
    const listener = window.db.collection('materialRequests')
        .where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
            notificationCounts.materialRequests = snapshot.size;
            updateBadge('material-requests', notificationCounts.materialRequests);
        });
    
    notificationListeners.push(listener);
}



/**
 * Setup broken printers badge
 */
function setupBrokenPrintersBadge() {
    if (!window.db) {
        setTimeout(setupBrokenPrintersBadge, 500);
        return;
    }
    
    const listener = window.db.collection('printers')
        .where('status', '==', 'broken')
        .onSnapshot((snapshot) => {
            notificationCounts.brokenPrinters = snapshot.size;
            updateBadge('broken-printers', notificationCounts.brokenPrinters);
        });
    
    notificationListeners.push(listener);
}

/**
 * Update badge display
 */
function updateBadge(badgeId, count) {
    const badge = document.querySelector(`[data-badge="${badgeId}"]`);
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count.toString();
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

/**
 * Get total notification count
 */
function getTotalNotificationCount() {
    return Object.values(notificationCounts).reduce((sum, count) => sum + count, 0);
}

/**
 * Cleanup notification listeners
 */
function cleanupNotificationBadges() {
    notificationListeners.forEach(listener => {
        if (listener && typeof listener === 'function') {
            listener();
        }
    });
    notificationListeners = [];
}

/**
 * Show admin notification overview
 */
function showAdminNotificationOverview() {
    const totalCount = getTotalNotificationCount();
    
    const modalContent = `
        <div class="modal-header">
            <h3>Benachrichtigungen (${totalCount})</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="notification-overview">
                ${notificationCounts.problemReports > 0 ? `
                    <div class="notification-item" onclick="showProblemReports()">
                        <div class="notification-icon">🔧</div>
                        <div class="notification-content">
                            <h4>Problem-Meldungen</h4>
                            <p>${notificationCounts.problemReports} neue Meldungen</p>
                        </div>
                        <div class="notification-badge">${notificationCounts.problemReports}</div>
                    </div>
                ` : ''}
                
                ${notificationCounts.equipmentRequests > 0 ? `
                    <div class="notification-item" onclick="showEquipmentManager()">
                        <div class="notification-icon">📦</div>
                        <div class="notification-content">
                            <h4>Equipment-Anfragen</h4>
                            <p>${notificationCounts.equipmentRequests} neue Anfragen</p>
                        </div>
                        <div class="notification-badge">${notificationCounts.equipmentRequests}</div>
                    </div>
                ` : ''}
                
                ${notificationCounts.materialRequests > 0 ? `
                    <div class="notification-item" onclick="showMaterialRequests()">
                        <div class="notification-icon">🧱</div>
                        <div class="notification-content">
                            <h4>Material-Wünsche</h4>
                            <p>${notificationCounts.materialRequests} neue Wünsche</p>
                        </div>
                        <div class="notification-badge">${notificationCounts.materialRequests}</div>
                    </div>
                ` : ''}
                
                ${notificationCounts.brokenPrinters > 0 ? `
                    <div class="notification-item" onclick="showPrinterManager()">
                        <div class="notification-icon">🖨️</div>
                        <div class="notification-content">
                            <h4>Defekte Drucker</h4>
                            <p>${notificationCounts.brokenPrinters} Drucker benötigen Wartung</p>
                        </div>
                        <div class="notification-badge">${notificationCounts.brokenPrinters}</div>
                    </div>
                ` : ''}
                
                ${totalCount === 0 ? `
                    <div class="no-notifications">
                        <div class="no-notifications-icon">✅</div>
                        <h4>Keine neuen Benachrichtigungen</h4>
                        <p>Alle Anfragen wurden bearbeitet</p>
                    </div>
                ` : ''}
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
}

/**
 * Show material requests management
 */
function showMaterialRequests() {
    if (!window.db) return;
    
    window.db.collection('materialRequests')
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .get()
        .then((snapshot) => {
            const requests = [];
            snapshot.forEach((doc) => {
                requests.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            const modalContent = `
                <div class="modal-header">
                    <h3>Material-Wünsche (${requests.length})</h3>
                    <button class="close-btn" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="requests-list">
                        ${requests.map(request => `
                            <div class="request-item">
                                <div class="request-header">
                                    <h4>${request.name}</h4>
                                    <span class="request-priority priority-${request.priority}">${request.priority}</span>
                                </div>
                                <div class="request-details">
                                    <p><strong>Typ:</strong> ${request.type}</p>
                                    <p><strong>Menge:</strong> ${request.quantity}</p>
                                    <p><strong>Angefragt von:</strong> ${request.requestedBy} (${request.requestedByKennung})</p>
                                    <p><strong>Begründung:</strong> ${request.reason}</p>
                                    ${request.supplier ? `<p><strong>Lieferant:</strong> ${request.supplier}</p>` : ''}
                                </div>
                                <div class="request-actions">
                                    <button class="btn btn-success btn-sm" onclick="processMaterialRequest('${request.id}', 'approved')">
                                        Genehmigen
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="processMaterialRequest('${request.id}', 'rejected')">
                                        Ablehnen
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
        });
}

/**
 * Process material request
 */
async function processMaterialRequest(requestId, status) {
    try {
        await window.db.collection('materialRequests').doc(requestId).update({
            status: status,
            processedAt: firebase.firestore.FieldValue.serverTimestamp(),
            processedBy: window.currentUser.name
        });
        
        toast.success(status === 'approved' ? 'Material-Wunsch genehmigt' : 'Material-Wunsch abgelehnt');
        
        // Refresh the modal
        showMaterialRequests();
        
    } catch (error) {
        console.error('Error processing material request:', error);
        toast.error('Fehler beim Bearbeiten der Anfrage');
    }
}

/**
 * Process schedule request
 */
async function processScheduleRequest(requestId, status) {
    try {
        await window.db.collection('scheduleRequests').doc(requestId).update({
            status: status,
            processedAt: firebase.firestore.FieldValue.serverTimestamp(),
            processedBy: window.currentUser.name
        });
        
        toast.success(status === 'approved' ? 'Terminanfrage genehmigt' : 'Terminanfrage abgelehnt');
        
        // Refresh the modal
        showScheduleRequests();
        
    } catch (error) {
        console.error('Error processing schedule request:', error);
        toast.error('Fehler beim Bearbeiten der Terminanfrage');
    }
}

// Global functions
window.initializeNotificationBadges = initNotificationBadges;
window.cleanupNotificationBadges = cleanupNotificationBadges;
window.showAdminNotificationOverview = showAdminNotificationOverview;
window.showMaterialRequests = showMaterialRequests;
window.showScheduleRequests = showScheduleRequests;
window.processMaterialRequest = processMaterialRequest;
window.processScheduleRequest = processScheduleRequest;

console.log('🔔 Notification Badges Module loaded'); 