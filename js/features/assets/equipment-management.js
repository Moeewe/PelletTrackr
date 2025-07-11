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
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event?.target?.classList.add('active');
    
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
 * Show add equipment form (placeholder)
 */
function showAddEquipmentForm() {
    showToast('Equipment-Formular wird noch implementiert', 'info');
}

/**
 * Edit equipment (placeholder)
 */
function editEquipment(equipmentId) {
    showToast('Equipment-Bearbeitung wird noch implementiert', 'info');
}

/**
 * Borrow equipment (placeholder)
 */
function borrowEquipment(equipmentId) {
    showToast('Ausleih-System wird noch implementiert', 'info');
}

/**
 * Return equipment (placeholder)
 */
function returnEquipment(equipmentId) {
    showToast('Rückgabe-System wird noch implementiert', 'info');
} 