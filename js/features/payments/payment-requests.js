/**
 * Payment Request System
 * Handles user payment requests and admin notifications
 */

// Global payment request management
let paymentRequestsListener = null;
let userPaymentRequestsListener = null;

/**
 * Setup real-time listener for user payment requests
 */
function setupUserPaymentRequestsListener() {
    // Clean up existing listener
    if (userPaymentRequestsListener) {
        userPaymentRequestsListener();
        userPaymentRequestsListener = null;
    }
    
    // Only set up listener for logged-in users
    if (!window.currentUser || window.currentUser.isAdmin) {
        console.log('Skipping user payment request listener - not a regular user');
        return;
    }
    
    // Retry if database is not ready
    if (!window.db) {
        console.log('Database not ready, retrying user payment request listener in 500ms...');
        setTimeout(setupUserPaymentRequestsListener, 500);
        return;
    }
    
    try {
        console.log(`Setting up payment request listener for user: ${window.currentUser.kennung}`);
        
        userPaymentRequestsListener = window.db.collection('paymentRequests')
            .where('userId', '==', window.currentUser.kennung)
            .onSnapshot((snapshot) => {
                console.log('Live update: Payment requests changed for user', window.currentUser.kennung);
                
                // Update button states for all current entries
                updateAllPaymentRequestButtons();
            }, (error) => {
                console.error('Error in user payment requests listener:', error);
                // Retry setting up listener after error
                setTimeout(setupUserPaymentRequestsListener, 2000);
            });
        
        console.log("✅ User payment requests listener registered successfully");
    } catch (error) {
        console.error("❌ Failed to setup user payment requests listener:", error);
        // Retry after error
        setTimeout(setupUserPaymentRequestsListener, 2000);
    }
}

/**
 * Update all payment request buttons based on current state
 */
async function updateAllPaymentRequestButtons() {
    if (!window.currentUser || window.currentUser.isAdmin) return;
    
    try {
        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get all entry rows currently displayed
        const entryRows = document.querySelectorAll('.entry-row, .entry-card');
        
        if (entryRows.length === 0) {
            // No entries visible yet, try again in a moment
            console.log('No entry rows found, retrying in 500ms...');
            setTimeout(updateAllPaymentRequestButtons, 500);
            return;
        }
        
        console.log(`Updating payment request buttons for ${entryRows.length} entries`);
        
        for (const row of entryRows) {
            // Extract entry ID from payment request button
            const paymentButton = row.querySelector('.payment-request-btn');
            if (paymentButton && paymentButton.onclick) {
                const onclickStr = paymentButton.onclick.toString();
                const entryIdMatch = onclickStr.match(/['"`]([^'"`]+)['"`]/);
                if (entryIdMatch) {
                    const entryId = entryIdMatch[1];
                    const requestExists = await checkPaymentRequestExists(entryId);
                    updatePaymentRequestButton(entryId, requestExists);
                }
            }
        }
        
        console.log('✅ Payment request buttons updated successfully');
    } catch (error) {
        console.error('Error updating payment request buttons:', error);
        // Retry once after 1 second on error
        setTimeout(updateAllPaymentRequestButtons, 1000);
    }
}

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
        
        // Button will be updated automatically by the real-time listener
        
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
        
        // Mark as cancelled instead of deleting
        const requestDoc = requests.docs[0];
        await window.db.collection('paymentRequests').doc(requestDoc.id).update({
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Zahlungsanfrage zurückgezogen', 'success');
        
        // Button will be updated automatically by the real-time listener
        
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
        console.log('Loading pending payment requests...');
        
        // Try with orderBy first, fallback to simple query if it fails
        let requests;
        try {
            requests = await window.db.collection('paymentRequests')
                .where('status', '==', 'pending')
                .orderBy('requestedAt', 'desc')
                .get();
        } catch (orderError) {
            console.warn('OrderBy failed, using simple query:', orderError);
            requests = await window.db.collection('paymentRequests')
                .where('status', '==', 'pending')
                .get();
        }
            
        const paymentRequests = [];
        requests.forEach(doc => {
            const data = doc.data();
            paymentRequests.push({
                id: doc.id,
                ...data,
                // Ensure requestedAt is properly handled
                requestedAt: data.requestedAt || null
            });
        });
        
        console.log(`Found ${paymentRequests.length} pending payment requests:`, paymentRequests);
        return paymentRequests;
    } catch (error) {
        console.error('Error loading payment requests:', error);
        showToast('Fehler beim Laden der Zahlungsanfragen', 'error');
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
        
        // Refresh the modal content if open
        const container = document.getElementById('paymentRequestsList');
        if (container) {
            const requests = await loadPendingPaymentRequests();
            if (requests.length === 0) {
                container.innerHTML = '<p class="text-center">Keine offenen Zahlungsanfragen</p>';
            } else {
                container.innerHTML = renderPaymentRequestsList(requests);
            }
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
    try {
        const modalContent = `
            <div class="modal-header">
                <h3>Zahlungsanfragen verwalten</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="card">
                    <div class="card-body">
                        <div id="paymentRequestsList" class="payment-requests-container">
                            <div class="loading">Zahlungsanfragen werden geladen...</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
            </div>
        `;
        
        showModalWithContent(modalContent);
        
        // Load payment requests
        const requests = await loadPendingPaymentRequests();
        const container = document.getElementById('paymentRequestsList');
        
        if (container) {
            if (requests.length === 0) {
                container.innerHTML = '<p class="text-center">Keine offenen Zahlungsanfragen</p>';
            } else {
                container.innerHTML = renderPaymentRequestsList(requests);
            }
        }
        
    } catch (error) {
        console.error('Error showing payment requests modal:', error);
        showToast('Fehler beim Laden der Zahlungsanfragen', 'error');
    }
}

/**
 * Render payment requests list for admin
 */
function renderPaymentRequestsList(requests) {
    console.log('Rendering payment requests list with', requests.length, 'requests');
    
    if (requests.length === 0) {
        return '<div class="empty-state"><p>Keine offenen Zahlungsanfragen</p></div>';
    }
    
    return `
        <div class="payment-requests-list">
            ${requests.map(request => {
                // Safe timestamp handling
                let requestedAtText = 'Unbekannt';
                try {
                    if (request.requestedAt) {
                        if (typeof request.requestedAt.toDate === 'function') {
                            requestedAtText = new Date(request.requestedAt.toDate()).toLocaleString('de-DE');
                        } else if (request.requestedAt instanceof Date) {
                            requestedAtText = request.requestedAt.toLocaleString('de-DE');
                        } else if (typeof request.requestedAt === 'string') {
                            requestedAtText = new Date(request.requestedAt).toLocaleString('de-DE');
                        }
                    }
                } catch (dateError) {
                    console.warn('Error formatting date:', dateError);
                }
                
                // Safe currency formatting
                const amount = request.amount || 0;
                const amountText = window.formatCurrency ? window.formatCurrency(amount) : `€${amount.toFixed(2)}`;
                
                return `
                    <div class="payment-request-item" id="request-${request.id}">
                        <div class="request-header">
                            <h4>${request.jobName || '3D-Druck Auftrag'}</h4>
                            <span class="request-amount">${amountText}</span>
                        </div>
                        <div class="request-details">
                            <p><strong>Nutzer:</strong> ${request.userName || 'Unbekannt'} ${request.userId ? `(${request.userId})` : ''}</p>
                            <p><strong>Material:</strong> ${request.material || 'Unbekannt'} ${request.materialMenge ? `(${request.materialMenge.toFixed(2)} kg)` : ''}</p>
                            <p><strong>Angefragt:</strong> ${requestedAtText}</p>
                            <p><strong>Entry-ID:</strong> ${request.entryId || 'Unbekannt'}</p>
                        </div>
                        <div class="request-actions">
                            <button class="btn btn-success" onclick="processPaymentRequest('${request.id}', true)">
                                ✅ Zahlung registrieren
                            </button>
                            <button class="btn btn-danger" onclick="processPaymentRequest('${request.id}', false)">
                                ❌ Ablehnen
                            </button>
                            <button class="btn btn-secondary" onclick="deletePaymentRequest('${request.id}')">
                                🗑️ Löschen
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Admin: Delete a payment request completely
 */
async function deletePaymentRequest(requestId) {
    if (!confirm('Möchten Sie diese Zahlungsanfrage wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
        return;
    }
    
    try {
        console.log('Deleting payment request:', requestId);
        
        await window.db.collection('paymentRequests').doc(requestId).delete();
        
        showToast('Zahlungsanfrage wurde gelöscht', 'success');
        
        // Refresh the modal content
        const requests = await loadPendingPaymentRequests();
        const container = document.getElementById('paymentRequestsList');
        
        if (container) {
            if (requests.length === 0) {
                container.innerHTML = '<p class="text-center">Keine offenen Zahlungsanfragen</p>';
            } else {
                container.innerHTML = renderPaymentRequestsList(requests);
            }
        }
        
    } catch (error) {
        console.error('Error deleting payment request:', error);
        showToast('Fehler beim Löschen der Zahlungsanfrage', 'error');
    }
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
    if (paymentRequestsListener) {
        paymentRequestsListener();
    }
    
    paymentRequestsListener = window.db.collection('paymentRequests').onSnapshot((snapshot) => {
        const requests = [];
        snapshot.forEach((doc) => {
            if (doc.data().status === 'pending') {
                requests.push({
                    id: doc.id,
                    ...doc.data(),
                    requestedAt: doc.data().requestedAt?.toDate()
                });
            }
        });
        
        console.log('Live update: Loaded payment requests:', requests.length);
        updatePaymentRequestsBadge(requests.length);
    }, (error) => {
        console.error('Error in payment requests listener:', error);
        showToast('Fehler beim Live-Update der Zahlungsanfragen', 'error');
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

/**
 * Initialize payment request system
 */
function initializePaymentRequests() {
    if (window.currentUser && !window.currentUser.isAdmin) {
        setupUserPaymentRequestsListener();
    }
    
    if (window.currentUser && window.currentUser.isAdmin) {
        setupPaymentRequestsListener();
    }
}

// Make functions globally available
window.requestPayment = requestPayment;
window.cancelPaymentRequest = cancelPaymentRequest;
window.processPaymentRequest = processPaymentRequest;
window.deletePaymentRequest = deletePaymentRequest;
window.showPaymentRequestsModal = showPaymentRequestsModal;
window.checkPaymentRequestExists = checkPaymentRequestExists;
window.updatePaymentRequestButton = updatePaymentRequestButton;
window.setupPaymentRequestsListener = setupPaymentRequestsListener;
window.initializePaymentRequests = initializePaymentRequests;

// Remove DOMContentLoaded listener - initialization happens after login
// Payment requests are initialized via initializePaymentRequests() in auth.js 