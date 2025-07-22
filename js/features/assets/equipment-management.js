/**
 * Equipment Management System
 * Handles lending system for keys, hardware, and books
 * Version 1.9 - Optimized to store only FH-Kennung, fetch user details on demand
 */

// Equipment Management Module - Extended with Requests Support
let equipment = [];
let equipmentListener = null;
let equipmentRequestsListener = null;
let currentEquipmentCategory = 'hardware';
let filteredEquipment = [];
let equipmentRequests = []; // Store requests from requests collection
let allUsers = []; // Cache for user data

// Fixed categories - no more dynamic categories
const EQUIPMENT_CATEGORIES = {
    'keys': 'Schlüssel',
    'hardware': 'Hardware', 
    'books': 'Bücher'
};

// Safe showToast function with fallback
function safeShowToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else if (window.toast && typeof window.toast[type] === 'function') {
        window.toast[type](message);
    } else {
        console.log(`Toast (${type}): ${message}`);
    }
}

/**
 * Setup real-time listener for equipment
 */
function setupEquipmentListener() {
    // Clean up existing listener
    if (equipmentListener) {
        equipmentListener();
        equipmentListener = null;
    }
    
    try {
        equipmentListener = window.db.collection('equipment').onSnapshot((snapshot) => {
            equipment = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                equipment.push({
                    id: doc.id,
                    ...data
                });
            });
            
            console.log('Live update: Loaded equipment:', equipment.length);
            console.log('📋 Equipment data sample:', equipment.slice(0, 3).map(item => ({
                id: item.id,
                name: item.name,
                status: item.status,
                borrowedBy: item.borrowedBy,
                requestsCount: (item.requests || []).length
            })));
            
            // Load equipment requests and users after equipment is loaded
            loadEquipmentRequests();
            loadAllUsersForEquipment();
            
            showEquipmentCategory(currentEquipmentCategory);
            
            // Update machine overview in admin dashboard
            updateMachineOverview();
            
            // Also update when admin dashboard is shown
            setTimeout(() => {
                if (typeof updateMachineOverview === 'function') {
                    console.log('🔄 Manual updateMachineOverview call after equipment load');
                    updateMachineOverview();
                }
            }, 1000);
        }, (error) => {
            console.error('Error in equipment listener:', error);
            safeShowToast('Fehler beim Live-Update des Equipments', 'error');
        });
        
        console.log("✅ Equipment listener registered");
    } catch (error) {
        console.error("❌ Failed to setup equipment listener:", error);
        // Fallback to manual loading
        loadEquipment();
    }
}

/**
 * Setup real-time listener for equipment requests
 */
function setupEquipmentRequestsListener() {
    // Clean up existing listener
    if (equipmentRequestsListener) {
        equipmentRequestsListener();
        equipmentRequestsListener = null;
    }
    
    try {
        // Listen to both equipment and return requests
        equipmentRequestsListener = window.db.collection('requests')
            .where('type', 'in', ['equipment', 'return'])
            .onSnapshot((snapshot) => {
                equipmentRequests = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    equipmentRequests.push({
                        id: doc.id,
                        ...data,
                        requestedAt: data.createdAt?.toDate() || data.requestedAt?.toDate(),
                        fromDate: data.fromDate?.toDate(),
                        toDate: data.toDate?.toDate()
                    });
                });
                
                console.log('📋 Live update: Loaded equipment requests:', equipmentRequests.length);
                console.log('📋 Equipment requests details:', equipmentRequests.map(req => ({
                    id: req.id,
                    type: req.type,
                    status: req.status,
                    equipmentId: req.equipmentId,
                    userKennung: req.userKennung,
                    requestedBy: req.requestedBy
                })));
                
                // Update equipment list to show requests
                showEquipmentCategory(currentEquipmentCategory);
                
                // Update notification badge
                updateEquipmentRequestsBadge();
                
            }, (error) => {
                console.error('Error in equipment requests listener:', error);
                safeShowToast('Fehler beim Live-Update der Equipment-Anfragen', 'error');
            });
        
        console.log("✅ Equipment requests listener registered");
    } catch (error) {
        console.error("❌ Failed to setup equipment requests listener:", error);
        // Fallback to manual loading
        loadEquipmentRequests();
    }
}

/**
 * Load equipment requests from requests collection (fallback)
 */
async function loadEquipmentRequests() {
    try {
        // Load both equipment requests and return requests
        const equipmentQuerySnapshot = await window.db.collection('requests')
            .where('type', '==', 'equipment')
            .get();
        
        const returnQuerySnapshot = await window.db.collection('requests')
            .where('type', '==', 'return')
            .get();
        
        equipmentRequests = [];
        
        // Add equipment requests
        equipmentQuerySnapshot.forEach((doc) => {
            const data = doc.data();
            equipmentRequests.push({
                id: doc.id,
                ...data,
                requestedAt: data.createdAt?.toDate() || data.requestedAt?.toDate(),
                fromDate: data.fromDate?.toDate(),
                toDate: data.toDate?.toDate()
            });
        });
        
        // Add return requests
        returnQuerySnapshot.forEach((doc) => {
            const data = doc.data();
            equipmentRequests.push({
                id: doc.id,
                ...data,
                requestedAt: data.createdAt?.toDate() || data.requestedAt?.toDate()
            });
        });
        
        console.log('📋 Loaded equipment requests:', equipmentRequests.length);
        console.log('📋 Equipment requests sample:', equipmentRequests.slice(0, 3).map(req => ({
            id: req.id,
            equipmentId: req.equipmentId,
            status: req.status,
            type: req.type,
            userKennung: req.userKennung,
            requestedBy: req.requestedBy
        })));
        
        // Update equipment list to show requests
        showEquipmentCategory(currentEquipmentCategory);
        
    } catch (error) {
        console.error('Error loading equipment requests:', error);
        equipmentRequests = [];
    }
}

/**
 * Show equipment manager modal
 */
async function showEquipmentManager() {
    const modalContent = `
        <div class="modal-header">
            <h3>Equipment verwalten
                <span id="equipment-requests-badge" class="notification-badge" style="display: none;">0</span>
            </h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="card">
                <div class="card-body">
                    <div class="equipment-controls">
                        <div class="control-row">
                            <div class="search-container">
                                <input type="text" id="equipmentSearchInput" placeholder="Equipment durchsuchen..." class="search-input" onkeyup="searchEquipment()">
                                <button class="search-clear" onclick="clearEquipmentSearch()">×</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="category-tabs">
                        <button class="tab-btn" onclick="showEquipmentCategory('keys')">Schlüssel</button>
                        <button class="tab-btn active" onclick="showEquipmentCategory('hardware')">Hardware</button>
                        <button class="tab-btn" onclick="showEquipmentCategory('books')">Bücher</button>
                    </div>
                    
                    <div id="equipmentList" class="equipment-container">
                        <div class="loading">Equipment wird geladen...</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-primary" onclick="showAddEquipmentForm()">Equipment hinzufügen</button>
            <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
    
    setupEquipmentListener();
    setupEquipmentRequestsListener();
    
    // Show hardware category by default after requests are loaded
    setTimeout(() => {
        showEquipmentCategory('hardware');
    }, 100);
}

/**
 * Close equipment manager modal
 */
function closeEquipmentManager() {
    // Clean up listeners
    if (equipmentListener) {
        equipmentListener();
        equipmentListener = null;
    }
    if (equipmentRequestsListener) {
        equipmentRequestsListener();
        equipmentRequestsListener = null;
    }
    closeModal();
}

/**
 * Load equipment from Firebase
 */
async function loadEquipment() {
    try {
        const querySnapshot = await window.db.collection('equipment').get();
        equipment = [];
        
        querySnapshot.forEach((doc) => {
            equipment.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        filteredEquipment = equipment;
        console.log('📋 Loaded equipment:', equipment.length);
        console.log('📋 Equipment data sample:', equipment.slice(0, 3).map(item => ({
            id: item.id,
            name: item.name,
            status: item.status,
            category: item.category,
            borrowedBy: item.borrowedBy
        })));
        
        // Debug: Show all unique categories in the data
        const uniqueCategories = [...new Set(equipment.map(item => item.category))];
        console.log('🔍 Available categories in data:', uniqueCategories);
        console.log('🔍 Equipment by category:', uniqueCategories.map(cat => ({
            category: cat,
            count: equipment.filter(item => item.category === cat).length,
            items: equipment.filter(item => item.category === cat).map(item => item.name)
        })));
        showEquipmentCategory(currentEquipmentCategory);
        
    } catch (error) {
        console.error('Error loading equipment:', error);
        safeShowToast('Fehler beim Laden der Ausrüstung', 'error');
    }
}

/**
 * Search equipment based on name, description, or category
 */
function searchEquipment() {
    // Trigger category display which will handle search filtering
    showEquipmentCategory(currentEquipmentCategory);
}

/**
 * Clear equipment search
 */
function clearEquipmentSearch() {
    document.getElementById('equipmentSearchInput').value = '';
    showEquipmentCategory(currentEquipmentCategory);
}

/**
 * Show equipment category
 */
function showEquipmentCategory(category) {
    currentEquipmentCategory = category;
    
    // Update tab buttons - use correct selector for equipment tabs
    const tabButtons = document.querySelectorAll('.category-tabs .tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Set the correct tab as active based on category
    const categoryTab = document.querySelector(`.category-tabs .tab-btn[onclick*="${category}"]`);
    if (categoryTab) {
        categoryTab.classList.add('active');
    }
    
    // Filter equipment by category from all equipment (not just search results)
    const categoryEquipment = equipment.filter(item => item.category === category);
    
    console.log(`🔍 Category filter: looking for category '${category}'`);
    console.log(`🔍 All equipment categories:`, equipment.map(item => item.category));
    console.log(`🔍 Found ${categoryEquipment.length} items for category '${category}':`, categoryEquipment.map(item => item.name));
    
    // Apply search filter if there's a search term
    const searchInput = document.getElementById('equipmentSearchInput');
    if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredCategoryEquipment = categoryEquipment.filter(item => {
            return (
                (item.name && item.name.toLowerCase().includes(searchTerm)) ||
                (item.description && item.description.toLowerCase().includes(searchTerm)) ||
                (item.location && item.location.toLowerCase().includes(searchTerm))
            );
        });
        renderEquipmentList(filteredCategoryEquipment);
    } else {
        renderEquipmentList(categoryEquipment);
    }
    
    console.log(`🔍 Switched to category: ${category}, showing ${categoryEquipment.length} items`);
}



/**
 * Render equipment list
 */
function renderEquipmentList(equipmentList) {
    const container = document.getElementById('equipmentList');
    
    // Add null check for container
    if (!container) {
        console.warn('Equipment list container not found');
        return;
    }
    
    if (equipmentList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine Ausrüstung in dieser Kategorie.</p>
                <button class="btn btn-primary" onclick="showAddEquipmentForm()">
                    Equipment hinzufügen
                </button>
            </div>
        `;
        return;
    }
    
    console.log('🔍 Rendering equipment list with', equipmentList.length, 'items');
    console.log('📋 Equipment list data:', equipmentList.map(item => ({
        id: item.id,
        name: item.name,
        status: item.status,
        borrowedBy: item.borrowedBy,
        borrowedByKennung: item.borrowedByKennung,
        category: item.category,
        requestsCount: (item.requests || []).length
    })));
    
    container.innerHTML = equipmentList.map(item => {
        // Get requests from equipmentRequests array (from requests collection)
        const requests = equipmentRequests.filter(req => req.equipmentId === item.id);
        const pendingRequest = requests.find(req => req.status === 'pending' && req.type === 'equipment');
        const pendingReturnRequest = requests.find(req => req.status === 'pending' && req.type === 'return');
        
        // Enhanced return request detection
        const returnRequests = requests.filter(req => req.type === 'return');
        const anyPendingReturn = returnRequests.some(req => req.status === 'pending');
        
        console.log(`🔍 Return request analysis for ${item.name}:`, {
            totalRequests: requests.length,
            returnRequests: returnRequests.length,
            returnRequestsDetails: returnRequests.map(r => ({ id: r.id, status: r.status, type: r.type })),
            anyPendingReturn: anyPendingReturn,
            pendingReturnRequest: pendingReturnRequest ? pendingReturnRequest.id : null
        });
        
        // Enhanced debugging for return requests
        console.log(`🔍 Equipment ${item.id} (${item.name}):`, {
            status: item.status,
            borrowedBy: item.borrowedBy,
            borrowedByKennung: item.borrowedByKennung,
            requestsCount: requests.length,
            requests: requests.map(r => ({ 
                id: r.id, 
                type: r.type, 
                status: r.status, 
                requestedBy: r.requestedBy,
                requestedByName: r.requestedByName,
                userKennung: r.userKennung,
                requestedByKennung: r.requestedByKennung
            })),
            pendingRequest: pendingRequest ? pendingRequest.id : null,
            pendingReturnRequest: pendingReturnRequest ? pendingReturnRequest.id : null,
            shouldShowReturnButton: item.status === 'borrowed' && pendingReturnRequest ? 'YES' : 'NO'
        });
        
        // Debug: Check if this equipment should show return button
        const shouldShowReturnButton = (item.status === 'borrowed' || item.borrowedBy) && (pendingReturnRequest || anyPendingReturn);
        console.log(`🔍 Should show return button for ${item.name}: ${shouldShowReturnButton ? 'YES' : 'NO'}`);
        if (shouldShowReturnButton) {
            console.log(`🔍 Return request details:`, pendingReturnRequest || returnRequests.find(r => r.status === 'pending'));
        }
        
        // Additional debug: Log all requests for borrowed items
        if (item.status === 'borrowed' || item.borrowedBy) {
            console.log(`🔍 All requests for borrowed item ${item.name}:`, requests);
            console.log(`🔍 Equipment status: ${item.status}, borrowedBy: ${item.borrowedBy}, borrowedByKennung: ${item.borrowedByKennung}`);
        }
        
        return `
        <div class="equipment-item ${item.requiresDeposit ? 'requires-deposit' : ''} ${pendingRequest ? 'has-pending-request' : ''}">
            <div class="equipment-header">
                <div class="equipment-name">${item.name}</div>
                <div class="equipment-status-row">
                    <span class="equipment-status ${pendingRequest ? 'requested' : (pendingReturnRequest || anyPendingReturn) ? 'return-requested' : (item.borrowedBy ? 'borrowed' : item.status)}">
                        ${pendingRequest ? 'Angefragt' : (pendingReturnRequest || anyPendingReturn) ? 'Rückgabe angefragt' : (item.borrowedBy ? 'Ausgeliehen' : getEquipmentStatusText(item.status))}
                    </span>
                    ${item.requiresDeposit ? `
                        <span class="equipment-deposit ${item.depositPaid ? 'paid' : 'unpaid'}" title="Pfand ${item.depositPaid ? 'bezahlt' : 'ausstehend'}">
                            ${item.depositAmount}€ ${item.depositPaid ? 'Bezahlt' : 'Ausstehend'}
                        </span>
                    ` : ''}
                </div>
            </div>
            <div class="equipment-info">${item.description || 'Keine Beschreibung'}</div>
            
            ${pendingRequest ? `
                <div class="equipment-request-info">
                    <strong>Ausleihe angefragt von:</strong> ${pendingRequest.userName || pendingRequest.userKennung || pendingRequest.requestedByName || 'Unbekannter User'} (${pendingRequest.userKennung || pendingRequest.requestedBy || 'Unbekannt'})
                    <br><strong>Zeitraum:</strong> ${pendingRequest.fromDate ? new Date(pendingRequest.fromDate.seconds * 1000).toLocaleDateString() : 'Unbekannt'} - ${pendingRequest.toDate ? new Date(pendingRequest.toDate.seconds * 1000).toLocaleDateString() : 'Unbekannt'}
                    <br><strong>Grund:</strong> ${pendingRequest.reason || pendingRequest.purpose || 'Kein Grund angegeben'}
                </div>
            ` : (pendingReturnRequest || anyPendingReturn) ? `
                <div class="equipment-request-info">
                    <strong>Rückgabe angefragt von:</strong> ${(pendingReturnRequest || returnRequests.find(r => r.status === 'pending')).requestedByName || (pendingReturnRequest || returnRequests.find(r => r.status === 'pending')).requestedBy || (pendingReturnRequest || returnRequests.find(r => r.status === 'pending')).userName || 'Unbekannter User'} (${(pendingReturnRequest || returnRequests.find(r => r.status === 'pending')).requestedBy || (pendingReturnRequest || returnRequests.find(r => r.status === 'pending')).userKennung || 'Unbekannt'})
                    <br><strong>Angefragt am:</strong> ${(pendingReturnRequest || returnRequests.find(r => r.status === 'pending')).createdAt ? new Date((pendingReturnRequest || returnRequests.find(r => r.status === 'pending')).createdAt.seconds * 1000).toLocaleDateString() : 'Unbekannt'}
                </div>
            ` : (item.status === 'borrowed' || item.borrowedBy) && item.borrowedByKennung ? `
                <div class="equipment-current-user">
                    Ausgeliehen an: <strong>${item.borrowedBy || item.borrowedByKennung}</strong> (${item.borrowedByKennung || item.borrowedBy})<br>
                    Seit: ${item.borrowedAt ? new Date(item.borrowedAt.toDate()).toLocaleDateString() : 'Unbekannt'}
                    ${item.requiresDeposit ? `
                        <div class="equipment-deposit-status">
                            Pfand: <span class="${item.depositPaid ? 'deposit-paid' : 'deposit-unpaid'}">
                                ${item.depositPaid ? 'Bezahlt' : 'Ausstehend'}
                            </span>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <div class="equipment-actions">
                ${(() => {
                    console.log(`🔍 Action buttons debug for ${item.name}:`, {
                        status: item.status,
                        borrowedBy: item.borrowedBy,
                        pendingRequest: pendingRequest ? pendingRequest.id : null,
                        pendingReturnRequest: pendingReturnRequest ? pendingReturnRequest.id : null,
                        anyPendingReturn: anyPendingReturn
                    });
                    
                    if (pendingRequest) {
                        console.log('🔍 Showing pending request buttons');
                        const userName = pendingRequest.userName || pendingRequest.userKennung || pendingRequest.requestedByName || 'Unbekannter User';
                        return `
                            <button class="btn btn-success" onclick="approveEquipmentRequest('${pendingRequest.id}', '${item.id}')">Anfrage von ${userName} genehmigen</button>
                            <button class="btn btn-danger" onclick="rejectEquipmentRequest('${pendingRequest.id}', '${item.id}')">Anfrage von ${userName} ablehnen</button>
                            <button class="btn btn-secondary" onclick="editEquipment('${item.id}')">Bearbeiten</button>
                            <button class="btn btn-tertiary" onclick="duplicateEquipment('${item.id}')">Dublizieren</button>
                        `;
                    } else if (item.status === 'available' || (!item.borrowedBy && !item.borrowedByKennung && item.status !== 'borrowed' && item.status !== 'rented')) {
                        console.log('🔍 Showing available equipment buttons');
                        return `
                            <button class="btn btn-primary" onclick="borrowEquipment('${item.id}')">Ausleihen</button>
                            <button class="btn btn-secondary" onclick="editEquipment('${item.id}')">Bearbeiten</button>
                            <button class="btn btn-tertiary" onclick="duplicateEquipment('${item.id}')">Dublizieren</button>
                        `;
                    } else if (item.status === 'borrowed' || item.status === 'rented' || item.borrowedBy || item.borrowedByKennung) {
                        console.log('🔍 Showing borrowed equipment buttons');
                        if (pendingReturnRequest || anyPendingReturn) {
                            const returnRequest = pendingReturnRequest || returnRequests.find(r => r.status === 'pending');
                            const userName = returnRequest ? (returnRequest.requestedByName || returnRequest.requestedBy || returnRequest.userName || returnRequest.userKennung || 'Unbekannter User') : 'Unbekannter User';
                            return `
                                <button class="btn btn-success" onclick="confirmEquipmentReturn('${item.id}')">Rückgabe von ${userName} bestätigen</button>
                                <button class="btn btn-secondary" onclick="editEquipment('${item.id}')">Bearbeiten</button>
                                <button class="btn btn-tertiary" onclick="duplicateEquipment('${item.id}')">Dublizieren</button>
                            `;
                        } else {
                            return `
                                <button class="btn btn-success" onclick="returnEquipment('${item.id}')">Zurückgeben</button>
                                <button class="btn btn-secondary" onclick="editEquipment('${item.id}')">Bearbeiten</button>
                                <button class="btn btn-tertiary" onclick="duplicateEquipment('${item.id}')">Dublizieren</button>
                                ${item.requiresDeposit && !item.depositPaid ? `
                                    <button class="btn btn-warning" onclick="markDepositAsPaid('${item.id}')">Pfand als bezahlt markieren</button>
                                ` : ''}
                            `;
                        }
                    } else {
                        console.log('🔍 Showing default buttons');
                        return `
                            <button class="btn btn-secondary" onclick="editEquipment('${item.id}')">Bearbeiten</button>
                            <button class="btn btn-tertiary" onclick="duplicateEquipment('${item.id}')">Dublizieren</button>
                        `;
                    }
                })()}
            </div>
        </div>
        `;
    }).join('');
}

/**
 * Get localized equipment status text
 */
function getEquipmentStatusText(status) {
    const statusMap = {
        'available': 'Verfügbar',
        'borrowed': 'Ausgeliehen',
        'maintenance': 'Wartung',
        'rented': 'Ausgeliehen',
        'pending': 'Offen',
        'approved': 'Genehmigt',
        'given': 'Ausgegeben',
        'active': 'Aktiv',
        'return_requested': 'Rückgabe angefragt',
        'returned': 'Zurückgegeben',
        'rejected': 'Abgelehnt'
    };
    return statusMap[status] || status;
}

/**
 * Show add equipment form
 */
function showAddEquipmentForm() {
    const modalContent = `
        <div class="modal-header">
            <h3>Equipment hinzufügen</h3>
            <button class="close-btn" onclick="closeAddEquipmentForm()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="card">
                <div class="card-body">
                    <form id="addEquipmentForm" class="form">
                        <div class="form-group">
                            <label class="form-label">Name</label>
                            <input type="text" name="name" class="form-input" placeholder="z.B. Schlüssel Labor 1, Zangensatz, etc." required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Kategorie</label>
                            <select name="category" class="form-select" required>
                                ${Object.entries(EQUIPMENT_CATEGORIES).map(([key, name]) => `
                                    <option value="${key}" ${key === currentEquipmentCategory ? 'selected' : ''}>${name}</option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Standort</label>
                            <input type="text" name="location" class="form-input" placeholder="z.B. Labor 1, Werkstatt, Büro..." required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Beschreibung</label>
                            <textarea name="description" class="form-textarea" placeholder="Beschreibung des Equipment..." rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Pfand-System</label>
                            <div class="form-checkbox-group">
                                <label class="form-checkbox">
                                    <input type="checkbox" name="requiresDeposit" class="form-checkbox-input" onchange="toggleDepositAmount()">
                                    <span class="form-checkbox-label">Pfand erforderlich</span>
                                </label>
                                <input type="number" name="depositAmount" id="depositAmountInput" class="form-input" placeholder="Pfand-Betrag €" step="0.01" style="display: none;">
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeAddEquipmentForm()">Abbrechen</button>
            <button type="button" class="btn btn-primary" onclick="saveEquipment()">Equipment hinzufügen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
}

/**
 * Toggle deposit amount field visibility
 */
function toggleDepositAmount() {
    const depositAmount = document.getElementById('depositAmountInput');
    const checkbox = document.querySelector('input[name="requiresDeposit"]');
    
    if (checkbox && depositAmount) {
        if (checkbox.checked) {
            depositAmount.style.display = 'block';
            depositAmount.required = true;
        } else {
            depositAmount.style.display = 'none';
            depositAmount.required = false;
            depositAmount.value = '';
        }
    }
}

/**
 * Close add equipment form
 */
function closeAddEquipmentForm() {
    // Return to equipment overview instead of closing modal
    showEquipmentManager();
}

/**
 * Save equipment
 */
async function saveEquipment() {
    const form = document.getElementById('addEquipmentForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const equipmentData = {
        name: formData.get('name').trim(),
        category: formData.get('category'),
        location: formData.get('location').trim(),
        description: formData.get('description').trim(),
        requiresDeposit: formData.get('requiresDeposit') === 'on',
        status: 'available',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (equipmentData.requiresDeposit) {
        const depositAmount = parseFloat(formData.get('depositAmount'));
        if (isNaN(depositAmount) || depositAmount <= 0) {
            safeShowToast('Pfandbetrag muss eine positive Zahl sein', 'error');
            return;
        }
        equipmentData.depositAmount = depositAmount;
        equipmentData.depositPaid = false;
    }
    
    if (!equipmentData.name || !equipmentData.location) {
        safeShowToast('Name und Standort sind Pflichtfelder', 'error');
        return;
    }
    
    try {
        await window.db.collection('equipment').add(equipmentData);
        safeShowToast('Equipment erfolgreich hinzugefügt', 'success');
        
        // Return to equipment overview instead of closing modal
        showEquipmentManager();
        
    } catch (error) {
        console.error('Error saving equipment:', error);
        safeShowToast('Fehler beim Speichern', 'error');
    }
}

/**
 * Edit equipment
 */
function editEquipment(equipmentId) {
    const equipmentItem = equipment.find(item => item.id === equipmentId);
    if (!equipmentItem) {
        safeShowToast('Equipment nicht gefunden', 'error');
        return;
    }
    
    // Create edit modal content using proper modal structure
    const modalContent = `
        <div class="modal-header">
            <h3>Equipment bearbeiten</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <form id="editEquipmentForm" class="form">
                <div class="form-group">
                    <label class="form-label">Equipment Name</label>
                    <input type="text" id="editEquipmentName" class="form-input" value="${equipmentItem.name}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Kategorie</label>
                    <select id="editEquipmentCategory" class="form-select" required>
                        ${Object.entries(EQUIPMENT_CATEGORIES).map(([key, name]) => `
                            <option value="${key}" ${equipmentItem.category === key ? 'selected' : ''}>
                                ${name}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Beschreibung</label>
                    <textarea id="editEquipmentDescription" class="form-textarea" rows="3">${equipmentItem.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Status</label>
                    <select id="editEquipmentStatus" class="form-select" required>
                        <option value="available" ${equipmentItem.status === 'available' ? 'selected' : ''}>Verfügbar</option>
                        <option value="borrowed" ${equipmentItem.status === 'borrowed' ? 'selected' : ''}>Ausgeliehen</option>
                        <option value="maintenance" ${equipmentItem.status === 'maintenance' ? 'selected' : ''}>Wartung</option>
                        <option value="broken" ${equipmentItem.status === 'broken' ? 'selected' : ''}>Defekt</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" id="editEquipmentRequiresDeposit" ${equipmentItem.requiresDeposit ? 'checked' : ''}>
                        Pfand erforderlich
                    </label>
                </div>
                <div class="form-group deposit-group" style="display: ${equipmentItem.requiresDeposit ? 'block' : 'none'};">
                    <label class="form-label">Pfandbetrag (€)</label>
                    <input type="number" id="editEquipmentDepositAmount" class="form-input" value="${equipmentItem.depositAmount || 0}" min="0" step="0.01">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
                    <button type="button" class="btn btn-danger" onclick="deleteEquipment('${equipmentId}')">Löschen</button>
                    <button type="button" class="btn btn-primary" onclick="updateEquipment('${equipmentId}')">Speichern</button>
                </div>
            </form>
        </div>
    `;
    
    // Use proper modal system for correct z-index and display
    showModalWithContent(modalContent);
    
    // Add deposit toggle functionality after modal is shown
    setTimeout(() => {
        const depositCheckbox = document.getElementById('editEquipmentRequiresDeposit');
        const depositGroup = document.querySelector('.deposit-group');
        
        if (depositCheckbox && depositGroup) {
            depositCheckbox.addEventListener('change', function() {
                depositGroup.style.display = this.checked ? 'block' : 'none';
            });
        }
    }, 100);
}

/**
 * Close edit equipment form
 */
function closeEditEquipmentForm() {
    // Return to equipment overview instead of closing modal
    showEquipmentManager();
}

/**
 * Update equipment
 */
async function updateEquipment(equipmentId) {
    const form = document.getElementById('editEquipmentForm');
    if (!form) return;
    
    // Get form values directly from elements since we're using IDs
    const equipmentData = {
        name: document.getElementById('editEquipmentName').value.trim(),
        category: document.getElementById('editEquipmentCategory').value,
        description: document.getElementById('editEquipmentDescription').value.trim(),
        status: document.getElementById('editEquipmentStatus').value,
        requiresDeposit: document.getElementById('editEquipmentRequiresDeposit').checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (equipmentData.requiresDeposit) {
        const depositAmount = parseFloat(document.getElementById('editEquipmentDepositAmount').value);
        if (isNaN(depositAmount) || depositAmount <= 0) {
            safeShowToast('Pfandbetrag muss eine positive Zahl sein', 'error');
            return;
        }
        equipmentData.depositAmount = depositAmount;
    } else {
        // Remove deposit fields if not required
        equipmentData.depositAmount = firebase.firestore.FieldValue.delete();
        equipmentData.depositPaid = firebase.firestore.FieldValue.delete();
    }
    
    if (!equipmentData.name || !equipmentData.category) {
        safeShowToast('Bitte alle Pflichtfelder ausfüllen', 'error');
        return;
    }
    
    try {
        await window.db.collection('equipment').doc(equipmentId).update(equipmentData);
        
        safeShowToast('Equipment erfolgreich aktualisiert', 'success');
        // Return to equipment overview instead of closing modal
        showEquipmentManager();
        
        // Update machine overview
        updateMachineOverview();
        
    } catch (error) {
        console.error('Error updating equipment:', error);
        safeShowToast('Fehler beim Aktualisieren', 'error');
    }
}

/**
 * Delete equipment with confirmation
 */
async function deleteEquipment(equipmentId) {
    const equipmentItem = equipment.find(item => item.id === equipmentId);
    if (!equipmentItem) {
        safeShowToast('Equipment nicht gefunden', 'error');
        return;
    }
    
    // Show confirmation dialog
    const confirmed = confirm(`Möchtest du "${equipmentItem.name}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`);
    
    if (!confirmed) return;
    
    try {
        await window.db.collection('equipment').doc(equipmentId).delete();
        
        safeShowToast('Equipment erfolgreich gelöscht', 'success');
        // Return to equipment overview instead of closing modal
        showEquipmentManager();
        
    } catch (error) {
        console.error('Error deleting equipment:', error);
        safeShowToast('Fehler beim Löschen', 'error');
    }
}

/**
 * Borrow equipment
 */
async function borrowEquipment(equipmentId) {
    // Check if user is admin
    if (!window.currentUser || !window.currentUser.isAdmin) {
        safeShowToast('Nur Admins können Equipment direkt ausleihen. Bitte stellen Sie eine Anfrage.', 'warning');
        return;
    }
    
    const equipmentItem = equipment.find(item => item.id === equipmentId);
    
    // Load all users first for admin selection
    await loadAllUsersForEquipment();
    
    // Show admin loan modal
    const modalContent = `
        <div class="modal-header">
            <h3>Equipment direkt ausleihen</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form">
                <div class="form-group">
                    <label class="form-label">Benutzer suchen</label>
                    <input type="text" id="adminBorrowUserSearch" class="form-input" placeholder="Name oder FH-Kennung eingeben..." onkeyup="filterAdminBorrowUsers()">
                    <div id="adminBorrowUserResults" class="user-search-results" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; margin-top: 5px; display: none;"></div>
                </div>
                <div class="form-group">
                    <label class="form-label">Ausgewählter Benutzer</label>
                    <input type="text" id="adminBorrowUserDisplay" class="form-input" placeholder="Benutzer über Suche auswählen..." readonly>
                    <input type="hidden" id="adminBorrowUser" value="">
                </div>
                <div class="form-group">
                    <label class="form-label">Handynummer (erforderlich)</label>
                    <input type="tel" id="adminBorrowUserPhone" class="form-input" placeholder="z.B. 0176 12345678" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Dauer</label>
                    <select id="adminBorrowDuration" class="form-select">
                        <option value="1_hour">1 Stunde</option>
                        <option value="2_hours">2 Stunden</option>
                        <option value="half_day">Halber Tag</option>
                        <option value="full_day">Ganzer Tag</option>
                        <option value="week">1 Woche</option>
                        <option value="other">Andere</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Zweck</label>
                    <textarea id="adminBorrowPurpose" class="form-textarea" placeholder="Zweck der Ausleihe..." rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Notiz (optional)</label>
                    <textarea id="adminBorrowNote" class="form-textarea" placeholder="Zusätzliche Notizen..." rows="2"></textarea>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
            <button class="btn btn-primary" onclick="submitAdminBorrowEquipment('${equipmentId}')">Equipment ausleihen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
}

/**
 * Load all users for equipment admin selection
 */
async function loadAllUsersForEquipment() {
    try {
        console.log('🔄 Loading all users for equipment selection...');
        
        const querySnapshot = await window.db.collection('users').get();
        allUsers = [];
        
        querySnapshot.forEach(doc => {
            const userData = doc.data();
            allUsers.push({
                id: doc.id,
                kennung: userData.kennung || doc.id,
                name: userData.name || 'Unbekannter Benutzer',
                email: userData.email || '',
                phone: userData.phone || '',
                isAdmin: userData.isAdmin || false
            });
        });
        
        console.log(`✅ Loaded ${allUsers.length} users for equipment selection`);
        
    } catch (error) {
        console.error('❌ Error loading users for equipment selection:', error);
        allUsers = [];
    }
}

/**
 * Filter users for admin borrow modal
 */
function filterAdminBorrowUsers() {
    const searchTerm = document.getElementById('adminBorrowUserSearch').value.toLowerCase().trim();
    const resultsDiv = document.getElementById('adminBorrowUserResults');
    
    console.log('🔍 Filtering users with search term:', searchTerm);
    console.log('�� Available users:', allUsers ? allUsers.length : 0);
    
    if (!searchTerm) {
        resultsDiv.style.display = 'none';
        return;
    }
    
    if (!allUsers || allUsers.length === 0) {
        console.warn('⚠️ No users available for search');
        resultsDiv.innerHTML = '<div class="no-results">Keine Benutzer verfügbar</div>';
        resultsDiv.style.display = 'block';
        return;
    }
    
    // Filter users and remove duplicates based on kennung
    const filteredUsers = allUsers.filter(user => {
        const nameMatch = user.name && user.name.toLowerCase().includes(searchTerm);
        const kennungMatch = user.kennung && user.kennung.toLowerCase().includes(searchTerm);
        const emailMatch = user.email && user.email.toLowerCase().includes(searchTerm);
        
        return nameMatch || kennungMatch || emailMatch;
    });
    
    // Remove duplicates based on kennung (keep the one with most complete data)
    const uniqueUsers = [];
    const seenKennungen = new Set();
    
    filteredUsers.forEach(user => {
        if (!seenKennungen.has(user.kennung)) {
            seenKennungen.add(user.kennung);
            uniqueUsers.push(user);
        } else {
            // If we already have this kennung, replace with more complete data
            const existingIndex = uniqueUsers.findIndex(u => u.kennung === user.kennung);
            const existing = uniqueUsers[existingIndex];
            
            // Keep the user with more complete data (phone, email, etc.)
            const existingScore = (existing.phone ? 1 : 0) + (existing.email ? 1 : 0);
            const newScore = (user.phone ? 1 : 0) + (user.email ? 1 : 0);
            
            if (newScore > existingScore) {
                uniqueUsers[existingIndex] = user;
            }
        }
    });
    
    const limitedUsers = uniqueUsers.slice(0, 10); // Limit to 10 results
    
    console.log(`🔍 Found ${filteredUsers.length} matching users, ${limitedUsers.length} unique users`);
    
    if (limitedUsers.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results">Keine Benutzer gefunden</div>';
        resultsDiv.style.display = 'block';
        return;
    }
    
    resultsDiv.innerHTML = limitedUsers.map(user => `
        <div class="user-result-item" onclick="selectAdminBorrowUser('${user.kennung}', '${user.name}', '${user.email || ''}', '${user.phone || ''}')">
            <strong>${user.name}</strong> (${user.kennung})
            ${user.email ? `<br><small>📧 ${user.email}</small>` : ''}
            ${user.phone ? `<br><small>📱 ${user.phone}</small>` : ''}
        </div>
    `).join('');
    
    resultsDiv.style.display = 'block';
}

/**
 * Select user in admin borrow modal
 */
function selectAdminBorrowUser(kennung, name, email, phone) {
    document.getElementById('adminBorrowUserSearch').value = '';
    document.getElementById('adminBorrowUserDisplay').value = `${name} (${kennung})`;
    document.getElementById('adminBorrowUser').value = kennung;
    document.getElementById('adminBorrowUserPhone').value = phone;
    document.getElementById('adminBorrowUserResults').style.display = 'none';
    
    // Store selected user data
    window.selectedAdminBorrowUser = { kennung, name, email, phone };
}

/**
 * Submit admin equipment borrow
 */
async function submitAdminBorrowEquipment(equipmentId) {
    const selectedUserKennung = document.getElementById('adminBorrowUser').value;
    const phoneNumber = document.getElementById('adminBorrowUserPhone').value;
    const duration = document.getElementById('adminBorrowDuration').value;
    const purpose = document.getElementById('adminBorrowPurpose').value;
    const note = document.getElementById('adminBorrowNote').value;
    
    if (!selectedUserKennung || !phoneNumber || !duration || !purpose) {
        safeShowToast('Bitte alle Pflichtfelder ausfüllen', 'error');
        return;
    }
    
    // Validate phone number
    const phoneRegex = /^(\+49|0)[0-9\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phoneNumber)) {
        safeShowToast('Bitte geben Sie eine gültige Handynummer ein', 'error');
        return;
    }
    
    const equipmentItem = equipment.find(item => item.id === equipmentId);
    if (!equipmentItem) {
        safeShowToast('Equipment nicht gefunden', 'error');
        return;
    }
    
    // Check if deposit is required
    if (equipmentItem.requiresDeposit) {
        const depositConfirm = await toast.confirm(
            `Für dieses Equipment ist ein Pfand von ${equipmentItem.depositAmount}€ erforderlich. Wurde das Pfand bezahlt?`,
            'Ja, bezahlt',
            'Nein, nicht bezahlt'
        );
        if (!depositConfirm) {
            safeShowToast('Ausleihe abgebrochen. Pfand muss vor der Ausleihe bezahlt werden.', 'warning');
            return;
        }
    }
    
    try {
        // Find selected user
        const selectedUser = allUsers ? allUsers.find(user => user.kennung === selectedUserKennung) : null;
        if (!selectedUser) {
            safeShowToast('Ausgewählter Benutzer nicht gefunden', 'error');
            return;
        }
        
        // Update user phone number - create document if it doesn't exist
        let userWasCreated = false;
        try {
            await window.db.collection('users').doc(selectedUserKennung).update({
                phone: phoneNumber,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            // If document doesn't exist, create it
            if (error.code === 'not-found') {
                await window.db.collection('users').doc(selectedUserKennung).set({
                    name: selectedUser.name,
                    kennung: selectedUser.kennung,
                    email: selectedUser.email || `${selectedUser.kennung}@fh-muenster.de`,
                    phone: phoneNumber,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                userWasCreated = true;
            } else {
                throw error; // Re-throw other errors
            }
        }
        
        // Update window.allUsers if user was created or phone was updated
        if (typeof updateUserInList === 'function') {
            if (userWasCreated) {
                updateUserInList(selectedUserKennung, {
                    docId: selectedUserKennung,
                    name: selectedUser.name,
                    kennung: selectedUser.kennung,
                    email: selectedUser.email || `${selectedUser.kennung}@fh-muenster.de`,
                    phone: phoneNumber,
                    isAdmin: false,
                    entries: [],
                    totalCost: 0,
                    paidAmount: 0,
                    unpaidAmount: 0
                });
            } else {
                updateUserInList(selectedUserKennung, { phone: phoneNumber });
            }
        }
        
        // Create loan request with status 'given'
        const loanData = {
            type: 'equipment',
            equipmentId: equipmentId,
            equipmentType: equipmentItem.category,
            equipmentName: equipmentItem.name,
            equipmentLocation: equipmentItem.location,
            duration: duration,
            purpose: purpose,
            status: 'given',
            userName: selectedUser.name,
            userKennung: selectedUser.kennung,
            userEmail: selectedUser.email || '',
            userPhone: phoneNumber,
            givenBy: window.currentUser?.name || 'Admin',
            givenByKennung: window.currentUser?.kennung || '',
            giveNote: note,
            givenAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await window.db.collection('requests').add(loanData);
        
        // Update equipment status - use same fields as user request workflow
        const updateData = {
            status: 'borrowed',
            borrowedByKennung: selectedUser.kennung,
            borrowedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // If deposit is required, mark it as paid
        if (equipmentItem.requiresDeposit) {
            updateData.depositPaid = true;
        }
        
        await window.db.collection('equipment').doc(equipmentId).update(updateData);
        
        safeShowToast(`Equipment erfolgreich an ${selectedUser.name} ausgeliehen`, 'success');
        
        // Refresh user management if it's open
        if (typeof loadUsersForManagement === 'function') {
            // Force reload of user data
            setTimeout(() => {
                loadUsersForManagement();
            }, 500); // Small delay to ensure Firestore update is complete
        }
        
        closeModal();
        
        // Update machine overview
        updateMachineOverview();
        
    } catch (error) {
        console.error('Error submitting admin equipment borrow:', error);
        safeShowToast('Fehler beim Ausleihen des Equipment', 'error');
    }
}

/**
 * Return equipment
 */
async function returnEquipment(equipmentId) {
    const equipmentItem = equipment.find(item => item.id === equipmentId);
    
    const confirmed = confirm('Equipment als zurückgegeben markieren?');
    if (!confirmed) return;
    
    try {
        const updateData = {
            status: 'available',
            borrowedByKennung: firebase.firestore.FieldValue.delete(),
            borrowedAt: firebase.firestore.FieldValue.delete(),
            rentedByKennung: firebase.firestore.FieldValue.delete(),
            rentedAt: firebase.firestore.FieldValue.delete(),
            returnedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Reset deposit status when returning
        if (equipmentItem && equipmentItem.requiresDeposit) {
            updateData.depositPaid = false;
        }
        
        await window.db.collection('equipment').doc(equipmentId).update(updateData);
        
        safeShowToast('Equipment erfolgreich zurückgegeben', 'success');
        // Removed manual reload - real-time listener will handle the update
        
        // Update machine overview
        updateMachineOverview();
        
    } catch (error) {
        console.error('Error returning equipment:', error);
        safeShowToast('Fehler bei der Rückgabe', 'error');
    }
}

/**
 * Mark deposit as paid
 */
async function markDepositAsPaid(equipmentId) {
    const confirmed = confirm('Pfand als bezahlt markieren?');
    if (!confirmed) return;
    
    try {
        await window.db.collection('equipment').doc(equipmentId).update({
            depositPaid: true,
            depositPaidAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        safeShowToast('Pfand als bezahlt markiert', 'success');
        // Removed manual reload - real-time listener will handle the update
        
    } catch (error) {
        console.error('Error marking deposit as paid:', error);
        safeShowToast('Fehler beim Markieren des Pfands', 'error');
    }
}

/**
 * Setup equipment requests listener
 */
/**
 * Update the notification badge for equipment requests
 */
function updateEquipmentRequestsBadge() {
    const badge = document.getElementById('equipment-requests-badge');
    
    // Count pending requests across all equipment
    const pendingCount = equipmentRequests.filter(req => req.status === 'pending').length;
    
    const shouldShow = pendingCount > 0;
    
    if (badge) {
        badge.textContent = pendingCount;
        badge.style.display = shouldShow ? 'inline-block' : 'none';
    }
}

/**
 * Render category tabs dynamically
 */
// Category tabs are now static in HTML, no dynamic rendering needed

// Category counters removed - using simplified static categories

// Category management functions removed - using fixed categories only

// More category management functions removed

// All old category management functions removed 

// ==================== GLOBAL EXPORTS ====================
// Equipment Management-Funktionen global verfügbar machen
// Make functions globally available
window.showEquipmentManager = showEquipmentManager;
window.closeEquipmentManager = closeEquipmentManager;
window.showEquipmentCategory = showEquipmentCategory;
window.searchEquipment = searchEquipment;
window.clearEquipmentSearch = clearEquipmentSearch;
window.showAddEquipmentForm = showAddEquipmentForm;
window.toggleDepositAmount = toggleDepositAmount;
window.closeAddEquipmentForm = closeAddEquipmentForm;
window.saveEquipment = saveEquipment;
window.editEquipment = editEquipment;
window.closeEditEquipmentForm = closeEditEquipmentForm;
window.updateEquipment = updateEquipment;
window.borrowEquipment = borrowEquipment;
window.returnEquipment = returnEquipment;
window.markDepositAsPaid = markDepositAsPaid;
window.filterAdminBorrowUsers = filterAdminBorrowUsers;
window.selectAdminBorrowUser = selectAdminBorrowUser;
window.submitAdminBorrowEquipment = submitAdminBorrowEquipment;
window.updateEquipmentRequestsBadge = updateEquipmentRequestsBadge;
window.approveEquipmentRequest = approveEquipmentRequest;
window.rejectEquipmentRequest = rejectEquipmentRequest;
window.duplicateEquipment = duplicateEquipment;
window.deleteEquipment = deleteEquipment;
window.updateMachineOverview = updateMachineOverview;
// window.requestEquipmentReturn removed - function no longer exists
window.confirmEquipmentReturn = confirmEquipmentReturn;
window.setupEquipmentRequestsListener = setupEquipmentRequestsListener;
window.loadEquipmentRequests = loadEquipmentRequests;
window.loadAllUsersForEquipment = loadAllUsersForEquipment;
// getUserDetails function removed - using direct data access instead

/**
 * Approve equipment request and mark equipment as borrowed
 */
async function approveEquipmentRequest(requestId, equipmentId) {
  try {
        const confirmed = confirm('Möchtest du diese Ausleihe-Anfrage genehmigen?');
    if (!confirmed) {
        return;
    }
    
    const loadingId = window.loading ? window.loading.show('Anfrage wird genehmigt...') : null;
    
    // Find the request in equipmentRequests array
    const requestData = equipmentRequests.find(req => req.id === requestId);
    if (!requestData) {
      throw new Error('Anfrage nicht gefunden');
    }
    
    // Update request status in requests collection
    await window.db.collection('requests').doc(requestId).update({
      status: 'approved',
      approvedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      approvedBy: window.currentUser?.kennung || 'admin'
    });
    
    // Update equipment status - use the correct field for user kennung
    const userKennung = requestData.userKennung || requestData.requestedByKennung || requestData.requestedBy;
    await window.db.collection('equipment').doc(equipmentId).update({
      status: 'borrowed',
      borrowedByKennung: userKennung,
      borrowedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      depositPaid: false,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
    
    if (loadingId && window.loading) window.loading.hide(loadingId);
    
    if (window.toast) {
      window.toast.success('Ausleihe-Anfrage erfolgreich genehmigt');
    } else {
      alert('Ausleihe-Anfrage erfolgreich genehmigt');
    }
    
  } catch (error) {
    console.error('Error approving equipment request:', error);
    if (window.loading) window.loading.hideAll();
    
    if (window.toast) {
      window.toast.error('Fehler beim Genehmigen der Anfrage: ' + error.message);
    } else {
      alert('Fehler beim Genehmigen der Anfrage: ' + error.message);
    }
  }
}

/**
 * Reject equipment request
 */
async function rejectEquipmentRequest(requestId, equipmentId) {
  try {
        const confirmed = confirm('Möchtest du diese Ausleihe-Anfrage ablehnen?');
    if (!confirmed) {
        return;
    }
    
    const loadingId = window.loading ? window.loading.show('Anfrage wird abgelehnt...') : null;
    
    // Update request status in requests collection
    await window.db.collection('requests').doc(requestId).update({
      status: 'rejected',
      rejectedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      rejectedBy: window.currentUser?.kennung || 'admin'
    });
    
    if (loadingId && window.loading) window.loading.hide(loadingId);
    
    if (window.toast) {
      window.toast.success('Ausleihe-Anfrage erfolgreich abgelehnt');
    } else {
      alert('Ausleihe-Anfrage erfolgreich abgelehnt');
    }
    
  } catch (error) {
    console.error('Error rejecting equipment request:', error);
    if (window.loading) window.loading.hideAll();
    
    if (window.toast) {
      window.toast.error('Fehler beim Ablehnen der Anfrage: ' + error.message);
    } else {
      alert('Fehler beim Ablehnen der Anfrage: ' + error.message);
    }
  }
}

/**
 * Duplicate equipment
 */
async function duplicateEquipment(equipmentId) {
    const equipmentItem = equipment.find(item => item.id === equipmentId);
    if (!equipmentItem) {
        safeShowToast('Equipment nicht gefunden', 'error');
        return;
    }
    
    // Create duplicate data
    const duplicateData = {
        name: `${equipmentItem.name} (Kopie)`,
        category: equipmentItem.category,
        location: equipmentItem.location,
        description: equipmentItem.description,
        requiresDeposit: equipmentItem.requiresDeposit,
        depositAmount: equipmentItem.depositAmount,
        status: 'available',
        createdAt: new Date()
    };
    
    try {
        await window.db.collection('equipment').add(duplicateData);
        safeShowToast('Equipment erfolgreich dupliziert', 'success');
        
        // Return to equipment overview instead of closing modal
        showEquipmentManager();
        
    } catch (error) {
        console.error('Error duplicating equipment:', error);
        safeShowToast('Fehler beim Duplizieren', 'error');
    }
}

/**
 * Request equipment return from user
 */
// requestEquipmentReturn function removed - simplified admin workflow

/**
 * Confirm equipment return request
 */
async function confirmEquipmentReturn(equipmentId) {
    const equipmentItem = equipment.find(item => item.id === equipmentId);
    if (!equipmentItem) {
        safeShowToast('Equipment nicht gefunden', 'error');
        return;
    }
    
    // Show confirmation dialog
    const confirmed = confirm('Möchtest du die Rückgabe dieses Equipments bestätigen?');
    if (!confirmed) {
        return;
    }
    
    try {
        // Find pending return request in equipmentRequests
        const returnRequest = equipmentRequests.find(req => 
            req.equipmentId === equipmentId && 
            req.status === 'pending' && 
            req.type === 'return'
        );
        
        if (!returnRequest) {
            safeShowToast('Keine Rückgabe-Anfrage für dieses Equipment gefunden', 'error');
            return;
        }
        
        // Update return request status in requests collection
        await window.db.collection('requests').doc(returnRequest.id).update({
            status: 'confirmed',
            confirmedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            confirmedBy: window.currentUser?.kennung || 'admin',
            confirmedByName: window.currentUser?.name || 'Administrator'
        });
        
        // Update equipment status
        const updateData = {
            status: 'available',
            borrowedByKennung: window.firebase.firestore.FieldValue.delete(),
            borrowedAt: window.firebase.firestore.FieldValue.delete(),
            returnedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Reset deposit status when returning
        if (equipmentItem.requiresDeposit) {
            updateData.depositPaid = false;
        }
        
        await window.db.collection('equipment').doc(equipmentId).update(updateData);
        
        safeShowToast('Rückgabe erfolgreich bestätigt', 'success');
        
        // Update machine overview
        updateMachineOverview();
        
    } catch (error) {
        console.error('Error confirming equipment return:', error);
        safeShowToast('Fehler bei der Bestätigung der Rückgabe', 'error');
    }
}

/**
 * Update machine overview in admin dashboard and user dashboard
 */
function updateMachineOverview() {
    console.log('🔄 updateMachineOverview called');
    
    // Get printer data from user services (this is the correct data source)
    const userPrinters = window.userPrinters || [];
    
    if (userPrinters.length === 0) {
        console.log('❌ userPrinters array is empty - trying to load printer data...');
        
        // Try to load printer data if not available
        if (typeof loadPrinterStatus === 'function') {
            loadPrinterStatus();
        }
        
        // Set default values to 0
        const availableElement = document.getElementById('availableMachines');
        const inUseElement = document.getElementById('inUseMachines');
        const maintenanceElement = document.getElementById('maintenanceMachines');
        const userAvailableElement = document.getElementById('userAvailableMachines');
        const userInUseElement = document.getElementById('userInUseMachines');
        const userMaintenanceElement = document.getElementById('userMaintenanceMachines');
        
        if (availableElement) availableElement.textContent = '0';
        if (inUseElement) inUseElement.textContent = '0';
        if (maintenanceElement) maintenanceElement.textContent = '0';
        if (userAvailableElement) userAvailableElement.textContent = '0';
        if (userInUseElement) userInUseElement.textContent = '0';
        if (userMaintenanceElement) userMaintenanceElement.textContent = '0';
        
        return;
    }
    
    console.log('📊 Current userPrinters data:', userPrinters);
    
    const available = userPrinters.filter(printer => printer.status === 'available').length;
    const inUse = userPrinters.filter(printer => printer.status === 'printing' || printer.status === 'in_use').length;
    const maintenance = userPrinters.filter(printer => 
        printer.status === 'maintenance' || printer.status === 'broken'
    ).length;
    
    console.log(`📊 Calculated counts: ${available} available, ${inUse} in use, ${maintenance} maintenance`);
    
    // Update admin dashboard elements
    const availableElement = document.getElementById('availableMachines');
    const inUseElement = document.getElementById('inUseMachines');
    const maintenanceElement = document.getElementById('maintenanceMachines');
    
    // Update user dashboard elements
    const userAvailableElement = document.getElementById('userAvailableMachines');
    const userInUseElement = document.getElementById('userInUseMachines');
    const userMaintenanceElement = document.getElementById('userMaintenanceMachines');
    
    console.log('🔍 Found elements:', {
        admin: { available: !!availableElement, inUse: !!inUseElement, maintenance: !!maintenanceElement },
        user: { available: !!userAvailableElement, inUse: !!userInUseElement, maintenance: !!userMaintenanceElement }
    });
    
    // Update admin elements
    if (availableElement) {
        availableElement.textContent = available;
        const availableCircle = availableElement.closest('.status-circle');
        if (availableCircle) {
            availableCircle.classList.toggle('empty', available === 0);
        }
    }
    
    if (inUseElement) {
        inUseElement.textContent = inUse;
        const inUseCircle = inUseElement.closest('.status-circle');
        if (inUseCircle) {
            inUseCircle.classList.toggle('empty', inUse === 0);
        }
    }
    
    if (maintenanceElement) {
        maintenanceElement.textContent = maintenance;
        const maintenanceCircle = maintenanceElement.closest('.status-circle');
        if (maintenanceCircle) {
            maintenanceCircle.classList.toggle('empty', maintenance === 0);
        }
    }
    
    // Update user elements
    if (userAvailableElement) {
        userAvailableElement.textContent = available;
        const userAvailableCircle = userAvailableElement.closest('.status-circle');
        if (userAvailableCircle) {
            userAvailableCircle.classList.toggle('empty', available === 0);
        }
    }
    
    if (userInUseElement) {
        userInUseElement.textContent = inUse;
        const userInUseCircle = userInUseElement.closest('.status-circle');
        if (userInUseCircle) {
            userInUseCircle.classList.toggle('empty', inUse === 0);
        }
    }
    
    if (userMaintenanceElement) {
        userMaintenanceElement.textContent = maintenance;
        const userMaintenanceCircle = userMaintenanceElement.closest('.status-circle');
        if (userMaintenanceCircle) {
            userMaintenanceCircle.classList.toggle('empty', maintenance === 0);
        }
    }
    
    console.log(`✅ Printer Overview Updated: ${available} available, ${inUse} in use, ${maintenance} maintenance (Wartung + Defekt)`);
}

// ==================== GLOBAL EXPORTS ====================
// Funktionen global verfügbar machen
window.showEquipmentManager = showEquipmentManager;
window.closeEquipmentManager = closeEquipmentManager;
window.loadEquipment = loadEquipment;
window.searchEquipment = searchEquipment;
window.clearEquipmentSearch = clearEquipmentSearch;
window.showEquipmentCategory = showEquipmentCategory;
window.showAddEquipmentForm = showAddEquipmentForm;
window.toggleDepositAmount = toggleDepositAmount;
window.closeAddEquipmentForm = closeAddEquipmentForm;
window.saveEquipment = saveEquipment;
window.editEquipment = editEquipment;
window.closeEditEquipmentForm = closeEditEquipmentForm;
window.updateEquipment = updateEquipment;
window.deleteEquipment = deleteEquipment;
window.borrowEquipment = borrowEquipment;
window.returnEquipment = returnEquipment;
window.markDepositAsPaid = markDepositAsPaid;
window.duplicateEquipment = duplicateEquipment;
window.updateMachineOverview = updateMachineOverview;
window.filterAdminBorrowUsers = filterAdminBorrowUsers;
window.selectAdminBorrowUser = selectAdminBorrowUser;
window.submitAdminBorrowEquipment = submitAdminBorrowEquipment;
// window.requestEquipmentReturn removed - function no longer exists
window.confirmEquipmentReturn = confirmEquipmentReturn;
window.loadAllUsersForEquipment = loadAllUsersForEquipment;
window.approveEquipmentRequest = approveEquipmentRequest;
window.rejectEquipmentRequest = rejectEquipmentRequest;

// Global helper function for waiting for updateMachineOverview
window.waitForUpdateMachineOverview = function(callback, maxAttempts = 10) {
  let attempts = 0;
  const checkFunction = () => {
    attempts++;
    if (typeof updateMachineOverview === 'function') {
      console.log('🔄 updateMachineOverview function found after', attempts, 'attempts');
      callback();
    } else if (attempts < maxAttempts) {
      console.log('⏳ Waiting for updateMachineOverview function... (attempt', attempts, '/', maxAttempts, ')');
      setTimeout(checkFunction, 500);
    } else {
      console.warn('⚠️ updateMachineOverview function not available after', maxAttempts, 'attempts');
    }
  };
  checkFunction();
};

// Global function to manually trigger equipment manager (fallback)
window.triggerEquipmentManager = function() {
    console.log('🔧 Manually triggering equipment manager...');
    if (typeof showEquipmentManager === 'function') {
        showEquipmentManager();
    } else {
        console.error('showEquipmentManager function not available');
    }
};

console.log("🔧 Equipment Management Module geladen (v1.9)");
console.log("🔧 Available functions:", {
    showEquipmentManager: typeof showEquipmentManager,
    confirmEquipmentReturn: typeof confirmEquipmentReturn,
    approveEquipmentRequest: typeof approveEquipmentRequest,
    rejectEquipmentRequest: typeof rejectEquipmentRequest
});

// ==================== EVENT LISTENER SETUP ====================
// Set up event listeners for buttons that use inline onclick handlers
function setupEquipmentEventListeners() {
    // Equipment Manager Button
    const equipmentManagerBtn = document.getElementById('equipmentManagerBtn');
    if (equipmentManagerBtn) {
        equipmentManagerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof showEquipmentManager === 'function') {
                showEquipmentManager();
            } else {
                console.error('showEquipmentManager function not available');
            }
        });
        console.log('✅ Equipment Manager button event listener set up');
    } else {
        console.log('⚠️ Equipment Manager button not found, will retry...');
    }
    
    // Also handle notification items that might be dynamically created
    document.addEventListener('click', (e) => {
        const notificationItem = e.target.closest('.notification-item[data-action="showEquipmentManager"]');
        if (notificationItem) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof showEquipmentManager === 'function') {
                showEquipmentManager();
            } else {
                console.error('showEquipmentManager function not available');
            }
        }
    });
}

// Try to set up event listeners immediately
setupEquipmentEventListeners();

// Also try on DOMContentLoaded
document.addEventListener('DOMContentLoaded', setupEquipmentEventListeners);

// And try after a delay to catch dynamically loaded content
setTimeout(setupEquipmentEventListeners, 1000);
setTimeout(setupEquipmentEventListeners, 2000); 