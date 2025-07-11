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
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Material anfragen</h3>
                <button class="modal-close" onclick="closeMaterialRequestForm()">&times;</button>
            </div>
            <div class="modal-body">
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
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeMaterialRequestForm()">Abbrechen</button>
                        <button type="button" class="btn btn-primary" onclick="submitMaterialRequest()">Anfrage senden</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.id = 'materialRequestModal';
}

/**
 * Close material request form
 */
function closeMaterialRequestForm() {
    const modal = document.getElementById('materialRequestModal');
    if (modal) {
        modal.remove();
    }
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
        
        showToast('Material-Anfrage erfolgreich gesendet', 'success');
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
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('materialOrdersModal').style.display = 'block';
    
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
        showOrderTab(currentOrderTab);
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
    
    // Update tab buttons - search within material orders modal only
    const materialOrdersModal = document.getElementById('materialOrdersModal');
    if (materialOrdersModal) {
        materialOrdersModal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Find the clicked tab button or set first one as active
        const clickedBtn = event?.target;
        if (clickedBtn && clickedBtn.classList.contains('tab-btn')) {
            clickedBtn.classList.add('active');
        } else {
            // Set the tab for the current content as active
            const activeTab = materialOrdersModal.querySelector(`.tab-btn[onclick*="${tab}"]`);
            if (activeTab) {
                activeTab.classList.add('active');
            }
        }
        
        // Hide all tab content
        materialOrdersModal.querySelectorAll('.order-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Show selected tab
        const tabContent = document.getElementById(getTabContentId(tab));
        if (tabContent) {
            tabContent.classList.add('active');
            renderTabContent(tab);
        }
    }
}

/**
 * Get tab content element ID
 */
function getTabContentId(tab) {
    const tabMap = {
        'requests': 'orderRequests',
        'shopping': 'shoppingList', 
        'orders': 'orderHistory'
    };
    return tabMap[tab];
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
        case 'orders':
            renderOrderHistory();
            break;
    }
}

/**
 * Render order requests from users
 */
function renderOrderRequests() {
    const container = document.getElementById('orderRequests');
    const requests = materialOrders.filter(order => order.type === 'request');
    
    if (requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine Bestellanfragen vorhanden.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = requests.map(request => `
        <div class="order-request ${request.status || 'pending'}">
            <div class="order-header">
                <div class="order-user">${request.userName || 'Unbekannter User'}</div>
                <div class="order-date">${request.createdAt ? request.createdAt.toLocaleDateString() : 'Unbekanntes Datum'}</div>
            </div>
            <div class="order-material">${request.materialName || 'Unbekanntes Material'}</div>
            ${request.manufacturer ? `<div class="order-manufacturer">Hersteller: ${request.manufacturer}</div>` : ''}
            ${request.quantity ? `<div class="order-quantity">Menge: ${request.quantity}</div>` : ''}
            <div class="order-reason">"${request.reason || 'Kein Grund angegeben'}"</div>
            <div class="order-priority">Dringlichkeit: ${getPriorityText(request.priority)}</div>
            ${request.status === 'pending' ? `
                <div class="order-actions">
                    <button class="btn btn-success" onclick="approveOrderRequest('${request.id}')">Genehmigen</button>
                    <button class="btn btn-danger" onclick="rejectOrderRequest('${request.id}')">Ablehnen</button>
                    <button class="btn btn-secondary" onclick="deleteOrderRequest('${request.id}')">Löschen</button>
                </div>
            ` : `
                <div class="order-status">Status: ${getStatusText(request.status)}</div>
                <div class="order-actions">
                    <button class="btn btn-danger" onclick="deleteOrderRequest('${request.id}')">Löschen</button>
                </div>
            `}
        </div>
    `).join('');
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
 * Render automatic shopping list
 */
function renderShoppingList() {
    const container = document.getElementById('shoppingList');
    
    // Placeholder content
    container.innerHTML = `
        <div class="empty-state">
            <p>Automatische Einkaufsliste wird noch implementiert.</p>
            <p>Hier werden Materialien mit niedrigem Bestand angezeigt.</p>
        </div>
    `;
}

/**
 * Render order history
 */
function renderOrderHistory() {
    const container = document.getElementById('orderHistory');
    const orders = materialOrders.filter(order => order.type === 'order');
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine Bestellungen vorhanden.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="order-request">
            <div class="order-header">
                <div class="order-user">Bestellung #${order.orderNumber || order.id.substr(0,8)}</div>
                <div class="order-date">${order.createdAt ? order.createdAt.toLocaleDateString() : 'Unbekanntes Datum'}</div>
            </div>
            <div class="order-material">${order.items?.length || 0} Artikel</div>
            <div class="order-reason">Status: ${order.status || 'Unbekannt'}</div>
        </div>
    `).join('');
}

/**
 * Approve order request
 */
async function approveOrderRequest(requestId) {
    try {
        await window.db.collection('materialOrders').doc(requestId).update({
            status: 'approved',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Anfrage genehmigt', 'success');
        // Real-time listener will automatically update the UI
        
    } catch (error) {
        console.error('Error approving request:', error);
        showToast('Fehler beim Genehmigen', 'error');
    }
}

/**
 * Reject order request
 */
async function rejectOrderRequest(requestId) {
    const reason = prompt('Grund für Ablehnung (optional):');
    
    try {
        await window.db.collection('materialOrders').doc(requestId).update({
            status: 'rejected',
            rejectionReason: reason || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Anfrage abgelehnt', 'success');
        // Real-time listener will automatically update the UI
        
    } catch (error) {
        console.error('Error rejecting request:', error);
        showToast('Fehler beim Ablehnen', 'error');
    }
}

/**
 * Delete order request permanently
 */
async function deleteOrderRequest(requestId) {
    if (!confirm('Möchten Sie diese Bestellung wirklich dauerhaft löschen?')) {
        return;
    }
    
    try {
        await window.db.collection('materialOrders').doc(requestId).delete();
        showToast('Bestellung erfolgreich gelöscht', 'success');
        // Real-time listener will automatically update the UI
        
    } catch (error) {
        console.error('Error deleting request:', error);
        showToast('Fehler beim Löschen', 'error');
    }
} 