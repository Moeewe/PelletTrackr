/**
 * Equipment Management System
 * Handles lending system for keys, hardware, and books
 */

// Equipment Management Module - Extended with Requests Support
let equipment = [];
let equipmentListener = null;
let equipmentRequests = [];
let equipmentRequestsListener = null;
let currentEquipmentCategory = 'Hardware';
let filteredEquipment = [];

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
                equipment.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log('Live update: Loaded equipment:', equipment.length);
            showEquipmentCategory(currentEquipmentCategory);
            
            // Update machine overview in admin dashboard
            updateMachineOverview();
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
 * Show equipment manager modal
 */
function showEquipmentManager() {
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
                        <button class="tab-btn active" onclick="showEquipmentCategory('keys')">Schlüssel</button>
                        <button class="tab-btn" onclick="showEquipmentCategory('hardware')">Hardware</button>
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
            <button class="btn btn-warning" onclick="showEquipmentRequests()">
                Anfragen verwalten
                <span id="equipment-requests-footer-badge" class="notification-badge" style="display: none;">0</span>
            </button>
            <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
    setupEquipmentListener();
    setupEquipmentRequestsListener();
    loadEquipmentRequests();
    
    // Update notification badge immediately
    updateEquipmentRequestsBadge();
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
        showEquipmentCategory(currentEquipmentCategory);
        console.log('Loaded equipment:', equipment.length);
        
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
    
    container.innerHTML = equipmentList.map(item => {
        // Check if there's a pending request for this equipment
        const pendingRequest = getPendingRequestForEquipment(item.id);
        
        return `
        <div class="equipment-item ${item.requiresDeposit ? 'requires-deposit' : ''} ${pendingRequest ? 'has-pending-request' : ''}">
            <div class="equipment-header">
                <div class="equipment-name">${item.name}</div>
                <div class="equipment-status-row">
                    <span class="equipment-status ${pendingRequest ? 'requested' : item.status}">${pendingRequest ? 'Angefragt' : getEquipmentStatusText(item.status)}</span>
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
                    <strong>Ausleihe angefragt von:</strong> ${pendingRequest.userName} (${pendingRequest.userKennung})
                    <br><strong>Zeitraum:</strong> ${pendingRequest.fromDate ? new Date(pendingRequest.fromDate.seconds * 1000).toLocaleDateString() : 'Unbekannt'} - ${pendingRequest.toDate ? new Date(pendingRequest.toDate.seconds * 1000).toLocaleDateString() : 'Unbekannt'}
                    <br><strong>Grund:</strong> ${pendingRequest.reason || 'Kein Grund angegeben'}
                </div>
            ` : item.status === 'borrowed' && item.borrowedBy ? `
                <div class="equipment-current-user">
                    Ausgeliehen an: <strong>${item.borrowedBy}</strong><br>
                    Seit: ${new Date(item.borrowedAt.toDate()).toLocaleDateString()}
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
                ${pendingRequest ? `
                    <button class="btn btn-warning" onclick="showEquipmentRequests('${item.id}')">Anfrage beantworten</button>
                    <button class="btn btn-secondary" onclick="editEquipment('${item.id}')">Bearbeiten</button>
                    <button class="btn btn-tertiary" onclick="duplicateEquipment('${item.id}')">Dublizieren</button>
                ` : item.status === 'available' ? `
                    <button class="btn btn-primary" onclick="borrowEquipment('${item.id}')">Ausleihen</button>
                    <button class="btn btn-secondary" onclick="editEquipment('${item.id}')">Bearbeiten</button>
                    <button class="btn btn-tertiary" onclick="duplicateEquipment('${item.id}')">Dublizieren</button>
                ` : item.status === 'borrowed' ? `
                    <button class="btn btn-success" onclick="returnEquipment('${item.id}')">Zurückgeben</button>
                    ${item.requiresDeposit && !item.depositPaid ? `
                        <button class="btn btn-warning" onclick="markDepositAsPaid('${item.id}')">Pfand als bezahlt markieren</button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="editEquipment('${item.id}')">Bearbeiten</button>
                    <button class="btn btn-tertiary" onclick="duplicateEquipment('${item.id}')">Dublizieren</button>
                ` : `
                    <button class="btn btn-secondary" onclick="editEquipment('${item.id}')">Bearbeiten</button>
                    <button class="btn btn-tertiary" onclick="duplicateEquipment('${item.id}')">Dublizieren</button>
                `}
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
        'maintenance': 'Wartung'
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
    const confirmed = await toast.confirm(
        `Möchtest du "${equipmentItem.name}" wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden.`,
        'Löschen',
        'Abbrechen'
    );
    
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
    const equipmentItem = equipment.find(item => item.id === equipmentId);
    const userName = prompt('Name des Entleihers:');
    if (!userName) return;
    
    let proceedWithBorrow = true;
    
    // Check if deposit is required
    if (equipmentItem && equipmentItem.requiresDeposit) {
        const depositConfirm = confirm(`Für dieses Equipment ist ein Pfand von ${equipmentItem.depositAmount}€ erforderlich. Wurde das Pfand bezahlt?`);
        if (!depositConfirm) {
            proceedWithBorrow = false;
        }
    }
    
    if (!proceedWithBorrow) {
        safeShowToast('Ausleihe abgebrochen. Pfand muss vor der Ausleihe bezahlt werden.', 'warning');
        return;
    }
    
    try {
        const updateData = {
            status: 'borrowed',
            borrowedBy: userName,
            borrowedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // If deposit is required, mark it as paid
        if (equipmentItem && equipmentItem.requiresDeposit) {
            updateData.depositPaid = true;
        }
        
        await window.db.collection('equipment').doc(equipmentId).update(updateData);
        
        safeShowToast(`Equipment erfolgreich an ${userName} ausgeliehen`, 'success');
        // Removed manual reload - real-time listener will handle the update
        
        // Update machine overview
        updateMachineOverview();
        
    } catch (error) {
        console.error('Error borrowing equipment:', error);
        safeShowToast('Fehler beim Ausleihen', 'error');
    }
}

/**
 * Return equipment
 */
async function returnEquipment(equipmentId) {
    const equipmentItem = equipment.find(item => item.id === equipmentId);
    
    if (!confirm('Equipment als zurückgegeben markieren?')) return;
    
    try {
        const updateData = {
            status: 'available',
            borrowedBy: firebase.firestore.FieldValue.delete(),
            borrowedAt: firebase.firestore.FieldValue.delete(),
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
    if (!confirm('Pfand als bezahlt markieren?')) return;
    
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
function setupEquipmentRequestsListener() {
  if (!window.db) {
    setTimeout(setupEquipmentRequestsListener, 500);
    return;
  }
  
  if (equipmentRequestsListener) {
    equipmentRequestsListener();
    equipmentRequestsListener = null;
  }
  
  try {
    equipmentRequestsListener = window.db.collection('requests')
      .where('type', '==', 'equipment')
      .where('status', '==', 'pending')
      .onSnapshot((snapshot) => {
        equipmentRequests = [];
        snapshot.forEach(doc => {
          equipmentRequests.push({
            id: doc.id,
            ...doc.data()
          });
        });
        console.log('Live update: Loaded equipment requests:', equipmentRequests.length);
        
        // Update notification badge
        updateEquipmentRequestsBadge();
        
        // Re-render equipment with updated request data
        if (equipment.length > 0) {
          showEquipmentCategory(currentEquipmentCategory);
        }
      }, (error) => {
        console.error('Error in equipment requests listener:', error);
      });
    
    console.log("✅ Equipment requests listener registered");
  } catch (error) {
    console.error("❌ Failed to setup equipment requests listener:", error);
  }
}

/**
 * Get pending equipment request for a specific equipment item
 */
function getPendingRequestForEquipment(equipmentId) {
  return equipmentRequests.find(request => 
    request.equipmentId === equipmentId && request.status === 'pending'
  );
}

/**
 * Load equipment requests from Firebase
 */
async function loadEquipmentRequests() {
  try {
    const querySnapshot = await window.db.collection('requests')
      .where('type', '==', 'equipment')
      .where('status', '==', 'pending')
      .get();
    
    equipmentRequests = [];
    querySnapshot.forEach(doc => {
      equipmentRequests.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('Loaded equipment requests:', equipmentRequests.length);
  } catch (error) {
    console.error('Error loading equipment requests:', error);
  }
}

/**
 * Update the notification badge for equipment requests
 */
function updateEquipmentRequestsBadge() {
    const badge = document.getElementById('equipment-requests-badge');
    const footerBadge = document.getElementById('equipment-requests-footer-badge');
    
    const count = equipmentRequests.length;
    const shouldShow = count > 0;
    
    if (badge) {
        badge.textContent = count;
        badge.style.display = shouldShow ? 'inline-block' : 'none';
    }
    
    if (footerBadge) {
        footerBadge.textContent = count;
        footerBadge.style.display = shouldShow ? 'inline-block' : 'none';
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
window.updateEquipmentRequestsBadge = updateEquipmentRequestsBadge;
window.approveEquipmentRequest = approveEquipmentRequest;
window.rejectEquipmentRequest = rejectEquipmentRequest;

/**
 * Approve equipment request and mark equipment as borrowed
 */
async function approveEquipmentRequest(requestId, equipmentId) {
  try {
    if (!confirm('Möchtest du diese Ausleihe-Anfrage genehmigen?')) {
      return;
    }
    
    const loadingId = window.loading ? window.loading.show('Anfrage wird genehmigt...') : null;
    
    // Get the request data first
    const requestDoc = await window.db.collection('equipmentRequests').doc(requestId).get();
    if (!requestDoc.exists) {
      throw new Error('Anfrage nicht gefunden');
    }
    
    const requestData = requestDoc.data();
    
    // Start a batch operation
    const batch = window.db.batch();
    
    // Update the equipment status to borrowed
    const equipmentRef = window.db.collection('equipment').doc(equipmentId);
    batch.update(equipmentRef, {
      status: 'borrowed',
      borrowedBy: requestData.userName,
      borrowedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      borrowedByKennung: requestData.userKennung
    });
    
    // Update the request status to approved and active
    const requestRef = window.db.collection('equipmentRequests').doc(requestId);
    batch.update(requestRef, {
      status: 'approved',
      approvedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      equipmentId: equipmentId
    });
    
    // Commit the batch
    await batch.commit();
    
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
async function rejectEquipmentRequest(requestId) {
  try {
    if (!confirm('Möchtest du diese Ausleihe-Anfrage ablehnen?')) {
      return;
    }
    
    const loadingId = window.loading ? window.loading.show('Anfrage wird abgelehnt...') : null;
    
    // Update the request status to rejected
    await window.db.collection('requests').doc(requestId).update({
      status: 'rejected',
      rejectedAt: window.firebase.firestore.FieldValue.serverTimestamp()
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
 * Update machine overview in admin dashboard
 */
function updateMachineOverview() {
    // Get printer data from printer management system
    if (typeof printers === 'undefined' || !printers || printers.length === 0) {
        console.log('📊 No printers data available for overview update');
        return;
    }
    
    const available = printers.filter(printer => printer.status === 'available').length;
    const inUse = printers.filter(printer => printer.status === 'printing').length;
    const maintenance = printers.filter(printer => 
        printer.status === 'maintenance' || printer.status === 'broken'
    ).length;
    
    // Update display elements
    const availableElement = document.getElementById('availableMachines');
    const inUseElement = document.getElementById('inUseMachines');
    const maintenanceElement = document.getElementById('maintenanceMachines');
    
    if (availableElement) {
        availableElement.textContent = available;
        // Update CSS class for empty state
        const availableCircle = availableElement.closest('.status-circle');
        if (availableCircle) {
            availableCircle.classList.toggle('empty', available === 0);
        }
    }
    
    if (inUseElement) {
        inUseElement.textContent = inUse;
        // Update CSS class for empty state
        const inUseCircle = inUseElement.closest('.status-circle');
        if (inUseCircle) {
            inUseCircle.classList.toggle('empty', inUse === 0);
        }
    }
    
    if (maintenanceElement) {
        maintenanceElement.textContent = maintenance;
        // Update CSS class for empty state
        const maintenanceCircle = maintenanceElement.closest('.status-circle');
        if (maintenanceCircle) {
            maintenanceCircle.classList.toggle('empty', maintenance === 0);
        }
    }
    
    console.log(`📊 Printer Overview Updated: ${available} available, ${inUse} in use, ${maintenance} maintenance (Wartung + Defekt)`);
}

console.log("🔧 Equipment Management Module geladen"); 