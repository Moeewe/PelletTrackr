/**
 * Notification Badge System
 * Updates badges on admin interface buttons to show pending tasks
 */

// Badge update intervals
let badgeUpdateInterval = null;

/**
 * Initialize badge system
 */
function initializeBadgeSystem() {
    console.log('📋 Initializing notification badge system...');
    updateAllBadges();
    
    // Update badges every 30 seconds
    if (badgeUpdateInterval) {
        clearInterval(badgeUpdateInterval);
    }
    badgeUpdateInterval = setInterval(updateAllBadges, 30000);
}

/**
 * Update all notification badges
 */
async function updateAllBadges() {
    try {
        if (!window.db) return;
        
        // Update each badge type
        await Promise.all([
            updateUserManagerBadge(),
            updateProblemReportsBadge(),
            updateEquipmentBadge(),
            updateMaterialOrdersBadge(),
            updateReservationBadge(),
            updateEquipmentRequestsBadge(),
            updatePrinterManagerBadge()
        ]);
        
    } catch (error) {
        console.error('Error updating badges:', error);
    }
}

/**
 * Update user manager badge - counts users with unpaid amounts
 */
async function updateUserManagerBadge() {
    try {
        let unpaidUsersCount = 0;
        
        const entriesSnapshot = await window.db.collection('entries').get();
        const userDebts = new Map();
        
        entriesSnapshot.forEach(doc => {
            const entry = doc.data();
            if (!entry.paid && !entry.isPaid) {
                const kennung = entry.kennung;
                if (!userDebts.has(kennung)) {
                    userDebts.set(kennung, 0);
                }
                userDebts.set(kennung, userDebts.get(kennung) + (entry.totalCost || 0));
            }
        });
        
        unpaidUsersCount = userDebts.size;
        updateBadge('userManagerBadge', unpaidUsersCount);
        
    } catch (error) {
        console.error('Error updating user manager badge:', error);
        updateBadge('userManagerBadge', 0);
    }
}

/**
 * Update problem reports badge
 */
async function updateProblemReportsBadge() {
    try {
        const problemsSnapshot = await window.db.collection('problemReports')
            .where('status', '==', 'open')
            .get();
        
        updateBadge('problemReportsBadge', problemsSnapshot.size);
        
    } catch (error) {
        console.error('Error updating problem reports badge:', error);
        updateBadge('problemReportsBadge', 0);
    }
}

/**
 * Update equipment badge - counts borrowed items
 */
async function updateEquipmentBadge() {
    try {
        const equipmentSnapshot = await window.db.collection('equipment')
            .where('status', '==', 'borrowed')
            .get();
        
        updateBadge('equipmentBadge', equipmentSnapshot.size);
        
    } catch (error) {
        console.error('Error updating equipment badge:', error);
        updateBadge('equipmentBadge', 0);
    }
}

/**
 * Update material orders badge
 */
async function updateMaterialOrdersBadge() {
    try {
        const ordersSnapshot = await window.db.collection('materialOrders')
            .where('status', '==', 'pending')
            .get();
        
        updateBadge('materialOrdersBadge', ordersSnapshot.size);
        
    } catch (error) {
        console.error('Error updating material orders badge:', error);
        updateBadge('materialOrdersBadge', 0);
    }
}

/**
 * Update reservation badge - counts today's reservations
 */
async function updateReservationBadge() {
    try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        const reservationsSnapshot = await window.db.collection('reservations')
            .where('date', '>=', startOfDay)
            .where('date', '<', endOfDay)
            .get();
        
        updateBadge('reservationBadge', reservationsSnapshot.size);
        
    } catch (error) {
        console.error('Error updating reservation badge:', error);
        updateBadge('reservationBadge', 0);
    }
}

/**
 * Update equipment requests badge
 */
async function updateEquipmentRequestsBadge() {
    try {
        const requestsSnapshot = await window.db.collection('equipmentRequests')
            .where('status', '==', 'pending')
            .get();
        
        updateBadge('equipmentRequestsBadge', requestsSnapshot.size);
        
    } catch (error) {
        console.error('Error updating equipment requests badge:', error);
        updateBadge('equipmentRequestsBadge', 0);
    }
}

/**
 * Update printer manager badge - counts printers needing attention
 */
async function updatePrinterManagerBadge() {
    try {
        let attentionCount = 0;
        
        const printersSnapshot = await window.db.collection('printers').get();
        
        printersSnapshot.forEach(doc => {
            const printer = doc.data();
            // Count printers that need attention (maintenance or broken)
            if (printer.status === 'maintenance' || printer.status === 'broken') {
                attentionCount++;
            }
        });
        
        updateBadge('printerManagerBadge', attentionCount);
        
    } catch (error) {
        console.error('Error updating printer manager badge:', error);
        updateBadge('printerManagerBadge', 0);
    }
}

/**
 * Update individual badge display
 */
function updateBadge(badgeId, count) {
    const badge = document.getElementById(badgeId);
    if (badge) {
        badge.textContent = count;
        badge.setAttribute('data-count', count);
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

/**
 * Clear all badges
 */
function clearAllBadges() {
    const badges = [
        'userManagerBadge',
        'problemReportsBadge', 
        'equipmentBadge',
        'materialOrdersBadge',
        'reservationBadge',
        'equipmentRequestsBadge',
        'printerManagerBadge'
    ];
    
    badges.forEach(badgeId => updateBadge(badgeId, 0));
}

/**
 * Cleanup badge system
 */
function cleanupBadgeSystem() {
    if (badgeUpdateInterval) {
        clearInterval(badgeUpdateInterval);
        badgeUpdateInterval = null;
    }
    clearAllBadges();
}

// Global exports
window.initializeBadgeSystem = initializeBadgeSystem;
window.updateAllBadges = updateAllBadges;
window.clearAllBadges = clearAllBadges;
window.cleanupBadgeSystem = cleanupBadgeSystem;

console.log('📋 Notification Badge System loaded'); 