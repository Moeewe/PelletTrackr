// ==================== SORTING UTILITIES ====================

let userSortDirection = {};
let adminSortDirection = {};

function sortUserEntries(column) {
  if (!window.allUserEntries.length) return;
  
  // Toggle sort direction
  userSortDirection[column] = userSortDirection[column] === 'asc' ? 'desc' : 'asc';
  const direction = userSortDirection[column];
  
  window.allUserEntries.sort((a, b) => {
    let valueA, valueB;
    
    switch(column) {
      case 'date':
        valueA = new Date(a.date);
        valueB = new Date(b.date);
        break;
      case 'jobName':
        valueA = a.jobName?.toLowerCase() || '';
        valueB = b.jobName?.toLowerCase() || '';
        break;
      case 'material':
        valueA = a.material?.toLowerCase() || '';
        valueB = b.material?.toLowerCase() || '';
        break;
      case 'materialMenge':
        valueA = parseFloat(a.materialMenge) || 0;
        valueB = parseFloat(b.materialMenge) || 0;
        break;
      case 'masterbatch':
        valueA = a.masterbatch?.toLowerCase() || '';
        valueB = b.masterbatch?.toLowerCase() || '';
        break;
      case 'masterbatchMenge':
        valueA = parseFloat(a.masterbatchMenge) || 0;
        valueB = parseFloat(b.masterbatchMenge) || 0;
        break;
      case 'cost':
        valueA = parseFloat(a.cost) || 0;
        valueB = parseFloat(b.cost) || 0;
        break;
      case 'status':
        valueA = a.status?.toLowerCase() || '';
        valueB = b.status?.toLowerCase() || '';
        break;
      default:
        return 0;
    }
    
    if (valueA < valueB) return direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  
  window.renderUserEntries(window.allUserEntries);
}

// Neue Funktion für User-Entries Dropdown-Sortierung
function sortUserEntries() {
  if (!window.allUserEntries.length) return;
  
  const sortSelect = document.getElementById('userSortSelect');
  if (!sortSelect) return;
  
  const sortValue = sortSelect.value;
  let sortedEntries = [...window.allUserEntries];
  
  sortedEntries.sort((a, b) => {
    let valueA, valueB;
    
    switch(sortValue) {
      case 'date-desc':
        valueA = a.timestamp ? new Date(a.timestamp.toDate()) : new Date(0);
        valueB = b.timestamp ? new Date(b.timestamp.toDate()) : new Date(0);
        return valueB - valueA;
      case 'date-asc':
        valueA = a.timestamp ? new Date(a.timestamp.toDate()) : new Date(0);
        valueB = b.timestamp ? new Date(b.timestamp.toDate()) : new Date(0);
        return valueA - valueB;
      case 'jobName-asc':
        valueA = (a.jobName || '').toLowerCase();
        valueB = (b.jobName || '').toLowerCase();
        return valueA.localeCompare(valueB);
      case 'jobName-desc':
        valueA = (a.jobName || '').toLowerCase();
        valueB = (b.jobName || '').toLowerCase();
        return valueB.localeCompare(valueA);
      case 'material-asc':
        valueA = (a.material || '').toLowerCase();
        valueB = (b.material || '').toLowerCase();
        return valueA.localeCompare(valueB);
      case 'material-desc':
        valueA = (a.material || '').toLowerCase();
        valueB = (b.material || '').toLowerCase();
        return valueB.localeCompare(valueA);
      case 'cost-desc':
        valueA = parseFloat(a.totalCost) || 0;
        valueB = parseFloat(b.totalCost) || 0;
        return valueB - valueA;
      case 'cost-asc':
        valueA = parseFloat(a.totalCost) || 0;
        valueB = parseFloat(b.totalCost) || 0;
        return valueA - valueB;
      case 'status-paid':
        const paidA = a.paid || a.isPaid;
        const paidB = b.paid || b.isPaid;
        return paidB - paidA; // Bezahlt zuerst
      case 'status-unpaid':
        const unpaidA = a.paid || a.isPaid;
        const unpaidB = b.paid || b.isPaid;
        return unpaidA - unpaidB; // Unbezahlt zuerst
      default:
        return 0;
    }
  });
  
  window.renderUserEntries(sortedEntries);
}

function sortAdminEntriesBy(column) {
  if (!window.allAdminEntries.length) return;
  
  // Toggle sort direction
  adminSortDirection[column] = adminSortDirection[column] === 'asc' ? 'desc' : 'asc';
  const direction = adminSortDirection[column];
  
  window.allAdminEntries.sort((a, b) => {
    let valueA, valueB;
    
    switch (column) {
      case 'date':
        valueA = new Date(a.date);
        valueB = new Date(b.date);
        break;
      case 'name':
        valueA = a.name?.toLowerCase() || '';
        valueB = b.name?.toLowerCase() || '';
        break;
      case 'kennung':
        valueA = a.kennung?.toLowerCase() || '';
        valueB = b.kennung?.toLowerCase() || '';
        break;
      case 'jobName':
        valueA = a.jobName?.toLowerCase() || '';
        valueB = b.jobName?.toLowerCase() || '';
        break;
      case 'material':
        valueA = a.material?.toLowerCase() || '';
        valueB = b.material?.toLowerCase() || '';
        break;
      case 'materialMenge':
        valueA = parseFloat(a.materialMenge) || 0;
        valueB = parseFloat(b.materialMenge) || 0;
        break;
      case 'masterbatch':
        valueA = a.masterbatch?.toLowerCase() || '';
        valueB = b.masterbatch?.toLowerCase() || '';
        break;
      case 'masterbatchMenge':
        valueA = parseFloat(a.masterbatchMenge) || 0;
        valueB = parseFloat(b.masterbatchMenge) || 0;
        break;
      case 'cost':
        valueA = parseFloat(a.cost) || 0;
        valueB = parseFloat(b.cost) || 0;
        break;
      case 'status':
        valueA = a.status?.toLowerCase() || '';
        valueB = b.status?.toLowerCase() || '';
        break;
      default:
        return 0;
    }
    
    if (valueA < valueB) return direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  
  window.renderAdminEntries(window.allAdminEntries);
}

// Search Admin entries
function searchAdmins() {
  if (!window.allAdminEntries) return;

  const searchTerm = document.getElementById('adminManagerSearchInput').value.toLowerCase();

  const filteredEntries = window.allAdminEntries.filter(entry => {
    return entry.name.toLowerCase().includes(searchTerm) ||
           entry.kennung.toLowerCase().includes(searchTerm) ||
           entry.jobName.toLowerCase().includes(searchTerm) ||
           entry.material.toLowerCase().includes(searchTerm) ||
           entry.masterbatch.toLowerCase().includes(searchTerm);
  });

  window.renderAdminEntries(filteredEntries);
}

// ==================== SEARCH FUNCTIONS ====================

// User Entries durchsuchen
function searchUserEntries() {
  if (!window.allUserEntries || window.allUserEntries.length === 0) return;

  const searchTerm = document.getElementById('userSearchInput').value.toLowerCase();
  
  if (!searchTerm) {
    // Zeige alle Einträge wenn Suchfeld leer ist
    window.renderUserEntries(window.allUserEntries);
    return;
  }

  const filteredEntries = window.allUserEntries.filter(entry => {
    return (
      (entry.material && entry.material.toLowerCase().includes(searchTerm)) ||
      (entry.masterbatch && entry.masterbatch.toLowerCase().includes(searchTerm)) ||
      (entry.jobName && entry.jobName.toLowerCase().includes(searchTerm)) ||
      (entry.kennung && entry.kennung.toLowerCase().includes(searchTerm)) ||
      (entry.paid ? 'bezahlt' : 'offen').includes(searchTerm)
    );
  });

  window.renderUserEntries(filteredEntries);
}

// Admin Entries durchsuchen
function searchAdminEntries() {
  if (!window.allAdminEntries || window.allAdminEntries.length === 0) return;

  const searchTerm = document.getElementById('adminSearchInput').value.toLowerCase();
  
  if (!searchTerm) {
    // Zeige alle Einträge wenn Suchfeld leer ist
    window.renderAdminEntries(window.allAdminEntries);
    return;
  }

  const filteredEntries = window.allAdminEntries.filter(entry => {
    return (
      (entry.name && entry.name.toLowerCase().includes(searchTerm)) ||
      (entry.kennung && entry.kennung.toLowerCase().includes(searchTerm)) ||
      (entry.material && entry.material.toLowerCase().includes(searchTerm)) ||
      (entry.masterbatch && entry.masterbatch.toLowerCase().includes(searchTerm)) ||
      (entry.jobName && entry.jobName.toLowerCase().includes(searchTerm)) ||
      (entry.paid ? 'bezahlt' : 'offen').includes(searchTerm)
    );
  });

  window.renderAdminEntries(filteredEntries);
}

// Admin Entries sortieren (über Select-Dropdown)
function sortAdminEntries() {
  if (!window.allAdminEntries || window.allAdminEntries.length === 0) return;

  const sortValue = document.getElementById('adminSortSelect').value;
  const [criteria, direction] = sortValue.split('-');

  let sortedEntries = [...window.allAdminEntries];

  switch (criteria) {
    case 'date':
      sortedEntries.sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp.toDate()) : new Date(0);
        const dateB = b.timestamp ? new Date(b.timestamp.toDate()) : new Date(0);
        return direction === 'asc' ? dateA - dateB : dateB - dateA;
      });
      break;
    
    case 'name':
      sortedEntries.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
      break;
    
    case 'cost':
      sortedEntries.sort((a, b) => {
        const costA = parseFloat(a.totalCost) || 0;
        const costB = parseFloat(b.totalCost) || 0;
        return direction === 'asc' ? costA - costB : costB - costA;
      });
      break;
    
    case 'status':
      if (direction === 'paid') {
        sortedEntries = sortedEntries.filter(entry => entry.paid || entry.isPaid);
      } else if (direction === 'unpaid') {
        sortedEntries = sortedEntries.filter(entry => !(entry.paid || entry.isPaid));
      }
      break;
  }

  window.renderAdminEntries(sortedEntries);
}

// ==================== VISUAL SORT INDICATORS ====================
// Removed - using only gray arrows in CSS

// ==================== GLOBAL EXPOSURE ====================
// Sorting functions global verfügbar machen

window.sortUserEntries = sortUserEntries;
window.sortAdminEntriesBy = sortAdminEntriesBy;
window.sortAdminEntries = sortAdminEntries;
window.searchUserEntries = searchUserEntries;
window.searchAdminEntries = searchAdminEntries;
window.searchAdmins = searchAdmins;
