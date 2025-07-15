// ==================== BUTTON FACTORY ====================
// Zentrale Button-Erstellung für konsistente Styles

// Button-Typen Definitionen
const BUTTON_TYPES = {
  PRIMARY: 'btn-primary',      // Schwarz - Hauptaktionen (Bearbeiten, Speichern, Hinzufügen)
  SECONDARY: 'btn-secondary',  // Weiß mit schwarzer Outline - Sekundäre Aktionen (Schließen, Abbrechen)
  TERTIARY: 'btn-tertiary',   // Weiß mit schwarzer Outline - Tertiäre Aktionen (Details)
  SUCCESS: 'btn-success',     // Harmonisches Grün - Erfolgs-Aktionen (Nachweis, Bezahlt)
  WARNING: 'btn-warning',     // Gelb - Warnungen (Mahnung, Nachweis wenn unbezahlt)
  DANGER: 'btn-danger',       // Harmonisches Orange-Rot - Gefährliche Aktionen (Löschen)
  UNDO: 'btn-undo',          // Harmonisches Grau - Rückgängig-Aktionen
  NACHWEIS: 'btn-nachweis'    // Gelb - Spezial für Nachweis-Buttons
};

// Button-Aktionen Mapping für konsistente Verwendung
const BUTTON_ACTIONS = {
  // Primäre Aktionen (schwarz)
  EDIT: { type: BUTTON_TYPES.PRIMARY, text: 'Bearbeiten' },
  SAVE: { type: BUTTON_TYPES.PRIMARY, text: 'Speichern' },
  ADD: { type: BUTTON_TYPES.PRIMARY, text: 'Hinzufügen' },
  CREATE: { type: BUTTON_TYPES.PRIMARY, text: 'Erstellen' },
  UPDATE: { type: BUTTON_TYPES.PRIMARY, text: 'Aktualisieren' },
  REGISTER_PAYMENT: { type: BUTTON_TYPES.PRIMARY, text: 'Zahlung genehmigen' },
  PAYMENT_REQUEST: { type: BUTTON_TYPES.PRIMARY, text: 'Zahlung anweisen' },
  
  // Sekundäre Aktionen (weiß mit schwarzer Outline)
  CLOSE: { type: BUTTON_TYPES.SECONDARY, text: 'Schließen' },
  CANCEL: { type: BUTTON_TYPES.SECONDARY, text: 'Abbrechen' },
  
  // Rückgängig-Aktionen (neues Grau)
  UNDO: { type: BUTTON_TYPES.UNDO, text: 'Rückgängig' },
  
  // Tertiäre Aktionen (weiß mit schwarzer Outline)
  DETAILS: { type: BUTTON_TYPES.TERTIARY, text: 'Details' },
  VIEW: { type: BUTTON_TYPES.TERTIARY, text: 'Anzeigen' },
  
  // Erfolgs-Aktionen (grün)
  NACHWEIS_SHOW: { type: BUTTON_TYPES.SUCCESS, text: 'Nachweis anzeigen' },
  NACHWEIS_PAID: { type: BUTTON_TYPES.SUCCESS, text: 'Nachweis' },
  
  // Warnungs-Aktionen (gelb)
  REMINDER: { type: BUTTON_TYPES.WARNING, text: 'Mahnung' },
  NACHWEIS_UNPAID: { type: BUTTON_TYPES.NACHWEIS, text: 'Nachweis' },
  
  // Gefährliche Aktionen (rot)
  DELETE: { type: BUTTON_TYPES.DANGER, text: 'Löschen' },
  REMOVE: { type: BUTTON_TYPES.DANGER, text: 'Entfernen' }
};

// Basis Button Creator
function createButton(action, onclick, options = {}) {
  const buttonConfig = BUTTON_ACTIONS[action];
  if (!buttonConfig) {
    console.warn(`Unknown button action: ${action}`);
    return `<button class="btn">Unknown</button>`;
  }
  
  const {
    text = options.text || buttonConfig.text,
    disabled = options.disabled || false,
    title = options.title || '',
    id = options.id || '',
    extraClasses = options.extraClasses || ''
  } = options;
  
  const disabledAttr = disabled ? 'disabled' : '';
  const titleAttr = title ? `title="${title}"` : '';
  const idAttr = id ? `id="${id}"` : '';
  
  return `<button class="btn ${buttonConfig.type} ${extraClasses}" onclick="${onclick}" ${disabledAttr} ${titleAttr} ${idAttr}>${text}</button>`;
}

// Spezielle Button Creators für häufige Anwendungsfälle
const ButtonFactory = {
  // Entry/Druck Buttons
  editEntry: (entryId, isUser = false) => {
    const action = isUser ? `editUserEntry('${entryId}')` : `editEntry('${entryId}')`;
    return createButton('EDIT', action);
  },
  
  deleteEntry: (entryId) => createButton('DELETE', `deleteEntry('${entryId}')`),
  
  viewDetails: (entryId) => createButton('DETAILS', `viewEntryDetails('${entryId}')`),
  
  showNachweis: (entryId, isPaid = false) => {
    if (isPaid) {
      return createButton('NACHWEIS_PAID', `showPaymentProof('${entryId}')`);
    } else {
      return createButton('PAYMENT_REQUEST', `requestPayment('${entryId}')`, {
        title: 'Zahlungsanfrage an Admin senden',
        id: `payment-request-btn-${entryId}`,
        extraClasses: 'payment-request-btn'
      });
    }
  },
  
  registerPayment: (entryId) => createButton('REGISTER_PAYMENT', `markEntryAsPaid('${entryId}')`),
  
  undoPayment: (entryId) => createButton('UNDO', `markEntryAsUnpaid('${entryId}')`),
  
  // User Management Buttons
  editUser: (kennung) => createButton('EDIT', `editUser('${kennung}')`),
  
  deleteUser: (kennung) => createButton('DELETE', `deleteUser('${kennung}')`),
  
  userDetails: (kennung) => createButton('DETAILS', `showUserDetails('${kennung}')`),
  
  sendReminder: (kennung) => createButton('REMINDER', `sendPaymentReminder('${kennung}')`, { text: 'Erinnerung' }),
  
  sendUrgentReminder: (kennung) => createButton('DELETE', `sendUrgentReminder('${kennung}')`, { text: 'Dringende Mahnung' }),
  
  // Material Management Buttons
  editMaterial: (materialId) => createButton('EDIT', `editMaterial('${materialId}')`),
  
  deleteMaterial: (materialId) => createButton('DELETE', `deleteMaterial('${materialId}')`),
  
  addMaterial: () => createButton('ADD', 'addMaterial()', { text: 'Material hinzufügen' }),
  
  // Masterbatch Management Buttons
  editMasterbatch: (masterbatchId) => createButton('EDIT', `editMasterbatch('${masterbatchId}')`),
  
  deleteMasterbatch: (masterbatchId) => createButton('DELETE', `deleteMasterbatch('${masterbatchId}')`),
  
  addMasterbatch: () => createButton('ADD', 'addMasterbatch()', { text: 'Masterbatch hinzufügen' }),
  
  // Modal Buttons
  closeModal: () => createButton('CLOSE', 'closeModal()'),
  
  cancelModal: () => createButton('CANCEL', 'closeModal()'),
  
  // Spezifische Close-Funktionen für verschiedene Modals
  cancelMaterialModal: () => createButton('CANCEL', 'closeEditMaterialModal()'),
  
  cancelMasterbatchModal: () => createButton('CANCEL', 'closeEditMasterbatchModal()'),
  
  saveChanges: (saveFunction) => createButton('SAVE', saveFunction),
  
  // Generic Buttons
  primary: (text, onclick, options = {}) => createButton('EDIT', onclick, { ...options, text }),
  
  secondary: (text, onclick, options = {}) => createButton('CLOSE', onclick, { ...options, text }),
  
  tertiary: (text, onclick, options = {}) => createButton('DETAILS', onclick, { ...options, text }),
  
  danger: (text, onclick, options = {}) => createButton('DELETE', onclick, { ...options, text })
};

// Export für globale Verwendung
window.ButtonFactory = ButtonFactory;
window.BUTTON_ACTIONS = BUTTON_ACTIONS;
window.createButton = createButton;

// UX: Toast für Nachweis-Button wenn disabled
document.addEventListener('click', function(e) {
  const btn = e.target.closest('button.btn-nachweis:disabled');
  if (btn) {
    if (window.toast && typeof window.toast.warning === 'function') {
      window.toast.warning('Nachweis erst verfügbar, wenn der Druck bezahlt wurde.');
    } else {
      alert('Nachweis erst verfügbar, wenn der Druck bezahlt wurde.');
    }
    e.preventDefault();
    e.stopPropagation();
  }
});
