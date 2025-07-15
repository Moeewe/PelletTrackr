/**
 * Material Order Management System
 * Handles material requests, shopping lists, and order tracking
 */

// Global order state
let materialOrders = [];
let currentOrderTab = 'wishes';
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
        toast.error('Bitte füllen Sie mindestens Material und Begründung aus');
        return;
    }
    
    try {
        await window.db.collection('materialOrders').add({
            type: 'request',
            source: 'user', // Track if this came from user or admin
            userName: window.currentUser?.name || 'Unbekannter User',
            userKennung: window.currentUser?.kennung || '',
            createdBy: window.currentUser?.name || 'Unbekannter User',
            createdByKennung: window.currentUser?.kennung || '',
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
        
        toast.success(`Material-Anfrage erfolgreich gesendet!\n\nMaterial: ${formData.materialName}${quantityText}${manufacturerText}\nPriorität: ${getPriorityText(formData.priority)}\n\nEin Admin wird deine Anfrage prüfen und das Material bestellen.`);
        
        // Return to orders list instead of closing modal
        showOrdersManagement();
        
        // Refresh admin view if material orders modal is open
        if (document.getElementById('materialOrdersModal') && document.getElementById('materialOrdersModal').style.display === 'block') {
            loadMaterialOrders();
        }
        
    } catch (error) {
        console.error('Error submitting material request:', error);
        toast.error('Fehler beim Senden der Anfrage');
    }
}

/**
 * Show admin order form for creating admin orders
 */
function showAdminOrderForm() {
    const modalContent = `
        <div class="modal-header">
            <h3>Admin-Bestellung anlegen</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="card">
                <div class="card-body">
                    <form id="adminOrderForm" class="form">
                        <div class="form-group">
                            <label class="form-label">Material/Filament</label>
                            <input type="text" id="adminMaterialName" class="form-input" placeholder="z.B. PLA Schwarz, PETG Transparent, TPU Flexibel...">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Hersteller (optional)</label>
                            <input type="text" id="adminManufacturer" class="form-input" placeholder="z.B. Prusament, eSUN, Polymaker...">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Begründung</label>
                            <textarea id="adminReason" class="form-textarea" placeholder="Warum wird dieses Material bestellt? Für welchen Zweck?" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Menge</label>
                            <input type="text" id="adminQuantity" class="form-input" placeholder="z.B. 1kg, 500g, 2 Spulen...">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Dringlichkeit</label>
                            <select id="adminPriority" class="form-select">
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
            <button type="button" class="btn btn-primary" onclick="submitAdminOrder()">Bestellung anlegen</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
}

/**
 * Submit admin order
 */
async function submitAdminOrder() {
    const formData = {
        materialName: document.getElementById('adminMaterialName').value.trim(),
        manufacturer: document.getElementById('adminManufacturer').value.trim(),
        reason: document.getElementById('adminReason').value.trim(),
        quantity: document.getElementById('adminQuantity').value.trim(),
        priority: document.getElementById('adminPriority').value
    };
    
    // Validation
    if (!formData.materialName || !formData.reason) {
        toast.error('Bitte füllen Sie mindestens Material und Begründung aus');
        return;
    }
    
    try {
        await window.db.collection('materialOrders').add({
            type: 'request',
            source: 'admin', // Track this as admin-created
            userName: null, // Not applicable for admin orders
            userKennung: null,
            createdBy: window.currentUser?.name || 'Admin',
            createdByKennung: window.currentUser?.kennung || '',
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
        
        toast.success(`Admin-Bestellung erfolgreich angelegt!\n\nMaterial: ${formData.materialName}${quantityText}${manufacturerText}\nPriorität: ${getPriorityText(formData.priority)}`);
        
        closeModal();
        
        // Refresh admin view if material orders modal is open
        if (document.getElementById('materialOrdersModal') && document.getElementById('materialOrdersModal').style.display === 'block') {
            loadMaterialOrders();
        }
        
    } catch (error) {
        console.error('Error submitting admin order:', error);
        toast.error('Fehler beim Anlegen der Bestellung: ' + error.message);
    }
}

/**
 * Show material orders modal
 */
function showMaterialOrders() {
    const modalContent = `
        <div class="modal-header">
            <h3>Bestellungen verwalten</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="card">
                <div class="card-body">
                    <div class="order-tabs">
                        <button class="tab-btn active" onclick="showOrderTab('requests')">
                            Bestellanfragen
                            <span class="badge" id="requestsCounter" style="display: none;">0</span>
                        </button>
                        <button class="tab-btn" onclick="showOrderTab('shopping')">
                            Einkaufsliste
                            <span class="badge" id="shoppingCounter" style="display: none;">0</span>
                        </button>
                        <button class="tab-btn" onclick="showOrderTab('history')">
                            Verlauf
                            <span class="badge" id="historyCounter" style="display: none;">0</span>
                        </button>
                    </div>
                    
                    <div id="requests" class="tab-content active">
                        <div id="orderRequestsContent">
                            <div class="loading">Bestellanfragen werden geladen...</div>
                        </div>
                        <br>
                        <div id="materialWishesContent">
                            <div class="loading">Material-Wünsche werden geladen...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-primary" onclick="showMaterialRequestForm()">Material-Wunsch hinzufügen</button>
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
        toast.error('Fehler beim Live-Update der Bestellungen');
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
        toast.error('Fehler beim Laden der Bestellungen');
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
    const historyCount = materialOrders.filter(order => order.status === 'purchased' || order.status === 'delivered' || order.status === 'rejected').length;
    
    // Update counter elements
    const requestsCounter = document.getElementById('requestsCounter');
    const shoppingCounter = document.getElementById('shoppingCounter');
    const historyCounter = document.getElementById('historyCounter');
    
    if (requestsCounter) {
        requestsCounter.textContent = requestsCount;
        requestsCounter.style.display = requestsCount > 0 ? 'inline-block' : 'none';
    }
    
    if (shoppingCounter) {
        shoppingCounter.textContent = shoppingCount;
        shoppingCounter.style.display = shoppingCount > 0 ? 'inline-block' : 'none';
    }
    
    if (historyCounter) {
        historyCounter.textContent = historyCount;
        historyCounter.style.display = historyCount > 0 ? 'inline-block' : 'none';
    }
}

/**
 * Render order requests and material wishes tab
 */
function renderOrderRequests() {
    const requests = materialOrders.filter(order => order.type === 'request' && order.status === 'pending');
    const allWishes = materialOrders.filter(order => order.type === 'request');
    const container = document.getElementById('orderRequestsContent');
    
    if (!container) return;
    
    if (requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine offenen Materialanfragen vorhanden.</p>
                <p>Nutzer können über den "Material anfragen" Button neue Anfragen erstellen.</p>
            </div>
        `;
    } else {
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
    
    // Also render material wishes in the same tab
    renderMaterialWishes();
}

/**
 * Render material wishes tab
 */
function renderMaterialWishes() {
    const wishes = materialOrders.filter(order => order.type === 'request').sort((a, b) => {
        // Sort by priority: high -> medium -> low
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
    });
    const container = document.getElementById('materialWishesContent');
    
    if (wishes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine Material-Wünsche vorhanden.</p>
                <button class="btn btn-primary" onclick="showMaterialRequestForm()">Material-Wunsch hinzufügen</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="material-wishes-header">
            <h4>Material-Wünsche (${wishes.length})</h4>
            <button class="btn btn-primary" onclick="showMaterialRequestForm()">Material-Wunsch hinzufügen</button>
        </div>
        <div class="material-wishes-list">
            ${wishes.map(wish => `
                <div class="material-wish-item ${wish.status === 'pending' ? 'pending' : wish.status === 'approved' ? 'approved' : 'rejected'}">
                    <div class="wish-header">
                        <div class="wish-material">
                            <strong>${wish.materialName || 'Unbekanntes Material'}</strong>
                            ${wish.manufacturer ? `<span class="manufacturer">${wish.manufacturer}</span>` : ''}
                        </div>
                        <div class="wish-priority-container">
                            <span class="priority-badge priority-${wish.priority}">${getPriorityIcon(wish.priority)} ${getPriorityText(wish.priority)}</span>
                            <div class="wish-status status-${wish.status}">
                                ${getStatusText(wish.status)}
                            </div>
                        </div>
                    </div>
                    <div class="wish-details">
                        <div class="wish-info">
                            <span class="wish-user">von ${wish.userName || 'Unbekannt'}</span>
                            <span class="wish-date">${wish.createdAt ? wish.createdAt.toLocaleDateString('de-DE') : 'Unbekannt'}</span>
                        </div>
                        <div class="wish-reason">${wish.reason || 'Keine Begründung'}</div>
                        ${wish.quantity ? `<div class="wish-quantity">Menge: ${wish.quantity}</div>` : ''}
                    </div>
                    ${window.currentUser?.isAdmin ? `
                        <div class="wish-actions">
                            <button class="btn btn-success btn-small" onclick="approveOrderRequest('${wish.id}')">
                                Genehmigen
                            </button>
                            <button class="btn btn-warning btn-small" onclick="rejectOrderRequest('${wish.id}')">
                                Ablehnen
                            </button>
                            <button class="btn btn-danger btn-small" onclick="deleteOrderRequest('${wish.id}')">
                                Löschen
                            </button>
                        </div>
                    ` : ''}
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
 * Get priority icon
 */
function getPriorityIcon(priority) {
    const iconMap = {
        'low': '●',
        'medium': '▲',
        'high': '⬆'
    };
    return iconMap[priority] || '●';
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
 * Render order history with deletion functionality
 */
function renderOrderHistory() {
    const container = document.getElementById('orderHistoryContent');
    const orders = materialOrders.filter(order => order.status === 'purchased' || order.status === 'delivered' || order.status === 'rejected');
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine Bestellungen im Verlauf vorhanden.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="history-header">
            <h4>Bestellverlauf (${orders.length})</h4>
            ${window.currentUser?.isAdmin ? `<button class="btn btn-warning btn-small" onclick="clearAllHistory()">Verlauf leeren</button>` : ''}
        </div>
        <div class="history-list">
            ${orders.map(order => `
                <div class="history-item status-${order.status}">
                    <div class="history-header">
                        <div class="history-material">
                            <strong>${order.materialName || 'Unbekanntes Material'}</strong>
                            ${order.manufacturer ? `<span class="manufacturer">${order.manufacturer}</span>` : ''}
                        </div>
                        <div class="history-status status-${order.status}">
                            ${getStatusText(order.status)}
                        </div>
                        ${window.currentUser?.isAdmin ? `
                            <div class="history-actions">
                                <button class="btn btn-danger btn-small" onclick="deleteHistoryItem('${order.id}')">
                                    Löschen
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="history-details">
                        <div class="history-info">
                            <span class="history-user">von ${order.userName || 'Unbekannt'}</span>
                            <span class="history-date">erstellt: ${order.createdAt ? order.createdAt.toLocaleDateString('de-DE') : 'Unbekannt'}</span>
                            ${order.purchasedAt ? `<span class="history-purchased">eingekauft: ${order.purchasedAt.toDate().toLocaleDateString('de-DE')}</span>` : ''}
                            ${order.deliveredAt ? `<span class="history-delivered">geliefert: ${order.deliveredAt.toDate().toLocaleDateString('de-DE')}</span>` : ''}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}