// ==================== SORTING UTILITIES ====================

let userSortDirection = {};
let adminSortDirection = {};

// ==================== ADVANCED SEARCH & FILTER STATE ====================

let currentUserFilters = {
    search: '',
    material: '',
    dateRange: '',
    costRange: '',
    status: 'all'
};

let currentAdminFilters = {
    search: '',
    user: '',
    material: '',
    status: '',
    dateRange: '',
    costRange: ''
};

// ==================== ENHANCED SEARCH FUNCTIONS ====================

// Advanced User Search
function performAdvancedUserSearch() {
    if (!window.allUserEntries || window.allUserEntries.length === 0) return;
    
    // Update search term
    const searchInput = document.getElementById('userSearchInput');
    currentUserFilters.search = searchInput ? searchInput.value.toLowerCase() : '';
    
    // Update other filters
    currentUserFilters.material = document.getElementById('userMaterialFilter')?.value || '';
    currentUserFilters.dateRange = document.getElementById('userDateFilter')?.value || '';
    currentUserFilters.costRange = document.getElementById('userCostFilter')?.value || '';
    
    // Apply all filters
    let filteredEntries = applyUserFilters(window.allUserEntries);
    
    // Update results counter
    updateUserResultsCounter(filteredEntries.length, window.allUserEntries.length);
    
    // Render filtered results
    window.renderUserEntries(filteredEntries);
}

// Advanced Admin Search
function performAdvancedAdminSearch() {
    if (!window.allAdminEntries || window.allAdminEntries.length === 0) {
        console.log('🔍 Admin search: No entries available');
        return;
    }
    
    // Update search term
    const searchInput = document.getElementById('adminSearchInput');
    currentAdminFilters.search = searchInput ? searchInput.value.toLowerCase() : '';
    
    // Update other filters
    currentAdminFilters.user = document.getElementById('adminUserFilter')?.value || '';
    currentAdminFilters.material = document.getElementById('adminMaterialFilter')?.value || '';
    currentAdminFilters.status = document.getElementById('adminStatusFilter')?.value || '';
    currentAdminFilters.dateRange = document.getElementById('adminDateFilter')?.value || '';
    
    console.log('🔍 Admin search filters:', currentAdminFilters);
    
    // Apply all filters
    let filteredEntries = applyAdminFilters(window.allAdminEntries);
    
    console.log(`🔍 Admin search: ${filteredEntries.length} of ${window.allAdminEntries.length} entries match filters`);
    
    // Update results counter
    updateAdminResultsCounter(filteredEntries.length, window.allAdminEntries.length);
    
    // Render filtered results
    if (typeof window.renderAdminEntries === 'function') {
        window.renderAdminEntries(filteredEntries);
    } else {
        console.error('❌ renderAdminEntries function not found');
    }
}

// Apply User Filters
function applyUserFilters(entries) {
    return entries.filter(entry => {
        // Text search filter
        if (currentUserFilters.search) {
            const searchText = currentUserFilters.search;
            const matchesSearch = (
                (entry.material && entry.material.toLowerCase().includes(searchText)) ||
                (entry.masterbatch && entry.masterbatch.toLowerCase().includes(searchText)) ||
                (entry.jobName && entry.jobName.toLowerCase().includes(searchText)) ||
                (entry.jobNotes && entry.jobNotes.toLowerCase().includes(searchText)) ||
                (entry.kennung && entry.kennung.toLowerCase().includes(searchText))
            );
            if (!matchesSearch) return false;
        }
        
        // Material filter
        if (currentUserFilters.material && entry.material !== currentUserFilters.material) {
            return false;
        }
        
        // Date range filter
        if (currentUserFilters.dateRange && !matchesDateRange(entry, currentUserFilters.dateRange)) {
            return false;
        }
        
        // Cost range filter
        if (currentUserFilters.costRange && !matchesCostRange(entry, currentUserFilters.costRange)) {
            return false;
        }
        
        // Status filter
        if (currentUserFilters.status !== 'all') {
            const isPaid = entry.paid || entry.isPaid;
            if (currentUserFilters.status === 'paid' && !isPaid) return false;
            if (currentUserFilters.status === 'unpaid' && isPaid) return false;
        }
        
        return true;
    });
}

// Apply Admin Filters
function applyAdminFilters(entries) {
    return entries.filter(entry => {
        // Text search filter
        if (currentAdminFilters.search) {
            const searchText = currentAdminFilters.search;
            const matchesSearch = (
                (entry.name && entry.name.toLowerCase().includes(searchText)) ||
                (entry.kennung && entry.kennung.toLowerCase().includes(searchText)) ||
                (entry.material && entry.material.toLowerCase().includes(searchText)) ||
                (entry.masterbatch && entry.masterbatch.toLowerCase().includes(searchText)) ||
                (entry.jobName && entry.jobName.toLowerCase().includes(searchText)) ||
                (entry.jobNotes && entry.jobNotes.toLowerCase().includes(searchText))
            );
            if (!matchesSearch) return false;
        }
        
        // User filter
        if (currentAdminFilters.user && entry.name !== currentAdminFilters.user) {
            return false;
        }
        
        // Material filter
        if (currentAdminFilters.material && entry.material !== currentAdminFilters.material) {
            return false;
        }
        
        // Status filter
        if (currentAdminFilters.status) {
            const isPaid = entry.paid || entry.isPaid;
            if (currentAdminFilters.status === 'paid' && !isPaid) return false;
            if (currentAdminFilters.status === 'unpaid' && isPaid) return false;
        }
        
        // Date range filter
        if (currentAdminFilters.dateRange && !matchesDateRange(entry, currentAdminFilters.dateRange)) {
            return false;
        }
        
        // Cost range filter
        if (currentAdminFilters.costRange && !matchesCostRange(entry, currentAdminFilters.costRange)) {
            return false;
        }
        
        return true;
    });
}

// ==================== QUICK FILTER FUNCTIONS ====================

// User Quick Filters
function setUserQuickFilter(filter) {
    // Reset all filters first
    resetUserFilters(false);
    
    // Remove active class from all buttons
    document.querySelectorAll('.quick-filters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Apply quick filter
    switch(filter) {
        case 'all':
            currentUserFilters.status = 'all';
            break;
        case 'unpaid':
            currentUserFilters.status = 'unpaid';
            break;
        case 'paid':
            currentUserFilters.status = 'paid';
            break;
        case 'recent':
            currentUserFilters.dateRange = 'week';
            break;
        case 'high-cost':
            currentUserFilters.costRange = '30+';
            break;
    }
    
    performAdvancedUserSearch();
}

// Admin Quick Filters
function setAdminQuickFilter(filter) {
    // Reset all filters first
    resetAdminFilters(false);
    
    // Remove active class from all buttons
    document.querySelectorAll('#adminAdvancedFilters .quick-filters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Apply quick filter
    switch(filter) {
        case 'all':
            currentAdminFilters.status = '';
            break;
        case 'unpaid':
            currentAdminFilters.status = 'unpaid';
            break;
        case 'paid':
            currentAdminFilters.status = 'paid';
            break;
        case 'today':
            currentAdminFilters.dateRange = 'today';
            break;
        case 'high-value':
            currentAdminFilters.costRange = '25+';
            break;
    }
    
    performAdvancedAdminSearch();
}

// ==================== UTILITY FUNCTIONS ====================

// Date Range Matching
function matchesDateRange(entry, range) {
    if (!entry.timestamp) return false;
    
    const entryDate = entry.timestamp.toDate ? entry.timestamp.toDate() : new Date(entry.timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch(range) {
        case 'today':
            const entryDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
            return entryDay.getTime() === today.getTime();
        case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return entryDate >= weekAgo;
        case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            return entryDate >= monthAgo;
        case 'quarter':
            const quarterAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
            return entryDate >= quarterAgo;
        case 'year':
            const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
            return entryDate >= yearAgo;
        default:
            return true;
    }
}

// Cost Range Matching
function matchesCostRange(entry, range) {
    const cost = parseFloat(entry.totalCost) || 0;
    
    switch(range) {
        case '0-5':
            return cost >= 0 && cost <= 5;
        case '5-15':
            return cost > 5 && cost <= 15;
        case '15-30':
            return cost > 15 && cost <= 30;
        case '25+':
            return cost > 25;
        case '30+':
            return cost > 30;
        default:
            return true;
    }
}

// ==================== UI HELPER FUNCTIONS ====================

// Toggle Advanced Filters
function toggleUserAdvancedFilters() {
    const toggle = document.querySelector('#userAdvancedFilters .advanced-toggle');
    const panel = document.getElementById('userFiltersPanel');
    
    if (panel.classList.contains('expanded')) {
        panel.classList.remove('expanded');
        toggle.classList.remove('expanded');
    } else {
        panel.classList.add('expanded');
        toggle.classList.add('expanded');
        populateUserFilterDropdowns();
    }
}

function toggleAdminAdvancedFilters() {
    const toggle = document.querySelector('#adminAdvancedFilters .advanced-toggle');
    const panel = document.getElementById('adminFiltersPanel');
    
    if (panel.classList.contains('expanded')) {
        panel.classList.remove('expanded');
        toggle.classList.remove('expanded');
    } else {
        panel.classList.add('expanded');
        toggle.classList.add('expanded');
        populateAdminFilterDropdowns();
    }
}

// Populate Filter Dropdowns
function populateUserFilterDropdowns() {
    const materialSelect = document.getElementById('userMaterialFilter');
    if (materialSelect && window.allUserEntries) {
        const materials = [...new Set(window.allUserEntries.map(e => e.material).filter(Boolean))];
        materialSelect.innerHTML = '<option value="">Alle Materialien</option>';
        materials.forEach(material => {
            materialSelect.innerHTML += `<option value="${material}">${material}</option>`;
        });
    }
}

function populateAdminFilterDropdowns() {
    const userSelect = document.getElementById('adminUserFilter');
    const materialSelect = document.getElementById('adminMaterialFilter');
    
    if (userSelect && window.allAdminEntries) {
        const users = [...new Set(window.allAdminEntries.map(e => e.name).filter(Boolean))];
        userSelect.innerHTML = '<option value="">Alle Nutzer</option>';
        users.forEach(user => {
            userSelect.innerHTML += `<option value="${user}">${user}</option>`;
        });
    }
    
    if (materialSelect && window.allAdminEntries) {
        const materials = [...new Set(window.allAdminEntries.map(e => e.material).filter(Boolean))];
        materialSelect.innerHTML = '<option value="">Alle Materialien</option>';
        materials.forEach(material => {
            materialSelect.innerHTML += `<option value="${material}">${material}</option>`;
        });
    }
}

// Update Results Counter
function updateUserResultsCounter(filtered, total) {
    const counter = document.getElementById('userResultsCounter');
    if (counter) {
        if (filtered === total) {
            counter.textContent = `${total} Drucke`;
        } else {
            counter.textContent = `${filtered} von ${total} Drucke`;
        }
    }
}

function updateAdminResultsCounter(filtered, total) {
    const counter = document.getElementById('adminResultsCounter');
    if (counter) {
        if (filtered === total) {
            counter.textContent = `${total} Drucke`;
        } else {
            counter.textContent = `${filtered} von ${total} Drucke`;
        }
    }
}

// Clear Search Functions
function clearUserSearch() {
    document.getElementById('userSearchInput').value = '';
    currentUserFilters.search = '';
    performAdvancedUserSearch();
}

function clearAdminSearch() {
    document.getElementById('adminSearchInput').value = '';
    currentAdminFilters.search = '';
    performAdvancedAdminSearch();
}

// Reset Filter Functions
function resetUserFilters(performSearch = true) {
    currentUserFilters = {
        search: '',
        material: '',
        dateRange: '',
        costRange: '',
        status: 'all'
    };
    
    // Reset UI elements
    document.getElementById('userSearchInput').value = '';
    document.getElementById('userMaterialFilter').value = '';
    document.getElementById('userDateFilter').value = '';
    document.getElementById('userCostFilter').value = '';
    
    // Reset quick filter buttons
    document.querySelectorAll('#userAdvancedFilters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('#userAdvancedFilters .filter-btn[data-filter="all"]')?.classList.add('active');
    
    if (performSearch) {
        performAdvancedUserSearch();
    }
}

function resetAdminFilters(performSearch = true) {
    currentAdminFilters = {
        search: '',
        user: '',
        material: '',
        status: '',
        dateRange: '',
        costRange: ''
    };
    
    // Reset UI elements
    document.getElementById('adminSearchInput').value = '';
    document.getElementById('adminUserFilter').value = '';
    document.getElementById('adminMaterialFilter').value = '';
    document.getElementById('adminStatusFilter').value = '';
    document.getElementById('adminDateFilter').value = '';
    
    // Reset quick filter buttons
    document.querySelectorAll('#adminAdvancedFilters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('#adminAdvancedFilters .filter-btn[data-filter="all"]')?.classList.add('active');
    
    if (performSearch) {
        performAdvancedAdminSearch();
    }
}

// ==================== LEGACY COMPATIBILITY FUNCTIONS ====================

// Legacy User Search (for backward compatibility)
function searchUserEntries() {
    performAdvancedUserSearch();
}

// Legacy Admin Search (for backward compatibility)
function searchAdminEntries() {
    performAdvancedAdminSearch();
}

// Legacy sorting functions
function sortUserEntries(column) {
    if (!window.allUserEntries || !window.allUserEntries.length) return;
    
    // Toggle sort direction
    userSortDirection[column] = userSortDirection[column] === 'asc' ? 'desc' : 'asc';
    const direction = userSortDirection[column];
    
    // Get currently filtered entries
    let entriesToSort = applyUserFilters(window.allUserEntries);
    
    entriesToSort.sort((a, b) => {
        let valueA, valueB;
        
        switch(column) {
            case 'date':
                valueA = a.timestamp ? new Date(a.timestamp.toDate()) : new Date(0);
                valueB = b.timestamp ? new Date(b.timestamp.toDate()) : new Date(0);
                break;
            case 'jobName':
                valueA = (a.jobName || '').toLowerCase();
                valueB = (b.jobName || '').toLowerCase();
                break;
            case 'material':
                valueA = (a.material || '').toLowerCase();
                valueB = (b.material || '').toLowerCase();
                break;
            case 'materialMenge':
                valueA = parseFloat(a.materialMenge) || 0;
                valueB = parseFloat(b.materialMenge) || 0;
                break;
            case 'masterbatch':
                valueA = (a.masterbatch || '').toLowerCase();
                valueB = (b.masterbatch || '').toLowerCase();
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
                valueA = (a.paid || a.isPaid) ? 'paid' : 'unpaid';
                valueB = (b.paid || b.isPaid) ? 'paid' : 'unpaid';
                break;
            default:
                return 0;
        }
        
        if (valueA < valueB) return direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    window.renderUserEntries(entriesToSort);
}

function sortAdminEntriesBy(column) {
    if (!window.allAdminEntries || !window.allAdminEntries.length) return;
    
    // Toggle sort direction
    adminSortDirection[column] = adminSortDirection[column] === 'asc' ? 'desc' : 'asc';
    const direction = adminSortDirection[column];
    
    // Get currently filtered entries
    let entriesToSort = applyAdminFilters(window.allAdminEntries);
    
    entriesToSort.sort((a, b) => {
        let valueA, valueB;
        
        switch (column) {
            case 'date':
                valueA = a.timestamp ? new Date(a.timestamp.toDate()) : new Date(0);
                valueB = b.timestamp ? new Date(b.timestamp.toDate()) : new Date(0);
                break;
            case 'name':
                valueA = (a.name || '').toLowerCase();
                valueB = (b.name || '').toLowerCase();
                break;
            case 'kennung':
                valueA = (a.kennung || '').toLowerCase();
                valueB = (b.kennung || '').toLowerCase();
                break;
            case 'jobName':
                valueA = (a.jobName || '').toLowerCase();
                valueB = (b.jobName || '').toLowerCase();
                break;
            case 'material':
                valueA = (a.material || '').toLowerCase();
                valueB = (b.material || '').toLowerCase();
                break;
            case 'materialMenge':
                valueA = parseFloat(a.materialMenge) || 0;
                valueB = parseFloat(b.materialMenge) || 0;
                break;
            case 'masterbatch':
                valueA = (a.masterbatch || '').toLowerCase();
                valueB = (b.masterbatch || '').toLowerCase();
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
                valueA = (a.paid || a.isPaid) ? 'paid' : 'unpaid';
                valueB = (b.paid || b.isPaid) ? 'paid' : 'unpaid';
                break;
            default:
                return 0;
        }
        
        if (valueA < valueB) return direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    window.renderAdminEntries(entriesToSort);
}

// Admin Entries sortieren (über Select-Dropdown)
function sortAdminEntries() {
    if (!window.allAdminEntries || window.allAdminEntries.length === 0) return;
    
    const sortValue = document.getElementById('adminSortSelect').value;
    const [criteria, direction] = sortValue.split('-');
    
    // Get currently filtered entries
    let sortedEntries = applyAdminFilters(window.allAdminEntries);
    
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
    }
    
    window.renderAdminEntries(sortedEntries);
}

// Search Admin entries (legacy user management)
function searchAdmins() {
    if (!window.allAdminEntries) return;
    
    const searchTerm = document.getElementById('adminManagerSearchInput')?.value.toLowerCase() || '';
    
    const filteredEntries = window.allAdminEntries.filter(entry => {
        return (entry.name && entry.name.toLowerCase().includes(searchTerm)) ||
               (entry.kennung && entry.kennung.toLowerCase().includes(searchTerm)) ||
               (entry.jobName && entry.jobName.toLowerCase().includes(searchTerm)) ||
               (entry.material && entry.material.toLowerCase().includes(searchTerm)) ||
               (entry.masterbatch && entry.masterbatch.toLowerCase().includes(searchTerm));
    });
    
    window.renderAdminEntries(filteredEntries);
}

// ==================== INITIALIZATION ====================

// Initialize filter dropdowns when data is loaded
function initializeAdvancedFilters() {
    console.log('🔧 Initializing advanced filters...');
    
    // Set default active filter
    const userAllFilter = document.querySelector('#userAdvancedFilters .filter-btn[data-filter="all"]');
    const adminAllFilter = document.querySelector('#adminAdvancedFilters .filter-btn[data-filter="all"]');
    
    if (userAllFilter) {
        userAllFilter.classList.add('active');
        console.log('✅ User "all" filter activated');
    }
    
    if (adminAllFilter) {
        adminAllFilter.classList.add('active');
        console.log('✅ Admin "all" filter activated');
    }
    
    // Initialize counters
    if (window.allUserEntries) {
        updateUserResultsCounter(window.allUserEntries.length, window.allUserEntries.length);
        console.log(`📊 User counter: ${window.allUserEntries.length} entries`);
    }
    if (window.allAdminEntries) {
        updateAdminResultsCounter(window.allAdminEntries.length, window.allAdminEntries.length);
        console.log(`📊 Admin counter: ${window.allAdminEntries.length} entries`);
    }
    
    console.log('✅ Advanced filters initialized');
}

// Call initialization when entries are loaded
if (typeof window.addEventListener !== 'undefined') {
    window.addEventListener('entriesLoaded', initializeAdvancedFilters);
}
