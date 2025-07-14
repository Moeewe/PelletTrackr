/**
 * Equipment Management System
 * Handles lending system for keys, hardware, and books
 */

// Global equipment state
let equipment = [];
let currentEquipmentCategory = 'keys';
let filteredEquipment = [];
let equipmentListener = null;

// Fixed categories - no more dynamic categories
const EQUIPMENT_CATEGORIES = {
    'keys': 'Schlüssel',
    'hardware': 'Hardware', 
    'books': 'Bücher'
};

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
        }, (error) => {
            console.error('Error in equipment listener:', error);
            showToast('Fehler beim Live-Update des Equipments', 'error');
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
            <h3>Equipment verwalten</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="card">
                <div class="card-body">
                    <div class="category-tabs">
                        <button class="tab-btn active" onclick="showEquipmentCategory('keys')">Schlüssel</button>
                        <button class="tab-btn" onclick="showEquipmentCategory('hardware')">Hardware</button>
                        <button class="tab-btn" onclick="showEquipmentCategory('books')">Bücher</button>
                    </div>
                    
                    <div class="equipment-search">
                        <input type="text" id="equipmentSearchInput" placeholder="Equipment durchsuchen..." class="search-input" onkeyup="searchEquipment()">
                        <button class="search-clear-btn" onclick="clearEquipmentSearch()" title="Suche löschen">×</button>
                    </div>
                    
                    <div class="equipment-list" id="equipmentList">
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
}

/**
 * Close equipment manager modal
 */
function closeEquipmentManager() {
    // Clean up listener
    if (equipmentListener) {
        equipmentListener();
        equipmentListener = null;
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
        showToast('Fehler beim Laden der Ausrüstung', 'error');
    }
}

/**
 * Search equipment based on name, description, or category
 */
function searchEquipment() {
    const searchTerm = document.getElementById('equipmentSearchInput').value.toLowerCase();
    
    if (searchTerm.trim() === '') {
        filteredEquipment = equipment;
    } else {
        filteredEquipment = equipment.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            (item.description && item.description.toLowerCase().includes(searchTerm)) ||
            (item.category && item.category.toLowerCase().includes(searchTerm))
        );
    }
    
    showEquipmentCategory(currentEquipmentCategory);
}

/**
 * Clear equipment search
 */
function clearEquipmentSearch() {
    document.getElementById('equipmentSearchInput').value = '';
    filteredEquipment = equipment;
    showEquipmentCategory(currentEquipmentCategory);
}

/**
 * Show equipment category
 */
function showEquipmentCategory(category) {
    currentEquipmentCategory = category;
    
    // Update tab buttons - search within equipment modal only
    const equipmentModal = document.getElementById('equipmentModal');
    if (equipmentModal) {
        equipmentModal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Find the clicked tab button or set first one as active
        const clickedBtn = event?.target;
        if (clickedBtn && clickedBtn.classList.contains('tab-btn')) {
            clickedBtn.classList.add('active');
        } else {
            // Set the tab for the current category as active
            const categoryTab = equipmentModal.querySelector(`.tab-btn[onclick*="${category}"]`);
            if (categoryTab) {
                categoryTab.classList.add('active');
            }
        }
    }
    
    // Filter equipment by category from filteredEquipment (search results)
    const categoryEquipment = filteredEquipment.filter(item => item.category === category);
    renderEquipmentList(categoryEquipment);
}



/**
 * Render equipment list
 */
function renderEquipmentList(equipmentList) {
    const container = document.getElementById('equipmentList');
    
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
    
    container.innerHTML = equipmentList.map(item => `
        <div class="equipment-item ${item.requiresDeposit ? 'requires-deposit' : ''}">
            <div class="equipment-header">
                <div class="equipment-name">${item.name}</div>
                <div class="equipment-status-row">
                    <span class="equipment-status ${item.status}">${getEquipmentStatusText(item.status)}</span>
                    ${item.requiresDeposit ? `
                        <span class="equipment-deposit ${item.depositPaid ? 'paid' : 'unpaid'}" title="Pfand ${item.depositPaid ? 'bezahlt' : 'ausstehend'}">
                            ${item.depositAmount}€ ${item.depositPaid ? 'Bezahlt' : 'Ausstehend'}
                        </span>
                    ` : ''}
                </div>
            </div>
            <div class="equipment-info">${item.description || 'Keine Beschreibung'}</div>
            ${item.status === 'borrowed' && item.borrowedBy ? `
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
                ${item.status === 'available' ? `
                    <button class="btn btn-primary" onclick="borrowEquipment('${item.id}')">Ausleihen</button>
                ` : item.status === 'borrowed' ? `
                    <button class="btn btn-success" onclick="returnEquipment('${item.id}')">Zurückgeben</button>
                    ${item.requiresDeposit && !item.depositPaid ? `
                        <button class="btn btn-warning" onclick="markDepositAsPaid('${item.id}')">Pfand als bezahlt markieren</button>
                    ` : ''}
                ` : ''}
                <button class="btn btn-secondary" onclick="editEquipment('${item.id}')">Bearbeiten</button>
            </div>
        </div>
    `).join('');
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
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Equipment hinzufügen</h3>
                <button class="modal-close" onclick="closeAddEquipmentForm()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="equipmentForm" class="form">
                    <div class="form-group">
                        <label class="form-label">Name</label>
                        <input type="text" id="equipmentName" class="form-input" placeholder="z.B. Schlüssel Labor 1, Zangensatz, etc.">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Kategorie</label>
                        <select id="equipmentCategory" class="form-select">
                            ${Object.entries(EQUIPMENT_CATEGORIES).map(([key, name]) => `
                                <option value="${key}">${name}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Beschreibung</label>
                        <textarea id="equipmentDescription" class="form-textarea" placeholder="Beschreibung des Equipment..." rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select id="equipmentStatus" class="form-select">
                            <option value="available">Verfügbar</option>
                            <option value="maintenance">Wartung</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Pfand-System</label>
                        <div class="form-checkbox-group">
                            <label class="form-checkbox">
                                <input type="checkbox" id="requiresDeposit" class="form-checkbox-input">
                                <span class="form-checkbox-label">Pfand erforderlich</span>
                            </label>
                            <input type="number" id="depositAmount" class="form-input" placeholder="Pfand-Betrag €" step="0.01" style="display: none;">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeAddEquipmentForm()">Abbrechen</button>
                        <button type="button" class="btn btn-primary" onclick="saveEquipment()">Speichern</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.id = 'addEquipmentModal';
    
    // Set default category
    document.getElementById('equipmentCategory').value = currentEquipmentCategory;
    
    // Add event listener for deposit checkbox
    document.getElementById('requiresDeposit').addEventListener('change', function() {
        const depositAmount = document.getElementById('depositAmount');
        if (this.checked) {
            depositAmount.style.display = 'block';
            depositAmount.required = true;
        } else {
            depositAmount.style.display = 'none';
            depositAmount.required = false;
            depositAmount.value = '';
        }
    });
}

/**
 * Close add equipment form
 */
function closeAddEquipmentForm() {
    const modal = document.getElementById('addEquipmentModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Save equipment
 */
async function saveEquipment() {
    const form = document.getElementById('equipmentForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const equipmentData = {
        name: formData.get('equipmentName').trim(),
        category: formData.get('equipmentCategory'),
        description: formData.get('equipmentDescription').trim(),
        status: formData.get('equipmentStatus'),
        requiresDeposit: formData.get('requiresDeposit') === 'on',
        depositAmount: formData.get('requiresDeposit') === 'on' ? 
            parseFloat(formData.get('depositAmount')) || 0 : 0,
        depositPaid: false, // Initially no deposit paid
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (!equipmentData.name) {
        showToast('Bitte geben Sie einen Namen ein', 'error');
        return;
    }
    
    if (equipmentData.requiresDeposit && !equipmentData.depositAmount) {
        showToast('Bitte geben Sie einen Pfand-Betrag ein', 'error');
        return;
    }
    
    try {
        await window.db.collection('equipment').add(equipmentData);
        
        showToast('Equipment erfolgreich hinzugefügt', 'success');
        closeAddEquipmentForm();
        // Removed manual reload - real-time listener will handle the update
        
    } catch (error) {
        console.error('Error saving equipment:', error);
        showToast('Fehler beim Speichern', 'error');
    }
}

/**
 * Edit equipment
 */
function editEquipment(equipmentId) {
    const equipmentItem = equipment.find(item => item.id === equipmentId);
    if (!equipmentItem) {
        showToast('Equipment nicht gefunden', 'error');
        return;
    }
    
    // Create edit modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Equipment bearbeiten</h3>
                <button class="modal-close" onclick="closeEditEquipmentForm()">&times;</button>
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
                        <button type="button" class="btn btn-secondary" onclick="closeEditEquipmentForm()">Abbrechen</button>
                        <button type="button" class="btn btn-primary" onclick="updateEquipment('${equipmentId}')">Speichern</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.id = 'editEquipmentModal';
    
    // Add deposit toggle functionality
    const depositCheckbox = document.getElementById('editEquipmentRequiresDeposit');
    const depositGroup = document.querySelector('.deposit-group');
    
    depositCheckbox.addEventListener('change', function() {
        depositGroup.style.display = this.checked ? 'block' : 'none';
    });
}

/**
 * Close edit equipment form
 */
function closeEditEquipmentForm() {
    const modal = document.getElementById('editEquipmentModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Update equipment
 */
async function updateEquipment(equipmentId) {
    const form = document.getElementById('editEquipmentForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const equipmentData = {
        name: formData.get('editEquipmentName').trim(),
        category: formData.get('editEquipmentCategory'),
        description: formData.get('editEquipmentDescription').trim(),
        status: formData.get('editEquipmentStatus'),
        requiresDeposit: formData.get('editEquipmentRequiresDeposit') === 'on',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (equipmentData.requiresDeposit) {
        const depositAmount = parseFloat(formData.get('editEquipmentDepositAmount'));
        if (isNaN(depositAmount) || depositAmount <= 0) {
            showToast('Pfandbetrag muss eine positive Zahl sein', 'error');
            return;
        }
        equipmentData.depositAmount = depositAmount;
    } else {
        // Remove deposit fields if not required
        equipmentData.depositAmount = firebase.firestore.FieldValue.delete();
        equipmentData.depositPaid = firebase.firestore.FieldValue.delete();
    }
    
    if (!equipmentData.name || !equipmentData.category) {
        showToast('Bitte alle Pflichtfelder ausfüllen', 'error');
        return;
    }
    
    try {
        await window.db.collection('equipment').doc(equipmentId).update(equipmentData);
        
        showToast('Equipment erfolgreich aktualisiert', 'success');
        closeEditEquipmentForm();
        // Removed manual reload - real-time listener will handle the update
        
    } catch (error) {
        console.error('Error updating equipment:', error);
        showToast('Fehler beim Aktualisieren', 'error');
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
        showToast('Ausleihe abgebrochen. Pfand muss vor der Ausleihe bezahlt werden.', 'warning');
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
        
        showToast(`Equipment erfolgreich an ${userName} ausgeliehen`, 'success');
        // Removed manual reload - real-time listener will handle the update
        
    } catch (error) {
        console.error('Error borrowing equipment:', error);
        showToast('Fehler beim Ausleihen', 'error');
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
        
        showToast('Equipment erfolgreich zurückgegeben', 'success');
        // Removed manual reload - real-time listener will handle the update
        
    } catch (error) {
        console.error('Error returning equipment:', error);
        showToast('Fehler bei der Rückgabe', 'error');
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
        
        showToast('Pfand als bezahlt markiert', 'success');
        // Removed manual reload - real-time listener will handle the update
        
    } catch (error) {
        console.error('Error marking deposit as paid:', error);
        showToast('Fehler beim Markieren des Pfands', 'error');
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
window.showEquipmentManager = showEquipmentManager;
window.closeEquipmentManager = closeEquipmentManager;
window.loadEquipment = loadEquipment;
window.showEquipmentCategory = showEquipmentCategory;
window.searchEquipment = searchEquipment;
window.clearEquipmentSearch = clearEquipmentSearch;
window.borrowEquipment = borrowEquipment;
window.returnEquipment = returnEquipment;
window.editEquipment = editEquipment;
window.showAddEquipmentForm = showAddEquipmentForm;
window.closeAddEquipmentForm = closeAddEquipmentForm;
window.saveEquipment = saveEquipment;
window.markDepositAsPaid = markDepositAsPaid;
window.showAddCategoryForm = showAddCategoryForm;
window.closeAddCategoryForm = closeAddCategoryForm;
window.saveCategory = saveCategory;
window.showManageCategoriesForm = showManageCategoriesForm;
window.closeManageCategoriesForm = closeManageCategoriesForm;
window.editCategory = editCategory;
window.closeEditCategoryForm = closeEditCategoryForm;
window.updateCategory = updateCategory;
window.deleteCategory = deleteCategory;
window.deleteEquipmentRequest = deleteEquipmentRequest;
window.closeEditEquipmentForm = closeEditEquipmentForm;
window.updateEquipment = updateEquipment;

console.log("🔧 Equipment Management Module geladen"); 