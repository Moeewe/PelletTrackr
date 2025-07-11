/**
 * Equipment Management System
 * Handles lending system for keys, tools, and accessories
 */

// Global equipment state
let equipment = [];
let currentEquipmentCategory = 'keys';

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
    
    // Set default category
    document.getElementById('equipmentCategory').value = currentEquipmentCategory;
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
        status: document.getElementById('equipmentStatus').value
    };
    
    if (!formData.name) {
        showToast('Bitte geben Sie einen Namen ein', 'error');
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
    const userName = prompt('Name des Entleihers:');
    if (!userName) return;
    
    try {
        await window.db.collection('equipment').doc(equipmentId).update({
            status: 'borrowed',
            borrowedBy: userName,
            borrowedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
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
    if (!confirm('Equipment als zurückgegeben markieren?')) return;
    
    try {
        await window.db.collection('equipment').doc(equipmentId).update({
            status: 'available',
            borrowedBy: firebase.firestore.FieldValue.delete(),
            borrowedAt: firebase.firestore.FieldValue.delete(),
            returnedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Equipment erfolgreich zurückgegeben', 'success');
        await loadEquipment(); // Reload to show updated status
        
    } catch (error) {
        console.error('Error returning equipment:', error);
        showToast('Fehler bei der Rückgabe', 'error');
    }
} 