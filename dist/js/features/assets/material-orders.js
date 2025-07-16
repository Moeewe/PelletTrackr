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
 * Show material orders modal with redesigned structure
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
                        </button>

                        <button class="tab-btn" onclick="showOrderTab('shopping')">
                            Einkaufsliste
                        </button>
                        <button class="tab-btn" onclick="showOrderTab('history')">
                            Verlauf
                        </button>
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
    const requestsCount = materialOrders.filter(order => order.status === 'pending').length;
    const shoppingCount = materialOrders.filter(order => order.status === 'approved').length;
    const historyCount = materialOrders.filter(order => 
        order.status === 'purchased' || 
        order.status === 'delivered' || 
        order.status === 'rejected'
    ).length;
    
    console.log(`📊 Tab Counters - Requests: ${requestsCount}, Shopping: ${shoppingCount}, History: ${historyCount}`);
    
    // Counter badges wurden entfernt für ein sauberes UI
}

/**
 * Render order requests - unified tab for both admin and user requests
 */
function renderOrderRequests() {
    const requests = materialOrders.filter(order => order.status === 'pending');
    const container = document.getElementById('orderRequestsContent');
    
    if (!container) return;
    
    if (requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine offenen Bestellanfragen vorhanden.</p>
                <p>Nutzer können über den "Material-Wunsch hinzufügen" Button neue Anfragen erstellen.</p>
            </div>
        `;
        return;
    }
    
    // Sort by priority and date
    requests.sort((a, b) => {
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        const priorityDiff = (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
        if (priorityDiff !== 0) return priorityDiff;
        
        const dateA = a.createdAt || new Date(0);
        const dateB = b.createdAt || new Date(0);
        return dateB - dateA; // Newest first
    });
    
    container.innerHTML = `
        <div class="order-cards">
            ${requests.map(request => createOrderCard(request, 'request')).join('')}
        </div>
    `;
}

/**
 * Render shopping list with card design
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
                <p>Genehmigte Bestellanfragen erscheinen hier zum Einkauf.</p>
            </div>
        `;
        return;
    }
    
    // Sort by priority: high -> medium -> low
    shoppingItems.sort((a, b) => {
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
    });
    
    container.innerHTML = `
        <div class="order-cards">
            ${shoppingItems.map(item => createOrderCard(item, 'shopping')).join('')}
        </div>
    `;
}

/**
 * Render order history with card design
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
                <p>Abgeschlossene und abgelehnte Bestellungen erscheinen hier.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="order-cards">
            ${orders.map(order => createOrderCard(order, 'history')).join('')}
        </div>
    `;
}

/**
 * Create unified order card based on screenshot design
 */
function createOrderCard(order, context) {
    const isUserRequest = order.source === 'user' || !order.source;
    const sourceLabel = isUserRequest ? 'NUTZERWUNSCH' : 'ADMIN-BESTELLUNG';
    const sourceBadgeClass = isUserRequest ? 'badge-user' : 'badge-admin';
    const sourcePerson = order.userName || order.createdBy || 'Unbekannt';
    const statusText = getStatusText(order.status).toUpperCase();
    const statusClass = `badge-${order.status}`;
    
    const createdDate = order.createdAt ? 
        (order.createdAt.toLocaleDateString ? order.createdAt.toLocaleDateString('de-DE') : 
         new Date(order.createdAt).toLocaleDateString('de-DE')) : 'Unbekannt';
    
    const processDate = order.updatedAt || order.createdAt;
    const processDateStr = processDate ? 
        (processDate.toDate ? new Date(processDate.toDate()).toLocaleDateString('de-DE') : 
         new Date(processDate).toLocaleDateString('de-DE')) : 'Unbekannt';
    
    let actionButtons = '';
    
    if (context === 'request') {
        actionButtons = `
            <button class="btn btn-success" onclick="approveOrderRequest('${order.id}')">
                Genehmigen
            </button>
            <button class="btn btn-warning" onclick="rejectOrderRequest('${order.id}')">
                Ablehnen
            </button>
        `;
    } else if (context === 'shopping') {
        actionButtons = `
            <button class="btn btn-success" onclick="markAsPurchased('${order.id}')">
                Als gekauft markieren
            </button>
            <button class="btn btn-warning" onclick="rejectOrderRequest('${order.id}')">
                Doch ablehnen
            </button>
        `;
    } else if (context === 'history') {
        actionButtons = `
            <button class="btn btn-danger btn-small" onclick="deleteOrderRequest('${order.id}')">
                Löschen
            </button>
        `;
    }
    
    return `
        <div class="order-card">
            <div class="order-card-header">
                <h4 class="order-title">${order.materialName || 'Unbekanntes Material'}</h4>
                <div class="order-badges">
                    <span class="order-badge ${sourceBadgeClass}">${sourceLabel}</span>
                    <span class="order-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
            <div class="order-card-body">
                <div class="order-detail">
                    <strong>Von:</strong> ${sourcePerson}
                </div>
                ${order.manufacturer ? `
                    <div class="order-detail">
                        <strong>Hersteller:</strong> ${order.manufacturer}
                    </div>
                ` : ''}
                ${order.quantity ? `
                    <div class="order-detail">
                        <strong>Menge:</strong> ${order.quantity}
                    </div>
                ` : ''}
                <div class="order-detail">
                    <strong>Begründung:</strong> ${order.reason || 'Keine Begründung'}
                </div>
                <div class="order-detail">
                    <strong>Angefragt:</strong> ${createdDate}
                </div>
                <div class="order-detail">
                    <strong>Status:</strong> ${getStatusText(order.status)}
                </div>
                ${order.priority ? `
                    <div class="order-detail">
                        <strong>Priorität:</strong> 
                        <span class="priority-indicator priority-${order.priority}">${getPriorityText(order.priority)}</span>
                    </div>
                ` : ''}
            </div>
            ${actionButtons ? `
                <div class="order-card-actions">
                    ${actionButtons}
                </div>
            ` : ''}
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
        'pending': 'Offen',
        'approved': 'Genehmigt',
        'rejected': 'Abgelehnt',
        'ordered': 'Bestellt',
        'delivered': 'Geliefert',
        'purchased': 'Eingekauft',
        'cancelled': 'Storniert'
    };
    return statusMap[status] || status;
}

/**
 * Render user wishes from materialRequests collection
 */

// Export functions to global scope
window.showMaterialOrders = showMaterialOrders;
window.closeMaterialOrders = closeMaterialOrders;
window.showMaterialRequestForm = showMaterialRequestForm;
window.closeMaterialRequestForm = closeMaterialRequestForm;
window.submitMaterialRequest = submitMaterialRequest;