// ==================== SORTING UTILITIES ====================

let userSortDirection = {};
let adminSortDirection = {};

// User Entries sortieren
function sortUserEntries(column) {
  if (!window.allUserEntries || !window.allUserEntries.length) return;
  
  // Toggle sort direction
  userSortDirection[column] = userSortDirection[column] === 'asc' ? 'desc' : 'asc';
  const direction = userSortDirection[column];
  
  window.allUserEntries.sort((a, b) => {
    let valueA, valueB;
    
    switch (column) {
      case 'date':
        valueA = a.timestamp ? new Date(a.timestamp.toDate()) : new Date(0);
        valueB = b.timestamp ? new Date(b.timestamp.toDate()) : new Date(0);
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
        valueA = parseFloat(a.totalCost) || 0;
        valueB = parseFloat(b.totalCost) || 0;
        break;
      case 'status':
        valueA = (a.paid || a.isPaid) ? 'bezahlt' : 'offen';
        valueB = (b.paid || b.isPaid) ? 'bezahlt' : 'offen';
        break;
      default:
        return 0;
    }
    
    if (typeof valueA === 'string') {
      return direction === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    } else {
      return direction === 'asc' ? valueA - valueB : valueB - valueA;
    }
  });
  
  if (typeof window.renderUserEntries === 'function') {
    window.renderUserEntries(window.allUserEntries);
  }
}

// Admin Entries sortieren (über Select-Dropdown)
function sortAdminEntries() {
  if (!window.allAdminEntries || window.allAdminEntries.length === 0) return;

  const sortSelect = document.getElementById('adminSortSelect');
  if (!sortSelect) return;

  const sortValue = sortSelect.value;
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

  if (typeof window.renderAdminEntries === 'function') {
    window.renderAdminEntries(sortedEntries);
  }
}

// User Entries durchsuchen
function searchUserEntries() {
  if (!window.allUserEntries || window.allUserEntries.length === 0) return;

  const searchInput = document.getElementById('userSearchInput');
  if (!searchInput) return;

  const searchTerm = searchInput.value.toLowerCase();
  
  if (!searchTerm) {
    // Zeige alle Einträge wenn Suchfeld leer ist
    if (typeof window.renderUserEntries === 'function') {
      window.renderUserEntries(window.allUserEntries);
    }
    return;
  }

  const filteredEntries = window.allUserEntries.filter(entry => {
    return (
      (entry.material && entry.material.toLowerCase().includes(searchTerm)) ||
      (entry.masterbatch && entry.masterbatch.toLowerCase().includes(searchTerm)) ||
      (entry.jobName && entry.jobName.toLowerCase().includes(searchTerm)) ||
      (entry.kennung && entry.kennung.toLowerCase().includes(searchTerm)) ||
      (entry.name && entry.name.toLowerCase().includes(searchTerm)) ||
      (entry.paid || entry.isPaid ? 'bezahlt' : 'offen').includes(searchTerm)
    );
  });

  if (typeof window.renderUserEntries === 'function') {
    window.renderUserEntries(filteredEntries);
  }
}

// Admin Entries durchsuchen
function searchAdminEntries() {
  if (!window.allAdminEntries || window.allAdminEntries.length === 0) return;

  const searchInput = document.getElementById('adminSearchInput');
  if (!searchInput) return;

  const searchTerm = searchInput.value.toLowerCase();
  
  if (!searchTerm) {
    // Zeige alle Einträge wenn Suchfeld leer ist
    if (typeof window.renderAdminEntries === 'function') {
      window.renderAdminEntries(window.allAdminEntries);
    }
    return;
  }

  const filteredEntries = window.allAdminEntries.filter(entry => {
    return (
      (entry.name && entry.name.toLowerCase().includes(searchTerm)) ||
      (entry.kennung && entry.kennung.toLowerCase().includes(searchTerm)) ||
      (entry.material && entry.material.toLowerCase().includes(searchTerm)) ||
      (entry.masterbatch && entry.masterbatch.toLowerCase().includes(searchTerm)) ||
      (entry.jobName && entry.jobName.toLowerCase().includes(searchTerm)) ||
      (entry.paid || entry.isPaid ? 'bezahlt' : 'offen').includes(searchTerm)
    );
  });

  if (typeof window.renderAdminEntries === 'function') {
    window.renderAdminEntries(filteredEntries);
  }
}

// User Management Search
function searchUsers() {
  if (!window.allUsers || window.allUsers.length === 0) return;

  const searchInput = document.getElementById('userManagerSearchInput');
  if (!searchInput) return;

  const searchTerm = searchInput.value.toLowerCase();
  
  if (!searchTerm) {
    // Zeige alle Nutzer wenn Suchfeld leer ist
    if (typeof window.renderUsersTable === 'function') {
      window.renderUsersTable(window.allUsers);
    }
    return;
  }

  const filteredUsers = window.allUsers.filter(user => {
    return (
      (user.name && user.name.toLowerCase().includes(searchTerm)) ||
      (user.kennung && user.kennung.toLowerCase().includes(searchTerm)) ||
      (user.email && user.email.toLowerCase().includes(searchTerm))
    );
  });

  if (typeof window.renderUsersTable === 'function') {
    window.renderUsersTable(filteredUsers);
  }
}

// User Management Sort
function sortUsers() {
  if (!window.allUsers || window.allUsers.length === 0) return;

  const sortSelect = document.getElementById('userManagerSortSelect');
  if (!sortSelect) return;

  const sortValue = sortSelect.value;
  const [criteria, direction] = sortValue.split('-');

  let sortedUsers = [...window.allUsers];

  switch (criteria) {
    case 'name':
      sortedUsers.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
      break;
    
    case 'kennung':
      sortedUsers.sort((a, b) => {
        const kennungA = (a.kennung || '').toLowerCase();
        const kennungB = (b.kennung || '').toLowerCase();
        return direction === 'asc' ? kennungA.localeCompare(kennungB) : kennungB.localeCompare(kennungA);
      });
      break;
    
    case 'entries':
      sortedUsers.sort((a, b) => {
        const entriesA = a.entries ? a.entries.length : 0;
        const entriesB = b.entries ? b.entries.length : 0;
        return direction === 'asc' ? entriesA - entriesB : entriesB - entriesA;
      });
      break;
    
    case 'revenue':
      sortedUsers.sort((a, b) => {
        const revenueA = a.totalCost || 0;
        const revenueB = b.totalCost || 0;
        return direction === 'asc' ? revenueA - revenueB : revenueB - revenueA;
      });
      break;
  }

  if (typeof window.renderUsersTable === 'function') {
    window.renderUsersTable(sortedUsers);
  }
}

// ==================== GLOBAL EXPORTS ====================
// Make all functions globally available
window.sortUserEntries = sortUserEntries;
window.searchUserEntries = searchUserEntries;
window.sortAdminEntries = sortAdminEntries;
window.searchAdminEntries = searchAdminEntries;
window.searchUsers = searchUsers;
window.sortUsers = sortUsers;

console.log("🔍 Sorting & Filtering Module loaded");
