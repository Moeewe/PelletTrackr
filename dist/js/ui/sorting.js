// ==================== SORTING UTILITIES ====================

let userSortDirection = {};
let adminSortDirection = {};

function sortUserEntries(column) {
  if (!window.allUserEntries.length) return;
  
  // Toggle sort direction
  userSortDirection[column] = userSortDirection[column] === 'asc' ? 'desc' : 'asc';
  const direction = userSortDirection[column];
  
  // Update visual indicators
  updateSortIndicators('user', column, direction);
  
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

function sortAdminEntriesBy(column) {
  if (!window.allAdminEntries.length) return;
  
  // Toggle sort direction
  adminSortDirection[column] = adminSortDirection[column] === 'asc' ? 'desc' : 'asc';
  const direction = adminSortDirection[column];
  
  // Update visual indicators
  updateSortIndicators('admin', column, direction);
  
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

function updateSortIndicators(tableType, column, direction) {
  // Remove previous sort indicators
  const headers = document.querySelectorAll(`.data-table th`);
  headers.forEach(th => {
    th.classList.remove('sorted-asc', 'sorted-desc');
  });
  
  // Add new sort indicator
  const columnMap = {
    'user': {
      'date': 'th[onclick="sortUserEntries(\'date\')"]',
      'jobName': 'th[onclick="sortUserEntries(\'jobName\')"]',
      'material': 'th[onclick="sortUserEntries(\'material\')"]',
      'materialMenge': 'th[onclick="sortUserEntries(\'materialMenge\')"]',
      'masterbatch': 'th[onclick="sortUserEntries(\'masterbatch\')"]',
      'masterbatchMenge': 'th[onclick="sortUserEntries(\'masterbatchMenge\')"]',
      'cost': 'th[onclick="sortUserEntries(\'cost\')"]',
      'status': 'th[onclick="sortUserEntries(\'status\')"]'
    },
    'admin': {
      'date': 'th[onclick="sortAdminEntriesBy(\'date\')"]',
      'name': 'th[onclick="sortAdminEntriesBy(\'name\')"]',
      'kennung': 'th[onclick="sortAdminEntriesBy(\'kennung\')"]',
      'jobName': 'th[onclick="sortAdminEntriesBy(\'jobName\')"]',
      'material': 'th[onclick="sortAdminEntriesBy(\'material\')"]',
      'materialMenge': 'th[onclick="sortAdminEntriesBy(\'materialMenge\')"]',
      'masterbatch': 'th[onclick="sortAdminEntriesBy(\'masterbatch\')"]',
      'masterbatchMenge': 'th[onclick="sortAdminEntriesBy(\'masterbatchMenge\')"]',
      'cost': 'th[onclick="sortAdminEntriesBy(\'cost\')"]',
      'status': 'th[onclick="sortAdminEntriesBy(\'status\')"]'
    }
  };
  
  const selector = columnMap[tableType] && columnMap[tableType][column];
  if (selector) {
    const targetHeader = document.querySelector(selector);
    if (targetHeader) {
      targetHeader.classList.add(direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
  }
}
