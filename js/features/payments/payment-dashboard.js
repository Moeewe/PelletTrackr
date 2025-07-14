/**
 * Payment Dashboard Component
 * Unified interface for payment status and payment requests
 */

/**
 * Show comprehensive payment dashboard modal
 */
async function showPaymentDashboard() {
    try {
        const modalContent = `
            <div class="modal-header">
                <h3>Zahlungs-Dashboard</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="payment-dashboard">
                    <!-- Payment Status Overview -->
                    <div class="dashboard-section">
                        <h4>📊 Zahlungsübersicht</h4>
                        <div class="payment-stats-grid">
                            <div class="stat-card">
                                <div class="stat-value" id="totalUnpaidEntries">-</div>
                                <div class="stat-label">Unbezahlte Drucke</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value" id="totalUnpaidAmount">-</div>
                                <div class="stat-label">Offener Betrag</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value" id="pendingRequestsCount">-</div>
                                <div class="stat-label">Zahlungsanfragen</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value" id="todayPaidCount">-</div>
                                <div class="stat-label">Heute bezahlt</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Payment Requests Section -->
                    <div class="dashboard-section">
                        <h4>🔔 Ausstehende Zahlungsanfragen</h4>
                        <div id="paymentRequestsContainer" class="payment-requests-container">
                            <div class="loading">Zahlungsanfragen werden geladen...</div>
                        </div>
                    </div>
                    
                    <!-- Recent Payment Activity -->
                    <div class="dashboard-section">
                        <h4>💳 Letzte Zahlungsaktivitäten</h4>
                        <div id="recentPaymentsContainer" class="recent-payments-container">
                            <div class="loading">Aktivitäten werden geladen...</div>
                        </div>
                    </div>
                    
                    <!-- Overdue Payments -->
                    <div class="dashboard-section">
                        <h4>⚠️ Überfällige Zahlungen</h4>
                        <div id="overduePaymentsContainer" class="overdue-payments-container">
                            <div class="loading">Überfällige Zahlungen werden geladen...</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="refreshPaymentDashboard()">
                    🔄 Aktualisieren
                </button>
                <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
            </div>
        `;
        
        showModalWithContent(modalContent);
        
        // Load dashboard data
        await loadPaymentDashboardData();
        
    } catch (error) {
        console.error('Error showing payment dashboard:', error);
        showToast('Fehler beim Laden des Zahlungs-Dashboards', 'error');
    }
}

/**
 * Load all payment dashboard data
 */
async function loadPaymentDashboardData() {
    try {
        // Load data in parallel
        const [
            unpaidStats,
            paymentRequests,
            recentPayments,
            overduePayments
        ] = await Promise.all([
            getUnpaidStatistics(),
            loadPendingPaymentRequests(),
            getRecentPaymentActivity(),
            getOverduePayments()
        ]);
        
        // Update UI components
        updatePaymentStatistics(unpaidStats);
        renderPaymentRequestsDashboard(paymentRequests);
        renderRecentPayments(recentPayments);
        renderOverduePayments(overduePayments);
        
    } catch (error) {
        console.error('Error loading payment dashboard data:', error);
        showToast('Fehler beim Laden der Zahlungsdaten', 'error');
    }
}

/**
 * Get unpaid statistics
 */
async function getUnpaidStatistics() {
    try {
        const unpaidEntries = await window.db.collection('entries')
            .where('paid', '==', false)
            .get();
            
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayPaidEntries = await window.db.collection('entries')
            .where('paid', '==', true)
            .where('paidAt', '>=', today)
            .get();
            
        let totalUnpaidAmount = 0;
        unpaidEntries.forEach(doc => {
            const entry = doc.data();
            totalUnpaidAmount += entry.totalCost || 0;
        });
        
        return {
            totalUnpaidEntries: unpaidEntries.size,
            totalUnpaidAmount: totalUnpaidAmount,
            todayPaidCount: todayPaidEntries.size
        };
    } catch (error) {
        console.error('Error getting unpaid statistics:', error);
        return {
            totalUnpaidEntries: 0,
            totalUnpaidAmount: 0,
            todayPaidCount: 0
        };
    }
}

/**
 * Get recent payment activity
 */
async function getRecentPaymentActivity() {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentPayments = await window.db.collection('entries')
            .where('paid', '==', true)
            .where('paidAt', '>=', sevenDaysAgo)
            .orderBy('paidAt', 'desc')
            .limit(10)
            .get();
            
        return recentPayments.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting recent payment activity:', error);
        return [];
    }
}

/**
 * Get overdue payments
 */
async function getOverduePayments() {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const overdueEntries = await window.db.collection('entries')
            .where('paid', '==', false)
            .where('timestamp', '<=', thirtyDaysAgo)
            .orderBy('timestamp', 'asc')
            .limit(20)
            .get();
            
        return overdueEntries.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error getting overdue payments:', error);
        return [];
    }
}

/**
 * Update payment statistics display
 */
function updatePaymentStatistics(stats) {
    const totalUnpaidEntries = document.getElementById('totalUnpaidEntries');
    const totalUnpaidAmount = document.getElementById('totalUnpaidAmount');
    const todayPaidCount = document.getElementById('todayPaidCount');
    
    if (totalUnpaidEntries) {
        totalUnpaidEntries.textContent = stats.totalUnpaidEntries;
    }
    
    if (totalUnpaidAmount) {
        totalUnpaidAmount.textContent = window.formatCurrency(stats.totalUnpaidAmount);
    }
    
    if (todayPaidCount) {
        todayPaidCount.textContent = stats.todayPaidCount;
    }
}

/**
 * Render payment requests in dashboard
 */
function renderPaymentRequestsDashboard(requests) {
    const container = document.getElementById('paymentRequestsContainer');
    if (!container) return;
    
    const pendingRequestsCount = document.getElementById('pendingRequestsCount');
    if (pendingRequestsCount) {
        pendingRequestsCount.textContent = requests.length;
    }
    
    if (requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>✅ Keine ausstehenden Zahlungsanfragen</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = requests.map(request => `
        <div class="payment-request-card">
            <div class="request-header">
                <div class="request-user">
                    <strong>${request.userName}</strong>
                    <span class="user-kennung">(${request.userId})</span>
                </div>
                <div class="request-amount">
                    ${window.formatCurrency(request.amount)}
                </div>
            </div>
            <div class="request-details">
                <div class="request-job">${request.jobName}</div>
                <div class="request-material">${request.material}</div>
                <div class="request-date">
                    Angefragt: ${request.requestedAt ? request.requestedAt.toLocaleDateString() : 'Unbekannt'}
                </div>
            </div>
            <div class="request-actions">
                <button class="btn btn-success btn-small" onclick="processPaymentRequest('${request.id}', true)">
                    ✅ Genehmigen
                </button>
                <button class="btn btn-danger btn-small" onclick="processPaymentRequest('${request.id}', false)">
                    ❌ Ablehnen
                </button>
                <button class="btn btn-secondary btn-small" onclick="showEntryDetails('${request.entryId}')">
                    📝 Details
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Render recent payments
 */
function renderRecentPayments(payments) {
    const container = document.getElementById('recentPaymentsContainer');
    if (!container) return;
    
    if (payments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Keine kürzlichen Zahlungen</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = payments.map(payment => `
        <div class="payment-activity-item">
            <div class="activity-icon">💳</div>
            <div class="activity-content">
                <div class="activity-header">
                    <strong>${payment.name}</strong>
                    <span class="activity-amount">${window.formatCurrency(payment.totalCost)}</span>
                </div>
                <div class="activity-details">
                    ${payment.jobName} - ${payment.material}
                </div>
                <div class="activity-date">
                    ${payment.paidAt ? payment.paidAt.toLocaleDateString() : 'Unbekannt'}
                    ${payment.paymentMethod ? `(${getPaymentMethodText(payment.paymentMethod)})` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Render overdue payments
 */
function renderOverduePayments(overduePayments) {
    const container = document.getElementById('overduePaymentsContainer');
    if (!container) return;
    
    if (overduePayments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>✅ Keine überfälligen Zahlungen</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = overduePayments.map(payment => {
        const daysOverdue = Math.floor((new Date() - payment.timestamp.toDate()) / (1000 * 60 * 60 * 24));
        
        return `
            <div class="overdue-payment-item">
                <div class="overdue-urgency ${daysOverdue > 60 ? 'critical' : daysOverdue > 30 ? 'high' : 'medium'}">
                    ${daysOverdue} Tage
                </div>
                <div class="overdue-content">
                    <div class="overdue-header">
                        <strong>${payment.name}</strong>
                        <span class="overdue-amount">${window.formatCurrency(payment.totalCost)}</span>
                    </div>
                    <div class="overdue-details">
                        ${payment.jobName} - ${payment.material}
                    </div>
                    <div class="overdue-date">
                        Erstellt: ${payment.timestamp.toLocaleDateString()}
                    </div>
                </div>
                <div class="overdue-actions">
                    <button class="btn btn-primary btn-small" onclick="markEntryAsPaid('${payment.id}')">
                        💳 Bezahlt
                    </button>
                    <button class="btn btn-warning btn-small" onclick="sendPaymentReminder('${payment.kennung}')">
                        📧 Erinnerung
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Get payment method text
 */
function getPaymentMethodText(method) {
    const methods = {
        'admin_direct': 'Direkt vom Admin',
        'admin_approved_request': 'Genehmigte Anfrage',
        'system_auto_cleanup': 'Automatisch bereinigt'
    };
    return methods[method] || method;
}

/**
 * Refresh payment dashboard
 */
async function refreshPaymentDashboard() {
    const refreshButton = document.querySelector('[onclick="refreshPaymentDashboard()"]');
    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = '🔄 Aktualisiert...';
    }
    
    try {
        await loadPaymentDashboardData();
        showToast('Dashboard aktualisiert', 'success');
    } catch (error) {
        console.error('Error refreshing payment dashboard:', error);
        showToast('Fehler beim Aktualisieren', 'error');
    } finally {
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.textContent = '🔄 Aktualisieren';
        }
    }
}

// Make functions globally available
window.showPaymentDashboard = showPaymentDashboard;
window.refreshPaymentDashboard = refreshPaymentDashboard;
window.loadPaymentDashboardData = loadPaymentDashboardData;

console.log('💳 Payment Dashboard Module loaded'); 