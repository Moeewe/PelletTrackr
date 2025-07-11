/**
 * Equipment Management System
 * Handles lending system for keys, tools, and accessories
 */

// Global equipment state
let equipment = [];
let currentEquipmentCategory = 'keys';

// Lazy loader for equipment
let equipmentLoader = null;

/**
 * Show equipment manager modal
 */
function showEquipmentManager() {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('equipmentModal').style.display = 'block';
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
 * Show equipment category
 */
function showEquipmentCategory(category) {
    currentEquipmentCategory = category;
    
    // Update tab buttons - only within equipment modal
    const modal = document.getElementById('equipmentModal');
    if (modal) {
        modal.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Find and activate the correct tab button
        const tabButtons = modal.querySelectorAll('.tab-btn');
        const tabMap = ['keys', 'tools', 'accessories'];
        const tabIndex = tabMap.indexOf(category);
        if (tabButtons[tabIndex]) {
            tabButtons[tabIndex].classList.add('active');
        }
    }
    
    // Filter equipment by category
    const categoryEquipment = equipment.filter(item => item.category === category);
    renderEquipmentList(categoryEquipment);
}

/**
 * Initialize equipment lazy loading
 */
function initializeEquipmentLazyLoading() {
    equipmentLoader = new LazyLoader('equipmentList', {
        mobilePageSize: 5,
        desktopPageSize: 20,
        renderFunction: createEquipmentElement,
        emptyStateMessage: 'Keine Ausrüstung in dieser Kategorie.',
        searchFunction: (equipment, searchTerm) => {
            return equipment.name.toLowerCase().includes(searchTerm) ||
                   (equipment.description && equipment.description.toLowerCase().includes(searchTerm)) ||
                   (equipment.borrowedBy && equipment.borrowedBy.toLowerCase().includes(searchTerm));
        }
    });
}

/**
 * Create equipment element for lazy loading
 */
function createEquipmentElement(item) {
    const container = document.createElement('div');
    container.className = 'lazy-item';
    container.innerHTML = `
        <div class="equipment-item">
            <div class="equipment-header">
                <div class="equipment-name">${item.name}</div>
                <span class="equipment-status ${item.status}">${getEquipmentStatusText(item.status)}</span>
            </div>
            <div class="equipment-info">${item.description || 'Keine Beschreibung'}</div>
            ${item.status === 'borrowed' && item.borrowedBy ? `
                <div class="equipment-current-user">
                    Ausgeliehen an: <strong>${item.borrowedBy}</strong><br>
                    Seit: ${new Date(item.borrowedAt.toDate()).toLocaleDateString()}
                </div>
            ` : ''}
            <div class="equipment-actions">
                ${item.status === 'available' ? `
                    <button class="btn btn-primary" onclick="borrowEquipment('${item.id}')">Ausleihen</button>
                ` : item.status === 'borrowed' ? `
                    <button class="btn btn-success" onclick="returnEquipment('${item.id}')">Zurückgeben</button>
                ` : ''}
                <button class="btn btn-secondary" onclick="editEquipment('${item.id}')">Bearbeiten</button>
            </div>
        </div>
    `;
    return container;
}

/**
 * Render equipment list with lazy loading
 */
function renderEquipmentList(equipmentList) {
    if (!equipmentLoader) {
        initializeEquipmentLazyLoading();
    }
    
    equipmentLoader.setData(equipmentList);
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
                        <input type="text" id="equipmentName" class="form-input" placeholder="z.B. Druckraum Schlüssel #1" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Kategorie</label>
                        <select id="equipmentCategory" class="form-select" required>
                            <option value="keys">Schlüssel</option>
                            <option value="tools">Werkzeuge</option>
                            <option value="accessories">Zubehör</option>
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
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (!formData.name) {
        showToast('Bitte geben Sie einen Namen ein', 'error');
        return;
    }
    
    try {
        await window.db.collection('equipment').add(formData);
        showToast('Equipment erfolgreich hinzugefügt', 'success');
        closeAddEquipmentForm();
        await loadEquipment();
        
    } catch (error) {
        console.error('Error saving equipment:', error);
        showToast('Fehler beim Speichern', 'error');
    }
}

/**
 * Edit equipment
 */
function editEquipment(equipmentId) {
    const item = equipment.find(e => e.id === equipmentId);
    if (!item) return;
    
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
                        <label class="form-label">Name</label>
                        <input type="text" id="editEquipmentName" class="form-input" value="${item.name}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Kategorie</label>
                        <select id="editEquipmentCategory" class="form-select" required>
                            <option value="keys" ${item.category === 'keys' ? 'selected' : ''}>Schlüssel</option>
                            <option value="tools" ${item.category === 'tools' ? 'selected' : ''}>Werkzeuge</option>
                            <option value="accessories" ${item.category === 'accessories' ? 'selected' : ''}>Zubehör</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Beschreibung</label>
                        <textarea id="editEquipmentDescription" class="form-textarea" rows="3">${item.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select id="editEquipmentStatus" class="form-select">
                            <option value="available" ${item.status === 'available' ? 'selected' : ''}>Verfügbar</option>
                            <option value="borrowed" ${item.status === 'borrowed' ? 'selected' : ''}>Ausgeliehen</option>
                            <option value="maintenance" ${item.status === 'maintenance' ? 'selected' : ''}>Wartung</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeEditEquipmentForm()">Abbrechen</button>
                        <button type="button" class="btn btn-primary" onclick="updateEquipment('${equipmentId}')">Speichern</button>
                        <button type="button" class="btn btn-danger" onclick="deleteEquipment('${equipmentId}')">Löschen</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.id = 'editEquipmentModal';
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
    const formData = {
        name: document.getElementById('editEquipmentName').value.trim(),
        category: document.getElementById('editEquipmentCategory').value,
        description: document.getElementById('editEquipmentDescription').value.trim(),
        status: document.getElementById('editEquipmentStatus').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (!formData.name) {
        showToast('Bitte geben Sie einen Namen ein', 'error');
        return;
    }
    
    try {
        await window.db.collection('equipment').doc(equipmentId).update(formData);
        showToast('Equipment erfolgreich aktualisiert', 'success');
        closeEditEquipmentForm();
        await loadEquipment();
        
    } catch (error) {
        console.error('Error updating equipment:', error);
        showToast('Fehler beim Aktualisieren', 'error');
    }
}

/**
 * Delete equipment
 */
async function deleteEquipment(equipmentId) {
    const item = equipment.find(e => e.id === equipmentId);
    if (!item) return;
    
    if (!confirm(`Möchten Sie "${item.name}" wirklich löschen?`)) {
        return;
    }
    
    try {
        await window.db.collection('equipment').doc(equipmentId).delete();
        showToast('Equipment erfolgreich gelöscht', 'success');
        closeEditEquipmentForm();
        await loadEquipment();
        
    } catch (error) {
        console.error('Error deleting equipment:', error);
        showToast('Fehler beim Löschen', 'error');
    }
}

/**
 * Borrow equipment
 */
async function borrowEquipment(equipmentId) {
    const userName = prompt('Name des Ausleihers:');
    if (!userName) return;
    
    try {
        await window.db.collection('equipment').doc(equipmentId).update({
            status: 'borrowed',
            borrowedBy: userName,
            borrowedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast(`Equipment an ${userName} ausgeliehen`, 'success');
        await loadEquipment();
        
    } catch (error) {
        console.error('Error borrowing equipment:', error);
        showToast('Fehler beim Ausleihen', 'error');
    }
}

/**
 * Return equipment
 */
async function returnEquipment(equipmentId) {
    if (!confirm('Equipment als zurückgegeben markieren?')) {
        return;
    }
    
    try {
        await window.db.collection('equipment').doc(equipmentId).update({
            status: 'available',
            borrowedBy: firebase.firestore.FieldValue.delete(),
            borrowedAt: firebase.firestore.FieldValue.delete(),
            returnedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Equipment zurückgegeben', 'success');
        await loadEquipment();
        
    } catch (error) {
        console.error('Error returning equipment:', error);
        showToast('Fehler bei der Rückgabe', 'error');
    }
}

/**
 * Search equipment
 */
function searchEquipment() {
    const searchInput = document.getElementById('equipmentSearchInput');
    if (searchInput && equipmentLoader) {
        equipmentLoader.search(searchInput.value);
    }
} 