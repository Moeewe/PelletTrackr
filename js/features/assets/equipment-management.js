/**
 * Equipment Management System
 * Handles lending system for keys, tools, and accessories
 */

// Global equipment state
let equipment = [];
let currentEquipmentCategory = 'keys';
let equipmentCategories = []; // Dynamic categories from Firebase

/**
 * Show equipment manager modal
 */
function showEquipmentManager() {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('equipmentModal').style.display = 'block';
    loadEquipmentCategories();
    loadEquipment();
}

/**
 * Close equipment manager modal
 */
function closeEquipmentManager() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('equipmentModal').style.display = 'none';
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
        
        showEquipmentCategory(currentEquipmentCategory);
        console.log('Loaded equipment:', equipment.length);
        
    } catch (error) {
        console.error('Error loading equipment:', error);
        showToast('Fehler beim Laden der Ausrüstung', 'error');
    }
}

/**
 * Load equipment categories from Firebase
 */
async function loadEquipmentCategories() {
    try {
        const snapshot = await window.db.collection('equipmentCategories').orderBy('createdAt', 'asc').get();
        equipmentCategories = [];
        
        snapshot.forEach((doc) => {
            equipmentCategories.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // If no categories exist, create default ones
        if (equipmentCategories.length === 0) {
            await createDefaultCategories();
        }
        
        renderCategoryTabs();
        console.log('Loaded equipment categories:', equipmentCategories.length);
        
    } catch (error) {
        console.error('Error loading equipment categories:', error);
        showToast('Fehler beim Laden der Kategorien', 'error');
    }
}

/**
 * Create default equipment categories
 */
async function createDefaultCategories() {
    const defaultCategories = [
        { key: 'keys', name: 'Schlüssel', icon: '🔑' },
        { key: 'tools', name: 'Werkzeuge', icon: '🔧' },
        { key: 'accessories', name: 'Zubehör', icon: '📦' },
        { key: 'printers', name: 'Drucker', icon: '🖨️' },
        { key: 'cameras', name: 'Kameras', icon: '📷' },
        { key: 'gadgets', name: 'Gadgets', icon: '📱' },
        { key: 'books', name: 'Bücher', icon: '📚' }
    ];
    
    try {
        for (const category of defaultCategories) {
            await window.db.collection('equipmentCategories').add({
                ...category,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        await loadEquipmentCategories(); // Reload after creating
        
    } catch (error) {
        console.error('Error creating default categories:', error);
        showToast('Fehler beim Erstellen der Standard-Kategorien', 'error');
    }
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
    
    // Filter equipment by category
    const categoryEquipment = equipment.filter(item => item.category === category);
    renderEquipmentList(categoryEquipment);
}

/**
 * Show equipment editing message
 */
function showEquipmentEditMessage() {
    if (window.toast && typeof window.toast.info === 'function') {
        window.toast.info('Equipment-Bearbeitung wird in einer späteren Version implementiert.');
    } else {
        alert('Equipment-Bearbeitung wird in einer späteren Version implementiert.');
    }
}

// Make function globally available
window.showEquipmentEditMessage = showEquipmentEditMessage;

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
                            💰 ${item.depositAmount}€ ${item.depositPaid ? '✅' : '❌'}
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
                                ${item.depositPaid ? 'Bezahlt ✅' : 'Ausstehend ❌'}
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
                            ${equipmentCategories.map(category => `
                                <option value="${category.key}">${category.icon} ${category.name}</option>
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
    const formData = {
        name: document.getElementById('equipmentName').value.trim(),
        category: document.getElementById('equipmentCategory').value,
        description: document.getElementById('equipmentDescription').value.trim(),
        status: document.getElementById('equipmentStatus').value,
        requiresDeposit: document.getElementById('requiresDeposit').checked,
        depositAmount: document.getElementById('requiresDeposit').checked ? 
            parseFloat(document.getElementById('depositAmount').value) || 0 : 0,
        depositPaid: false // Initially no deposit paid
    };
    
    if (!formData.name) {
        showToast('Bitte geben Sie einen Namen ein', 'error');
        return;
    }
    
    if (formData.requiresDeposit && !formData.depositAmount) {
        showToast('Bitte geben Sie einen Pfand-Betrag ein', 'error');
        return;
    }
    
    try {
        await window.db.collection('equipment').add({
            ...formData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Equipment erfolgreich hinzugefügt', 'success');
        closeAddEquipmentForm();
        await loadEquipment(); // Reload to show new equipment immediately
        
    } catch (error) {
        console.error('Error saving equipment:', error);
        showToast('Fehler beim Speichern', 'error');
    }
}

/**
 * Edit equipment
 */
function editEquipment(equipmentId) {
    showToast('Equipment-Bearbeitung wird in einer späteren Version implementiert', 'info');
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
        await loadEquipment(); // Reload to show updated status
        
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
        await loadEquipment(); // Reload to show updated status
        
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
        await loadEquipment(); // Reload to show updated status
        
    } catch (error) {
        console.error('Error marking deposit as paid:', error);
        showToast('Fehler beim Markieren des Pfands', 'error');
    }
}

/**
 * Render category tabs dynamically
 */
function renderCategoryTabs() {
    const tabsContainer = document.querySelector('.category-tabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = equipmentCategories.map(category => `
        <button class="tab-btn ${category.key === currentEquipmentCategory ? 'active' : ''}" 
                onclick="showEquipmentCategory('${category.key}')">
            <span class="tab-icon">${category.icon}</span>
            <span class="tab-name">${category.name}</span>
            <span class="tab-counter" id="counter-${category.key}">0</span>
        </button>
    `).join('') + `
        <button class="tab-btn tab-btn-add" onclick="showAddCategoryForm()" title="Kategorie hinzufügen">
            <span class="tab-icon">➕</span>
            <span class="tab-name">Hinzufügen</span>
        </button>
        <button class="tab-btn tab-btn-manage" onclick="showManageCategoriesForm()" title="Kategorien verwalten">
            <span class="tab-icon">⚙️</span>
            <span class="tab-name">Verwalten</span>
        </button>
    `;
    
    // Update counters
    updateCategoryCounters();
}

/**
 * Update category counters
 */
function updateCategoryCounters() {
    equipmentCategories.forEach(category => {
        const count = equipment.filter(item => item.category === category.key).length;
        const counter = document.getElementById(`counter-${category.key}`);
        if (counter) {
            counter.textContent = count;
            counter.style.display = count > 0 ? 'inline-block' : 'none';
        }
    });
}

/**
 * Show add category form
 */
function showAddCategoryForm() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Kategorie hinzufügen</h3>
                <button class="modal-close" onclick="closeAddCategoryForm()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="addCategoryForm" class="form">
                    <div class="form-group">
                        <label class="form-label">Kategorie Name</label>
                        <input type="text" id="categoryName" class="form-input" placeholder="z.B. Drucker, Kamera, etc.">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Icon (Emoji)</label>
                        <input type="text" id="categoryIcon" class="form-input" placeholder="z.B. 🖨️, 📷, etc.">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeAddCategoryForm()">Abbrechen</button>
                        <button type="button" class="btn btn-primary" onclick="saveCategory()">Speichern</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.id = 'addCategoryModal';
}

/**
 * Close add category form
 */
function closeAddCategoryForm() {
    const modal = document.getElementById('addCategoryModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Save category
 */
async function saveCategory() {
    const categoryName = document.getElementById('categoryName').value.trim();
    const categoryIcon = document.getElementById('categoryIcon').value.trim();
    
    if (!categoryName) {
        showToast('Bitte geben Sie einen Namen für die Kategorie ein', 'error');
        return;
    }
    
    // Generate key from name (lowercase, replace spaces with underscores)
    const categoryKey = categoryName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    // Check if key already exists
    const existingCategory = equipmentCategories.find(cat => cat.key === categoryKey);
    if (existingCategory) {
        showToast('Eine Kategorie mit diesem Namen existiert bereits', 'error');
        return;
    }
    
    const formData = {
        name: categoryName,
        key: categoryKey,
        icon: categoryIcon || '📦', // Default icon if none provided
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await window.db.collection('equipmentCategories').add(formData);
        showToast('Kategorie erfolgreich hinzugefügt', 'success');
        closeAddCategoryForm();
        await loadEquipmentCategories(); // Reload to show new category immediately
        
    } catch (error) {
        console.error('Error saving category:', error);
        showToast('Fehler beim Speichern der Kategorie', 'error');
    }
}

/**
 * Show manage categories form
 */
function showManageCategoriesForm() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Kategorien verwalten</h3>
                <button class="modal-close" onclick="closeManageCategoriesForm()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="category-list">
                    ${equipmentCategories.map(category => `
                        <div class="category-item">
                            <span class="category-icon">${category.icon}</span>
                            <span class="category-name">${category.name}</span>
                            <span class="category-actions">
                                <button class="btn btn-sm btn-primary" onclick="editCategory('${category.id}')">Bearbeiten</button>
                                <button class="btn btn-sm btn-danger" onclick="deleteCategory('${category.id}')">Löschen</button>
                            </span>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-primary" onclick="showAddCategoryForm()">Kategorie hinzufügen</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.id = 'manageCategoriesModal';
}

/**
 * Close manage categories form
 */
function closeManageCategoriesForm() {
    const modal = document.getElementById('manageCategoriesModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Edit category
 */
async function editCategory(categoryId) {
    const category = equipmentCategories.find(c => c.id === categoryId);
    if (!category) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Kategorie bearbeiten</h3>
                <button class="modal-close" onclick="closeEditCategoryForm()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="editCategoryForm" class="form">
                    <input type="hidden" id="categoryId" value="${categoryId}">
                    <div class="form-group">
                        <label class="form-label">Kategorie Name</label>
                        <input type="text" id="categoryName" value="${category.name}" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Icon (Emoji)</label>
                        <input type="text" id="categoryIcon" value="${category.icon}" class="form-input">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeEditCategoryForm()">Abbrechen</button>
                        <button type="button" class="btn btn-primary" onclick="updateCategory()">Speichern</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.id = 'editCategoryModal';
}

/**
 * Close edit category form
 */
function closeEditCategoryForm() {
    const modal = document.getElementById('editCategoryModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Update category
 */
async function updateCategory() {
    const categoryId = document.getElementById('categoryId').value;
    const categoryName = document.getElementById('categoryName').value.trim();
    const categoryIcon = document.getElementById('categoryIcon').value.trim();

    if (!categoryName) {
        showToast('Bitte geben Sie einen Namen für die Kategorie ein', 'error');
        return;
    }

    try {
        await window.db.collection('equipmentCategories').doc(categoryId).update({
            name: categoryName,
            icon: categoryIcon || '📦',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('Kategorie erfolgreich aktualisiert', 'success');
        closeEditCategoryForm();
        await loadEquipmentCategories(); // Reload to show updated category
    } catch (error) {
        console.error('Error updating category:', error);
        showToast('Fehler beim Aktualisieren der Kategorie', 'error');
    }
}

/**
 * Delete category
 */
async function deleteCategory(categoryId) {
    if (!confirm('Möchten Sie diese Kategorie wirklich löschen? Alle darin enthaltenen Equipment-Einträge werden ebenfalls gelöscht.')) {
        return;
    }

    try {
        await window.db.collection('equipmentCategories').doc(categoryId).delete();
        showToast('Kategorie erfolgreich gelöscht', 'success');
        await loadEquipmentCategories(); // Reload to show updated category list
    } catch (error) {
        console.error('Error deleting category:', error);
        showToast('Fehler beim Löschen der Kategorie', 'error');
    }
} 

// ==================== GLOBAL EXPORTS ====================
// Equipment Management-Funktionen global verfügbar machen
window.showEquipmentManager = showEquipmentManager;
window.closeEquipmentManager = closeEquipmentManager;
window.loadEquipment = loadEquipment;
window.showEquipmentCategory = showEquipmentCategory;
window.showEquipmentEditMessage = showEquipmentEditMessage;
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

console.log("🔧 Equipment Management Module geladen"); 