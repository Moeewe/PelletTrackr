/**
 * Payment Request System
 * Handles user payment requests and admin notifications
 */

// Global payment request management
let paymentRequestsListener = null;

/**
 * User requests payment processing for an entry
 */
async function requestPayment(entryId) {
    try {
        console.log('Requesting payment for entry:', entryId);
        
        // Check if Firebase is available
        if (!window.db) {
            showToast('Firebase nicht verfügbar. Bitte Seite neu laden.', 'error');
            return;
        }
        
        // Check if user is logged in
        if (!window.currentUser) {
            showToast('Bitte melden Sie sich zuerst an', 'error');
            return;
        }
        
        // Get entry details
        const entryDoc = await window.db.collection('entries').doc(entryId).get();
        if (!entryDoc.exists) {
            showToast('Druck nicht gefunden', 'error');
            return;
        }
        
        const entry = entryDoc.data();
        
        // Check if payment request already exists
        const existingRequest = await window.db.collection('paymentRequests')
            .where('entryId', '==', entryId)
            .where('status', '==', 'pending')
            .get();
            
        if (!existingRequest.empty) {
            showToast('Zahlungsanfrage bereits gesendet', 'warning');
            return;
        }
        
        // Create payment request
        const paymentRequest = {
            entryId: entryId,
            userId: window.currentUser.kennung,
            userName: window.currentUser.name,
            amount: entry.totalCost,
            jobName: entry.jobName || '3D-Druck Auftrag',
            material: entry.material,
            materialMenge: entry.materialMenge,
            status: 'pending',
            requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
            processedAt: null,
            processedBy: null
        };
        
        await window.db.collection('paymentRequests').add(paymentRequest);
        
        showToast('Zahlungsanfrage gesendet! Der Admin wird benachrichtigt.', 'success');
        
        // Update button state immediately
        updatePaymentRequestButton(entryId, true);
        
    } catch (error) {
        console.error('Error requesting payment:', error);
        showToast('Fehler beim Senden der Zahlungsanfrage', 'error');
    }
}

/**
 * Update payment request button state
 */
function updatePaymentRequestButton(entryId, requested = false) {
    // Multiple selectors to find the button
    const selectors = [
        `#payment-request-btn-${entryId}`,
        `[onclick*="requestPayment('${entryId}')"]`,
        `[onclick*="cancelPaymentRequest('${entryId}')"]`,
        `.payment-request-btn[onclick*="${entryId}"]`
    ];
    
    let buttons = [];
    selectors.forEach(selector => {
        const found = document.querySelectorAll(selector);
        found.forEach(btn => {
            if (!buttons.includes(btn)) {
                buttons.push(btn);
            }
        });
    });
    
    buttons.forEach(button => {
        if (requested) {
            button.textContent = 'Zahlungsanfrage zurücknehmen';
            button.className = 'btn btn-undo payment-request-btn';
            button.style.opacity = '1';
            button.onclick = () => cancelPaymentRequest(entryId);
            button.title = 'Zahlungsanfrage zurückziehen';
            button.setAttribute('data-state', 'requested');
        } else {
            button.textContent = 'Zahlung anweisen';
            button.className = 'btn btn-payment-request payment-request-btn';
            button.style.opacity = '1';
            button.onclick = () => requestPayment(entryId);
            button.title = 'Zahlungsanfrage an Admin senden';
            button.setAttribute('data-state', 'available');
        }
    });
}

/**
 * User cancels/withdraws a payment request
 */
async function cancelPaymentRequest(entryId) {
    try {
        console.log('Cancelling payment request for entry:', entryId);
        
        // Find the pending payment request
        const requests = await window.db.collection('paymentRequests')
            .where('entryId', '==', entryId)
            .where('status', '==', 'pending')
            .get();
            
        if (requests.empty) {
            showToast('Keine aktive Zahlungsanfrage gefunden', 'warning');
            return;
        }
        
                 // Mark payment request as cancelled instead of deleting
         const requestDoc = requests.docs[0];
         await window.db.collection('paymentRequests').doc(requestDoc.id).update({
             status: 'cancelled',
             cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
             cancelledBy: window.currentUser.name
         });
         
         showToast('Zahlungsanfrage zurückgezogen', 'success');
        
        // Update button state
        updatePaymentRequestButton(entryId, false);
        
    } catch (error) {
        console.error('Error cancelling payment request:', error);
        showToast('Fehler beim Zurückziehen der Zahlungsanfrage', 'error');
    }
}

/**
 * Check if payment request exists for entry
 */
async function checkPaymentRequestExists(entryId) {
    try {
        const requests = await window.db.collection('paymentRequests')
            .where('entryId', '==', entryId)
            .where('status', '==', 'pending')
            .get();
            
        return !requests.empty;
    } catch (error) {
        console.error('Error checking payment request:', error);
        return false;
    }
}

/**
 * Admin: Get all pending payment requests
 */
async function loadPendingPaymentRequests() {
    try {
        const requests = await window.db.collection('paymentRequests')
            .where('status', '==', 'pending')
            .orderBy('requestedAt', 'desc')
            .get();
            
        const paymentRequests = [];
        requests.forEach(doc => {
            paymentRequests.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return paymentRequests;
    } catch (error) {
        console.error('Error loading payment requests:', error);
        return [];
    }
}

/**
 * Admin: Process payment request (approve and mark entry as paid)
 */
async function processPaymentRequest(requestId, approve = true) {
    try {
        const requestDoc = await window.db.collection('paymentRequests').doc(requestId).get();
        if (!requestDoc.exists) {
            showToast('Zahlungsanfrage nicht gefunden', 'error');
            return;
        }
        
        const request = requestDoc.data();
        
        if (approve) {
            // Mark entry as paid
            await window.db.collection('entries').doc(request.entryId).update({
                paid: true,
                isPaid: true,
                paidAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update request status
            await window.db.collection('paymentRequests').doc(requestId).update({
                status: 'approved',
                processedAt: firebase.firestore.FieldValue.serverTimestamp(),
                processedBy: window.currentUser.name
            });
            
            showToast('Zahlung registriert und Anfrage genehmigt', 'success');
        } else {
            // Reject request
            await window.db.collection('paymentRequests').doc(requestId).update({
                status: 'rejected',
                processedAt: firebase.firestore.FieldValue.serverTimestamp(),
                processedBy: window.currentUser.name
            });
            
            showToast('Zahlungsanfrage abgelehnt', 'warning');
        }
        
        // Refresh admin entries if visible
        if (typeof loadAdminEntries === 'function') {
            loadAdminEntries();
        }
        
    } catch (error) {
        console.error('Error processing payment request:', error);
        showToast('Fehler beim Verarbeiten der Zahlungsanfrage', 'error');
    }
}

/**
 * Admin: Show payment requests modal
 */
async function showPaymentRequestsModal() {
    const requests = await loadPendingPaymentRequests();
    
    const modalContent = `
        <div class="modal-header">
            <h3>Zahlungsanfragen verwalten (${requests.length})</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="card">
                <div class="card-body">
                    <div id="paymentRequestsList">
                        ${requests.length === 0 ? 
                            '<p class="text-center">Keine offenen Zahlungsanfragen</p>' : 
                            renderPaymentRequestsList(requests)
                        }
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
}

/**
 * Render payment requests list for admin
 */
function renderPaymentRequestsList(requests) {
    return `
        <div class="payment-requests-list">
            ${requests.map(request => `
                <div class="payment-request-item" id="request-${request.id}">
                    <div class="request-header">
                        <h4>${request.jobName}</h4>
                        <span class="request-amount">${formatCurrency(request.amount)}</span>
                    </div>
                    <div class="request-details">
                        <p><strong>Nutzer:</strong> ${request.userName} (${request.userId})</p>
                        <p><strong>Material:</strong> ${request.material} (${request.materialMenge?.toFixed(2)} kg)</p>
                        <p><strong>Angefragt:</strong> ${request.requestedAt ? new Date(request.requestedAt.toDate()).toLocaleString('de-DE') : 'Unbekannt'}</p>
                    </div>
                    <div class="request-actions">
                        <button class="btn btn-success" onclick="processPaymentRequest('${request.id}', true)">
                            Zahlung registrieren
                        </button>
                        <button class="btn btn-danger" onclick="processPaymentRequest('${request.id}', false)">
                            Ablehnen
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Get count of pending payment requests for badge
 */
async function getPendingPaymentRequestsCount() {
    try {
        const requests = await window.db.collection('paymentRequests')
            .where('status', '==', 'pending')
            .get();
            
        return requests.size;
    } catch (error) {
        console.error('Error getting payment requests count:', error);
        return 0;
    }
}

/**
 * Setup real-time listener for payment requests (for admin)
 */
function setupPaymentRequestsListener() {
    if (!window.currentUser?.isAdmin) return;
    
    if (paymentRequestsListener) {
        paymentRequestsListener();
    }
    
    paymentRequestsListener = window.db.collection('paymentRequests')
        .where('status', '==', 'pending')
        .onSnapshot(snapshot => {
            const count = snapshot.size;
            updatePaymentRequestsBadge(count);
        });
}

/**
 * Update payment requests badge in admin interface
 */
function updatePaymentRequestsBadge(count) {
    const badge = document.querySelector('[data-badge="payment-requests"]');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Make functions globally available
window.requestPayment = requestPayment;
window.cancelPaymentRequest = cancelPaymentRequest;
window.showPaymentRequestsModal = showPaymentRequestsModal;
window.processPaymentRequest = processPaymentRequest;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.currentUser?.isAdmin) {
        setupPaymentRequestsListener();
    }
}); 