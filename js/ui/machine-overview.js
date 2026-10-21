// ==================== MASCHINEN-ÜBERSICHT (Dashboard) ====================
// Eine gemeinsame, live aktualisierte Quelle für die Status-Zähler in Admin- und Nutzeransicht und für die
// Maschinenübersicht (Dialog). Zählt Drucker und Produktionsmaschinen, ohne deaktivierte Maschinen.
// Status: Verfügbar, In Betrieb, Wartung, Defekt (früher wurden Wartung und Defekt zusammengezählt).
(() => {
  'use strict';
  const state = { printers: [], machines: [], unsub: [] };
  const normalize = status => (status === 'printing' ? 'in_use' : status || 'available');
  const ELEMENTS = {
    available: ['availableMachines', 'userAvailableMachines'],
    in_use: ['inUseMachines', 'userInUseMachines'],
    maintenance: ['maintenanceMachines', 'userMaintenanceMachines'],
    broken: ['brokenMachines', 'userBrokenMachines']
  };

  function items() {
    return [
      ...state.printers.map(item => ({ ...item, collection: 'printers' })),
      ...state.machines.filter(item => item.active !== false).map(item => ({ ...item, collection: 'machines' }))
    ].filter(item => item.name).sort((a, b) => String(a.name).localeCompare(String(b.name), 'de'));
  }

  function counts() {
    const result = { available: 0, in_use: 0, maintenance: 0, broken: 0, total: 0 };
    items().forEach(item => {
      const key = normalize(item.status);
      result[Object.hasOwn(result, key) ? key : 'available']++;
      result.total++;
    });
    return result;
  }

  function render() {
    const c = counts();
    Object.entries(ELEMENTS).forEach(([key, ids]) => ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const text = String(c[key]);
      if (el.textContent !== text) el.textContent = text;
      el.closest('.status-circle')?.classList.toggle('empty', c[key] === 0);
    }));
  }

  function start() {
    if (state.unsub.length || !window.firebase?.auth?.().currentUser || !window.db) return;
    ['printers', 'machines'].forEach(name => {
      state.unsub.push(window.db.collection(name).onSnapshot(snapshot => {
        state[name] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        render();
        document.dispatchEvent(new CustomEvent('machines:updated'));
      }, error => console.warn('Maschinenübersicht:', error.code || error.message)));
    });
  }

  function stop() {
    state.unsub.splice(0).forEach(unsubscribe => unsubscribe());
    state.printers = [];
    state.machines = [];
    render();
  }

  if (window.firebase?.auth) window.firebase.auth().onAuthStateChanged(user => (user ? start() : stop()));
  // Ältere Aufrufer (Dashboard-Start, Status-Änderungen) nutzen jetzt diese Zählung.
  document.addEventListener('DOMContentLoaded', () => {
    window.updateMachineOverview = render;
    window.updatePrinterStatusDisplay = render;
    start();
  });

  window.MachineOverview = { items, counts, refresh: render, start, stop };
})();
