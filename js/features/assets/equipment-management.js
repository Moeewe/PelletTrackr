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
            
            // Make equipment globally available
            window.equipment = equipment;
            
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
            
            // Only show category if modal is active and we have a valid category
            const modal = document.getElementById('modal');
            if (modal && modal.classList.contains('active') && currentEquipmentCategory) {
                console.log('🔄 Equipment data updated, showing category:', currentEquipmentCategory);
                showEquipmentCategory(currentEquipmentCategory);
            }
            
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
 * Unified equipment system - no separate requests collection needed
 * All requests are stored directly in equipment documents
 */
function setupEquipmentRequestsListener() {
    // This function is now deprecated - all requests are in equipment collection
    console.log("🔄 Unified system: No separate requests listener needed");
    return;
}

/**
 * Unified equipment system - load requests from equipment collection
 */
async function loadEquipmentRequests() {
    try {
        // In unified system, requests are stored in equipment documents
        // No separate loading needed - data comes from equipment listener
        console.log('🔄 Unified system: Requests loaded from equipment collection');
        
        // Update notification badge
        updateEquipmentRequestsBadge();
        
    } catch (error) {
        console.error('Error in unified equipment system:', error);
    }
}

/**
 * Show equipment manager modal
 */
async function showEquipmentManager() {
    console.log('🔧 showEquipmentManager called - starting modal creation');
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
            <button class="btn btn-warning" onclick="cleanupEquipmentPendingRequests()" title="Doppelte Anfragen bereinigen">Cleanup</button>
            <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
        </div>
    `;
    
    console.log('🔧 Modal content created, length:', modalContent.length);
    console.log('🔧 Modal content contains equipmentList:', modalContent.includes('equipmentList'));
    
    showModalWithContent(modalContent);
    
    // Debug: Check if modal was created properly
    setTimeout(() => {
        const modal = document.getElementById('modal');
        const container = document.getElementById('equipmentList');
        console.log('🔍 Modal creation check:', {
            modal: modal ? 'Found' : 'Not found',
            container: container ? 'Found' : 'Not found',
            modalActive: modal?.classList.contains('active') || false,
            modalHTML: modal ? modal.innerHTML.substring(0, 200) + '...' : 'No modal'
        });
        
        // If modal exists but container doesn't, let's check what's in the modal
        if (modal && !container) {
            console.log('🔍 Modal exists but container not found. Searching for equipmentList...');
            const allElements = modal.querySelectorAll('*');
            console.log('🔍 All elements in modal:', Array.from(allElements).map(el => el.id || el.className || el.tagName));
        }
    }, 10);
    
    // Only setup listener if not already running
    if (!equipmentListener) {
        setupEquipmentListener();
    }
    setupEquipmentRequestsListener();
    
    // Show hardware category by default after requests are loaded
    // Use a more robust approach to wait for DOM elements
    const waitForContainer = (maxAttempts = 5) => {
        let attempts = 0;
        const checkContainer = () => {
            attempts++;
            const container = document.getElementById('equipmentList');
            const modal = document.getElementById('modal');
            const modalActive = modal?.classList.contains('active') || false;
            
            console.log(`🔍 Container check attempt ${attempts}/${maxAttempts}:`, {
                container: container ? 'Found' : 'Not found',
                modal: modal ? 'Found' : 'Not found',
                modalActive: modalActive
            });
            
            if (container && modalActive) {
                console.log('🔍 Container found and modal active, showing hardware category');
                showEquipmentCategory('hardware');
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(checkContainer, 200); // Increased delay to 200ms
            } else {
                console.warn('Equipment container not ready after all attempts - will use retry mechanism in showEquipmentCategory');
                // Only try if modal is active
                if (modalActive) {
                    showEquipmentCategory('hardware'); // This will now use the retry mechanism with limits
                }
            }
        };
        
        // Start checking after a short delay
        setTimeout(checkContainer, 100);
    };
    
    waitForContainer();
    
    // Auto-cleanup duplicate requests on admin access
    if (window.currentUser?.isAdmin) {
        setTimeout(() => {
            console.log('🔧 Auto-cleanup for admin access...');
            cleanupEquipmentPendingRequests();
        }, 2000); // Run after 2 seconds to let everything load
    }
}

/**
 * Close equipment manager modal
 */
function closeEquipmentManager() {
    // Don't clean up equipment listener - it's global now
    // Only clean up requests listener if it exists
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
        
        // Load user data for borrowed equipment
        await loadUserDataForEquipment();
        
        // Debug: Show all unique categories in the data
        const uniqueCategories = [...new Set(equipment.map(item => item.category))];
        console.log('🔍 Available categories in data:', uniqueCategories);
        console.log('🔍 Equipment by category:', uniqueCategories.map(cat => ({
            category: cat,
            count: equipment.filter(item => item.category === cat).length,
            items: equipment.filter(item => item.category === cat).map(item => item.name)
        })));
        // Only show category if modal is active
        const modal = document.getElementById('modal');
        if (modal && modal.classList.contains('active')) {
            showEquipmentCategory(currentEquipmentCategory);
        }
        
        // Update equipment requests badge
        updateEquipmentRequestsBadge();
        
    } catch (error) {
        console.error('Error loading equipment:', error);
        safeShowToast('Fehler beim Laden der Ausrüstung', 'error');
    }
}

/**
 * Load user data for borrowed equipment
 */
async function loadUserDataForEquipment() {
    try {
        // Get unique kennungs from borrowed equipment
        const borrowedEquipment = equipment.filter(item => item.borrowedByKennung);
        const uniqueKennungs = [...new Set(borrowedEquipment.map(item => item.borrowedByKennung))];
        
        if (uniqueKennungs.length === 0) {
            console.log('📋 No borrowed equipment found, skipping user data load');
            return;
        }
        
        console.log(`🔍 Loading user data for ${uniqueKennungs.length} borrowed equipment users:`, uniqueKennungs);
        
        // Initialize allUsers array if not exists
        if (!window.allUsers) {
            window.allUsers = [];
        }
        
        // Load user data for each kennung
        for (const kennung of uniqueKennungs) {
            // Check if user already loaded
            const existingUser = window.allUsers.find(u => u.kennung === kennung);
            if (existingUser) {
                console.log(`✅ User ${kennung} already loaded`);
                continue;
            }
            
            try {
                const userDoc = await window.db.collection('users').doc(kennung).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const user = {
                        kennung: kennung,
                        name: userData.name || kennung,
                        email: userData.email || `${kennung}@fh-muenster.de`,
                        phone: userData.phone || null
                    };
                    window.allUsers.push(user);
                    console.log(`✅ Loaded user data for ${kennung}:`, user);
                } else {
                    console.log(`⚠️ User document not found for kennung: ${kennung}`);
                }
            } catch (error) {
                console.error(`❌ Error loading user data for ${kennung}:`, error);
            }
        }
        
        console.log(`✅ User data loading completed. Total users in cache: ${window.allUsers.length}`);
        
    } catch (error) {
        console.error('❌ Error loading user data for equipment:', error);
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
function showEquipmentCategory(category, retryCount = 0) {
    // Don't proceed if no category is specified
    if (!category) {
        console.warn('showEquipmentCategory called without category');
        return;
    }
    
    currentEquipmentCategory = category;
    
    // Check if modal is ready before proceeding
    const container = document.getElementById('equipmentList');
    const modal = document.getElementById('modal');
    const modalActive = modal?.classList.contains('active') || false;
    
    console.log(`🔍 showEquipmentCategory called for '${category}', retry ${retryCount}, container:`, container ? 'Found' : 'Not found', 'modal:', modal ? 'Found' : 'Not found', 'modalActive:', modalActive);
    
    // If modal is not active, don't retry - just return
    if (!modalActive) {
        console.log(`🔍 Modal not active, skipping category display for '${category}'`);
        return;
    }
    
    if (!container) {
        if (retryCount >= 20) { // Reduced to 20 retries (2 seconds max)
            console.error(`Equipment container not ready for category '${category}' after ${retryCount} retries - giving up`);
            return;
        }
        console.warn(`Equipment container not ready for category '${category}' - will retry (${retryCount + 1}/20)`);
        setTimeout(() => {
            showEquipmentCategory(category, retryCount + 1);
        }, 100);
        return;
    }
    
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
function renderEquipmentList(equipmentList, retryCount = 0) {
    const container = document.getElementById('equipmentList');
    
    // Add null check for container
    if (!container) {
        if (retryCount >= 50) { // Max 5 seconds of retries (50 * 100ms)
            console.error(`Equipment list container not found after ${retryCount} retries - giving up`);
            return;
        }
        console.warn(`Equipment list container not found - modal may not be fully loaded yet (${retryCount + 1}/50)`);
        // Try again after a short delay
        setTimeout(() => {
            const retryContainer = document.getElementById('equipmentList');
            if (retryContainer) {
                renderEquipmentList(equipmentList, 0); // Reset retry count on success
            } else {
                renderEquipmentList(equipmentList, retryCount + 1);
            }
        }, 100);
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
        borrowedByKennung: item.borrowedByKennung,
        category: item.category,
        pendingRequestsCount: (item.pendingRequests || []).length
    })));
    
    container.innerHTML = equipmentList.map(item => {
        // Unified system: Get requests directly from equipment document
        const pendingRequests = item.pendingRequests || [];
        const pendingRequest = pendingRequests.find(req => req.status === 'pending' && req.type === 'equipment');
        const pendingReturnRequest = pendingRequests.find(req => req.status === 'pending' && req.type === 'return');
        
        // Define returnRequests for compatibility
        const returnRequests = pendingRequests.filter(req => req.type === 'return');
        
        console.log(`🔍 Equipment ${item.id} (${item.name}):`, {
            status: item.status,
            borrowedByKennung: item.borrowedByKennung,
            pendingRequestsCount: pendingRequests.length,
            pendingRequest: pendingRequest ? pendingRequest.id : null,
            pendingReturnRequest: pendingReturnRequest ? pendingReturnRequest.id : null,
            returnRequests: returnRequests.length,
            hasPendingReturns: returnRequests.some(req => req.status === 'pending')
        });
        
        return `
        <div class="equipment-item ${item.requiresDeposit ? 'requires-deposit' : ''} ${pendingRequest ? 'has-pending-request' : ''}">
            <div class="equipment-header">
                <div class="equipment-name">${item.name}</div>
                <div class="equipment-status-row">
                    <span class="equipment-status ${pendingRequest ? 'requested' : (pendingReturnRequest || (returnRequests.some(req => req.status === 'pending'))) ? 'return-requested' : (item.borrowedBy ? 'borrowed' : item.status)}">
                        ${pendingRequest ? 'Angefragt' : (pendingReturnRequest || (returnRequests.some(req => req.status === 'pending'))) ? 'Rückgabe angefragt' : (item.borrowedBy ? 'Ausgeliehen' : getEquipmentStatusText(item.status))}
                    </span>
                    ${item.requiresDeposit ? `
                                        <span class="equipment-deposit ${item.depositPaid ? 'paid' : 'unpaid'}" title="Pfand ${item.depositPaid ? 'bezahlt' : 'ausstehend'}">
                    ${item.depositAmount}€
                </span>
                    ` : ''}
                </div>
            </div>
            <div class="equipment-info">${item.description || 'Keine Beschreibung'}</div>
            
            ${pendingRequest ? `
                <div class="equipment-request-info">
                    <strong>Ausleihe angefragt von:</strong> ${pendingRequest.userName || pendingRequest.userKennung || pendingRequest.requestedByName || 'Unbekannter User'} (${pendingRequest.userKennung || pendingRequest.requestedBy || 'Unbekannt'})
                    <br><strong>Zeitraum:</strong> ${getEquipmentRequestTimeframe(pendingRequest)}
                    <br><strong>Grund:</strong> ${pendingRequest.reason || pendingRequest.purpose || 'Kein Grund angegeben'}
                </div>
            ` : (pendingReturnRequest || (returnRequests.some(req => req.status === 'pending'))) ? `
                <div class="equipment-request-info">
                    <strong>Rückgabe angefragt von:</strong> ${pendingReturnRequest ? (pendingReturnRequest.requestedByName || pendingReturnRequest.requestedBy || pendingReturnRequest.userName || 'Unbekannter User') : 'Unbekannter User'} (${pendingReturnRequest ? (pendingReturnRequest.requestedBy || pendingReturnRequest.userKennung || 'Unbekannt') : 'Unbekannt'})
                    <br><strong>Angefragt am:</strong> ${pendingReturnRequest && pendingReturnRequest.createdAt ? (() => {
                        try {
                            const date = pendingReturnRequest.createdAt.toDate ? 
                                pendingReturnRequest.createdAt.toDate() : 
                                new Date(pendingReturnRequest.createdAt);
                            return date.toLocaleDateString('de-DE');
                        } catch (error) {
                            console.error('Error parsing return request date:', error);
                            return 'Unbekannt';
                        }
                    })() : 'Unbekannt'}
                </div>
            ` : (item.status === 'borrowed' || item.borrowedBy) && item.borrowedByKennung ? `
                <div class="equipment-current-user">
                    ${getBorrowerInfoDisplay(item)}
                </div>
            ` : ''}
            
            <div class="equipment-actions">
                ${(() => {
                    console.log(`🔍 Action buttons debug for ${item.name}:`, {
                        status: item.status,
                        borrowedByKennung: item.borrowedByKennung,
                        pendingRequest: pendingRequest ? pendingRequest.id : null,
                        pendingReturnRequest: pendingReturnRequest ? pendingReturnRequest.id : null
                    });
                    
                    if (pendingRequest) {
                        console.log('🔍 Showing pending request buttons');
                        const userName = pendingRequest.userName || pendingRequest.userKennung || 'Unbekannter User';
                        return `
                            <button class="btn btn-success" onclick="approveEquipmentRequest('${pendingRequest.id}', '${item.id}')">Anfrage von ${userName} genehmigen</button>
                            <button class="btn btn-danger" onclick="rejectEquipmentRequest('${pendingRequest.id}', '${item.id}')">Anfrage von ${userName} ablehnen</button>
                            <button class="btn btn-secondary" onclick="editEquipment('${item.id}')">Bearbeiten</button>
                            <button class="btn btn-tertiary" onclick="duplicateEquipment('${item.id}')">Dublizieren</button>
                        `;
                    } else if (item.status === 'available' || (!item.borrowedByKennung && item.status !== 'borrowed')) {
                        console.log('🔍 Showing available equipment buttons');
                        
                        // Check if equipment has pending requests (unified system)
                        const hasPendingRequests = pendingRequests.some(req => 
                            req.status === 'pending' || req.status === 'approved'
                        );
                        
                        if (hasPendingRequests) {
                            const blockingRequest = pendingRequests.find(req => 
                                req.status === 'pending' || req.status === 'approved'
                            );
                            const userName = blockingRequest ? (blockingRequest.userName || blockingRequest.userKennung || 'Unbekannter User') : 'Unbekannter User';
                            return `
                                <button class="btn btn-primary" disabled title="Equipment hat ausstehende Anfragen von ${userName}">Ausleihen (Blockiert)</button>
                                <button class="btn btn-secondary" onclick="editEquipment('${item.id}')">Bearbeiten</button>
                                <button class="btn btn-tertiary" onclick="duplicateEquipment('${item.id}')">Dublizieren</button>
                            `;
                        } else {
                            return `
                                <button class="btn btn-primary" onclick="borrowEquipment('${item.id}')">Ausleihen</button>
                                <button class="btn btn-secondary" onclick="editEquipment('${item.id}')">Bearbeiten</button>
                                <button class="btn btn-tertiary" onclick="duplicateEquipment('${item.id}')">Dublizieren</button>
                            `;
                        }
                    } else if (item.status === 'borrowed' || item.borrowedByKennung) {
                        console.log('🔍 Showing borrowed equipment buttons');
                        if (pendingReturnRequest) {
                            const userName = pendingReturnRequest.userName || pendingReturnRequest.userKennung || 'Unbekannter User';
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
 * Get borrower information display with contact details (async version)
 */
async function getBorrowerInfoDisplayAsync(item) {
    const kennung = item.borrowedByKennung;
    if (!kennung) return 'Keine Benutzerinformationen verfügbar';
    
    // Try to find user in allUsers array first
    let user = null;
    if (window.allUsers && Array.isArray(window.allUsers)) {
        user = window.allUsers.find(u => u.kennung === kennung);
    }
    
    // If not found in allUsers, try to get from user management
    if (!user && typeof window.getUserDetails === 'function') {
        user = window.getUserDetails(kennung);
    }
    
    // If still not found, try to load directly from Firestore
    if (!user && window.db) {
        try {
            console.log(`🔍 Loading user data for kennung: ${kennung}`);
            const userDoc = await window.db.collection('users').doc(kennung).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                user = {
                    kennung: kennung,
                    name: userData.name || kennung,
                    email: userData.email || `${kennung}@fh-muenster.de`,
                    phone: userData.phone || null
                };
                console.log(`✅ Loaded user data:`, user);
            } else {
                console.log(`⚠️ User document not found for kennung: ${kennung}`);
            }
        } catch (error) {
            console.error(`❌ Error loading user data for ${kennung}:`, error);
        }
    }
    
    // Format borrowed date
    const borrowedDate = item.borrowedAt ? 
        (item.borrowedAt.toDate ? item.borrowedAt.toDate() : new Date(item.borrowedAt)) : 
        null;
    
    const borrowedDateStr = borrowedDate ? 
        borrowedDate.toLocaleDateString('de-DE', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Unbekannt';
    
    // Get loan duration if available
    let durationInfo = '';
    if (item.borrowedAt) {
        const now = new Date();
        const borrowed = borrowedDate || now;
        const diffTime = Math.abs(now - borrowed);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            durationInfo = ` (seit ${diffDays} Tag)`;
        } else {
            durationInfo = ` (seit ${diffDays} Tagen)`;
        }
    }
    
    // Build contact information
    let contactInfo = '';
    if (user) {
        contactInfo = `
            <div class="borrower-contact-info">
                <div class="contact-item">
                    <strong>📧 Email:</strong> <a href="mailto:${user.email || kennung + '@fh-muenster.de'}" class="contact-link">${user.email || kennung + '@fh-muenster.de'}</a>
                </div>
                ${user.phone ? `
                    <div class="contact-item">
                        <strong>📱 Telefon:</strong> <a href="tel:${user.phone}" class="contact-link">${user.phone}</a>
                    </div>
                ` : ''}
            </div>
        `;
    } else {
        // Fallback if user not found
        contactInfo = `
            <div class="borrower-contact-info">
                <div class="contact-item">
                    <strong>📧 Email:</strong> <a href="mailto:${kennung}@fh-muenster.de" class="contact-link">${kennung}@fh-muenster.de</a>
                </div>
                <div class="contact-item">
                    <em>Telefonnummer nicht verfügbar</em>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="borrower-info">
            <div class="borrower-header">
                <strong>Ausgeliehen an:</strong> ${user ? user.name : kennung} (${kennung})
            </div>
            <div class="borrower-details">
                <strong>Seit:</strong> ${borrowedDateStr}${durationInfo}
            </div>
            ${contactInfo}
        </div>
    `;
}

/**
 * Get borrower information display with contact details (sync version for templates)
 */
function getBorrowerInfoDisplay(item) {
    const kennung = item.borrowedByKennung;
    if (!kennung) return 'Keine Benutzerinformationen verfügbar';
    
    // Try to find user in allUsers array first
    let user = null;
    if (window.allUsers && Array.isArray(window.allUsers)) {
        user = window.allUsers.find(u => u.kennung === kennung);
    }
    
    // If not found in allUsers, try to get from user management
    if (!user && typeof window.getUserDetails === 'function') {
        user = window.getUserDetails(kennung);
    }
    
    // Format borrowed date
    const borrowedDate = item.borrowedAt ? 
        (item.borrowedAt.toDate ? item.borrowedAt.toDate() : new Date(item.borrowedAt)) : 
        null;
    
    const borrowedDateStr = borrowedDate ? 
        borrowedDate.toLocaleDateString('de-DE', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Unbekannt';
    
    // Get loan duration if available
    let durationInfo = '';
    if (item.borrowedAt) {
        const now = new Date();
        const borrowed = borrowedDate || now;
        const diffTime = Math.abs(now - borrowed);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            durationInfo = ` (seit ${diffDays} Tag)`;
        } else {
            durationInfo = ` (seit ${diffDays} Tagen)`;
        }
    }
    
    // Build contact information
    let contactInfo = '';
    if (user) {
        contactInfo = `
            <div class="borrower-contact-info">
                <div class="contact-item">
                    <strong>Email:</strong> <span class="contact-text">${user.email || kennung + '@fh-muenster.de'}</span>
                </div>
                ${user.phone ? `
                    <div class="contact-item">
                        <strong>Telefon:</strong> <span class="contact-text">${user.phone}</span>
                    </div>
                ` : `
                    <div class="contact-item">
                        <em>Telefonnummer nicht verfügbar</em>
                    </div>
                `}
            </div>
        `;
    } else {
        // Fallback if user not found
        contactInfo = `
            <div class="borrower-contact-info">
                <div class="contact-item">
                    <strong>Email:</strong> <span class="contact-text">${kennung}@fh-muenster.de</span>
                </div>
                <div class="contact-item">
                    <em>Telefonnummer nicht verfügbar</em>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="borrower-info">
            <div class="borrower-header">
                <strong>Ausgeliehen an:</strong> ${user ? user.name : kennung} (${kennung})
            </div>
            <div class="borrower-details">
                <strong>Seit:</strong> ${borrowedDateStr}${durationInfo}
            </div>
            ${contactInfo}

        </div>
    `;
}

/**
 * Get equipment request timeframe based on duration
 */
function getEquipmentRequestTimeframe(request) {
    if (!request || !request.duration) {
        return 'Unbekannt - Unbekannt';
    }
    
    // Get start date (request creation date) with robust parsing
    let startDate;
    try {
        if (request.createdAt) {
            if (request.createdAt.toDate && typeof request.createdAt.toDate === 'function') {
                // Firestore Timestamp
                startDate = request.createdAt.toDate();
            } else if (request.createdAt instanceof Date) {
                // JavaScript Date object
                startDate = request.createdAt;
            } else if (typeof request.createdAt === 'number') {
                // Unix timestamp (milliseconds)
                startDate = new Date(request.createdAt);
            } else if (typeof request.createdAt === 'string') {
                // Date string
                startDate = new Date(request.createdAt);
            } else {
                // Fallback to current date
                startDate = new Date();
            }
        } else {
            // No createdAt, use current date
            startDate = new Date();
        }
        
        // Validate the date
        if (isNaN(startDate.getTime())) {
            console.warn('Invalid startDate, using current date:', request.createdAt);
            startDate = new Date();
        }
    } catch (error) {
        console.error('Error parsing startDate:', error, request.createdAt);
        startDate = new Date();
    }
    
    // Calculate end date based on duration
    const endDate = new Date(startDate);
    
    switch (request.duration) {
        case '1_hour':
            endDate.setHours(endDate.getHours() + 1);
            break;
        case '2_hours':
            endDate.setHours(endDate.getHours() + 2);
            break;
        case 'half_day':
            endDate.setHours(endDate.getHours() + 12);
            break;
        case 'full_day':
            endDate.setDate(endDate.getDate() + 1);
            break;
        case 'week':
            endDate.setDate(endDate.getDate() + 7);
            break;
        case 'other':
            // For 'other' duration, assume 1 day
            endDate.setDate(endDate.getDate() + 1);
            break;
        default:
            // Default to 1 day
            endDate.setDate(endDate.getDate() + 1);
    }
    
    try {
        const startDateStr = startDate.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const endDateStr = endDate.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `${startDateStr} - ${endDateStr}`;
    } catch (error) {
        console.error('Error formatting dates:', error);
        return 'Datum nicht verfügbar';
    }
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
    const confirmed = await window.toast.confirm(`Möchtest du "${equipmentItem.name}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`);
    
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
        
        // Also search for users in entries collection (for users who have made entries but might not be in users collection)
        try {
            const entriesSnapshot = await window.db.collection('entries').get();
            const entryUsers = new Set();
            
            entriesSnapshot.forEach(doc => {
                const entryData = doc.data();
                if (entryData.userKennung && !allUsers.find(u => u.kennung === entryData.userKennung)) {
                    entryUsers.add(entryData.userKennung);
                }
            });
            
            // Add entry users to allUsers if they don't exist
            entryUsers.forEach(kennung => {
                allUsers.push({
                    id: kennung,
                    kennung: kennung,
                    name: kennung, // Use kennung as name if no name available
                    email: `${kennung}@fh-muenster.de`,
                    phone: '',
                    isAdmin: false
                });
            });
            
            console.log(`📋 Added ${entryUsers.size} users from entries collection`);
        } catch (error) {
            console.error('❌ Error loading users from entries:', error);
        }
        
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
    
    // Check if equipment is already borrowed (unified system)
    if (equipmentItem.status === 'borrowed' || equipmentItem.borrowedByKennung) {
        safeShowToast('Equipment ist bereits ausgeliehen und kann nicht erneut ausgeliehen werden', 'error');
        return;
    }
    
    // Check for pending requests (unified system)
    const pendingRequests = equipmentItem.pendingRequests?.filter(req => 
        req.status === 'pending' || req.status === 'approved'
    ) || [];
    
    if (pendingRequests.length > 0) {
        const requestInfo = pendingRequests.map(req => {
            const userName = req.userName || req.userKennung || 'Unbekannter User';
            return `${userName} (${req.status === 'pending' ? 'Anfrage ausstehend' : 'Anfrage genehmigt'})`;
        }).join(', ');
        
        safeShowToast(`Equipment hat bereits ausstehende Anfragen: ${requestInfo}`, 'error');
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
        // Find selected user from allUsers (which includes users from both users and entries collections)
        const selectedUser = allUsers ? allUsers.find(user => user.kennung === selectedUserKennung) : null;
        if (!selectedUser) {
            safeShowToast('Ausgewählter Benutzer nicht gefunden', 'error');
            return;
        }
        
        console.log('📋 Selected user for admin borrow:', selectedUser);
        
        // Use the existing user data - don't create new user documents
        // The user already exists in the system (either in users collection or entries collection)
        // We just use their existing data for the equipment loan
        
        // Create loan request with status 'given' (unified system)
        const loanRequestId = `admin_loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const currentTimestamp = new Date();
        const loanData = {
            id: loanRequestId,
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
            givenBy: window.currentUser?.name || window.currentUser?.displayName || 'Admin',
            givenByKennung: window.currentUser?.kennung || window.currentUser?.uid || '',
            giveNote: note,
            givenAt: currentTimestamp,
            createdAt: currentTimestamp
        };
        
        // Get equipment document to clean up pending requests (unified system)
        const equipmentRef = window.db.collection('equipment').doc(equipmentId);
        const equipmentDoc = await equipmentRef.get();
        
        if (!equipmentDoc.exists) {
            throw new Error('Equipment nicht gefunden');
        }
        
        const equipmentData = equipmentDoc.data();
        const pendingRequests = equipmentData.pendingRequests || [];
        
        // Remove any approved requests for this equipment (unified system)
        const cleanedRequests = pendingRequests.filter(req => req.status !== 'approved');
        
        // Add the new admin loan request to pendingRequests (unified system)
        cleanedRequests.push(loanData);
        
        // Update equipment status (unified system)
        const updateData = {
            status: 'borrowed',
            borrowedByKennung: selectedUser.kennung,
            borrowedByName: selectedUser.name,
            borrowedAt: firebase.firestore.FieldValue.serverTimestamp(),
            pendingRequests: cleanedRequests,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // If deposit is required, mark it as paid
        if (equipmentItem.requiresDeposit) {
            updateData.depositPaid = true;
        }
        
        await equipmentRef.update(updateData);
        
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
    if (!equipmentItem) {
        safeShowToast('Equipment nicht gefunden', 'error');
        return;
    }
    
    const confirmed = await window.toast.confirm('Equipment als zurückgegeben markieren?');
    if (!confirmed) return;
    
    try {
        // Get equipment document to clean up pending requests (unified system)
        const equipmentRef = window.db.collection('equipment').doc(equipmentId);
        const equipmentDoc = await equipmentRef.get();
        
        if (!equipmentDoc.exists) {
            throw new Error('Equipment nicht gefunden');
        }
        
        const equipmentData = equipmentDoc.data();
        const pendingRequests = equipmentData.pendingRequests || [];
        
        // Mark all approved/given requests for this equipment as returned (unified system)
        const updatedRequests = pendingRequests.map(req => {
            if (req.status === 'approved' || req.status === 'given') {
                return {
                    ...req,
                    status: 'returned',
                    returnedAt: new Date().toISOString()
                };
            }
            return req;
        });
        
        const updateData = {
            status: 'available',
            borrowedByKennung: firebase.firestore.FieldValue.delete(),
            borrowedAt: firebase.firestore.FieldValue.delete(),
            rentedByKennung: firebase.firestore.FieldValue.delete(),
            rentedAt: firebase.firestore.FieldValue.delete(),
            returnedAt: firebase.firestore.FieldValue.serverTimestamp(),
            pendingRequests: updatedRequests,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Reset deposit status when returning
        if (equipmentItem && equipmentItem.requiresDeposit) {
            updateData.depositPaid = false;
        }
        
        await equipmentRef.update(updateData);
        
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
    const confirmed = await window.toast.confirm('Pfand als bezahlt markieren?');
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
    const badge = document.querySelector('[data-badge="equipment-requests"]');
    if (!badge) {
        console.log('⚠️ Equipment requests badge not found');
        return;
    }
    
    // Count pending equipment requests from equipment collection (unified system)
    const pendingCount = equipment.reduce((count, item) => {
        const pendingRequests = item.pendingRequests || [];
        const pendingEquipmentRequests = pendingRequests.filter(req => 
            req.status === 'pending' && req.type === 'equipment'
        );
        return count + pendingEquipmentRequests.length;
    }, 0);
    
    console.log(`🔢 Equipment requests badge: ${pendingCount} pending equipment requests`);
    
    if (pendingCount > 0) {
        badge.textContent = pendingCount;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
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
window.cleanupEquipmentPendingRequests = cleanupEquipmentPendingRequests;
window.deleteEquipment = deleteEquipment;
window.updateMachineOverview = updateMachineOverview;
// window.requestEquipmentReturn removed - function no longer exists
window.confirmEquipmentReturn = confirmEquipmentReturn;
window.setupEquipmentRequestsListener = setupEquipmentRequestsListener;
window.loadEquipmentRequests = loadEquipmentRequests;
window.loadAllUsersForEquipment = loadAllUsersForEquipment;

// Make equipmentRequests globally available for button logic
window.equipmentRequests = equipmentRequests;
// getUserDetails function removed - using direct data access instead

/**
 * Approve equipment request and mark equipment as borrowed (unified system)
 */
async function approveEquipmentRequest(requestId, equipmentId) {
  try {
        const confirmed = await window.toast.confirm('Der Artikel wird als ausgegeben markiert. Fortfahren?');
    if (!confirmed) {
        return;
    }
    
    // Ask about deposit payment
    const depositPaid = await window.toast.confirm('Wurde der Pfand bezahlt?', 'Ja', 'Nein');
    
    if (depositPaid === null) {
        // User cancelled
        return;
    }
    
    const loadingId = window.loading ? window.loading.show('Anfrage wird genehmigt...') : null;
    
    // Get equipment document
    const equipmentRef = window.db.collection('equipment').doc(equipmentId);
    const equipmentDoc = await equipmentRef.get();
    
    if (!equipmentDoc.exists) {
      throw new Error('Equipment nicht gefunden');
    }
    
    const equipmentData = equipmentDoc.data();
    const pendingRequests = equipmentData.pendingRequests || [];
    
    // Find the request in pendingRequests array
    const requestIndex = pendingRequests.findIndex(req => req.id === requestId);
    if (requestIndex === -1) {
      throw new Error('Anfrage nicht gefunden');
    }
    
    const requestData = pendingRequests[requestIndex];
    
    // Update request status to given (approved and handed out)
    pendingRequests[requestIndex] = {
      ...requestData,
      status: 'given',
      approvedAt: new Date().toISOString(),
      approvedBy: window.currentUser?.kennung || 'admin',
      givenBy: window.currentUser?.name || 'Admin',
      givenByKennung: window.currentUser?.kennung || 'admin',
      givenAt: new Date().toISOString(),
      depositPaid: depositPaid
    };
    
    // Update equipment: approve request and mark as borrowed
    await equipmentRef.update({
      status: 'borrowed',
      borrowedByKennung: requestData.userKennung,
      borrowedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      pendingRequests: pendingRequests,
      depositPaid: depositPaid,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
    
    if (loadingId && window.loading) window.loading.hide(loadingId);
    
    if (window.toast) {
      window.toast.success('Ausleihe-Anfrage genehmigt und Equipment ausgegeben');
    } else {
      alert('Ausleihe-Anfrage genehmigt und Equipment ausgegeben');
    }
    
    // Update equipment requests badge
    updateEquipmentRequestsBadge();
    
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
 * Reject equipment request (unified system)
 */
async function rejectEquipmentRequest(requestId, equipmentId) {
  try {
        const confirmed = await window.toast.confirm('Möchtest du diese Ausleihe-Anfrage ablehnen?');
    if (!confirmed) {
        return;
    }
    
    const loadingId = window.loading ? window.loading.show('Anfrage wird abgelehnt...') : null;
    
    // Get equipment document
    const equipmentRef = window.db.collection('equipment').doc(equipmentId);
    const equipmentDoc = await equipmentRef.get();
    
    if (!equipmentDoc.exists) {
      throw new Error('Equipment nicht gefunden');
    }
    
    const equipmentData = equipmentDoc.data();
    const pendingRequests = equipmentData.pendingRequests || [];
    
    // Find the request in pendingRequests array
    const requestIndex = pendingRequests.findIndex(req => req.id === requestId);
    if (requestIndex === -1) {
      throw new Error('Anfrage nicht gefunden');
    }
    
    const requestData = pendingRequests[requestIndex];
    
    // Update request status to rejected
    pendingRequests[requestIndex] = {
      ...requestData,
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectedBy: window.currentUser?.kennung || 'admin'
    };
    
    // Update equipment: reject request
    await equipmentRef.update({
      pendingRequests: pendingRequests,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
    
    if (loadingId && window.loading) window.loading.hide(loadingId);
    
    if (window.toast) {
      window.toast.success('Ausleihe-Anfrage erfolgreich abgelehnt');
    } else {
      alert('Ausleihe-Anfrage erfolgreich abgelehnt');
    }
    
    // Update equipment requests badge
    updateEquipmentRequestsBadge();
    
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
    const confirmed = await window.toast.confirm('Möchtest du die Rückgabe dieses Equipments bestätigen?');
    if (!confirmed) {
        return;
    }
    
    try {
        // Get equipment document to find pending return request (unified system)
        const equipmentRef = window.db.collection('equipment').doc(equipmentId);
        const equipmentDoc = await equipmentRef.get();
        
        if (!equipmentDoc.exists) {
            safeShowToast('Equipment nicht gefunden', 'error');
            return;
        }
        
        const equipmentData = equipmentDoc.data();
        const pendingRequests = equipmentData.pendingRequests || [];
        
        // Find pending return request in pendingRequests array
        const returnRequest = pendingRequests.find(req => 
            req.status === 'pending' && 
            req.type === 'return'
        );
        
        if (!returnRequest) {
            safeShowToast('Keine Rückgabe-Anfrage für dieses Equipment gefunden', 'error');
            return;
        }
        
        console.log('📝 Found return request:', returnRequest);
        
        // Remove the return request from pendingRequests array since it's now confirmed
        const updatedRequests = pendingRequests.filter(req => req.id !== returnRequest.id);
        
        // Also update the original request to mark it as returned
        const finalUpdatedRequests = updatedRequests.map(req => {
            if (req.id === returnRequest.originalRequestId) {
                return {
                    ...req,
                    status: 'returned',
                    returnedAt: new Date().toISOString(),
                    returnedBy: window.currentUser?.kennung || 'admin',
                    returnedByName: window.currentUser?.name || 'Administrator'
                };
            }
            return req;
        });
        
        // Update equipment status and pendingRequests
        const updateData = {
            status: 'available',
            borrowedByKennung: window.firebase.firestore.FieldValue.delete(),
            borrowedByName: window.firebase.firestore.FieldValue.delete(),
            borrowedAt: window.firebase.firestore.FieldValue.delete(),
            pendingRequests: finalUpdatedRequests,
            returnedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Reset deposit status when returning
        if (equipmentItem.requiresDeposit) {
            updateData.depositPaid = false;
        }
        
        await equipmentRef.update(updateData);
        
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

console.log("🔧 Equipment Management Module geladen (v1.0.0)");
console.log("🔧 Available functions:", {
    showEquipmentManager: typeof showEquipmentManager,
    confirmEquipmentReturn: typeof confirmEquipmentReturn,
    approveEquipmentRequest: typeof approveEquipmentRequest,
    rejectEquipmentRequest: typeof rejectEquipmentRequest
});

/**
 * Clean up duplicate or invalid pending requests
 * This function ensures only one pending request per equipment exists
 */
async function cleanupEquipmentPendingRequests() {
    try {
        console.log('🧹 Starting pending requests cleanup...');
        
        const equipmentSnapshot = await window.db.collection('equipment').get();
        let cleanedCount = 0;
        
        for (const doc of equipmentSnapshot.docs) {
            const equipmentData = doc.data();
            const pendingRequests = equipmentData.pendingRequests || [];
            
            // Group requests by user and type
            const userRequests = {};
            const requestsToKeep = [];
            let hasChanges = false;
            
            for (const request of pendingRequests) {
                const key = `${request.userKennung}_${request.type}`;
                
                if (!userRequests[key]) {
                    userRequests[key] = [];
                }
                userRequests[key].push(request);
            }
            
            // For each user-type combination, keep only the most recent pending request
            for (const [key, requests] of Object.entries(userRequests)) {
                const pendingRequests = requests.filter(req => req.status === 'pending');
                
                if (pendingRequests.length > 1) {
                    // Sort by creation date and keep only the most recent
                    pendingRequests.sort((a, b) => {
                        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                        return dateB - dateA;
                    });
                    
                    // Keep only the most recent pending request
                    requestsToKeep.push(pendingRequests[0]);
                    
                    // Mark all others as rejected
                    for (let i = 1; i < pendingRequests.length; i++) {
                        pendingRequests[i].status = 'rejected';
                        pendingRequests[i].rejectionReason = 'Automatisch abgelehnt - doppelte Anfrage';
                        requestsToKeep.push(pendingRequests[i]);
                    }
                    
                    hasChanges = true;
                    cleanedCount += pendingRequests.length - 1;
                } else {
                    // Keep all non-pending requests and single pending requests
                    requestsToKeep.push(...requests);
                }
            }
            
            // Update equipment document if changes were made
            if (hasChanges) {
                await window.db.collection('equipment').doc(doc.id).update({
                    pendingRequests: requestsToKeep,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log(`✅ Cleaned up equipment ${equipmentData.name}: ${cleanedCount} duplicate requests removed`);
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 Cleanup completed: ${cleanedCount} duplicate requests removed`);
            safeShowToast(`Cleanup abgeschlossen: ${cleanedCount} doppelte Anfragen entfernt`, 'success');
        } else {
            console.log('✅ No duplicate requests found');
        }
        
    } catch (error) {
        console.error('❌ Error during pending requests cleanup:', error);
        safeShowToast('Fehler beim Bereinigen der Anfragen', 'error');
    }
}

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