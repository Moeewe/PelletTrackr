// ==================== ENTRY RENDERING MODULE ====================
// Handles rendering of entries in both desktop table and mobile card formats with lazy loading

// Global entry rendering state
let userEntriesData = [];
let adminEntriesData = [];

// Lazy loading instances
let userEntriesLoader = null;
let adminEntriesLoader = null;

/**
 * Initialize entry rendering with lazy loading
 */
function initializeEntryRendering() {
    // Initialize user entries lazy loader
    userEntriesLoader = new LazyLoader('userEntriesTable', {
        mobilePageSize: 5,
        desktopPageSize: 20,
        renderFunction: createUserEntryElement,
        emptyStateMessage: 'Noch keine Drucke vorhanden. Füge deinen ersten 3D-Druck hinzu!',
        searchFunction: createEntrySearchFunction()
    });
    
    // Initialize admin entries lazy loader  
    adminEntriesLoader = new LazyLoader('adminEntriesTable', {
        mobilePageSize: 5,
        desktopPageSize: 20,
        renderFunction: createAdminEntryElement,
        emptyStateMessage: 'Noch keine Drucke vorhanden.',
        searchFunction: createEntrySearchFunction()
    });
}

/**
 * Render user entries with lazy loading
 */
function renderUserEntries(entries) {
    userEntriesData = [...entries];
    
    if (!userEntriesLoader) {
        initializeEntryRendering();
    }
    
    userEntriesLoader.setData(entries);
}

/**
 * Render admin entries with lazy loading
 */
function renderAdminEntries(entries) {
    adminEntriesData = [...entries];
    
    if (!adminEntriesLoader) {
        initializeEntryRendering();
    }
    
    adminEntriesLoader.setData(entries);
}

/**
 * Create user entry element (responsive)
 */
function createUserEntryElement(entry) {
    const container = document.createElement('div');
    
    if (window.innerWidth <= 768) {
        // Mobile card layout
        container.innerHTML = createUserEntryCard(entry);
        container.className = 'lazy-item';
    } else {
        // Desktop table row
        container.innerHTML = createUserEntryRow(entry);
        container.className = 'lazy-item';
        
        // For table rows, we need to create the table structure if it doesn't exist
        ensureTableStructure('userEntriesTable', 'user');
    }
    
    return container;
}

/**
 * Create admin entry element (responsive)
 */
function createAdminEntryElement(entry) {
    const container = document.createElement('div');
    
    if (window.innerWidth <= 768) {
        // Mobile card layout
        container.innerHTML = createAdminEntryCard(entry);
        container.className = 'lazy-item';
    } else {
        // Desktop table row
        container.innerHTML = createAdminEntryRow(entry);
        container.className = 'lazy-item';
        
        // For table rows, we need to create the table structure if it doesn't exist
        ensureTableStructure('adminEntriesTable', 'admin');
    }
    
    return container;
}

/**
 * Ensure table structure exists for desktop view
 */
function ensureTableStructure(containerId, type) {
    const container = document.getElementById(containerId);
    if (!container.querySelector('.data-table')) {
        let tableHtml = '';
        
        if (type === 'user') {
            tableHtml = `
                <div class="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th onclick="sortUserEntries('date')">Datum</th>
                                <th onclick="sortUserEntries('jobName')">Job</th>
                                <th onclick="sortUserEntries('material')">Material</th>
                                <th onclick="sortUserEntries('materialMenge')">Menge</th>
                                <th onclick="sortUserEntries('masterbatch')">Masterbatch</th>
                                <th onclick="sortUserEntries('masterbatchMenge')">Menge</th>
                                <th onclick="sortUserEntries('cost')">Kosten</th>
                                <th onclick="sortUserEntries('status')">Status</th>
                                <th>Notizen</th>
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody class="lazy-items-container"></tbody>
                    </table>
                </div>
            `;
        } else {
            tableHtml = `
                <div class="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th onclick="sortAdminEntriesBy('date')">Datum</th>
                                <th onclick="sortAdminEntriesBy('name')">Name</th>
                                <th onclick="sortAdminEntriesBy('kennung')">Kennung</th>
                                <th onclick="sortAdminEntriesBy('jobName')">Job</th>
                                <th onclick="sortAdminEntriesBy('material')">Material</th>
                                <th onclick="sortAdminEntriesBy('materialMenge')">Mat. Menge</th>
                                <th onclick="sortAdminEntriesBy('masterbatch')">Masterbatch</th>
                                <th onclick="sortAdminEntriesBy('masterbatchMenge')">MB Menge</th>
                                <th onclick="sortAdminEntriesBy('cost')">Kosten</th>
                                <th onclick="sortAdminEntriesBy('status')">Status</th>
                                <th>Notizen</th>
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody class="lazy-items-container"></tbody>
                    </table>
                </div>
            `;
        }
        
        // Insert table before any existing content
        container.insertAdjacentHTML('afterbegin', tableHtml);
    }
}

/**
 * Create user entry card for mobile
 */
function createUserEntryCard(entry) {
    const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
    const isPaid = entry.paid || entry.isPaid;
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "";
    
    const statusBadgeClass = isPaid ? 'status-paid' : 'status-unpaid';
    const statusBadgeText = isPaid ? 'BEZAHLT' : 'OFFEN';
    
    const cardActions = `
        ${ButtonFactory.showNachweis(entry.id, isPaid)}
        ${ButtonFactory.editEntry(entry.id, true)}
    `;
    
    return `
        <div class="entry-card">
            <div class="entry-card-header">
                <h3 class="entry-job-title">${jobName}</h3>
                <span class="entry-status-badge ${statusBadgeClass}">${statusBadgeText}</span>
            </div>
            
            <div class="entry-card-body">
                <div class="entry-detail-row">
                    <span class="entry-detail-label">Datum</span>
                    <span class="entry-detail-value">${date}</span>
                </div>
                
                <div class="entry-detail-row">
                    <span class="entry-detail-label">Material</span>
                    <span class="entry-detail-value">${entry.material}</span>
                </div>
                
                <div class="entry-detail-row">
                    <span class="entry-detail-label">Menge</span>
                    <span class="entry-detail-value">${entry.materialMenge.toFixed(2)} kg</span>
                </div>
                
                <div class="entry-detail-row">
                    <span class="entry-detail-label">Masterbatch</span>
                    <span class="entry-detail-value">${entry.masterbatch}</span>
                </div>
                
                <div class="entry-detail-row">
                    <span class="entry-detail-label">MB Menge</span>
                    <span class="entry-detail-value">${entry.masterbatchMenge.toFixed(2)} g</span>
                </div>
                
                <div class="entry-detail-row">
                    <span class="entry-detail-label">Kosten</span>
                    <span class="entry-detail-value cost-value">${formatCurrency(entry.totalCost)}</span>
                </div>
                
                ${jobNotes ? `
                <div class="entry-detail-row">
                    <span class="entry-detail-label">Notizen</span>
                    <span class="entry-detail-value notes-value">${jobNotes}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="entry-card-footer">
                ${cardActions}
            </div>
        </div>
    `;
}

/**
 * Create user entry table row for desktop
 */
function createUserEntryRow(entry) {
    const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
    const isPaid = entry.paid || entry.isPaid;
    const status = isPaid ? 
        '<span class="entry-status-badge status-paid">Bezahlt</span>' : 
        '<span class="entry-status-badge status-unpaid">Offen</span>';
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "";
    const truncatedNotes = jobNotes.length > 30 ? jobNotes.substring(0, 30) + "..." : jobNotes;
    
    const actions = `
        <div class="actions">
            ${ButtonFactory.showNachweis(entry.id, isPaid)}
            ${ButtonFactory.viewDetails(entry.id)}
            ${ButtonFactory.editEntry(entry.id, true)}
        </div>`;
    
    return `
        <tr class="entry-row">
            <td data-label="Datum"><span class="cell-value">${date}</span></td>
            <td data-label="Job"><span class="cell-value">${jobName}</span></td>
            <td data-label="Material"><span class="cell-value">${entry.material}</span></td>
            <td data-label="Menge"><span class="cell-value">${entry.materialMenge.toFixed(2)} kg</span></td>
            <td data-label="Masterbatch"><span class="cell-value">${entry.masterbatch}</span></td>
            <td data-label="MB Menge"><span class="cell-value">${entry.masterbatchMenge.toFixed(2)} g</span></td>
            <td data-label="Kosten"><span class="cell-value"><strong>${formatCurrency(entry.totalCost)}</strong></span></td>
            <td data-label="Status" class="status-cell"><span class="cell-value">${status}</span></td>
            <td data-label="Notizen" class="notes-cell" title="${jobNotes}">
                <span class="cell-value">
                    ${truncatedNotes}
                    ${jobNotes.length > 0 ? `<button class="btn-edit-note" onclick="editNote('${entry.id}', '${escapeQuotes(jobNotes)}')">✏️</button>` : ''}
                </span>
            </td>
            <td data-label="Aktionen" class="actions">${actions}</td>
        </tr>
    `;
}

/**
 * Create admin entry card for mobile
 */
function createAdminEntryCard(entry) {
    const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
    const isPaid = entry.paid || entry.isPaid;
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "";
    
    const statusBadgeClass = isPaid ? 'status-paid' : 'status-unpaid';
    const statusBadgeText = isPaid ? 'BEZAHLT' : 'OFFEN';
    
    const cardActions = `
        ${ButtonFactory.markAsPaid(entry.id, isPaid)}
        ${ButtonFactory.editEntry(entry.id, false)}
        ${ButtonFactory.deleteEntry(entry.id)}
    `;
    
    return `
        <div class="entry-card">
            <div class="entry-card-header">
                <h3 class="entry-job-title">${jobName}</h3>
                <span class="entry-status-badge ${statusBadgeClass}">${statusBadgeText}</span>
            </div>
            
            <div class="entry-card-body">
                <div class="entry-detail-row">
                    <span class="entry-detail-label">Nutzer</span>
                    <span class="entry-detail-value">${entry.userName} (${entry.userKennung})</span>
                </div>
                
                <div class="entry-detail-row">
                    <span class="entry-detail-label">Datum</span>
                    <span class="entry-detail-value">${date}</span>
                </div>
                
                <div class="entry-detail-row">
                    <span class="entry-detail-label">Material</span>
                    <span class="entry-detail-value">${entry.material}</span>
                </div>
                
                <div class="entry-detail-row">
                    <span class="entry-detail-label">Menge</span>
                    <span class="entry-detail-value">${entry.materialMenge.toFixed(2)} kg</span>
                </div>
                
                <div class="entry-detail-row">
                    <span class="entry-detail-label">Masterbatch</span>
                    <span class="entry-detail-value">${entry.masterbatch}</span>
                </div>
                
                <div class="entry-detail-row">
                    <span class="entry-detail-label">MB Menge</span>
                    <span class="entry-detail-value">${entry.masterbatchMenge.toFixed(2)} g</span>
                </div>
                
                <div class="entry-detail-row">
                    <span class="entry-detail-label">Kosten</span>
                    <span class="entry-detail-value cost-value">${formatCurrency(entry.totalCost)}</span>
                </div>
                
                ${jobNotes ? `
                <div class="entry-detail-row">
                    <span class="entry-detail-label">Notizen</span>
                    <span class="entry-detail-value notes-value">${jobNotes}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="entry-card-footer">
                ${cardActions}
            </div>
        </div>
    `;
}

/**
 * Create admin entry table row for desktop
 */
function createAdminEntryRow(entry) {
    const date = entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleDateString('de-DE') : 'Unbekannt';
    const isPaid = entry.paid || entry.isPaid;
    const status = isPaid ? 
        '<span class="entry-status-badge status-paid">Bezahlt</span>' : 
        '<span class="entry-status-badge status-unpaid">Offen</span>';
    const jobName = entry.jobName || "3D-Druck Auftrag";
    const jobNotes = entry.jobNotes || "";
    const truncatedNotes = jobNotes.length > 30 ? jobNotes.substring(0, 30) + "..." : jobNotes;
    
    const actions = `
        <div class="action-group">
            ${ButtonFactory.markAsPaid(entry.id, isPaid)}
            ${ButtonFactory.editEntry(entry.id, false)}
            ${ButtonFactory.deleteEntry(entry.id)}
        </div>`;
    
    return `
        <tr class="entry-row">
            <td data-label="Datum"><span class="cell-value">${date}</span></td>
            <td data-label="Name"><span class="cell-value">${entry.userName}</span></td>
            <td data-label="Kennung"><span class="cell-value">${entry.userKennung}</span></td>
            <td data-label="Job"><span class="cell-value">${jobName}</span></td>
            <td data-label="Material"><span class="cell-value">${entry.material}</span></td>
            <td data-label="Mat. Menge"><span class="cell-value">${entry.materialMenge.toFixed(2)} kg</span></td>
            <td data-label="Masterbatch"><span class="cell-value">${entry.masterbatch}</span></td>
            <td data-label="MB Menge"><span class="cell-value">${entry.masterbatchMenge.toFixed(2)} g</span></td>
            <td data-label="Kosten"><span class="cell-value"><strong>${formatCurrency(entry.totalCost)}</strong></span></td>
            <td data-label="Status" class="status-cell"><span class="cell-value">${status}</span></td>
            <td data-label="Notizen" class="notes-cell" title="${jobNotes}">
                <span class="cell-value">
                    ${truncatedNotes}
                    ${jobNotes.length > 0 ? `<button class="btn-edit-note" onclick="editNote('${entry.id}', '${escapeQuotes(jobNotes)}')">✏️</button>` : ''}
                </span>
            </td>
            <td data-label="Aktionen" class="actions">${actions}</td>
        </tr>
    `;
}

/**
 * Search user entries
 */
function searchUserEntries() {
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput && userEntriesLoader) {
        userEntriesLoader.search(searchInput.value);
    }
}

/**
 * Search admin entries
 */
function searchAdminEntries() {
    const searchInput = document.getElementById('adminSearchInput');
    if (searchInput && adminEntriesLoader) {
        adminEntriesLoader.search(searchInput.value);
    }
}

/**
 * Handle window resize to switch between table and card layouts
 */
function handleEntryLayoutResize() {
    // Re-render entries when switching between mobile/desktop
    if (userEntriesLoader && userEntriesData.length > 0) {
        userEntriesLoader.updateData(userEntriesData);
    }
    
    if (adminEntriesLoader && adminEntriesData.length > 0) {
        adminEntriesLoader.updateData(adminEntriesData);
    }
}

// Add resize listener for responsive behavior
window.addEventListener('resize', debounce(handleEntryLayoutResize, 250));

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof LazyLoader !== 'undefined') {
        initializeEntryRendering();
    }
});

// Utility function for debouncing resize events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
