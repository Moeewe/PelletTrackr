// ==================== UTILITIES MODULE ====================
// Hilfsfunktionen für Formatierung und Validierung

/**
 * Lazy Loading System
 * Handles pagination and load-more functionality for lists and tables
 */

// Global lazy loading configuration
const LAZY_LOADING_CONFIG = {
    mobile: {
        pageSize: 5,
        loadMoreIncrement: 5
    },
    desktop: {
        pageSize: 20,
        loadMoreIncrement: 10
    }
};

/**
 * LazyLoader class for managing paginated content
 */
class LazyLoader {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.allItems = [];
        this.displayedItems = [];
        this.currentPage = 0;
        this.isLoading = false;
        
        // Configuration
        this.options = {
            mobilePageSize: options.mobilePageSize || LAZY_LOADING_CONFIG.mobile.pageSize,
            desktopPageSize: options.desktopPageSize || LAZY_LOADING_CONFIG.desktop.pageSize,
            mobileIncrement: options.mobileIncrement || LAZY_LOADING_CONFIG.mobile.loadMoreIncrement,
            desktopIncrement: options.desktopIncrement || LAZY_LOADING_CONFIG.desktop.loadMoreIncrement,
            renderFunction: options.renderFunction || this.defaultRenderFunction,
            emptyStateMessage: options.emptyStateMessage || 'Keine Einträge vorhanden.',
            loadMoreText: options.loadMoreText || 'Mehr laden',
            loadingText: options.loadingText || 'Lädt...',
            noMoreText: options.noMoreText || 'Alle Einträge geladen',
            searchable: options.searchable || false,
            searchFunction: options.searchFunction || null
        };
        
        this.searchTerm = '';
        this.filteredItems = [];
    }
    
    /**
     * Initialize the lazy loader with data
     */
    setData(items) {
        this.allItems = [...items];
        this.filteredItems = [...items];
        this.reset();
        this.render();
    }
    
    /**
     * Reset pagination to first page
     */
    reset() {
        this.currentPage = 0;
        this.displayedItems = [];
    }
    
    /**
     * Get current page size based on screen size
     */
    getCurrentPageSize() {
        return this.isMobile() ? this.options.mobilePageSize : this.options.desktopPageSize;
    }
    
    /**
     * Get load more increment based on screen size
     */
    getLoadMoreIncrement() {
        return this.isMobile() ? this.options.mobileIncrement : this.options.desktopIncrement;
    }
    
    /**
     * Check if device is mobile
     */
    isMobile() {
        return window.innerWidth <= 768;
    }
    
    /**
     * Search/filter items
     */
    search(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        
        if (this.searchTerm === '') {
            this.filteredItems = [...this.allItems];
        } else if (this.options.searchFunction) {
            this.filteredItems = this.allItems.filter(item => 
                this.options.searchFunction(item, this.searchTerm)
            );
        } else {
            // Default search function
            this.filteredItems = this.allItems.filter(item =>
                JSON.stringify(item).toLowerCase().includes(this.searchTerm)
            );
        }
        
        this.reset();
        this.render();
    }
    
    /**
     * Load more items
     */
    loadMore() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();
        
        // Simulate async loading for better UX
        setTimeout(() => {
            const increment = this.getLoadMoreIncrement();
            const startIndex = this.displayedItems.length;
            const endIndex = Math.min(startIndex + increment, this.filteredItems.length);
            
            const newItems = this.filteredItems.slice(startIndex, endIndex);
            this.displayedItems.push(...newItems);
            
            this.isLoading = false;
            this.render();
        }, 300);
    }
    
    /**
     * Show loading state in load more button
     */
    showLoadingState() {
        const loadMoreBtn = this.container.querySelector('.load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.textContent = this.options.loadingText;
            loadMoreBtn.disabled = true;
        }
    }
    
    /**
     * Check if there are more items to load
     */
    hasMoreItems() {
        return this.displayedItems.length < this.filteredItems.length;
    }
    
    /**
     * Render the current state
     */
    render() {
        if (!this.container) return;
        
        // If this is the first render, load initial items
        if (this.displayedItems.length === 0) {
            const initialPageSize = this.getCurrentPageSize();
            const initialItems = this.filteredItems.slice(0, initialPageSize);
            this.displayedItems = [...initialItems];
        }
        
        // Clear container
        this.container.innerHTML = '';
        
        // Handle empty state
        if (this.filteredItems.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        // Render items
        this.renderItems();
        
        // Render load more button if needed
        if (this.hasMoreItems()) {
            this.renderLoadMoreButton();
        }
        
        // Render statistics
        this.renderStatistics();
    }
    
    /**
     * Render empty state
     */
    renderEmptyState() {
        this.container.innerHTML = `
            <div class="empty-state">
                <p>${this.options.emptyStateMessage}</p>
            </div>
        `;
    }
    
    /**
     * Render items using the provided render function
     */
    renderItems() {
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'lazy-items-container';
        
        this.displayedItems.forEach(item => {
            const itemElement = this.options.renderFunction(item);
            itemsContainer.appendChild(itemElement);
        });
        
        this.container.appendChild(itemsContainer);
    }
    
    /**
     * Render load more button
     */
    renderLoadMoreButton() {
        const loadMoreContainer = document.createElement('div');
        loadMoreContainer.className = 'load-more-container';
        
        const button = document.createElement('button');
        button.className = 'btn btn-secondary load-more-btn';
        button.textContent = this.options.loadMoreText;
        button.onclick = () => this.loadMore();
        
        loadMoreContainer.appendChild(button);
        this.container.appendChild(loadMoreContainer);
    }
    
    /**
     * Render statistics (showing X of Y items)
     */
    renderStatistics() {
        const statsContainer = document.createElement('div');
        statsContainer.className = 'lazy-stats';
        
        const showing = this.displayedItems.length;
        const total = this.filteredItems.length;
        
        if (total > this.getCurrentPageSize()) {
            statsContainer.innerHTML = `
                <span class="stats-text">
                    ${showing} von ${total} Einträgen angezeigt
                    ${this.searchTerm ? ` (gefiltert von ${this.allItems.length})` : ''}
                </span>
            `;
            this.container.appendChild(statsContainer);
        }
    }
    
    /**
     * Default render function (fallback)
     */
    defaultRenderFunction(item) {
        const div = document.createElement('div');
        div.className = 'lazy-item';
        div.textContent = JSON.stringify(item);
        return div;
    }
    
    /**
     * Update data and re-render
     */
    updateData(newItems) {
        this.setData(newItems);
    }
    
    /**
     * Get current display statistics
     */
    getStats() {
        return {
            total: this.allItems.length,
            filtered: this.filteredItems.length,
            displayed: this.displayedItems.length,
            hasMore: this.hasMoreItems(),
            searchActive: this.searchTerm !== ''
        };
    }
}

/**
 * Create a search function for entries
 */
function createEntrySearchFunction() {
    return (entry, searchTerm) => {
        const searchableFields = [
            entry.material?.toLowerCase() || '',
            entry.masterbatch?.toLowerCase() || '',
            entry.jobName?.toLowerCase() || '',
            entry.notes?.toLowerCase() || '',
            entry.userName?.toLowerCase() || '',
            entry.userKennung?.toLowerCase() || '',
            entry.status?.toLowerCase() || ''
        ];
        
        return searchableFields.some(field => field.includes(searchTerm));
    };
}

/**
 * Create a search function for materials
 */
function createMaterialSearchFunction() {
    return (material, searchTerm) => {
        const searchableFields = [
            material.name?.toLowerCase() || '',
            material.type?.toLowerCase() || '',
            material.manufacturer?.toLowerCase() || '',
            material.description?.toLowerCase() || ''
        ];
        
        return searchableFields.some(field => field.includes(searchTerm));
    };
}

/**
 * Create a search function for users
 */
function createUserSearchFunction() {
    return (user, searchTerm) => {
        const searchableFields = [
            user.name?.toLowerCase() || '',
            user.kennung?.toLowerCase() || '',
            user.email?.toLowerCase() || ''
        ];
        
        return searchableFields.some(field => field.includes(searchTerm));
    };
}

// Währung formatieren
function formatCurrency(amount, decimals = 2) {
  return (amount || 0).toFixed(decimals).replace('.', ',') + ' €';
}

// Admin-Zugriff prüfen
function checkAdminAccess() {
  if (!window.currentUser || !window.currentUser.isAdmin) {
    if (window.toast && typeof window.toast.warning === 'function') {
      window.toast.warning('Nur für Administratoren!');
    } else {
      alert('Nur für Administratoren!');
    }
    return false;
  }
  return true;
}

// Deutsche Zahlenformate parsen
function parseGermanNumber(str) {
  if (typeof str !== 'string') return parseFloat(str) || 0;
  return parseFloat(str.replace(',', '.')) || 0;
}

// Anführungszeichen escapen für HTML-Attribute
function escapeQuotes(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}
