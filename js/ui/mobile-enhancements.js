// ==================== MOBILE UX ENHANCEMENTS ====================

class MobileEnhancements {
    constructor() {
        this.pullToRefreshEnabled = false;
        this.swipeGesturesEnabled = false;
        this.touchStartY = 0;
        this.touchStartX = 0;
        this.isRefreshing = false;
        
        this.init();
    }
    
    init() {
        // Only initialize on mobile devices
        if (this.isMobileDevice()) {
            this.setupPullToRefresh();
            this.setupSwipeGestures();
            this.setupTouchOptimizations();
            console.log('🚀 Mobile enhancements initialized');
        }
    }
    
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
    }
    
    // ==================== PULL TO REFRESH ====================
    
    setupPullToRefresh() {
        const screens = ['userDashboard', 'adminDashboard'];
        
        screens.forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) {
                this.addPullToRefresh(screen, screenId);
            }
        });
    }
    
    addPullToRefresh(container, screenType) {
        // Create refresh indicator
        const refreshIndicator = document.createElement('div');
        refreshIndicator.className = 'pull-refresh-indicator';
        refreshIndicator.innerHTML = `
            <div class="refresh-spinner"></div>
            <span class="refresh-text">Ziehe zum Aktualisieren</span>
        `;
        container.insertBefore(refreshIndicator, container.firstChild);
        
        let startY = 0;
        let currentY = 0;
        let refreshTriggered = false;
        
        // Touch start
        container.addEventListener('touchstart', (e) => {
            if (container.scrollTop === 0 && !this.isRefreshing) {
                startY = e.touches[0].clientY;
                refreshTriggered = false;
            }
        }, { passive: true });
        
        // Touch move
        container.addEventListener('touchmove', (e) => {
            if (container.scrollTop === 0 && !this.isRefreshing && startY > 0) {
                currentY = e.touches[0].clientY;
                const pullDistance = currentY - startY;
                
                if (pullDistance > 0) {
                    e.preventDefault();
                    const maxPull = 120;
                    const actualPull = Math.min(pullDistance, maxPull);
                    
                    // Update indicator position and state
                    refreshIndicator.style.transform = `translateY(${actualPull}px)`;
                    refreshIndicator.style.opacity = actualPull / maxPull;
                    
                    if (actualPull >= 80 && !refreshTriggered) {
                        refreshTriggered = true;
                        refreshIndicator.classList.add('ready');
                        refreshIndicator.querySelector('.refresh-text').textContent = 'Loslassen zum Aktualisieren';
                        this.triggerHapticFeedback();
                    } else if (actualPull < 80 && refreshTriggered) {
                        refreshTriggered = false;
                        refreshIndicator.classList.remove('ready');
                        refreshIndicator.querySelector('.refresh-text').textContent = 'Ziehe zum Aktualisieren';
                    }
                }
            }
        }, { passive: false });
        
        // Touch end
        container.addEventListener('touchend', () => {
            if (refreshTriggered && !this.isRefreshing) {
                this.performRefresh(refreshIndicator, screenType);
            } else {
                // Reset indicator
                refreshIndicator.style.transform = 'translateY(0)';
                refreshIndicator.style.opacity = '0';
                refreshIndicator.classList.remove('ready');
            }
            startY = 0;
            refreshTriggered = false;
        }, { passive: true });
    }
    
    async performRefresh(indicator, screenType) {
        this.isRefreshing = true;
        indicator.classList.add('refreshing');
        indicator.querySelector('.refresh-text').textContent = 'Aktualisiere...';
        
        try {
            // Trigger actual refresh based on screen type
            if (screenType === 'userDashboard' && typeof loadUserEntries === 'function') {
                await Promise.all([
                    loadUserEntries(),
                    loadUserStats()
                ]);
                showToast('✅ Deine Drucke wurden aktualisiert', 'success', 2000);
            } else if (screenType === 'adminDashboard' && typeof loadAllEntries === 'function') {
                await Promise.all([
                    loadAllEntries(),
                    loadAdminStats()
                ]);
                showToast('✅ Admin-Daten wurden aktualisiert', 'success', 2000);
            }
            
            // Small delay for better UX
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error('Refresh failed:', error);
            showToast('❌ Aktualisierung fehlgeschlagen', 'error', 3000);
        } finally {
            // Reset indicator
            setTimeout(() => {
                indicator.style.transform = 'translateY(0)';
                indicator.style.opacity = '0';
                indicator.classList.remove('refreshing', 'ready');
                indicator.querySelector('.refresh-text').textContent = 'Ziehe zum Aktualisieren';
                this.isRefreshing = false;
            }, 300);
        }
    }
    
    // ==================== SWIPE GESTURES ====================
    
    setupSwipeGestures() {
        // Add swipe gestures to cards
        this.addSwipeToCards();
        
        // Add navigation swipes
        this.addNavigationSwipes();
    }
    
    addSwipeToCards() {
        document.addEventListener('touchstart', (e) => {
            const card = e.target.closest('.stat-card, .printer-card, .user-entry-card');
            if (card && card.classList.contains('clickable')) {
                this.handleCardTouchStart(e, card);
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            const card = e.target.closest('.stat-card, .printer-card, .user-entry-card');
            if (card && card.classList.contains('swiping')) {
                this.handleCardTouchMove(e, card);
            }
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            const card = e.target.closest('.stat-card, .printer-card, .user-entry-card');
            if (card && card.classList.contains('swiping')) {
                this.handleCardTouchEnd(e, card);
            }
        }, { passive: true });
    }
    
    handleCardTouchStart(e, card) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        card.classList.add('swiping');
    }
    
    handleCardTouchMove(e, card) {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const deltaX = touchX - this.touchStartX;
        const deltaY = touchY - this.touchStartY;
        
        // Only trigger horizontal swipes
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            card.style.transform = `translateX(${deltaX * 0.3}px)`;
            card.style.opacity = Math.max(0.7, 1 - Math.abs(deltaX) / 200);
        }
    }
    
    handleCardTouchEnd(e, card) {
        const touchX = e.changedTouches[0].clientX;
        const deltaX = touchX - this.touchStartX;
        
        card.classList.remove('swiping');
        card.style.transform = '';
        card.style.opacity = '';
        
        // Trigger action on significant swipe
        if (Math.abs(deltaX) > 50) {
            this.triggerHapticFeedback();
            // Simulate click after short delay
            setTimeout(() => {
                card.click();
            }, 100);
        }
    }
    
    addNavigationSwipes() {
        let startX = 0;
        let startY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            
            // Check for horizontal swipe (and not on input elements)
            if (Math.abs(deltaX) > Math.abs(deltaY) && 
                Math.abs(deltaX) > 100 && 
                !e.target.closest('input, textarea, select, .modal')) {
                
                if (deltaX > 0) {
                    // Swipe right - previous screen
                    this.navigateToPreviousScreen();
                } else {
                    // Swipe left - next screen
                    this.navigateToNextScreen();
                }
            }
        }, { passive: true });
    }
    
    navigateToPreviousScreen() {
        const currentScreen = document.querySelector('.screen.active');
        if (currentScreen) {
            const screenId = currentScreen.id;
            
            // Enhanced navigation flow
            const navFlow = {
                'adminDashboard': 'userDashboard',
                'adminAssets': 'adminDashboard', 
                'userManager': 'adminAssets'
            };
            
            if (navFlow[screenId]) {
                showScreen(navFlow[screenId]);
                this.triggerHapticFeedback();
            }
        }
    }
    
    navigateToNextScreen() {
        const currentScreen = document.querySelector('.screen.active');
        if (currentScreen) {
            const screenId = currentScreen.id;
            
            // Enhanced navigation flow
            const navFlow = {
                'userDashboard': 'adminDashboard',
                'adminDashboard': 'adminAssets',
                'adminAssets': 'userManager'
            };
            
            if (navFlow[screenId] && window.currentUser?.isAdmin) {
                showScreen(navFlow[screenId]);
                this.triggerHapticFeedback();
            }
        }
    }
    
    // ==================== TOUCH OPTIMIZATIONS ====================
    
    setupTouchOptimizations() {
        // Improve button feedback
        this.enhanceButtonFeedback();
        
        // Optimize scroll performance
        this.optimizeScrolling();
        
        // Add visual feedback for touch
        this.addTouchFeedback();
    }
    
    enhanceButtonFeedback() {
        document.addEventListener('touchstart', (e) => {
            const button = e.target.closest('button, .btn, .clickable');
            if (button) {
                button.classList.add('touch-active');
                this.triggerHapticFeedback('light');
            }
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            const button = e.target.closest('button, .btn, .clickable');
            if (button) {
                setTimeout(() => {
                    button.classList.remove('touch-active');
                }, 150);
            }
        }, { passive: true });
    }
    
    optimizeScrolling() {
        // Add momentum scrolling for iOS
        const scrollContainers = document.querySelectorAll('.data-table, .screen, .modal-content');
        scrollContainers.forEach(container => {
            container.style.webkitOverflowScrolling = 'touch';
            container.style.scrollBehavior = 'smooth';
        });
    }
    
    addTouchFeedback() {
        // Visual feedback for interactive elements
        const style = document.createElement('style');
        style.textContent = `
            .touch-active {
                transform: scale(0.98) !important;
                opacity: 0.8 !important;
                transition: all 0.1s ease !important;
            }
            
            .swiping {
                transition: transform 0.1s ease, opacity 0.1s ease;
            }
        `;
        document.head.appendChild(style);
    }
    
    // ==================== UTILITY FUNCTIONS ====================
    
    triggerHapticFeedback(type = 'medium') {
        // Trigger haptic feedback if available
        if (navigator.vibrate) {
            const patterns = {
                light: 10,
                medium: 20,
                heavy: 50
            };
            navigator.vibrate(patterns[type] || patterns.medium);
        }
    }
}

// Initialize mobile enhancements
const mobileEnhancements = new MobileEnhancements();

// Make available globally
window.mobileEnhancements = mobileEnhancements; 