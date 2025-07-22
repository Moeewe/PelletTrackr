/**
 * User Services System
 * Handles printer status, scheduling, equipment requests, problem reports, and material requests
 */

// Global state for user services
let userPrinters = [];
let userPrinterListener = null;

// Make userPrinters globally accessible
window.userPrinters = userPrinters;

// Global variable to store all users
let allUsers = [];

/**
 * Initialize user services
 */
function initializeUserServices() {
    console.log('🔧 Initializing user services...');
    
    // Setup printer status listener
    setupUserPrinterListener();
    
    // Load initial data
    loadPrinterStatus();
    
    console.log('✅ User services initialized');
}

/**
 * Setup real-time listener for printer status
 */
function setupUserPrinterListener() {
    if (!window.db) {
        setTimeout(setupUserPrinterListener, 500);
        return;
    }
    
    // Clean up existing listener
    if (userPrinterListener) {
        userPrinterListener();
        userPrinterListener = null;
    }
    
    try {
        userPrinterListener = window.db.collection('printers').onSnapshot((snapshot) => {
            userPrinters = [];
            snapshot.forEach((doc) => {
                userPrinters.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Update global reference
            window.userPrinters = userPrinters;
            
            updatePrinterStatusDisplay();
            
            // Update machine overview in admin dashboard
            if (typeof updateMachineOverview === 'function') {
                updateMachineOverview();
            }
        });
        
        console.log('✅ User printer listener registered');
    } catch (error) {
        console.error('❌ Failed to setup user printer listener:', error);
    }
}

/**
 * Load and display printer status
 */
function loadPrinterStatus() {
    if (!window.db) return;
    
    window.db.collection('printers').get().then((snapshot) => {
        userPrinters = [];
        snapshot.forEach((doc) => {
            userPrinters.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update global reference
        window.userPrinters = userPrinters;
        
        updatePrinterStatusDisplay();
        
        // Update machine overview in admin dashboard
        if (typeof updateMachineOverview === 'function') {
            updateMachineOverview();
        }
    }).catch((error) => {
        console.error('Error loading printer status:', error);
    });
}

/**
 * Update printer status display
 */
function updatePrinterStatusDisplay() {
    const counts = {
        available: 0,
        in_use: 0,
        maintenance: 0,
        broken: 0
    };
    
    userPrinters.forEach(printer => {
        switch (printer.status) {
            case 'available':
                counts.available++;
                break;
            case 'printing':
            case 'in_use':
                counts.in_use++;
                break;
            case 'maintenance':
                counts.maintenance++;
                break;
            case 'broken':
                counts.broken++;
                break;
        }
    });
    
    // Update UI
    const availableEl = document.getElementById('userAvailableMachines');
    const inUseEl = document.getElementById('userInUseMachines');
    const maintenanceEl = document.getElementById('userMaintenanceMachines');
    
    if (availableEl) availableEl.textContent = counts.available;
    if (inUseEl) inUseEl.textContent = counts.in_use;
    if (maintenanceEl) maintenanceEl.textContent = counts.maintenance + counts.broken; // Combine maintenance and broken
}

/**
 * Show printer status modal with clickable status cycling
 */
function showPrinterStatus() {
    const isAdmin = window.currentUser?.isAdmin || false;

    const modalContent = `
        <div class="modal-header">
            <h3>Drucker Status</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="printer-list">
                ${userPrinters.map(printer => {
                    const isAdmin = window.currentUser?.isAdmin || false;
                    
                    return `
                        <div class="printer-item">
                            <div class="printer-info">
                                <h4 class="printer-name">${printer.name}</h4>
                                <p class="printer-location">${printer.location || ''}</p>
                                ${printer.description && printer.description !== 'undefined' && printer.description !== 'Keine Beschreibung' ? `<p class="printer-description">${printer.description}</p>` : ''}
                            </div>
                            <div class="printer-status-controls">
                                <div class="printer-status-grid">
                                    <button class="status-btn ${printer.status === 'available' ? 'active' : ''}" 
                                            onclick="handleUserStatusChange('${printer.id}', 'available')">
                                        Verfügbar
                                    </button>
                                    <button class="status-btn ${printer.status === 'printing' ? 'active' : ''}" 
                                            onclick="handleUserStatusChange('${printer.id}', 'printing')">
                                        In Betrieb
                                    </button>
                                    <button class="status-btn ${printer.status === 'maintenance' ? 'active' : ''} ${!isAdmin ? 'disabled' : ''}" 
                                            onclick="${isAdmin ? `handleUserStatusChange('${printer.id}', 'maintenance')` : ''}">
                                        Wartung
                                    </button>
                                    <button class="status-btn ${printer.status === 'broken' ? 'active' : ''} ${!isAdmin ? 'disabled' : ''}" 
                                            onclick="${isAdmin ? `handleUserStatusChange('${printer.id}', 'broken')` : ''}">
                                        Defekt
                                    </button>
                                </div>
                                <button class="btn btn-problem-report" onclick="reportPrinterProblem('${printer.id}', '${printer.name}')">
                                    Problem melden
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
}

/**
 * Handle user status change with proper permissions and logic
 */
async function handleUserStatusChange(printerId, newStatus) {
    const isAdmin = window.currentUser?.isAdmin || false;
    const printer = userPrinters.find(p => p.id === printerId);
    
    if (!printer) {
        window.toast.error('Drucker nicht gefunden');
        return;
    }
    
    // Check permissions for setting maintenance/broken
    if ((newStatus === 'maintenance' || newStatus === 'broken') && !isAdmin) {
        window.toast.error('Nur Administratoren können den Status auf "Wartung" oder "Defekt" setzen');
        return;
    }
    
    // Special handling for "broken" status
    if (newStatus === 'broken') {
        // Close current modal
        closeModal();
        
        // Show problem report dialog immediately
        setTimeout(() => {
            reportPrinterProblem(printerId, printer.name);
        }, 100);
        
        return;
    }
    
    // For other statuses, proceed normally
    await cyclePrinterStatus(printerId, newStatus);
}

/**
 * Cycle printer status when user clicks on status button
 * Requires admin access for safety
 */
async function cyclePrinterStatus(printerId, newStatus) {
    // Allow all users to change printer status for now
    // This can be restricted later if needed
    
    try {
        await window.db.collection('printers').doc(printerId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastStatusChangeBy: window.currentUser?.name || 'Unbekannt',
            lastStatusChangeAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local data
        const printerIndex = userPrinters.findIndex(p => p.id === printerId);
        if (printerIndex !== -1) {
            userPrinters[printerIndex].status = newStatus;
            // Update global reference
            window.userPrinters = userPrinters;
        }
        
        // Update the main interface status counts
        updatePrinterStatusDisplay();
        
        // Also update machine overview for consistency
        if (typeof updateMachineOverview === 'function') {
            updateMachineOverview();
        }
        
        // Show success message
        const statusText = getStatusText(newStatus);
        window.toast.success(`Drucker-Status auf "${statusText}" gesetzt`);
        
        // Refresh the modal display
        showPrinterStatus();
        
    } catch (error) {
        console.error('Error updating printer status:', error);
        window.toast.error('Fehler beim Ändern des Drucker-Status');
    }
}

/**
 * Show material request modal
 */
function showMaterialRequest() {
    const modalContent = `
        <div class="modal-header">
            <h3>Material-Wunsch</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form">
                <div class="form-group">
                    <label class="form-label">Material/Filament</label>
                    <input type="text" id="materialType" class="form-input" placeholder="z.B. PLA, PETG, TPU...">
                </div>
                <div class="form-group">
                    <label class="form-label">Name/Bezeichnung</label>
                    <input type="text" id="materialName" class="form-input" placeholder="z.B. PLA Schwarz, PETG Transparent...">
                </div>
                <div class="form-group">
                    <label class="form-label">Menge</label>
                    <input type="text" id="materialQuantity" class="form-input" placeholder="z.B. 1kg, 500g, 2 Spulen...">
                </div>
                <div class="form-group">
                    <label class="form-label">Priorität</label>
                    <select id="materialPriority" class="form-select">
                        <option value="low">Niedrig</option>
                        <option value="medium" selected>Mittel</option>
                        <option value="high">Hoch</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Begründung</label>
                    <textarea id="materialReason" class="form-textarea" placeholder="Warum benötigen Sie dieses Material?" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Lieferant (optional)</label>
                    <input type="text" id="materialSupplier" class="form-input" placeholder="z.B. Prusament, eSUN...">
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
                                <button class="btn btn-primary" onclick="submitMaterialWish()">Wunsch senden</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
}

/**
 * Show equipment request modal
 */
async function showEquipmentRequest() {
    // Show loading modal first
    const loadingContent = `
        <div class="modal-header">
            <h3>Equipment Anfrage</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div style="text-align: center; padding: 40px;">
                Lade verfügbares Equipment und Benutzer...
            </div>
        </div>
    `;
    
    showModalWithContent(loadingContent);
    
    // Load equipment data and users first
    await Promise.all([
        loadEquipmentForRequest(),
        loadAllUsers()
    ]);
    
    // Now show the actual form
    const modalContent = `
        <div class="modal-header">
            <h3>Equipment Anfrage</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
                    <div class="modal-body">
                <div class="form">
                    <div class="form-group">
                        <label class="form-label">Handynummer (erforderlich)</label>
                        <input type="tel" id="equipmentPhone" class="form-input" placeholder="z.B. 0176 12345678" required>
                        <small class="form-help">Ihre Handynummer wird für die Ausleihe benötigt und nur Admins können sie einsehen.</small>
                    </div>
                <div class="form-group">
                    <label class="form-label">Equipment-Typ</label>
                    <select id="equipmentType" class="form-select" onchange="updateEquipmentOptions()">
                        <option value="">Typ auswählen...</option>
                        <option value="keys">Schlüssel</option>
                        <option value="hardware">Hardware</option>
                        <option value="books">Bücher</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Gewünschtes Equipment</label>
                    <select id="equipmentName" class="form-select" disabled>
                        <option value="">Zuerst Equipment-Typ auswählen...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Benötigungsdauer</label>
                    <select id="equipmentDuration" class="form-select">
                        <option value="">Dauer wählen...</option>
                        <option value="1_hour">1 Stunde</option>
                        <option value="2_hours">2 Stunden</option>
                        <option value="half_day">Halber Tag</option>
                        <option value="full_day">Ganzer Tag</option>
                        <option value="week">1 Woche</option>
                        <option value="other">Andere</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Zweck / Begründung</label>
                    <textarea id="equipmentPurpose" class="form-textarea" placeholder="Wofür benötigen Sie das Equipment?" rows="3"></textarea>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
            <button class="btn btn-primary" onclick="submitEquipmentRequest()">Anfrage stellen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
    
    // Auto-fill phone number if available
    await autoFillPhoneNumber();
    
    // Add event listener to save phone number when changed
    const phoneInput = document.getElementById('equipmentPhone');
    if (phoneInput) {
        phoneInput.addEventListener('blur', async function() {
            const phoneNumber = this.value.trim();
            if (phoneNumber && phoneNumber !== window.currentUser?.phone) {
                await savePhoneNumberToProfile(phoneNumber);
            }
        });
    }
    
    console.log('✅ Equipment loaded:', availableEquipment.length, 'items');
    console.log('✅ Users loaded:', allUsers.length, 'users');
}

/**
 * Auto-fill phone number from user data
 */
async function autoFillPhoneNumber() {
    try {
        if (!window.currentUser || !window.currentUser.kennung) {
            console.log('⚠️ No current user found for phone auto-fill');
            return;
        }
        
        // Find current user in loaded users
        const currentUserData = allUsers.find(user => user.kennung === window.currentUser.kennung);
        
        if (currentUserData && currentUserData.phone) {
            const phoneInput = document.getElementById('equipmentPhone');
            if (phoneInput) {
                phoneInput.value = currentUserData.phone;
                console.log('✅ Auto-filled phone number:', currentUserData.phone);
            }
        } else {
            console.log('ℹ️ No phone number found for current user');
        }
        
    } catch (error) {
        console.error('❌ Error auto-filling phone number:', error);
    }
}

/**
 * Save phone number to user profile
 */
async function savePhoneNumberToProfile(phoneNumber) {
    try {
        if (!window.currentUser || !window.currentUser.kennung) {
            console.log('⚠️ No current user found for phone save');
            return;
        }
        
        // Update user document with phone number
        await window.db.collection('users').doc(window.currentUser.kennung).update({
            phone: phoneNumber,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Phone number saved to user profile:', phoneNumber);
        
        // Update current user object
        if (window.currentUser) {
            window.currentUser.phone = phoneNumber;
        }
        
    } catch (error) {
        console.error('❌ Error saving phone number:', error);
    }
}

/**
 * Show problem report modal
 */
function showProblemReport() {
    const modalContent = `
        <div class="modal-header">
            <h3>Problem melden</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form">
                <div class="form-group">
                    <label class="form-label">Problem-Typ</label>
                    <select id="problemType" class="form-select">
                        <option value="">Typ auswählen...</option>
                        <option value="printer">Drucker-Problem</option>
                        <option value="equipment">Equipment-Problem</option>
                        <option value="material">Material-Problem</option>
                        <option value="software">Software-Problem</option>
                        <option value="other">Sonstiges</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Betroffenes Gerät/Equipment</label>
                    <input type="text" id="problemDevice" class="form-input" placeholder="z.B. Drucker XYZ, Equipment ABC">
                </div>
                <div class="form-group">
                    <label class="form-label">Priorität</label>
                    <select id="problemPriority" class="form-select">
                        <option value="low">Niedrig</option>
                        <option value="medium" selected>Mittel</option>
                        <option value="high">Hoch</option>
                        <option value="urgent">Dringend</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Problembeschreibung</label>
                    <textarea id="problemDescription" class="form-textarea" placeholder="Beschreiben Sie das Problem detailliert..." rows="4"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Schritte zur Reproduktion</label>
                    <textarea id="problemSteps" class="form-textarea" placeholder="Wie kann das Problem reproduziert werden?" rows="3"></textarea>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
            <button class="btn btn-primary" onclick="submitProblemReport()">Problem melden</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
}

/**
 * Submit equipment request
 */
async function submitEquipmentRequest() {
    const equipmentType = document.getElementById('equipmentType').value;
    const equipmentName = document.getElementById('equipmentName').value;
    const duration = document.getElementById('equipmentDuration').value;
    const purpose = document.getElementById('equipmentPurpose').value;
    const phoneNumber = document.getElementById('equipmentPhone').value;
    
    if (!equipmentType || !equipmentName || !duration || !purpose || !phoneNumber) {
        window.toast.error('Bitte alle Felder ausfüllen');
        return;
    }
    
    // Validate phone number format
    const phoneRegex = /^(\+49|0)[0-9\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phoneNumber)) {
        window.toast.error('Bitte geben Sie eine gültige Handynummer ein');
        return;
    }
    
    // Debug logging
    console.log('🔍 Equipment Debug:');
    console.log('- Current User:', window.currentUser?.name);
    console.log('- Equipment Type:', equipmentType);
    console.log('- Equipment Name:', equipmentName);
    console.log('- Available Equipment:', availableEquipment?.length || 0, 'items');
    console.log('- Available Equipment List:', availableEquipment);
    
    // Find equipment by ID (since dropdown uses item.id as value)
    const selectedEquipment = availableEquipment?.find(eq => eq.id === equipmentName);
    console.log('- Selected Equipment:', selectedEquipment);
    
    if (!selectedEquipment) {
        console.error('❌ Equipment nicht gefunden!');
        console.log('- Suchte nach ID:', equipmentName);
        console.log('- Verfügbare IDs:', availableEquipment?.map(eq => eq.id) || []);
        window.toast.error('Equipment nicht gefunden - siehe Console für Details');
        return;
    }
    
    const requestData = {
        type: 'equipment',
        equipmentId: selectedEquipment.id,
        equipmentType: equipmentType,
        equipmentName: selectedEquipment.name,
        equipmentLocation: selectedEquipment.location,
        duration: duration,
        purpose: purpose,
        status: 'pending',
        userName: window.currentUser?.name || 'Unbekannter User',
        userKennung: window.currentUser?.kennung || '',
        userEmail: window.currentUser?.email || '',
        userPhone: phoneNumber,
        requestedBy: window.currentUser?.name || 'Unbekannter User',
        requestedByKennung: window.currentUser?.kennung || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        // Update user data with phone number if not already set
        let userWasCreated = false;
        if (window.currentUser?.kennung) {
            try {
                await window.db.collection('users').doc(window.currentUser.kennung).update({
                    phone: phoneNumber,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                // If document doesn't exist, create it
                if (error.code === 'not-found') {
                    await window.db.collection('users').doc(window.currentUser.kennung).set({
                        name: window.currentUser.name,
                        kennung: window.currentUser.kennung,
                        email: window.currentUser.email || `${window.currentUser.kennung}@fh-muenster.de`,
                        phone: phoneNumber,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    userWasCreated = true;
                } else {
                    throw error; // Re-throw other errors
                }
            }
        }
        
        // Update window.allUsers if user was created or phone was updated
        if (typeof updateUserInList === 'function' && window.currentUser?.kennung) {
            if (userWasCreated) {
                updateUserInList(window.currentUser.kennung, {
                    docId: window.currentUser.kennung,
                    name: window.currentUser.name,
                    kennung: window.currentUser.kennung,
                    email: window.currentUser.email || `${window.currentUser.kennung}@fh-muenster.de`,
                    phone: phoneNumber,
                    isAdmin: false,
                    entries: [],
                    totalCost: 0,
                    paidAmount: 0,
                    unpaidAmount: 0
                });
            } else {
                updateUserInList(window.currentUser.kennung, { phone: phoneNumber });
            }
        }
        
        await window.db.collection('requests').add(requestData);
        
        window.toast.success('Equipment-Anfrage erfolgreich gesendet');
        closeModal();
        
    } catch (error) {
        console.error('Error submitting equipment request:', error);
        window.toast.error('Fehler beim Senden der Equipment-Anfrage');
    }
}

/**
 * Submit problem report
 */
async function submitProblemReport() {
    const type = document.getElementById('problemType').value;
    const device = document.getElementById('problemDevice').value;
    const priority = document.getElementById('problemPriority').value;
    const description = document.getElementById('problemDescription').value;
    const steps = document.getElementById('problemSteps').value;
    
    if (!type || !device || !description) {
        window.toast.error('Bitte alle Pflichtfelder ausfüllen');
        return;
    }
    
    try {
        const reportData = {
            type,
            device,
            priority,
            description,
            steps,
            reportedBy: window.currentUser.name,
            reportedByKennung: window.currentUser.kennung,
            status: 'open',
            reportedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await window.db.collection('problemReports').add(reportData);
        
        window.toast.success('Problem erfolgreich gemeldet');
        closeModal();
        
    } catch (error) {
        console.error('Error submitting problem report:', error);
        window.toast.error('Fehler beim Melden des Problems');
    }
}

/**
 * Submit material wish - FIX: Move to materialOrders collection
 */
async function submitMaterialWish() {
    const type = document.getElementById('materialType').value;
    const name = document.getElementById('materialName').value;
    const quantity = document.getElementById('materialQuantity').value;
    const priority = document.getElementById('materialPriority').value;
    const reason = document.getElementById('materialReason').value;
    const supplier = document.getElementById('materialSupplier').value;
    
    if (!type || !name || !quantity || !reason) {
        window.toast.error('Bitte alle Pflichtfelder ausfüllen');
        return;
    }
    
    try {
        const requestData = {
            type: 'request',
            source: 'user', // Track this as user-created
            userName: window.currentUser?.name || 'Unbekannter User',
            userKennung: window.currentUser?.kennung || '',
            materialName: name,
            manufacturer: supplier || '',
            reason: reason,
            quantity: quantity,
            priority: priority,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Use materialOrders collection like admin orders
        await window.db.collection('materialOrders').add(requestData);
        
        window.toast.success('Material-Wunsch erfolgreich eingereicht');
        closeModal();
        
    } catch (error) {
        console.error('Error submitting material wish:', error);
        window.toast.error('Fehler beim Einreichen des Material-Wunschs');
    }
}

/**
 * Report a problem with a specific printer
 */
function reportPrinterProblem(printerId, printerName) {
    const modalContent = `
        <div class="modal-header">
            <h3>Problem melden</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form">
                <div class="printer-info-section">
                    <h4>Drucker: ${printerName}</h4>
                    <p style="color: #666; margin-bottom: 20px;">Melden Sie ein Problem mit diesem Drucker</p>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Problem-Typ</label>
                    <select id="problemType" class="form-select">
                        <option value="">Problem-Typ auswählen...</option>
                        <option value="mechanical">Mechanisches Problem</option>
                        <option value="software">Software Problem</option>
                        <option value="material">Material Problem</option>
                        <option value="quality">Druckqualität</option>
                        <option value="maintenance">Wartung erforderlich</option>
                        <option value="other">Sonstiges</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Schweregrad</label>
                    <select id="problemSeverity" class="form-select">
                        <option value="low">Niedrig - Drucker funktioniert, aber mit Einschränkungen</option>
                        <option value="medium" selected>Mittel - Drucker teilweise beeinträchtigt</option>
                        <option value="high">Hoch - Drucker nicht nutzbar</option>
                        <option value="critical">Kritisch - Sicherheitsrisiko oder Schäden</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Problem-Beschreibung</label>
                    <textarea id="problemDescription" class="form-textarea" placeholder="Beschreiben Sie das Problem so detailliert wie möglich..." rows="4"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Schritte zur Reproduktion (optional)</label>
                    <textarea id="problemSteps" class="form-textarea" placeholder="Wie kann das Problem reproduziert werden?" rows="3"></textarea>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
            <button class="btn btn-primary" onclick="submitPrinterProblemReport('${printerId}', '${printerName}')">Problem melden</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
}

/**
 * Submit printer problem report
 */
async function submitPrinterProblemReport(printerId, printerName) {
    const problemType = document.getElementById('problemType').value;
    const problemSeverity = document.getElementById('problemSeverity').value;
    const problemDescription = document.getElementById('problemDescription').value.trim();
    const problemSteps = document.getElementById('problemSteps').value.trim();
    
    if (!problemType || !problemDescription) {
        window.toast.error('Bitte Problem-Typ und Beschreibung ausfüllen');
        return;
    }
    
    try {
        const reportData = {
            printerId: printerId,
            printerName: printerName,
            problemType: problemType,
            severity: problemSeverity,
            description: problemDescription,
            reproductionSteps: problemSteps,
            reportedBy: window.currentUser.name,
            reportedByKennung: window.currentUser.kennung,
            status: 'open',
            reportedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await window.db.collection('problemReports').add(reportData);
        
        // Automatically set printer status to "broken" when problem is reported
        try {
            await window.db.collection('printers').doc(printerId).update({
                status: 'broken',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastStatusChangeBy: window.currentUser?.name || 'Unbekannt',
                lastStatusChangeAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update local data
            const printerIndex = userPrinters.findIndex(p => p.id === printerId);
            if (printerIndex !== -1) {
                userPrinters[printerIndex].status = 'broken';
                window.userPrinters = userPrinters;
            }
            
            // Update the main interface status counts
            updatePrinterStatusDisplay();
            
        } catch (error) {
            console.error('Error updating printer status to broken:', error);
        }
        
                window.toast.success(`Problem für Drucker "${printerName}" erfolgreich gemeldet und Status auf "Defekt" gesetzt`);
        closeModal();
        
    } catch (error) {
        console.error('Error submitting problem report:', error);
        window.toast.error('Fehler beim Melden des Problems');
    }
}

/**
 * Get status text for display
 */
function getStatusText(status) {
    const statusMap = {
        'available': 'Verfügbar',
        'in_use': 'In Betrieb',
        'maintenance': 'Wartung',
        'broken': 'Defekt'
    };
    return statusMap[status] || status;
}

/**
 * Cleanup user services listeners
 */
function cleanupUserServices() {
    if (userPrinterListener) {
        userPrinterListener();
        userPrinterListener = null;
    }
}

/**
 * Load equipment data for request
 */
let availableEquipment = [];

async function loadEquipmentForRequest() {
    if (!window.db) return;
    
    try {
        const snapshot = await window.db.collection('equipment').get();
        availableEquipment = [];
        snapshot.forEach((doc) => {
            const equipmentData = doc.data();
            // Only show available equipment
            if (equipmentData.status === 'available') {
                availableEquipment.push({
                    id: doc.id,
                    name: equipmentData.name,
                    category: equipmentData.category,
                    location: equipmentData.location
                });
            }
        });
        console.log('✅ Equipment loaded:', availableEquipment.length, 'items');
    } catch (error) {
        console.error('Error loading equipment:', error);
        availableEquipment = [];
    }
}

/**
 * Update equipment options based on selected type
 */
function updateEquipmentOptions() {
    const typeSelect = document.getElementById('equipmentType');
    const equipmentSelect = document.getElementById('equipmentName');
    
    if (!typeSelect || !equipmentSelect) return;
    
    const selectedType = typeSelect.value;
    
    console.log('🔄 Updating Equipment Options:');
    console.log('- Selected Type:', selectedType);
    console.log('- Available Equipment Total:', availableEquipment?.length || 0);
    
    // Clear current options
    equipmentSelect.innerHTML = '';
    
    if (!selectedType) {
        equipmentSelect.innerHTML = '<option value="">Zuerst Equipment-Typ auswählen...</option>';
        equipmentSelect.disabled = true;
        return;
    }
    
    // Filter equipment by selected category
    const filteredEquipment = availableEquipment?.filter(item => item.category === selectedType) || [];
    console.log('- Filtered Equipment for category', selectedType + ':', filteredEquipment.length);
    console.log('- Filtered Equipment Items:', filteredEquipment);
    
    if (filteredEquipment.length === 0) {
        equipmentSelect.innerHTML = '<option value="">Kein Equipment in dieser Kategorie verfügbar</option>';
        equipmentSelect.disabled = true;
        return;
    }
    
    // Add default option
    equipmentSelect.innerHTML = '<option value="">Equipment auswählen...</option>';
    
    // Add equipment options
    filteredEquipment.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.name} (${item.location})`;
        equipmentSelect.appendChild(option);
    });
    
    equipmentSelect.disabled = false;
}

/**
 * Show user's equipment requests
 */
async function showMyEquipmentRequests() {
    const modalContent = `
        <div class="modal-header">
            <h3>Meine Ausleihen</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div id="myEquipmentRequestsList">
                Lade Ausleihen...
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
    
    try {
        const snapshot = await window.db.collection('requests')
            .where('type', '==', 'equipment')
            .where('userKennung', '==', window.currentUser.kennung)
            .get();
        
        const requests = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            requests.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate()
            });
        });
        
        // Sort locally by creation date (newest first)
        requests.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt - a.createdAt;
        });
        
        renderMyEquipmentRequests(requests);
        
    } catch (error) {
        console.error('Error loading equipment requests:', error);
        document.getElementById('myEquipmentRequestsList').innerHTML = `
            <div class="error-state">
                <p>Fehler beim Laden der Ausleihen</p>
            </div>
        `;
    }
}

/**
 * Render user's equipment requests
 */
function renderMyEquipmentRequests(requests) {
    const container = document.getElementById('myEquipmentRequestsList');
    
    if (requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine Ausleihen gefunden</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="entry-cards">';
    
    requests.forEach(request => {
        const date = request.createdAt ? request.createdAt.toLocaleDateString('de-DE') : 'Unbekannt';
        const statusText = getEquipmentStatusText(request.status);
        const statusClass = getEquipmentStatusClass(request.status);
        
        html += `
            <div class="entry-card">
                <div class="entry-card-header">
                    <h3 class="entry-job-title">${request.equipmentName}</h3>
                    <span class="entry-status-badge ${statusClass}">${statusText}</span>
                </div>
                
                <div class="entry-card-body">
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Datum</span>
                        <span class="entry-detail-value">${date}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Typ</span>
                        <span class="entry-detail-value">${request.equipmentType}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Dauer</span>
                        <span class="entry-detail-value">${getEquipmentDurationText(request.duration)}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Zweck</span>
                        <span class="entry-detail-value">${request.purpose}</span>
                    </div>
                    
                    ${request.equipmentLocation ? `
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Standort</span>
                        <span class="entry-detail-value">${request.equipmentLocation}</span>
                    </div>
                    ` : ''}
                    
                    ${request.requestedBy && request.requestedBy !== request.userName ? `
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Angefordert von</span>
                        <span class="entry-detail-value">${request.requestedBy}</span>
                    </div>
                    ` : ''}
                    
                    ${request.givenBy ? `
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Ausgegeben von</span>
                        <span class="entry-detail-value">${request.givenBy}${request.giveNote ? ` - ${request.giveNote}` : ''}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="entry-card-footer">
                    ${request.status === 'given' || request.status === 'active' ? `
                        <button class="btn btn-primary btn-sm" onclick="requestEquipmentReturn('${request.id}')">
                            Rückgabe anfragen
                        </button>
                    ` : ''}
                    ${request.status === 'return_requested' ? `
                        <span class="btn btn-warning btn-sm" style="cursor: default; opacity: 0.7;">
                            Rückgabe angefordert
                        </span>
                    ` : ''}
                    ${request.status === 'returned' ? `
                        <span class="btn btn-success btn-sm" style="cursor: default; opacity: 0.7;">
                            Zurückgegeben
                        </span>
                    ` : ''}
                    ${request.status === 'pending' || request.status === 'approved' ? `
                        <button class="btn btn-danger btn-sm" onclick="deleteUserEquipmentRequest('${request.id}')">
                            Anfrage löschen
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Request return of equipment
 */
async function requestEquipmentReturn(requestId) {
    const confirmed = await window.toast.confirm(
        'Möchten Sie die Rückgabe dieses Equipments anfragen?',
        'Ja, anfragen',
        'Abbrechen'
    );
    if (!confirmed) {
        return;
    }
    
    try {
        console.log('🔄 Requesting equipment return for requestId:', requestId);
        
        // First, get the request details to find the equipment
        const requestDoc = await window.db.collection('requests').doc(requestId).get();
        if (!requestDoc.exists) {
            console.error('❌ Request document not found:', requestId);
            window.toast.error('Ausleih-Anfrage nicht gefunden');
            return;
        }
        
        const requestData = requestDoc.data();
        console.log('📋 Request data:', requestData);
        console.log('🔍 Equipment ID from request:', requestData.equipmentId);
        console.log('🔍 Equipment Name from request:', requestData.equipmentName);
        
        // Validate required fields
        if (!requestData.equipmentId && !requestData.equipmentName) {
            console.error('❌ Missing equipment data in request:', requestData);
            window.toast.error('Equipment-Daten in der Anfrage nicht gefunden');
            return;
        }
        
        // If equipmentId is missing, try to find it by name
        if (!requestData.equipmentId && requestData.equipmentName) {
            console.log('⚠️ Equipment ID missing, searching by name...');
            const equipmentQuery = await window.db.collection('equipment')
                .where('name', '==', requestData.equipmentName)
                .limit(1)
                .get();
            
            if (!equipmentQuery.empty) {
                const foundEquipment = equipmentQuery.docs[0];
                requestData.equipmentId = foundEquipment.id;
                console.log('✅ Found equipment ID by name:', foundEquipment.id);
                
                // Update the original request with the correct equipment ID
                await window.db.collection('requests').doc(requestId).update({
                    equipmentId: foundEquipment.id
                });
            } else {
                console.error('❌ Equipment not found by name:', requestData.equipmentName);
                window.toast.error('Equipment nicht gefunden');
                return;
            }
        }
        
        // Create a return request directly in the equipment document
        const returnRequestData = {
            id: `return_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            equipmentId: requestData.equipmentId,
            equipmentName: requestData.equipmentName,
            userKennung: requestData.userKennung,
            userName: requestData.userName,
            requestedBy: window.currentUser?.kennung || 'user',
            requestedByName: window.currentUser?.name || 'Benutzer',
            status: 'pending',
            type: 'return',
            originalRequestId: requestId,
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('📝 Creating return request:', returnRequestData);
        
        // Add to equipment document
        const equipmentRef = window.db.collection('equipment').doc(requestData.equipmentId);
        const equipmentDoc = await equipmentRef.get();
        
        if (!equipmentDoc.exists) {
            console.error('❌ Equipment document not found:', requestData.equipmentId);
            console.error('❌ Request data:', requestData);
            
            // Try to find equipment by name as fallback
            const equipmentQuery = await window.db.collection('equipment')
                .where('name', '==', requestData.equipmentName)
                .limit(1)
                .get();
            
            if (equipmentQuery.empty) {
                throw new Error(`Equipment nicht gefunden (ID: ${requestData.equipmentId}, Name: ${requestData.equipmentName})`);
            }
            
            // Use the found equipment
            const foundEquipment = equipmentQuery.docs[0];
            console.log('✅ Found equipment by name:', foundEquipment.id);
            
            const equipmentData = foundEquipment.data();
            const requests = equipmentData.requests || [];
            requests.push(returnRequestData);
            
            await foundEquipment.ref.update({
                requests: requests
            });
        } else {
            const equipmentData = equipmentDoc.data();
            const requests = equipmentData.requests || [];
            requests.push(returnRequestData);
            
            await equipmentRef.update({
                requests: requests
            });
        }
        
        // Update the original request status
        await window.db.collection('requests').doc(requestId).update({
            status: 'return_requested',
            returnRequestedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Return request created successfully');
        window.toast.success('Rückgabe-Anfrage erfolgreich erstellt');
        
        // Refresh the view if still on the equipment requests modal
        const equipmentRequestsList = document.getElementById('myEquipmentRequestsList');
        if (equipmentRequestsList) {
            refreshMyEquipmentRequests();
        }
        
    } catch (error) {
        console.error('❌ Error requesting return:', error);
        window.toast.error('Fehler beim Senden der Rückgabe-Anfrage: ' + error.message);
    }
}

/**
 * Delete equipment request (User version)
 */
async function deleteUserEquipmentRequest(requestId) {
    const confirmed = await window.toast.confirm(
        'Möchten Sie diese Ausleih-Anfrage wirklich löschen?',
        'Ja, löschen',
        'Abbrechen'
    );
    if (!confirmed) {
        return;
    }
    
    try {
        console.log(`🗑️ User Delete Equipment Request: ${requestId}`);
        
        // More robust element selection for user equipment requests
        let requestElement = null;
        
        // Strategy 1: Find by exact onclick match in myEquipmentRequestsList container
        const container = document.getElementById('myEquipmentRequestsList');
        if (container) {
            const deleteButtons = container.querySelectorAll(`[onclick="deleteUserEquipmentRequest('${requestId}')"]`);
            if (deleteButtons.length > 0) {
                requestElement = deleteButtons[0].closest('.entry-card');
                console.log('✅ Found element via exact onclick match');
            }
        }
        
        // Strategy 2: Find by partial onclick match
        if (!requestElement && container) {
            const allCards = container.querySelectorAll('.entry-card');
            for (const card of allCards) {
                const deleteBtn = card.querySelector(`[onclick*="deleteUserEquipmentRequest('${requestId}')"]`);
                if (deleteBtn) {
                    requestElement = card;
                    console.log('✅ Found element via partial onclick match');
                    break;
                }
            }
        }
        
        // Strategy 3: Find by content match as backup
        if (!requestElement && container) {
            const allCards = container.querySelectorAll('.entry-card');
            for (const card of allCards) {
                if (card.innerHTML.includes(requestId)) {
                    requestElement = card;
                    console.log('✅ Found element via content match');
                    break;
                }
            }
        }
        
        console.log('- Target container:', container ? 'FOUND' : 'NOT FOUND');
        console.log('- Target element:', requestElement ? 'FOUND' : 'NOT FOUND');
        
        // Make element transparent immediately
        if (requestElement) {
            requestElement.style.opacity = '0.3';
            requestElement.style.pointerEvents = 'none';
            requestElement.style.transition = 'opacity 0.3s ease';
            console.log('✅ Element made transparent');
        }
        
        // Delete from database
        await window.db.collection('requests').doc(requestId).delete();
        console.log('✅ Deleted from database');
        
        // Remove element from DOM immediately
        if (requestElement) {
            requestElement.style.opacity = '0';
            setTimeout(() => {
                requestElement.remove();
                console.log('✅ Element removed from DOM');
                
                // Check if container is now empty
                if (container) {
                    const remainingCards = container.querySelectorAll('.entry-card');
                    if (remainingCards.length === 0) {
                        container.innerHTML = `
                            <div class="empty-state">
                                <p>Keine Equipment-Anfragen vorhanden.</p>
                                <p>Sie können über "Equipment anfragen" neue Anfragen erstellen.</p>
                            </div>
                        `;
                    }
                }
            }, 300);
        }
        
        window.toast.success('Ausleih-Anfrage gelöscht');
        
    } catch (error) {
        console.error('Error deleting equipment request:', error);
        window.toast.error('Fehler beim Löschen der Ausleih-Anfrage');
        
        // Restore element if deletion failed
        if (requestElement) {
            requestElement.style.opacity = '1';
            requestElement.style.pointerEvents = 'auto';
        }
    }
}

/**
 * Refresh equipment requests without reopening modal
 */
async function refreshMyEquipmentRequests() {
    const container = document.getElementById('myEquipmentRequestsList');
    if (!container) return;
    
    try {
        container.innerHTML = 'Lade Ausleihen...';
        
        const snapshot = await window.db.collection('requests')
            .where('type', '==', 'equipment')
            .where('userKennung', '==', window.currentUser.kennung)
            .get();
        
        const requests = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            requests.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate()
            });
        });
        
        // Sort locally by creation date (newest first)
        requests.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt - a.createdAt;
        });
        
        renderMyEquipmentRequests(requests);
        
        // Check if modal should auto-close (no requests left)
        if (requests.length === 0) {
            setTimeout(() => {
                window.toast.info('Alle Ausleihen wurden entfernt');
                closeModal();
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error refreshing equipment requests:', error);
        container.innerHTML = `
            <div class="error-state">
                <p>Fehler beim Aktualisieren der Ausleihen</p>
            </div>
        `;
    }
}

/**
 * Get equipment status text
 */
function getEquipmentStatusText(status) {
    const statusMap = {
        'pending': 'Offen',
        'approved': 'Genehmigt', 
        'given': 'Ausgegeben',
        'active': 'Aktiv',
        'return_requested': 'Rückgabe angefragt',
        'returned': 'Zurückgegeben',
        'rejected': 'Abgelehnt',
        'available': 'Verfügbar',
        'borrowed': 'Ausgeliehen',
        'maintenance': 'Wartung',
        'rented': 'Ausgeliehen'
    };
    return statusMap[status] || status;
}

/**
 * Get equipment status CSS class
 */
function getEquipmentStatusClass(status) {
    const classMap = {
        'pending': 'status-new',
        'approved': 'status-paid',
        'given': 'status-paid',
        'active': 'status-paid',
        'return_requested': 'status-unpaid',
        'returned': 'status-paid',
        'rejected': 'status-unpaid'
    };
    return classMap[status] || 'status-new';
}

/**
 * Get equipment duration text
 */
function getEquipmentDurationText(duration) {
    const durationMap = {
        '1_hour': '1 Stunde',
        '2_hours': '2 Stunden',
        'half_day': 'Halber Tag',
        'full_day': 'Ganzer Tag',
        'week': '1 Woche',
        'other': 'Andere'
    };
    return durationMap[duration] || duration;
}

/**
 * Show user's problem reports
 */
async function showMyProblemReports() {
    const modalContent = `
        <div class="modal-header">
            <h3>Meine Meldungen</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div id="myProblemReportsList">
                Lade Meldungen...
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
    
    try {
        const snapshot = await window.db.collection('problemReports')
            .where('reportedByKennung', '==', window.currentUser.kennung)
            .get();
        
        const reports = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            reports.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || data.reportedAt?.toDate()
            });
        });
        
        // Sort locally by creation date (newest first)
        reports.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt - a.createdAt;
        });
        
        renderMyProblemReports(reports);
        
    } catch (error) {
        console.error('Error loading problem reports:', error);
        document.getElementById('myProblemReportsList').innerHTML = `
            <div class="error-state">
                <p>Fehler beim Laden der Meldungen</p>
            </div>
        `;
    }
}

/**
 * Render user's problem reports
 */
function renderMyProblemReports(reports) {
    const container = document.getElementById('myProblemReportsList');
    
    if (reports.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine Meldungen gefunden</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="entry-cards">';
    
    reports.forEach(report => {
        const date = report.createdAt ? report.createdAt.toLocaleDateString('de-DE') : 'Unbekannt';
        const statusText = getProblemStatusText(report.status);
        const statusClass = getProblemStatusClass(report.status);
        const priorityText = getProblemPriorityText(report.priority || report.severity);
        
        html += `
            <div class="entry-card">
                <div class="entry-card-header">
                    <h3 class="entry-job-title">${report.device || 'Problem-Meldung'}</h3>
                    <span class="entry-status-badge ${statusClass}">${statusText}</span>
                </div>
                
                <div class="entry-card-body">
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Datum</span>
                        <span class="entry-detail-value">${date}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Typ</span>
                        <span class="entry-detail-value">${getProblemTypeText(report.type)}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Priorität</span>
                        <span class="entry-detail-value">${priorityText}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Beschreibung</span>
                        <span class="entry-detail-value">${report.description}</span>
                    </div>
                    
                    ${report.steps ? `
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Schritte</span>
                        <span class="entry-detail-value">${report.steps}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="entry-card-footer">
                    ${report.status === 'open' ? `
                        <button class="btn btn-secondary btn-sm" onclick="editProblemReport('${report.id}')">
                            Bearbeiten
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteUserProblemReport('${report.id}')">
                            Löschen
                        </button>
                    ` : report.status === 'resolved' || report.status === 'closed' ? `
                        <button class="btn btn-danger btn-sm" onclick="deleteUserProblemReport('${report.id}')">
                            Löschen
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Edit problem report
 */
async function editProblemReport(reportId) {
    try {
        const doc = await window.db.collection('problemReports').doc(reportId).get();
        if (!doc.exists) {
            window.toast.error('Meldung nicht gefunden');
            return;
        }
        
        const report = doc.data();
        
        const modalContent = `
            <div class="modal-header">
                <h3>Meldung bearbeiten</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form">
                    <div class="form-group">
                        <label class="form-label">Problem-Typ</label>
                        <select id="editProblemType" class="form-select">
                            <option value="printer" ${report.type === 'printer' ? 'selected' : ''}>Drucker-Problem</option>
                            <option value="equipment" ${report.type === 'equipment' ? 'selected' : ''}>Equipment-Problem</option>
                            <option value="material" ${report.type === 'material' ? 'selected' : ''}>Material-Problem</option>
                            <option value="software" ${report.type === 'software' ? 'selected' : ''}>Software-Problem</option>
                            <option value="other" ${report.type === 'other' ? 'selected' : ''}>Sonstiges</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Betroffenes Gerät/Equipment</label>
                        <input type="text" id="editProblemDevice" class="form-input" value="${report.device || ''}" placeholder="z.B. Drucker XYZ, Equipment ABC">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Priorität</label>
                        <select id="editProblemPriority" class="form-select">
                            <option value="low" ${(report.priority || report.severity) === 'low' ? 'selected' : ''}>Niedrig</option>
                            <option value="medium" ${(report.priority || report.severity) === 'medium' ? 'selected' : ''}>Mittel</option>
                            <option value="high" ${(report.priority || report.severity) === 'high' ? 'selected' : ''}>Hoch</option>
                            <option value="urgent" ${(report.priority || report.severity) === 'urgent' || (report.priority || report.severity) === 'critical' ? 'selected' : ''}>Dringend</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Problembeschreibung</label>
                        <textarea id="editProblemDescription" class="form-textarea" rows="4">${report.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Schritte zur Reproduktion</label>
                        <textarea id="editProblemSteps" class="form-textarea" rows="3">${report.steps || ''}</textarea>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
                <button class="btn btn-primary" onclick="saveProblemReportEdit('${reportId}')">Speichern</button>
            </div>
        `;
        
        showModalWithContent(modalContent);
        
    } catch (error) {
        console.error('Error loading problem report for edit:', error);
        window.toast.error('Fehler beim Laden der Meldung');
    }
}

/**
 * Save problem report edit
 */
async function saveProblemReportEdit(reportId) {
    const type = document.getElementById('editProblemType').value;
    const device = document.getElementById('editProblemDevice').value;
    const priority = document.getElementById('editProblemPriority').value;
    const description = document.getElementById('editProblemDescription').value;
    const steps = document.getElementById('editProblemSteps').value;
    
    if (!type || !device || !description) {
        toast.error('Bitte alle Pflichtfelder ausfüllen');
        return;
    }
    
    try {
        await window.db.collection('problemReports').doc(reportId).update({
            type,
            device,
            priority,
            description,
            steps,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        window.toast.success('Meldung erfolgreich aktualisiert');
        closeModal();
        // Refresh the view if still on the view if still on the problem reports modal
        setTimeout(() => {
            const problemReportsList = document.getElementById('myProblemReportsList');
            if (problemReportsList) {
                refreshMyProblemReports();
            }
        }, 100);
        
    } catch (error) {
        console.error('Error updating problem report:', error);
        window.toast.error('Fehler beim Aktualisieren der Meldung');
    }
}

/**
 * Delete problem report (User version)
 */
async function deleteUserProblemReport(reportId) {
    const confirmed = await window.toast.confirm(
        'Möchten Sie diese Problem-Meldung wirklich löschen?',
        'Ja, löschen',
        'Abbrechen'
    );
    if (!confirmed) {
        return;
    }
    
    try {
        console.log(`🗑️ User Delete Problem Report: ${reportId}`);
        
        // More robust element selection for user problem reports
        let reportElement = null;
        
        // Strategy 1: Find by exact onclick match in myProblemReportsList container
        const container = document.getElementById('myProblemReportsList');
        if (container) {
            const deleteButtons = container.querySelectorAll(`[onclick="deleteUserProblemReport('${reportId}')"]`);
            if (deleteButtons.length > 0) {
                reportElement = deleteButtons[0].closest('.entry-card');
                console.log('✅ Found element via exact onclick match');
            }
        }
        
        // Strategy 2: Find by partial onclick match
        if (!reportElement && container) {
            const allCards = container.querySelectorAll('.entry-card');
            for (const card of allCards) {
                const deleteBtn = card.querySelector(`[onclick*="deleteUserProblemReport('${reportId}')"]`);
                if (deleteBtn) {
                    reportElement = card;
                    console.log('✅ Found element via partial onclick match');
                    break;
                }
            }
        }
        
        // Strategy 3: Find by data attribute (backup method)
        if (!reportElement && container) {
            const allCards = container.querySelectorAll('.entry-card');
            for (const card of allCards) {
                // Look for any element that contains the reportId
                if (card.innerHTML.includes(reportId)) {
                    reportElement = card;
                    console.log('✅ Found element via content match');
                    break;
                }
            }
        }
        
        console.log('- Target container:', container ? 'FOUND' : 'NOT FOUND');
        console.log('- Target element:', reportElement ? 'FOUND' : 'NOT FOUND');
        
        // Make element transparent immediately
        if (reportElement) {
            reportElement.style.opacity = '0.3';
            reportElement.style.pointerEvents = 'none';
            reportElement.style.transition = 'opacity 0.3s ease';
            console.log('✅ Element made transparent');
        }
        
        // Delete from database
        await window.db.collection('problemReports').doc(reportId).delete();
        console.log('✅ Deleted from database');
        
        // Remove element from DOM immediately
        if (reportElement) {
            reportElement.style.opacity = '0';
            setTimeout(() => {
                reportElement.remove();
                console.log('✅ Element removed from DOM');
                
                // Check if container is now empty
                if (container) {
                    const remainingCards = container.querySelectorAll('.entry-card');
                    if (remainingCards.length === 0) {
                        container.innerHTML = `
                            <div class="empty-state">
                                <p>Keine Problem-Meldungen vorhanden.</p>
                                <p>Sie können über "Problem melden" neue Meldungen erstellen.</p>
                            </div>
                        `;
                    }
                }
            }, 300);
        }
        
        window.toast.success('Problem-Meldung gelöscht');
        
    } catch (error) {
        console.error('Error deleting problem report:', error);
        window.toast.error('Fehler beim Löschen der Problem-Meldung');
        
        // Restore element if deletion failed
        if (reportElement) {
            reportElement.style.opacity = '1';
            reportElement.style.pointerEvents = 'auto';
        }
    }
}

/**
 * Refresh problem reports without reopening modal
 */
async function refreshMyProblemReports() {
    const container = document.getElementById('myProblemReportsList');
    if (!container) return;
    
    try {
        container.innerHTML = 'Lade Meldungen...';
        
        const snapshot = await window.db.collection('problemReports')
            .where('reportedByKennung', '==', window.currentUser.kennung)
            .get();
        
        const reports = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            reports.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || data.reportedAt?.toDate()
            });
        });
        
        // Sort locally by creation date (newest first)
        reports.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt - a.createdAt;
        });
        
        renderMyProblemReports(reports);
        
        // Check if modal should auto-close (no reports left)
        if (reports.length === 0) {
            setTimeout(() => {
                window.toast.info('Alle Meldungen wurden entfernt');
                closeModal();
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error refreshing problem reports:', error);
        container.innerHTML = `
            <div class="error-state">
                <p>Fehler beim Aktualisieren der Meldungen</p>
            </div>
        `;
    }
}

/**
 * Get problem status text
 */
function getProblemStatusText(status) {
    const statusMap = {
        'open': 'OFFEN',
        'in_progress': 'IN BEARBEITUNG',
        'resolved': 'GELÖST',
        'closed': 'GESCHLOSSEN'
    };
    return statusMap[status] || status.toUpperCase();
}

/**
 * Get problem status CSS class
 */
function getProblemStatusClass(status) {
    const classMap = {
        'open': 'status-new',
        'in_progress': 'status-unpaid',
        'resolved': 'status-paid',
        'closed': 'status-paid'
    };
    return classMap[status] || 'status-new';
}

/**
 * Get problem type text
 */
function getProblemTypeText(type) {
    const typeMap = {
        'printer': 'Drucker-Problem',
        'equipment': 'Equipment-Problem',
        'material': 'Material-Problem',
        'software': 'Software-Problem',
        'other': 'Sonstiges'
    };
    return typeMap[type] || type;
}

/**
 * Get problem priority text
 */
function getProblemPriorityText(priority) {
    const priorityMap = {
        'low': 'Niedrig',
        'medium': 'Mittel',
        'high': 'Hoch',
        'urgent': 'Dringend',
        'critical': 'Kritisch'
    };
    return priorityMap[priority] || priority;
}

/**
 * Show user's material requests
 */
async function showMyMaterialRequests() {
    const modalContent = `
        <div class="modal-header">
            <h3>Meine Wünsche</h3>
            <button class="close-btn" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div id="myMaterialRequestsList">
                Lade Wünsche...
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        </div>
    `;
    
    showModalWithContent(modalContent);
    
    try {
        const snapshot = await window.db.collection('materialOrders')
            .where('source', '==', 'user')
            .where('userKennung', '==', window.currentUser.kennung)
            .get();
        
        const requests = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            requests.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate()
            });
        });
        
        // Sort locally by creation date (newest first)
        requests.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt - a.createdAt;
        });
        
        renderMyMaterialRequests(requests);
        
    } catch (error) {
        console.error('Error loading material requests:', error);
        document.getElementById('myMaterialRequestsList').innerHTML = `
            <div class="error-state">
                <p>Fehler beim Laden der Wünsche</p>
            </div>
        `;
    }
}

/**
 * Render user's material requests
 */
function renderMyMaterialRequests(requests) {
    const container = document.getElementById('myMaterialRequestsList');
    
    if (requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine Wünsche gefunden</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="entry-cards">';
    
    requests.forEach(request => {
        const date = request.createdAt ? request.createdAt.toLocaleDateString('de-DE') : 'Unbekannt';
        const statusText = getMaterialRequestStatusText(request.status);
        const statusClass = getMaterialRequestStatusClass(request.status);
        const priorityText = getMaterialPriorityText(request.priority);
        
        html += `
            <div class="entry-card">
                <div class="entry-card-header">
                    <h3 class="entry-job-title">${request.materialName || request.name || 'Material-Wunsch'}</h3>
                    <span class="entry-status-badge ${statusClass}">${statusText}</span>
                </div>
                
                <div class="entry-card-body">
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Datum</span>
                        <span class="entry-detail-value">${date}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Material</span>
                        <span class="entry-detail-value">${request.materialName || 'Nicht angegeben'}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Menge</span>
                        <span class="entry-detail-value">${request.quantity || 'Nicht angegeben'}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Priorität</span>
                        <span class="entry-detail-value">${priorityText}</span>
                    </div>
                    
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Begründung</span>
                        <span class="entry-detail-value">${request.reason}</span>
                    </div>
                    
                    ${request.manufacturer ? `
                    <div class="entry-detail-row">
                        <span class="entry-detail-label">Hersteller</span>
                        <span class="entry-detail-value">${request.manufacturer}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="entry-card-footer">
                    ${request.status === 'pending' ? `
                        <button class="btn btn-secondary btn-sm" onclick="editMaterialRequest('${request.id}')">
                            Bearbeiten
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteMaterialRequest('${request.id}')">
                            Löschen
                        </button>
                    ` : request.status === 'approved' ? `
                        <button class="btn btn-danger btn-sm" onclick="deleteMaterialRequest('${request.id}')">
                            Löschen
                        </button>
                    ` : request.status === 'rejected' ? `
                        <button class="btn btn-danger btn-sm" onclick="deleteMaterialRequest('${request.id}')">
                            Löschen
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Edit material request
 */
async function editMaterialRequest(requestId) {
    try {
        const doc = await window.db.collection('materialOrders').doc(requestId).get();
        if (!doc.exists) {
            window.toast.error('Wunsch nicht gefunden');
            return;
        }
        
        const request = doc.data();
        
        const modalContent = `
            <div class="modal-header">
                <h3>Wunsch bearbeiten</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form">
                    <div class="form-group">
                        <label class="form-label">Material/Filament</label>
                        <input type="text" id="editMaterialType" class="form-input" value="${request.type || ''}" placeholder="z.B. PLA, PETG, TPU...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Name/Bezeichnung</label>
                        <input type="text" id="editMaterialName" class="form-input" value="${request.materialName || request.name || ''}" placeholder="z.B. PLA Schwarz, PETG Transparent...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Menge</label>
                        <input type="text" id="editMaterialQuantity" class="form-input" value="${request.quantity || ''}" placeholder="z.B. 1kg, 500g, 2 Spulen...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Priorität</label>
                        <select id="editMaterialPriority" class="form-select">
                            <option value="low" ${request.priority === 'low' ? 'selected' : ''}>Niedrig</option>
                            <option value="medium" ${request.priority === 'medium' || !request.priority ? 'selected' : ''}>Mittel</option>
                            <option value="high" ${request.priority === 'high' ? 'selected' : ''}>Hoch</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Begründung</label>
                        <textarea id="editMaterialReason" class="form-textarea" rows="3">${request.reason || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Lieferant (optional)</label>
                        <input type="text" id="editMaterialSupplier" class="form-input" value="${request.manufacturer || request.supplier || ''}" placeholder="z.B. Prusament, eSUN...">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
                <button class="btn btn-primary" onclick="saveMaterialRequestEdit('${requestId}')">Speichern</button>
            </div>
        `;
        
        showModalWithContent(modalContent);
        
    } catch (error) {
        console.error('Error loading material request for edit:', error);
        window.toast.error('Fehler beim Laden des Wunsches');
    }
}

/**
 * Save material request edit
 */
async function saveMaterialRequestEdit(requestId) {
    const type = document.getElementById('editMaterialType').value;
    const name = document.getElementById('editMaterialName').value;
    const quantity = document.getElementById('editMaterialQuantity').value;
    const priority = document.getElementById('editMaterialPriority').value;
    const reason = document.getElementById('editMaterialReason').value;
    const supplier = document.getElementById('editMaterialSupplier').value;
    
    if (!type || !name || !quantity || !reason) {
        window.toast.error('Bitte alle Pflichtfelder ausfüllen');
        return;
    }
    
    try {
        await window.db.collection('materialOrders').doc(requestId).update({
            type,
            materialName: name, // Use materialName to match submitMaterialWish
            quantity,
            priority,
            reason,
            manufacturer: supplier, // Use manufacturer to match submitMaterialWish
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        window.toast.success('Wunsch erfolgreich aktualisiert');
        closeModal();
        // Refresh the view if still on the material requests modal
        setTimeout(() => {
            const materialRequestsList = document.getElementById('myMaterialRequestsList');
            if (materialRequestsList) {
                refreshMyMaterialRequests();
            }
        }, 100);
        
    } catch (error) {
        console.error('Error updating material request:', error);
        window.toast.error('Fehler beim Aktualisieren des Wunsches');
    }
}

/**
 * Delete material request
 */
async function deleteMaterialRequest(requestId) {
    try {
        // Get request details for confirmation message
        const requestDoc = await window.db.collection('materialOrders').doc(requestId).get();
        if (!requestDoc.exists) {
            window.toast.error('Material-Wunsch nicht gefunden');
            return;
        }
        
        const requestData = requestDoc.data();
        const isApproved = requestData.status === 'approved';
        
        // Show appropriate confirmation message
        const confirmMessage = isApproved 
            ? 'Möchten Sie diesen genehmigten Material-Wunsch wirklich löschen?\n\nDies entfernt ihn auch aus der Admin-Einkaufsliste.' 
            : 'Möchten Sie diesen Material-Wunsch wirklich löschen?';
            
        const confirmed = await window.toast.confirm(
            confirmMessage,
            'Ja, löschen',
            'Abbrechen'
        );
        if (!confirmed) {
            return;
        }
        
        // First remove from display immediately with multiple selector strategies
        let requestElement = document.querySelector(`[onclick*="deleteMaterialRequest('${requestId}')"]`)?.closest('.entry-card');
        
        // Fallback selector strategies
        if (!requestElement) {
            requestElement = document.querySelector(`[onclick="deleteMaterialRequest('${requestId}')"]`)?.closest('.entry-card');
        }
        
        // Additional fallback: find all entry cards and match by data or content
        if (!requestElement) {
            const allCards = document.querySelectorAll('.entry-card');
            for (const card of allCards) {
                const deleteBtn = card.querySelector(`[onclick*="deleteMaterialRequest('${requestId}')"]`);
                if (deleteBtn) {
                    requestElement = card;
                    break;
                }
            }
        }
        
        // Debug logging
        console.log(`🗑️ Delete Material Request: ${requestId}`, requestElement ? 'Element found' : 'Element NOT found');
        
        if (requestElement) {
            requestElement.style.opacity = '0.5';
            requestElement.style.pointerEvents = 'none';
            console.log('✅ Element made transparent');
        }
        
        await window.db.collection('materialOrders').doc(requestId).delete();
        
        // Immediately remove element from DOM after successful deletion
        if (requestElement) {
            requestElement.remove();
            console.log('✅ Element removed from DOM');
        }
        
        window.toast.success('Material-Wunsch gelöscht');
        
        // Check if container is now empty and handle auto-close
        const container = document.getElementById('myMaterialRequestsList');
        if (container) {
            const remainingCards = container.querySelectorAll('.entry-card');
            if (remainingCards.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>Keine Material-Wünsche vorhanden.</p>
                        <p>Sie können über "Material-Wunsch hinzufügen" neue Wünsche erstellen.</p>
                    </div>
                `;
                setTimeout(() => {
                    window.toast.info('Alle Material-Wünsche wurden entfernt');
                }, 500);
            }
        }
        
    } catch (error) {
        console.error('Error deleting material request:', error);
        window.toast.error('Fehler beim Löschen des Material-Wunschs');
        
        // Restore element if deletion failed
        const requestElement = document.querySelector(`[onclick*="deleteMaterialRequest('${requestId}')"]`)?.closest('.entry-card');
        if (requestElement) {
            requestElement.style.opacity = '1';
            requestElement.style.pointerEvents = 'auto';
        }
    }
}

/**
 * Refresh material requests without reopening modal
 */
async function refreshMyMaterialRequests() {
    const container = document.getElementById('myMaterialRequestsList');
    if (!container) return;
    
    try {
        container.innerHTML = 'Lade Wünsche...';
        
        const snapshot = await window.db.collection('materialOrders')
            .where('source', '==', 'user')
            .where('userKennung', '==', window.currentUser.kennung)
            .get();
        
        const requests = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            requests.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate()
            });
        });
        
        // Sort locally by creation date (newest first)
        requests.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            return b.createdAt - a.createdAt;
        });
        
        renderMyMaterialRequests(requests);
        
        // Check if modal should auto-close (no requests left)
        if (requests.length === 0) {
            setTimeout(() => {
                window.toast.info('Alle Material-Wünsche wurden entfernt');
                closeModal();
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error refreshing material requests:', error);
        container.innerHTML = `
            <div class="error-state">
                <p>Fehler beim Aktualisieren der Material-Wünsche</p>
            </div>
        `;
    }
}

/**
 * Get material request status text
 */
function getMaterialRequestStatusText(status) {
    const statusMap = {
        'pending': 'OFFEN',
        'approved': 'GENEHMIGT',
        'ordered': 'BESTELLT',
        'delivered': 'GELIEFERT',
        'rejected': 'ABGELEHNT'
    };
    return statusMap[status] || status.toUpperCase();
}

/**
 * Get material request status CSS class
 */
function getMaterialRequestStatusClass(status) {
    const classMap = {
        'pending': 'status-new',
        'approved': 'status-unpaid',
        'ordered': 'status-unpaid',
        'delivered': 'status-paid',
        'rejected': 'status-unpaid'
    };
    return classMap[status] || 'status-new';
}

/**
 * Get material priority text
 */
function getMaterialPriorityText(priority) {
    const priorityMap = {
        'low': 'Niedrig',
        'medium': 'Mittel',
        'high': 'Hoch'
    };
    return priorityMap[priority] || 'Mittel';
}

/**
 * Load all users for equipment requests
 */
async function loadAllUsers() {
    try {
        console.log('🔄 Loading all users for equipment requests...');
        const usersSnapshot = await window.db.collection('users').get();
        
        allUsers = [];
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            allUsers.push({
                id: doc.id,
                name: userData.name || 'Unbekannter Benutzer',
                kennung: userData.kennung || '',
                email: userData.email || '',
                ...userData
            });
        });
        
        // Sort by name
        allUsers.sort((a, b) => a.name.localeCompare(b.name));
        
        console.log(`✅ Loaded ${allUsers.length} users for equipment requests`);
        return allUsers;
        
    } catch (error) {
        console.error('Error loading users:', error);
        return [];
    }
}

/**
 * Get user display text for dropdown
 */
function getUserDisplayText(user) {
    if (user.kennung && user.name) {
        return `${user.name} (${user.kennung})`;
    } else if (user.name) {
        return user.name;
    } else if (user.kennung) {
        return user.kennung;
    } else {
        return 'Unbekannter Benutzer';
    }
}

// Global functions
window.initializeUserServices = initializeUserServices;
window.cleanupUserServices = cleanupUserServices;
window.showPrinterStatus = showPrinterStatus;
window.cyclePrinterStatus = cyclePrinterStatus;
window.handleUserStatusChange = handleUserStatusChange;
window.showEquipmentRequest = showEquipmentRequest;
window.updateEquipmentOptions = updateEquipmentOptions;
window.loadEquipmentForRequest = loadEquipmentForRequest;
window.submitEquipmentRequest = submitEquipmentRequest;
window.submitMaterialWish = submitMaterialWish;
window.showProblemReport = showProblemReport;
window.reportPrinterProblem = reportPrinterProblem;
window.submitPrinterProblemReport = submitPrinterProblemReport;
window.showMyEquipmentRequests = showMyEquipmentRequests;
window.requestEquipmentReturn = requestEquipmentReturn;
window.deleteUserEquipmentRequest = deleteUserEquipmentRequest;
window.showMyProblemReports = showMyProblemReports;
window.editProblemReport = editProblemReport;
window.saveProblemReportEdit = saveProblemReportEdit;
window.deleteUserProblemReport = deleteUserProblemReport;
window.showMyMaterialRequests = showMyMaterialRequests;
window.editMaterialRequest = editMaterialRequest;
window.saveMaterialRequestEdit = saveMaterialRequestEdit;
window.deleteMaterialRequest = deleteMaterialRequest;
window.loadAllUsers = loadAllUsers;
window.getUserDisplayText = getUserDisplayText;
window.autoFillPhoneNumber = autoFillPhoneNumber;
window.savePhoneNumberToProfile = savePhoneNumberToProfile;
window.loadPrinterStatus = loadPrinterStatus;

console.log('👥 User Services Module loaded'); 