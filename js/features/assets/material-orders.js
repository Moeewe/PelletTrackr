/**
 * Material Order Management System
 * Handles material requests, shopping lists, and order tracking
 */

// Global order state
let materialOrders = [];
let currentOrderTab = 'requests';
let materialOrdersListener = null;

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
        
        // Return to orders overview instead of closing all modals
        showMaterialOrders();
        
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
    // Wait a moment for DOM elements to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get DOM elements with null checks (with retry logic)
    let attempts = 0;
    let materialNameEl, manufacturerEl, reasonEl, quantityEl, priorityEl;
    
    while (attempts < 5) {
        await new Promise(resolve => setTimeout(resolve, 200 * (attempts + 1))); // Exponential backoff
        
        materialNameEl = document.getElementById('requestMaterialName');
        manufacturerEl = document.getElementById('requestManufacturer');
        reasonEl = document.getElementById('requestReason');
        quantityEl = document.getElementById('requestQuantity');
        priorityEl = document.getElementById('requestPriority');
        
        if (materialNameEl && reasonEl) {
            console.log('✅ Form elements found on attempt:', attempts + 1);
            break;
        }
        
        attempts++;
        console.log(`⏳ Attempt ${attempts}: Elements not found yet, retrying...`);
    }
    
    // Check if elements exist after all attempts
    if (!materialNameEl || !reasonEl) {
        console.error('❌ Required form elements not found after 5 attempts');
        console.log('📋 Available elements:', {
            materialName: !!materialNameEl,
            manufacturer: !!manufacturerEl,
            reason: !!reasonEl,
            quantity: !!quantityEl,
            priority: !!priorityEl
        });
        
        // Show debug info about the current modal state
        const modal = document.getElementById('modal');
        console.log('🔍 Modal element:', !!modal);
        if (modal) {
            console.log('🔍 Modal content preview:', modal.innerHTML.substring(0, 200) + '...');
        }
        
        if (window.toast && typeof window.toast.error === 'function') {
            window.toast.error('Formular-Fehler: Erforderliche Felder nicht gefunden. Bitte versuchen Sie es erneut.');
        } else {
            alert('Formular-Fehler: Erforderliche Felder nicht gefunden. Bitte versuchen Sie es erneut.');
        }
        return;
    }
    
    const formData = {
        materialName: materialNameEl.value.trim(),
        manufacturer: manufacturerEl ? manufacturerEl.value.trim() : '',
        reason: reasonEl.value.trim(),
        quantity: quantityEl ? quantityEl.value.trim() : '',
        priority: priorityEl ? priorityEl.value : 'medium'
    };
    
    // Validation
    if (!formData.materialName || !formData.reason) {
        if (window.toast && typeof window.toast.error === 'function') {
            window.toast.error('Bitte füllen Sie mindestens Material und Begründung aus');
        } else {
            alert('Bitte füllen Sie mindestens Material und Begründung aus');
        }
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
        
        if (window.toast && typeof window.toast.success === 'function') {
            window.toast.success(`Material-Anfrage erfolgreich gesendet!\n\nMaterial: ${formData.materialName}${quantityText}${manufacturerText}\nPriorität: ${getPriorityText(formData.priority)}\n\nEin Admin wird deine Anfrage prüfen und das Material bestellen.`);
        } else {
            alert(`Material-Anfrage erfolgreich gesendet!\n\nMaterial: ${formData.materialName}${quantityText}${manufacturerText}\nPriorität: ${getPriorityText(formData.priority)}\n\nEin Admin wird deine Anfrage prüfen und das Material bestellen.`);
        }
        
        // Close modal and return to main dashboard
        closeModal();
        
        // Refresh admin view if material orders modal is open
        if (document.getElementById('materialOrdersModal') && document.getElementById('materialOrdersModal').style.display === 'block') {
            loadMaterialOrders();
        }
        
    } catch (error) {
        console.error('Error submitting material request:', error);
        if (window.toast && typeof window.toast.error === 'function') {
            window.toast.error('Fehler beim Senden der Anfrage');
        } else {
            alert('Fehler beim Senden der Anfrage');
        }
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
            <button class="btn btn-primary" onclick="showMaterialRequestForm()">Material-Wunsch hinzufügen</button>
            ${window.currentUser?.isAdmin ? `<button class="btn btn-secondary" onclick="showAdminOrderForm()">Admin-Bestellung anlegen</button>` : ''}
            <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
    
    // Setup real-time listener
    setupMaterialOrdersListener();
    
    // Load initial tab content after a short delay to ensure DOM is ready
    setTimeout(() => {
        showOrderTab('requests');
    }, 300);
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
            // Ensure currentOrderTab is set, default to 'requests'
            if (!currentOrderTab) {
                currentOrderTab = 'requests';
            }
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
                ${requests.map(request => {
                    const isUserRequest = request.source === 'user' || !request.source; // Legacy compatibility
                    const sourceLabel = isUserRequest ? 'Nutzerwunsch' : 'Admin-Bestellung';
                    const sourcePerson = isUserRequest ? request.userName || 'Unbekannt' : request.createdBy || 'Admin';
                    
                    return `
                    <div class="request-item">
                        <div class="request-header">
                            <h4>${request.materialName}</h4>
                            <div class="request-meta">
                                <span class="source-badge ${isUserRequest ? 'source-user' : 'source-admin'}">${sourceLabel}</span>
                                <span class="priority-badge priority-${request.priority}">${getPriorityText(request.priority)}</span>
                            </div>
                        </div>
                        <div class="request-details">
                            <p><strong>Von:</strong> ${sourcePerson}</p>
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
                `;
                }).join('')}
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
    // Only show non-pending requests to avoid duplication with renderOrderRequests
    const wishes = materialOrders.filter(order => 
        order.type === 'request' && order.status !== 'pending'
    ).sort((a, b) => {
        // Sort by priority: high -> medium -> low
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
    });
    const container = document.getElementById('materialWishesContent');
    
    if (!container) return;
    
    if (wishes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine verarbeiteten Material-Wünsche vorhanden.</p>
                <small>Genehmigte, abgelehnte oder gekaufte Material-Wünsche erscheinen hier.</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="material-wishes-header">
            <h4>Verarbeitete Material-Wünsche (${wishes.length})</h4>
        </div>
        <div class="material-wishes-list">
            ${wishes.map(wish => {
                const isUserRequest = wish.source === 'user' || !wish.source; // Legacy compatibility
                const sourceLabel = isUserRequest ? 'Nutzerwunsch' : 'Admin-Bestellung';
                const sourcePerson = isUserRequest ? wish.userName || 'Unbekannt' : wish.createdBy || 'Admin';
                
                return `
                <div class="request-item">
                    <div class="request-header">
                        <h4>${wish.materialName || 'Unbekanntes Material'}</h4>
                        <div class="request-meta">
                            <span class="source-badge ${isUserRequest ? 'source-user' : 'source-admin'}">${sourceLabel}</span>
                            <span class="status-badge status-${wish.status}">${getStatusText(wish.status)}</span>
                        </div>
                    </div>
                    <div class="request-details">
                        <p><strong>Von:</strong> ${sourcePerson}</p>
                        ${wish.manufacturer ? `<p><strong>Hersteller:</strong> ${wish.manufacturer}</p>` : ''}
                        ${wish.quantity ? `<p><strong>Menge:</strong> ${wish.quantity}</p>` : ''}
                        <p><strong>Begründung:</strong> ${wish.reason || 'Keine Begründung'}</p>
                        <p><strong>Angefragt:</strong> ${wish.createdAt ? (wish.createdAt.toDate ? new Date(wish.createdAt.toDate()).toLocaleDateString('de-DE') : new Date(wish.createdAt).toLocaleDateString('de-DE')) : 'Unbekannt'}</p>
                        <p><strong>Status:</strong> ${getStatusText(wish.status)}</p>
                    </div>
                    ${window.currentUser?.isAdmin && wish.status === 'approved' ? `
                        <div class="request-actions">
                            <button class="btn btn-success btn-small" onclick="markAsPurchased('${wish.id}')">
                                Als gekauft markieren
                            </button>
                            <button class="btn btn-warning btn-small" onclick="rejectOrderRequest('${wish.id}')">
                                Doch ablehnen
                            </button>
                        </div>
                    ` : ''}
                </div>
                `;
            }).join('')}
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
    
    if (!container) {
        console.warn('shoppingListContent element not found');
        return;
    }
    
    const shoppingItems = materialOrders.filter(order => order.status === 'approved');
    
    if (shoppingItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine Artikel zum Einkaufen vorhanden.</p>
            </div>
        `;
        return;
    }
    
    // Sort by priority: high -> medium -> low
    shoppingItems.sort((a, b) => {
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
    });
    
    container.innerHTML = shoppingItems.map(item => `
        <div class="shopping-list-item">
            <div class="shopping-priority priority-${item.priority}">
                ${getPriorityText(item.priority)}
            </div>
            <div class="shopping-item-content">
                <div class="shopping-item-header">
                    <h4 class="shopping-item-name">${item.materialName || 'Unbekanntes Material'}</h4>
                    <div class="shopping-item-source">${item.source === 'admin' ? 'Admin-Bestellung' : 'Nutzerwunsch'}</div>
                </div>
                <div class="shopping-item-details">
                    <div class="detail-row">
                        <span class="detail-label">Von:</span>
                        <span class="detail-value">${item.userName || item.createdBy || 'Unbekannt'}</span>
                    </div>
                    ${item.manufacturer ? `
                        <div class="detail-row">
                            <span class="detail-label">Hersteller:</span>
                            <span class="detail-value">${item.manufacturer}</span>
                        </div>
                    ` : ''}
                    ${item.quantity ? `
                        <div class="detail-row">
                            <span class="detail-label">Menge:</span>
                            <span class="detail-value">${item.quantity}</span>
                        </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">Begründung:</span>
                        <span class="detail-value">${item.reason || 'Keine Begründung'}</span>
                    </div>
                </div>
            </div>
            <div class="shopping-item-actions">
                <button class="btn btn-success" onclick="markAsPurchased('${item.id}')">Eingekauft</button>
                <button class="btn btn-danger" onclick="cancelOrder('${item.id}')">Stornieren</button>
            </div>
        </div>
    `).join('');
}

/**
 * Render order history with card layout and delete functionality for rejected items
 */
function renderOrderHistory() {
    const container = document.getElementById('orderHistoryContent');
    
    if (!container) {
        console.warn('orderHistoryContent element not found');
        return;
    }
    
    const orders = materialOrders.filter(order => 
        order.status === 'purchased' || 
        order.status === 'delivered' || 
        order.status === 'rejected'
    ).sort((a, b) => {
        const dateA = a.updatedAt || a.createdAt || new Date(0);
        const dateB = b.updatedAt || b.createdAt || new Date(0);
        const convertedDateA = dateA.toDate ? dateA.toDate() : new Date(dateA);
        const convertedDateB = dateB.toDate ? dateB.toDate() : new Date(dateB);
        return convertedDateB - convertedDateA; // Newest first
    });
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine Bestellungen im Verlauf vorhanden.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="history-cards">
            ${orders.map(order => {
                const statusClass = `status-${order.status}`;
                const statusText = getStatusText(order.status);
                const sourcePerson = order.userName || order.createdBy || 'Unbekannt';
                const sourceType = order.source === 'admin' ? 'Admin-Bestellung' : 'Nutzerwunsch';
                const processDate = order.updatedAt || order.createdAt;
                const processDateStr = processDate ? (processDate.toDate ? new Date(processDate.toDate()).toLocaleDateString('de-DE') : new Date(processDate).toLocaleDateString('de-DE')) : 'Unbekannt';
                
                return `
                    <div class="history-card ${statusClass}">
                        <div class="history-card-header">
                            <div class="history-card-title">
                                <h4 class="material-name">${order.materialName || 'Unbekanntes Material'}</h4>
                                <div class="source-type">${sourceType}</div>
                            </div>
                            <div class="history-card-status">
                                <span class="status-badge ${statusClass}">${statusText}</span>
                            </div>
                        </div>
                        
                        <div class="history-card-body">
                            <div class="detail-row">
                                <span class="detail-label">Von:</span>
                                <span class="detail-value">${sourcePerson}</span>
                            </div>
                            ${order.manufacturer ? `
                                <div class="detail-row">
                                    <span class="detail-label">Hersteller:</span>
                                    <span class="detail-value">${order.manufacturer}</span>
                                </div>
                            ` : ''}
                            ${order.quantity ? `
                                <div class="detail-row">
                                    <span class="detail-label">Menge:</span>
                                    <span class="detail-value">${order.quantity}</span>
                                </div>
                            ` : ''}
                            <div class="detail-row">
                                <span class="detail-label">Dringlichkeit:</span>
                                <span class="detail-value">${getPriorityText(order.priority)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Datum:</span>
                                <span class="detail-value">${processDateStr}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Begründung:</span>
                                <span class="detail-value">${order.reason || 'Keine Begründung'}</span>
                            </div>
                            ${order.rejectedBy ? `
                                <div class="detail-row">
                                    <span class="detail-label">Abgelehnt von:</span>
                                    <span class="detail-value">${order.rejectedBy}</span>
                                </div>
                            ` : ''}
                            ${order.approvedBy ? `
                                <div class="detail-row">
                                    <span class="detail-label">Genehmigt von:</span>
                                    <span class="detail-value">${order.approvedBy}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        ${order.status === 'rejected' ? `
                            <div class="history-card-actions">
                                <button class="btn btn-danger btn-small" onclick="deleteOrderRequest('${order.id}')">
                                    Löschen
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Delete single history item
 */
async function deleteHistoryItem(orderId) {
    if (!window.currentUser?.isAdmin) {
        toast.error('Keine Berechtigung zum Löschen');
        return;
    }
    
    const confirmed = await toast.confirm(
        'Möchten Sie diesen Eintrag wirklich aus dem Verlauf löschen?',
        'Eintrag löschen',
        'Abbrechen'
    );
    
    if (!confirmed) return;
    
    try {
        await window.db.collection('materialOrders').doc(orderId).delete();
        toast.success('Eintrag aus dem Verlauf gelöscht');
        
    } catch (error) {
        console.error('Error deleting history item:', error);
        toast.error('Fehler beim Löschen des Eintrags');
    }
}

/**
 * Clear all history items
 */
async function clearAllHistory() {
    if (!window.currentUser?.isAdmin) {
        toast.error('Keine Berechtigung zum Löschen');
        return;
    }
    
    const confirmed = await toast.confirm(
        'Möchten Sie wirklich den gesamten Bestellverlauf löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.',
        'Verlauf leeren',
        'Abbrechen'
    );
    
    if (!confirmed) return;
    
    try {
        const historyItems = materialOrders.filter(order => 
            order.status === 'purchased' || order.status === 'delivered' || order.status === 'rejected'
        );
        
        if (historyItems.length === 0) {
            toast.info('Kein Verlauf zum Löschen vorhanden');
            return;
        }
        
        const batch = window.db.batch();
        historyItems.forEach(item => {
            batch.delete(window.db.collection('materialOrders').doc(item.id));
        });
        
        await batch.commit();
        toast.success(`${historyItems.length} Einträge aus dem Verlauf gelöscht`);
        
    } catch (error) {
        console.error('Error clearing history:', error);
        toast.error('Fehler beim Leeren des Verlaufs');
    }
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
        
        toast.success('Anfrage genehmigt und zur Einkaufsliste hinzugefügt');
        // Real-time listener will handle the update automatically
        
    } catch (error) {
        console.error('Error approving request:', error);
        toast.error('Fehler beim Genehmigen');
        
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
        
        toast.success('Anfrage abgelehnt');
        // Real-time listener will handle the update automatically
        
    } catch (error) {
        console.error('Error rejecting request:', error);
        toast.error('Fehler beim Ablehnen');
        
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
        toast.success('Bestellung erfolgreich gelöscht');
        // Real-time listener will handle the update automatically
        
    } catch (error) {
        console.error('Error deleting request:', error);
        toast.error('Fehler beim Löschen');
        
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
        
        toast.success('Artikel als eingekauft markiert');
        // Real-time listener will automatically update the UI
        
    } catch (error) {
        console.error('Error marking as purchased:', error);
        toast.error('Fehler beim Markieren');
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
        
        toast.success('Bestellung storniert');
        // Real-time listener will automatically update the UI
        
    } catch (error) {
        console.error('Error cancelling order:', error);
        toast.error('Fehler beim Stornieren');
    }
}

// Export functions to global scope
window.showMaterialOrders = showMaterialOrders;
window.closeMaterialOrders = closeMaterialOrders;