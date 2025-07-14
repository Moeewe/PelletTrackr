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
    const buttons = document.querySelectorAll(`[onclick*="requestPayment('${entryId}')"]`);
    buttons.forEach(button => {
        if (requested) {
            button.textContent = 'Anfrage gesendet';
            button.disabled = true;
            button.style.opacity = '0.6';
            button.onclick = null;
        }
    });
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
            <h3>Zahlungsanfragen (${requests.length})</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div id="paymentRequestsList">
                ${requests.length === 0 ? 
                    '<p>Keine offenen Zahlungsanfragen</p>' : 
                    renderPaymentRequestsList(requests)
                }
            </div>
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.currentUser?.isAdmin) {
        setupPaymentRequestsListener();
    }
}); 