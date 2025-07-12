/**
 * Printer Reservation System
 * Handles calendar-based printer reservations and scheduling
 */

// Global reservation state
let reservations = [];
let currentWeekStart = new Date();
let selectedTimeSlot = null;

/**
 * Initialize reservation system
 */
function initializeReservationSystem() {
    setCurrentWeekToToday();
    loadReservations();
}

/**
 * Set current week to today
 */
function setCurrentWeekToToday() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Calculate Monday
    
    currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() + mondayOffset);
    currentWeekStart.setHours(0, 0, 0, 0);
}

/**
 * Load reservations from Firebase
 */
async function loadReservations() {
    try {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(currentWeekStart.getDate() + 7);
        
        const querySnapshot = await window.db.collection('reservations')
            .where('startTime', '>=', currentWeekStart)
            .where('startTime', '<', weekEnd)
            .get();
            
        reservations = [];
        querySnapshot.forEach((doc) => {
            reservations.push({
                id: doc.id,
                ...doc.data(),
                startTime: doc.data().startTime.toDate(),
                endTime: doc.data().endTime.toDate()
            });
        });
        
        console.log('Loaded reservations:', reservations.length);
    } catch (error) {
        console.error('Error loading reservations:', error);
        showToast('Fehler beim Laden der Reservierungen', 'error');
    }
}

/**
 * Show reservation calendar modal
 */
function showReservationCalendar() {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('reservationModal').style.display = 'block';
    
    loadReservations().then(() => {
        renderCalendar();
        updateWeekDisplay();
    });
}

/**
 * Close reservation calendar modal
 */
function closeReservationCalendar() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('reservationModal').style.display = 'none';
    selectedTimeSlot = null;
}

/**
 * Navigate to previous week
 */
function previousWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    loadReservations().then(() => {
        renderCalendar();
        updateWeekDisplay();
    });
}

/**
 * Navigate to next week
 */
function nextWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    loadReservations().then(() => {
        renderCalendar();
        updateWeekDisplay();
    });
}

/**
 * Update week display text
 */
function updateWeekDisplay() {
    const weekNumber = getWeekNumber(currentWeekStart);
    const year = currentWeekStart.getFullYear();
    document.getElementById('currentWeek').textContent = `KW ${weekNumber}, ${year}`;
}

/**
 * Get ISO week number
 */
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Render calendar grid
 */
function renderCalendar() {
    const calendar = document.getElementById('reservationCalendar');
    
    // Clear existing content
    calendar.innerHTML = '';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'calendar-header';
    
    // Time column header
    const timeHeader = document.createElement('div');
    timeHeader.className = 'calendar-header-cell';
    timeHeader.textContent = 'Zeit';
    header.appendChild(timeHeader);
    
    // Day headers
    const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    for (let i = 0; i < 7; i++) {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-header-cell';
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);
        dayHeader.textContent = `${days[i]} ${date.getDate()}.${date.getMonth() + 1}`;
        header.appendChild(dayHeader);
    }
    
    calendar.appendChild(header);
    
    // Create body
    const body = document.createElement('div');
    body.className = 'calendar-body';
    
    // Time slots (8:00 - 18:00)
    for (let hour = 8; hour < 18; hour++) {
        // Time slot label
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.textContent = `${hour}:00`;
        body.appendChild(timeSlot);
        
        // Day cells for this hour
        for (let day = 0; day < 7; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell available';
            
            const cellDate = new Date(currentWeekStart);
            cellDate.setDate(currentWeekStart.getDate() + day);
            cellDate.setHours(hour, 0, 0, 0);
            
            // Check if this slot has a reservation
            const reservation = reservations.find(r => 
                r.startTime.getTime() <= cellDate.getTime() && 
                r.endTime.getTime() > cellDate.getTime()
            );
            
            if (reservation) {
                cell.className = 'calendar-cell reserved';
                cell.innerHTML = `
                    <div class="reservation-block">
                        <div class="reservation-user">${reservation.userName}</div>
                        <div class="reservation-printer">${reservation.printerName}</div>
                    </div>
                `;
            } else {
                // Check if slot is in the past
                const now = new Date();
                if (cellDate < now) {
                    cell.className = 'calendar-cell past';
                } else {
                    cell.addEventListener('click', () => selectTimeSlot(cellDate));
                }
            }
            
            body.appendChild(cell);
        }
    }
    
    calendar.appendChild(body);
}

/**
 * Select a time slot for reservation
 */
function selectTimeSlot(dateTime) {
    selectedTimeSlot = dateTime;
    showNewReservationForm();
}

/**
 * Show new reservation form
 */
function showNewReservationForm() {
    if (!selectedTimeSlot) {
        // Show general reservation form
        selectedTimeSlot = new Date();
        selectedTimeSlot.setHours(8, 0, 0, 0);
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Neue Reservierung</h3>
                <button class="modal-close" onclick="closeNewReservationForm()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="reservationForm" class="form">
                    <div class="form-group">
                        <label class="form-label">Nutzer</label>
                        <input type="text" id="reservationUser" class="form-input" placeholder="Name" value="${window.currentUser?.name || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Drucker</label>
                        <select id="reservationPrinter" class="form-select">
                            <option value="">Drucker auswählen...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Datum</label>
                        <input type="date" id="reservationDate" class="form-input" value="${selectedTimeSlot.toISOString().split('T')[0]}">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Startzeit</label>
                            <input type="time" id="reservationStartTime" class="form-input" value="${selectedTimeSlot.toTimeString().substr(0,5)}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Endzeit</label>
                            <input type="time" id="reservationEndTime" class="form-input">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Notizen</label>
                        <textarea id="reservationNotes" class="form-textarea" placeholder="Optional: Projektbeschreibung, Materialien, etc." rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeNewReservationForm()">Abbrechen</button>
                        <button type="button" class="btn btn-primary" onclick="saveReservation()">Reservieren</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.id = 'newReservationModal';
    
    // Populate printer dropdown
    populatePrinterDropdown();
    
    // Set default end time (1 hour later)
    const endTime = new Date(selectedTimeSlot);
    endTime.setHours(endTime.getHours() + 1);
    document.getElementById('reservationEndTime').value = endTime.toTimeString().substr(0,5);
}

/**
 * Close new reservation form
 */
function closeNewReservationForm() {
    const modal = document.getElementById('newReservationModal');
    if (modal) {
        modal.remove();
    }
    selectedTimeSlot = null;
}

/**
 * Populate printer dropdown with available printers
 */
function populatePrinterDropdown() {
    const select = document.getElementById('reservationPrinter');
    if (!select) return;
    
    // Clear existing options except first
    select.innerHTML = '<option value="">Drucker auswählen...</option>';
    
    // Add available printers
    const availablePrinters = getAvailablePrinters();
    availablePrinters.forEach(printer => {
        const option = document.createElement('option');
        option.value = printer.id;
        option.textContent = `${printer.name} (${printer.model || 'Unbekannt'})`;
        select.appendChild(option);
    });
}

/**
 * Save new reservation
 */
async function saveReservation() {
    const formData = {
        userName: document.getElementById('reservationUser').value.trim(),
        userKennung: window.currentUser?.kennung || '',
        printerId: document.getElementById('reservationPrinter').value,
        date: document.getElementById('reservationDate').value,
        startTimeStr: document.getElementById('reservationStartTime').value,
        endTimeStr: document.getElementById('reservationEndTime').value,
        notes: document.getElementById('reservationNotes').value.trim()
    };
    
    // Validation
    if (!formData.userName || !formData.printerId || !formData.date || !formData.startTimeStr || !formData.endTimeStr) {
        showToast('Bitte füllen Sie alle Pflichtfelder aus', 'error');
        return;
    }
    
    // Create DateTime objects
    const startDateTime = new Date(`${formData.date}T${formData.startTimeStr}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTimeStr}`);
    
    if (endDateTime <= startDateTime) {
        showToast('Endzeit muss nach Startzeit liegen', 'error');
        return;
    }
    
    // Check for conflicts
    const hasConflict = reservations.some(r => 
        r.printerId === formData.printerId &&
        ((startDateTime >= r.startTime && startDateTime < r.endTime) ||
         (endDateTime > r.startTime && endDateTime <= r.endTime) ||
         (startDateTime <= r.startTime && endDateTime >= r.endTime))
    );
    
    if (hasConflict) {
        showToast('Zeitslot bereits reserviert', 'error');
        return;
    }
    
    // Get printer name
    const printer = printers.find(p => p.id === formData.printerId);
    const printerName = printer ? printer.name : 'Unbekannter Drucker';
    
    try {
        await window.db.collection('reservations').add({
            userName: formData.userName,
            userKennung: formData.userKennung,
            printerId: formData.printerId,
            printerName: printerName,
            startTime: firebase.firestore.Timestamp.fromDate(startDateTime),
            endTime: firebase.firestore.Timestamp.fromDate(endDateTime),
            notes: formData.notes,
            status: 'confirmed',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showToast('Reservierung erfolgreich erstellt', 'success');
        closeNewReservationForm();
        await loadReservations();
        renderCalendar();
        
    } catch (error) {
        console.error('Error saving reservation:', error);
        showToast('Fehler beim Erstellen der Reservierung', 'error');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize reservation system when Firebase is ready
    if (window.firebase && window.db) {
        initializeReservationSystem();
    } else {
        // Wait for Firebase initialization
        document.addEventListener('firebase-ready', initializeReservationSystem);
    }
}); 