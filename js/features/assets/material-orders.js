/**
 * Material Order Management System
 * Handles material requests, shopping lists, and order tracking
 */

// Global order state
let materialOrders = [];
let currentOrderTab = 'requests';
let materialOrdersListener = null;

/**
 * Show material request form for users
 */
function showMaterialRequestForm() {
    const modalContent = `
        <div class="modal-header">
            <h3>Material anfragen</h3>
            <button class="close-btn" onclick="closeMaterialRequestForm()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="card">
                <div class="card-body">
                    <form id="materialRequestForm" class="form">
                        <div class="form-group">
                            <label class="form-label">Material/Filament</label>
                            <input type="text" id="requestMaterialName" class="form-input" placeholder="z.B. PLA Schwarz, PETG Transparent, TPU Flexibel...">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Hersteller (optional)</label>
                            <input type="text" id="requestManufacturer" class="form-input" placeholder="z.B. Prusament, eSUN, Polymaker...">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Begründung</label>
                            <textarea id="requestReason" class="form-textarea" placeholder="Warum benötigen Sie dieses Material? Für welches Projekt?" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Ungefähre Menge</label>
                            <input type="text" id="requestQuantity" class="form-input" placeholder="z.B. 1kg, 500g, 2 Spulen...">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Dringlichkeit</label>
                            <select id="requestPriority" class="form-select">
                                <option value="low">Niedrig - kein Zeitdruck</option>
                                <option value="medium">Mittel - in den nächsten Wochen</option>
                                <option value="high">Hoch - dringend benötigt</option>
                            </select>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-primary" onclick="submitMaterialRequest()">Anfrage senden</button>
            <button type="button" class="btn btn-secondary" onclick="closeMaterialRequestForm()">Abbrechen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
}

/**
 * Close material request form
 */
function closeMaterialRequestForm() {
    closeModal();
}

/**
 * Submit material request
 */
async function submitMaterialRequest() {
    const formData = {
        materialName: document.getElementById('requestMaterialName').value.trim(),
        manufacturer: document.getElementById('requestManufacturer').value.trim(),
        reason: document.getElementById('requestReason').value.trim(),
        quantity: document.getElementById('requestQuantity').value.trim(),
        priority: document.getElementById('requestPriority').value
    };
    
    // Validation
    if (!formData.materialName || !formData.reason) {
        showToast('Bitte füllen Sie mindestens Material und Begründung aus', 'error');
        return;
    }
    
    try {
        await window.db.collection('materialOrders').add({
            type: 'request',
            userName: window.currentUser?.name || 'Unbekannter User',
            userKennung: window.currentUser?.kennung || '',
            materialName: formData.materialName,
            manufacturer: formData.manufacturer,
            reason: formData.reason,
            quantity: formData.quantity,
            priority: formData.priority,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const quantityText = formData.quantity ? `\nMenge: ${formData.quantity}` : '';
        const manufacturerText = formData.manufacturer ? `\nHersteller: ${formData.manufacturer}` : '';
        
        showToast(`✅ Material-Anfrage erfolgreich gesendet!\n\nMaterial: ${formData.materialName}${quantityText}${manufacturerText}\nPriorität: ${getPriorityText(formData.priority)}\n\nEin Admin wird deine Anfrage prüfen und das Material bestellen.`, 'success', 8000);
        closeMaterialRequestForm();
        
    } catch (error) {
        console.error('Error submitting material request:', error);
        showToast('Fehler beim Senden der Anfrage', 'error');
    }
}

/**
 * Show material orders modal
 */
function showMaterialOrders() {
    const modalContent = `
        <div class="modal-header">
            <h3>Material-Bestellungen verwalten</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="card">
                <div class="card-body">
                    <div class="order-tabs">
                        <button class="tab-btn active" onclick="showOrderTab('requests')">Anfragen</button>
                        <button class="tab-btn" onclick="showOrderTab('shopping')">Einkaufsliste</button>
                        <button class="tab-btn" onclick="showOrderTab('history')">Verlauf</button>
                    </div>
                    
                    <div id="requests" class="tab-content active">
                        <div id="orderRequestsContent">
                            <div class="loading">Bestellanfragen werden geladen...</div>
                        </div>
                    </div>
                    
                    <div id="shopping" class="tab-content">
                        <div id="shoppingListContent">
                            <div class="loading">Einkaufsliste wird geladen...</div>
                        </div>
                    </div>
                    
                    <div id="history" class="tab-content">
                        <div id="orderHistoryContent">
                            <div class="loading">Bestellverlauf wird geladen...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-primary" onclick="showMaterialRequestForm()">Material anfragen</button>
            <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
    
    // Setup real-time listener
    setupMaterialOrdersListener();
}

/**
 * Close material orders modal
 */
function closeMaterialOrders() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('materialOrdersModal').style.display = 'none';
    
    // Clean up real-time listener
    if (materialOrdersListener) {
        materialOrdersListener();
        materialOrdersListener = null;
    }
}

/**
 * Setup real-time listener for material orders
 */
function setupMaterialOrdersListener() {
    if (materialOrdersListener) {
        materialOrdersListener();
    }
    
    materialOrdersListener = window.db.collection('materialOrders').onSnapshot((snapshot) => {
        materialOrders = [];
        snapshot.forEach((doc) => {
            materialOrders.push({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            });
        });
        
        console.log('Live update: Loaded material orders:', materialOrders.length);
        
        // Update current tab display if modal is open
        const tabContent = document.querySelector('.tab-content.active');
        if (tabContent) {
            showOrderTab(currentOrderTab);
        }
        
    }, (error) => {
        console.error('Error in material orders listener:', error);
        showToast('Fehler beim Live-Update der Bestellungen', 'error');
    });
}

/**
 * Load material orders from Firebase (fallback)
 */
async function loadMaterialOrders() {
    try {
        const querySnapshot = await window.db.collection('materialOrders').get();
        materialOrders = [];
        
        querySnapshot.forEach((doc) => {
            materialOrders.push({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            });
        });
        
        showOrderTab(currentOrderTab);
        console.log('Loaded material orders:', materialOrders.length);
        
    } catch (error) {
        console.error('Error loading material orders:', error);
        showToast('Fehler beim Laden der Bestellungen', 'error');
    }
}

/**
 * Show order tab
 */
function showOrderTab(tab) {
    currentOrderTab = tab;
    
    // Update tab buttons - use correct selector for material orders
    const tabButtons = document.querySelectorAll('.order-tabs .tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Set the correct tab as active based on tab parameter
    const activeTab = document.querySelector(`.order-tabs .tab-btn[onclick*="${tab}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Hide all tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected tab content
    const selectedContent = document.getElementById(tab);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // Render the appropriate content
    renderTabContent(tab);
}

/**
 * Render tab content based on selected tab
 */
function renderTabContent(tab) {
    switch (tab) {
        case 'requests':
            renderOrderRequests();
            break;
        case 'shopping':
            renderShoppingList();
            break;
        case 'history':
            renderOrderHistory();
            break;
    }
    
    // Update tab counters
    updateTabCounters();
}

/**
 * Update tab counters with current counts
 */
function updateTabCounters() {
    const requestsCount = materialOrders.filter(order => order.type === 'request' && order.status === 'pending').length;
    const shoppingCount = materialOrders.filter(order => order.status === 'approved').length;
    const ordersCount = materialOrders.filter(order => order.status === 'purchased').length;
    
    // Update counter elements
    const requestsCounter = document.getElementById('requestsCounter');
    const shoppingCounter = document.getElementById('shoppingCounter');
    const ordersCounter = document.getElementById('ordersCounter');
    
    if (requestsCounter) {
        requestsCounter.textContent = requestsCount;
        requestsCounter.style.display = requestsCount > 0 ? 'inline-block' : 'none';
    }
    
    if (shoppingCounter) {
        shoppingCounter.textContent = shoppingCount;
        shoppingCounter.style.display = shoppingCount > 0 ? 'inline-block' : 'none';
    }
    
    if (ordersCounter) {
        ordersCounter.textContent = ordersCount;
        ordersCounter.style.display = ordersCount > 0 ? 'inline-block' : 'none';
    }
}

/**
 * Render order requests tab
 */
function renderOrderRequests() {
    const requests = materialOrders.filter(order => order.type === 'request' && order.status === 'pending');
    const container = document.getElementById('orderRequestsContent');
    
    if (!container) return;
    
    if (requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine offenen Materialanfragen vorhanden.</p>
                <p>Nutzer können über den "Material anfragen" Button neue Anfragen erstellen.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="requests-list">
            ${requests.map(request => `
                <div class="request-item">
                    <div class="request-header">
                        <h4>${request.materialName}</h4>
                        <span class="priority-badge priority-${request.priority}">${getPriorityText(request.priority)}</span>
                    </div>
                    <div class="request-details">
                        <p><strong>Nutzer:</strong> ${request.userName} (${request.userKennung})</p>
                        ${request.manufacturer ? `<p><strong>Hersteller:</strong> ${request.manufacturer}</p>` : ''}
                        ${request.quantity ? `<p><strong>Menge:</strong> ${request.quantity}</p>` : ''}
                        <p><strong>Begründung:</strong> ${request.reason}</p>
                        <p><strong>Angefragt:</strong> ${request.createdAt ? request.createdAt.toLocaleString() : 'Unbekannt'}</p>
                    </div>
                    <div class="request-actions">
                        <button class="btn btn-success btn-small" onclick="approveOrderRequest('${request.id}')">
                            Genehmigen
                        </button>
                        <button class="btn btn-warning btn-small" onclick="rejectOrderRequest('${request.id}')">
                            Ablehnen
                        </button>
                        <button class="btn btn-danger btn-small" onclick="deleteOrderRequest('${request.id}')">
                            Löschen
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Get localized priority text
 */
function getPriorityText(priority) {
    const priorityMap = {
        'low': 'Niedrig',
        'medium': 'Mittel',
        'high': 'Hoch'
    };
    return priorityMap[priority] || priority;
}

/**
 * Get localized status text
 */
function getStatusText(status) {
    const statusMap = {
        'pending': 'Ausstehend',
        'approved': 'Genehmigt',
        'rejected': 'Abgelehnt',
        'ordered': 'Bestellt',
        'delivered': 'Geliefert'
    };
    return statusMap[status] || status;
}

/**
 * Render shopping list (approved items to purchase)
 */
function renderShoppingList() {
    const container = document.getElementById('shoppingListContent');
    const shoppingItems = materialOrders.filter(order => order.status === 'approved');
    
    if (shoppingItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine Artikel zum Einkaufen vorhanden.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = shoppingItems.map(item => `
        <div class="shopping-list-item">
            <div class="shopping-item-info">
                <div class="shopping-item-name">${item.materialName || 'Unbekanntes Material'}</div>
                <div class="shopping-item-details">
                    ${item.manufacturer ? `Hersteller: ${item.manufacturer}<br>` : ''}
                    Angefragt von: ${item.userName || 'Unbekannt'}<br>
                    Menge: ${item.quantity || 'Nicht angegeben'}
                </div>
            </div>
            <div class="shopping-item-quantity">
                Dringlichkeit: ${getPriorityText(item.priority)}
            </div>
            <div class="shopping-item-actions">
                <button class="btn btn-success" onclick="markAsPurchased('${item.id}')">Eingekauft</button>
                <button class="btn btn-danger" onclick="cancelOrder('${item.id}')">Stornieren</button>
            </div>
        </div>
    `).join('');
}

/**
 * Render order history (purchased items)
 */
function renderOrderHistory() {
    const container = document.getElementById('orderHistoryContent');
    const orders = materialOrders.filter(order => order.status === 'purchased');
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine eingekauften Bestellungen vorhanden.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="order-request purchased">
            <div class="order-header">
                <div class="order-user">${order.materialName || 'Unbekanntes Material'}</div>
                <div class="order-date">${order.purchasedAt ? order.purchasedAt.toDate().toLocaleDateString() : 'Unbekanntes Datum'}</div>
            </div>
            ${order.manufacturer ? `<div class="order-manufacturer">Hersteller: ${order.manufacturer}</div>` : ''}
            <div class="order-material">Menge: ${order.quantity || 'Nicht angegeben'}</div>
            <div class="order-reason">Eingekauft von: ${order.userName || 'Unbekannt'}</div>
            <div class="order-priority">Ursprünglich angefragt: ${order.createdAt ? order.createdAt.toLocaleDateString() : 'Unbekannt'}</div>
        </div>
    `).join('');
}

/**
 * Approve order request and move to shopping list
 */
async function approveOrderRequest(requestId) {
    try {
        // Show immediate visual feedback
        const button = event.target;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Wird genehmigt...';
        
        await window.db.collection('materialOrders').doc(requestId).update({
            status: 'approved',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedBy: window.currentUser?.name || 'Admin'
        });
        
        showToast('Anfrage genehmigt und zur Einkaufsliste hinzugefügt', 'success');
        // Real-time listener will handle the update automatically
        
    } catch (error) {
        console.error('Error approving request:', error);
        showToast('Fehler beim Genehmigen', 'error');
        
        // Reset button state on error
        if (button) {
            button.disabled = false;
            button.textContent = originalText;
        }
    }
}

/**
 * Reject order request
 */
async function rejectOrderRequest(requestId) {
    if (!confirm('Möchten Sie diese Anfrage wirklich ablehnen?')) {
        return;
    }
    
    try {
        // Show immediate visual feedback
        const button = event.target;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Wird abgelehnt...';
        
        await window.db.collection('materialOrders').doc(requestId).update({
            status: 'rejected',
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectedBy: window.currentUser?.name || 'Admin'
        });
        
        showToast('Anfrage abgelehnt', 'success');
        // Real-time listener will handle the update automatically
        
    } catch (error) {
        console.error('Error rejecting request:', error);
        showToast('Fehler beim Ablehnen', 'error');
        
        // Reset button state on error
        if (button) {
            button.disabled = false;
            button.textContent = originalText;
        }
    }
}

/**
 * Delete order request  
 */
async function deleteOrderRequest(requestId) {
    if (!confirm('Möchten Sie diese Bestellung wirklich löschen?')) {
        return;
    }
    
    try {
        // Show immediate visual feedback
        const button = event.target;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Wird gelöscht...';
        
        await window.db.collection('materialOrders').doc(requestId).delete();
        showToast('Bestellung erfolgreich gelöscht', 'success');
        // Real-time listener will handle the update automatically
        
    } catch (error) {
        console.error('Error deleting request:', error);
        showToast('Fehler beim Löschen', 'error');
        
        // Reset button state on error
        if (button) {
            button.disabled = false;
            button.textContent = originalText;
        }
    }
}

/**
 * Mark item as purchased (move from shopping list to order history)
 */
async function markAsPurchased(requestId) {
    try {
        await window.db.collection('materialOrders').doc(requestId).update({
            status: 'purchased',
            purchasedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Artikel als eingekauft markiert', 'success');
        // Real-time listener will automatically update the UI
        
    } catch (error) {
        console.error('Error marking as purchased:', error);
        showToast('Fehler beim Markieren', 'error');
    }
}

/**
 * Cancel/reject order from shopping list
 */
async function cancelOrder(requestId) {
    const reason = prompt('Grund für Stornierung (optional):');
    
    try {
        await window.db.collection('materialOrders').doc(requestId).update({
            status: 'cancelled',
            cancellationReason: reason || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Bestellung storniert', 'success');
        // Real-time listener will automatically update the UI
        
    } catch (error) {
        console.error('Error cancelling order:', error);
        showToast('Fehler beim Stornieren', 'error');
    }
}

// Export functions to global scope
window.showMaterialOrders = showMaterialOrders;
window.closeMaterialOrders = closeMaterialOrders;