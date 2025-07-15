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
    materialOrders: 0,
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
        // Only setup badges that exist in HTML
        setupMaterialOrdersBadge();
        setupProblemReportsBadge();
        // setupPaymentRequestsBadge(); // Will be added when payment system is active
        console.log('✅ Notification badges initialized (material-orders, problem-reports)');
    } catch (error) {
        console.error('❌ Error initializing notification badges:', error);
    }
}

/**
 * Setup material orders badge
 */
function setupMaterialOrdersBadge() {
    if (!window.db) {
        setTimeout(setupMaterialOrdersBadge, 500);
        return;
    }
    
    console.log('🔄 Setting up material orders badge listener...');
    
    const listener = window.db.collection('materialOrders')
        .where('status', '==', 'pending')
        .onSnapshot((snapshot) => {
            notificationCounts.materialOrders = snapshot.size;
            console.log(`🔔 Material Orders Badge: ${snapshot.size} pending orders found`);
            updateBadge('material-orders', notificationCounts.materialOrders);
        }, (error) => {
            console.error('❌ Material orders badge listener error:', error);
        });
    
    notificationListeners.push(listener);
}

/**
 * Setup problem reports badge
 */
function setupProblemReportsBadge() {
    if (!window.db) {
        setTimeout(setupProblemReportsBadge, 500);
        return;
    }
    
    console.log('🔄 Setting up problem reports badge listener...');
    
    const listener = window.db.collection('problemReports')
        .where('status', '==', 'open')
        .onSnapshot((snapshot) => {
            notificationCounts.problemReports = snapshot.size;
            console.log(`🔔 Problem Reports Badge: ${snapshot.size} open reports found`);
            updateBadge('problem-reports', notificationCounts.problemReports);
        }, (error) => {
            console.error('❌ Problem reports badge listener error:', error);
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
 * Setup material requests badge - DISABLED (no HTML element)
 */
function setupMaterialRequestsBadge() {
    console.log('⚠️ Material requests badge disabled - no HTML element exists');
    // Badge element doesn't exist in HTML
    return;
}

/**
 * Setup equipment requests badge - DISABLED (no HTML element)  
 */
function setupEquipmentRequestsBadge() {
    console.log('⚠️ Equipment requests badge disabled - no HTML element exists');
    // Badge element doesn't exist in HTML
    return;
}

/**
 * Setup broken printers badge - DISABLED (no HTML element)
 */
function setupBrokenPrintersBadge() {
    console.log('⚠️ Broken printers badge disabled - no HTML element exists');
    // Badge element doesn't exist in HTML  
    return;
}

/**
 * Update badge display
 */
function updateBadge(badgeId, count) {
    const badge = document.querySelector(`[data-badge="${badgeId}"]`);
    console.log(`🔄 Badge update: ${badgeId} -> ${count}`, badge ? 'found' : 'NOT FOUND');
    
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count.toString();
            badge.style.display = 'inline-block';
            console.log(`✅ Badge ${badgeId} shown with count: ${count}`);
        } else {
            badge.style.display = 'none';
            console.log(`🚫 Badge ${badgeId} hidden (count: 0)`);
        }
    } else {
        console.warn(`❌ Badge element not found for: ${badgeId}`);
    }
}

/**
 * Debug function to manually reset all badges
 */
function debugResetAllBadges() {
    console.log('🧹 Manual badge reset requested...');
    
    // Reset all notification counts
    notificationCounts = {
        paymentRequests: 0,
        materialRequests: 0,
        materialOrders: 0,
        brokenPrinters: 0,
        problemReports: 0,
        printerStatusChanges: 0,
        printerDefectReports: 0
    };
    
    // Update all badges
    Object.keys(notificationCounts).forEach(key => {
        const badgeId = key.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
        updateBadge(badgeId, 0);
    });
    
    console.log('✅ All badges reset to 0');
}

/**
 * Debug function to force problem reports badge check
 */
function debugCheckProblemReportsBadge() {
    console.log('🔍 Debug: Checking problem reports badge...');
    
    if (!window.db) {
        console.log('❌ Database not available');
        return;
    }
    
    window.db.collection('problemReports')
        .where('status', '==', 'open')
        .get()
        .then((snapshot) => {
            const count = snapshot.size;
            console.log(`📊 Manual problem reports count: ${count}`);
            updateBadge('problem-reports', count);
            notificationCounts.problemReports = count;
        })
        .catch((error) => {
            console.error('❌ Error checking problem reports:', error);
        });
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

/**
 * Show schedule requests (placeholder function)
 */
function showScheduleRequests() {
    // This is a placeholder function - schedule requests feature not yet implemented
    console.log('Schedule requests feature not yet implemented');
    toast.info('Terminanfragen-Feature ist noch nicht implementiert');
}

// Global functions
window.initializeNotificationBadges = initNotificationBadges;
window.cleanupNotificationBadges = cleanupNotificationBadges;
window.showAdminNotificationOverview = showAdminNotificationOverview;
window.showMaterialRequests = showMaterialRequests;
window.showScheduleRequests = showScheduleRequests;
window.processMaterialRequest = processMaterialRequest;
window.processScheduleRequest = processScheduleRequest;
window.updateBadge = updateBadge; // Expose updateBadge globally
window.debugResetAllBadges = debugResetAllBadges; // Expose debugResetAllBadges globally
window.debugCheckProblemReportsBadge = debugCheckProblemReportsBadge; // Expose debugCheckProblemReportsBadge globally

console.log('🔔 Notification Badges Module loaded'); 