// ==================== ADMIN: OFFENE AUFGABEN ====================
// Live-Zähler für alles, was auf eine Admin-Aktion wartet: Zahlungsanfragen, Problemmeldungen, Materialwünsche,
// Equipment-Anfragen und Maschinen mit Defekt oder fälliger Wartung. Die Zähler erscheinen im Bereich "Offene Aufgaben"
// und als roter Punkt an den passenden Buttons. Neue Eingänge werden zusätzlich kurz gemeldet.
(() => {
  'use strict';
  const KEYS = ['payments', 'problems', 'orders', 'equipment', 'machines'];
  const counts = Object.fromEntries(KEYS.map(key => [key, 0]));
  const loaded = new Set();
  const unsub = [];
  const LABELS = {
    payments: 'Neue Zahlungsanfrage', problems: 'Neue Problemmeldung', orders: 'Neuer Materialwunsch',
    equipment: 'Neue Equipment-Anfrage', machines: 'Maschinen brauchen Aufmerksamkeit'
  };
  // Alte Zähler-Elemente an den Buttons (data-badge) zeigen dieselben Zahlen
  const BADGES = { 'payment-requests': 'payments', 'problem-reports': 'problems', 'material-orders': 'orders', 'equipment-requests': 'equipment', 'printer-issues': 'machines' };

  function render() {
    KEYS.forEach(key => {
      document.querySelectorAll(`[data-task="${key}"]`).forEach(row => {
        row.classList.toggle('has-tasks', counts[key] > 0);
        const pill = row.querySelector('.task-count');
        if (pill) pill.textContent = counts[key] > 0 ? String(counts[key]) : '0';
      });
    });
    Object.entries(BADGES).forEach(([badge, key]) => document.querySelectorAll(`[data-badge="${badge}"]`).forEach(el => {
      el.textContent = String(counts[key]);
      el.style.display = counts[key] > 0 ? 'flex' : 'none';
    }));
    const total = KEYS.reduce((sum, key) => sum + counts[key], 0);
    document.querySelectorAll('[data-tasks-total]').forEach(el => {
      el.textContent = String(total);
      el.hidden = total === 0;
    });
  }

  function set(key, value) {
    const before = counts[key];
    counts[key] = value;
    // Erste Lieferung nur anzeigen, danach bei Anstieg melden.
    if (loaded.has(key) && value > before) window.toast?.info?.(`${LABELS[key]} (${value})`);
    loaded.add(key);
    render();
  }

  const watch = (collection, build, handler) => {
    try {
      unsub.push(build(window.db.collection(collection)).onSnapshot(handler, error => console.warn('Aufgaben:', collection, error.code || error.message)));
    } catch (error) { console.warn('Aufgaben:', error.message); }
  };

  function machinesNeedingAttention() {
    const items = window.MachineOverview?.items?.() || [];
    return items.filter(item => item.status === 'broken' || window.maintenanceState?.(item)?.level === 'overdue').length;
  }

  function start() {
    if (unsub.length || !window.db || !window.currentUser?.isAdmin) return;
    watch('paymentRequests', c => c.where('status', '==', 'pending'), snap => set('payments', snap.size));
    watch('problemReports', c => c.where('status', '==', 'open'), snap => set('problems', snap.size));
    watch('materialOrders', c => c.where('status', '==', 'pending'), snap => set('orders', snap.size));
    watch('equipment', c => c, snap => set('equipment', snap.docs.reduce((sum, doc) =>
      sum + (doc.data().pendingRequests || []).filter(request => request?.status === 'pending').length, 0)));
    set('machines', machinesNeedingAttention());
  }

  function stop() {
    unsub.splice(0).forEach(fn => fn());
    loaded.clear();
    KEYS.forEach(key => { counts[key] = 0; });
    render();
  }

  document.addEventListener('machines:updated', () => { if (window.currentUser?.isAdmin) { counts.machines = machinesNeedingAttention(); render(); } });
  if (window.firebase?.auth) window.firebase.auth().onAuthStateChanged(user => { if (!user) stop(); });

  // Der Dashboard-Start ruft diese Funktion für Admins auf (früher: einzelne, teils fehlende Zähler).
  window.initializeNotificationBadges = start;
  window.AdminTasks = { start, stop, counts: () => ({ ...counts }) };
})();
