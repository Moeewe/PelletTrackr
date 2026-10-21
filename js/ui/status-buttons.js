// ==================== STATUS PER KLICK ====================
// Maschinenstatus für Admins: vier Buttons statt Dropdown oder Durchschalten.
// Gilt für Drucker ("printing") und Produktionsmaschinen ("in_use"); gespeichert wird sofort beim Klick.
(function () {
  const IN_USE = { printers: 'printing', machines: 'in_use', equipment: 'in_use' };
  const LABELS = { available: 'Verfügbar', in_use: 'In Betrieb', maintenance: 'Wartung', broken: 'Defekt' };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const inUseValue = collection => IN_USE[collection] || 'in_use';
  // Ältere Daten nutzen "printing" und "in_use" gemischt – beides zählt als "In Betrieb".
  const normalize = status => (status === 'printing' ? 'in_use' : status || 'available');

  function buttons(collection, id, status, allowed) {
    const current = normalize(status);
    const group = `${collection}:${id}`;
    return `<div class="mstatus" role="group" aria-label="Status" data-status-group="${esc(group)}">${Object.entries(LABELS).map(([key, label]) =>
      {
      const off = allowed && !allowed.includes(key);
      return `<button type="button" class="mstatus-btn mstatus-btn-${key} ${key === current ? 'active' : ''}" aria-pressed="${key === current}" ${off ? 'disabled' : `onclick="MachineStatus.set('${esc(collection)}','${esc(id)}','${key}')"`}>${label}</button>`;
    }).join('')}</div>`;
  }

  function paint(collection, id, key) {
    document.querySelectorAll(`[data-status-group="${CSS.escape(collection + ':' + id)}"] .mstatus-btn`).forEach(button => {
      const on = button.classList.contains('mstatus-btn-' + key);
      button.classList.toggle('active', on);
      button.setAttribute('aria-pressed', String(on));
    });
  }

  async function set(collection, id, key) {
    const admin = !!window.currentUser?.isAdmin;
    // Nutzer dürfen bei Druckern "Verfügbar" und "In Betrieb" setzen (siehe Firestore-Regeln), alles andere nur Admins.
    if (!admin && !(collection === 'printers' && ['available', 'in_use'].includes(key))) return window.toast?.error('Diesen Status können nur Administratoren ändern.');
    const status = key === 'in_use' ? inUseValue(collection) : key;
    paint(collection, id, key);
    try {
      await window.db.collection(collection).doc(id).update({
        status,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        lastStatusChangeBy: window.currentUser?.name || 'Admin',
        lastStatusChangeAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
      document.dispatchEvent(new CustomEvent('machine:status', { detail: { collection, id, status } }));
    } catch (error) {
      window.toast?.error('Status konnte nicht gespeichert werden: ' + (error.message || error));
    }
  }

  // ---------- Übersicht "Maschinen" (Nutzer und Admin) ----------
  const PAGE = 15;
  const panelState = { items: [], term: '', filter: 'all', limit: PAGE };

  function collectMachines() {
    if (window.MachineOverview) return window.MachineOverview.items();
    const printers = typeof userPrinters !== 'undefined' ? userPrinters : [];
    const machines = typeof userProductionMachines !== 'undefined' ? userProductionMachines : [];
    return [
      ...printers.map(item => ({ ...item, collection: 'printers' })),
      ...machines.filter(item => item.active !== false).map(item => ({ ...item, collection: 'machines' }))
    ].filter(item => item.name).sort((a, b) => String(a.name).localeCompare(String(b.name), 'de'));
  }

  function renderPanel() {
    const list = document.getElementById('machinePanelList');
    if (!list) return;
    const admin = !!window.currentUser?.isAdmin;
    const term = panelState.term.trim().toLowerCase();
    const searched = panelState.items.filter(item => !term || [item.name, item.model, window.machineKindLabel?.(item)].some(v => String(v || '').toLowerCase().includes(term)));
    const count = key => searched.filter(item => key === 'all' || normalize(item.status) === key).length;
    document.getElementById('machinePanelFilters').innerHTML = [['all', 'Alle'], ...Object.entries(LABELS)]
      .map(([key, label]) => `<button type="button" class="filter-chip ${panelState.filter === key ? 'active' : ''}" onclick="MachineStatus.filter('${key}')">${label} (${count(key)})</button>`).join('');
    const shown = searched.filter(item => panelState.filter === 'all' || normalize(item.status) === panelState.filter);
    if (!shown.length) { list.innerHTML = '<p class="printer-empty">' + (panelState.items.length ? 'Keine passenden Maschinen.' : 'Noch keine Maschinen angelegt.') + '</p>'; return; }
    const visible = shown.slice(0, panelState.limit);
    let lastKind = '';
    list.innerHTML = visible.map(item => {
      const kind = window.machineKindLabel?.(item) || 'Maschine';
      const heading = kind !== lastKind ? `<h4 class="printer-group">${esc(kind)}</h4>` : '';
      lastKind = kind;
      const canSet = admin || item.collection === 'printers';
      const control = canSet ? buttons(item.collection, item.id, item.status, admin ? null : ['available', 'in_use'])
        : `<span class="mstatus-pill mstatus-btn-${normalize(item.status)}">${LABELS[normalize(item.status)]}</span>`;
      const problem = !admin ? `<button class="link-small" onclick="MachineStatus.report('${esc(item.collection)}','${esc(item.id)}','${esc(String(item.name).replace(/'/g, ''))}')">Problem melden</button>` : '';
      return `${heading}<article class="printer-row"><div class="printer-row-main"><h4 class="printer-row-name">${esc(item.name)}</h4><p class="printer-row-details">${esc([item.model, item.location].filter(Boolean).join(' · '))}</p></div>${control}${problem}</article>`;
    }).join('') + (visible.length < shown.length
      ? `<div class="entry-show-more"><span>${visible.length} von ${shown.length} angezeigt</span><button type="button" class="btn btn-secondary" onclick="MachineStatus.more()">${Math.min(PAGE, shown.length - visible.length)} weitere anzeigen</button></div>` : '');
  }

  function panel(initialFilter) {
    const filter = typeof initialFilter === 'string' && ['available', 'in_use', 'maintenance', 'broken'].includes(initialFilter) ? initialFilter : 'all';
    Object.assign(panelState, { items: collectMachines(), term: '', filter, limit: PAGE });
    const admin = !!window.currentUser?.isAdmin;
    (window.showModalWithContent || window.showModal)(`<div class="modal-header"><h3>Maschinen</h3><button class="close-btn" onclick="closeModal()">&times;</button></div>
      <div class="modal-body">
        <div class="printer-toolbar"><input type="text" id="machinePanelSearch" class="search-input" placeholder="Maschine suchen …" autocomplete="off" oninput="MachineStatus.search(this.value)"><div id="machinePanelFilters" class="printer-filters" role="group" aria-label="Nach Status filtern"></div></div>
        <div id="machinePanelList" class="printer-list-compact"></div>
      </div>
      <div class="modal-footer">${admin ? '<button class="btn btn-secondary" onclick="MachineHub.open()">Maschinen verwalten</button>' : ''}<button class="btn btn-secondary" onclick="closeModal()">Schließen</button></div>`);
    renderPanel();
  }

  // Nach einer Änderung Zähler und Filter aktuell halten.
  document.addEventListener('machine:status', event => {
    const item = panelState.items.find(i => i.collection === event.detail.collection && i.id === event.detail.id);
    if (item) { item.status = event.detail.status; if (document.getElementById('machinePanelList')) renderPanel(); }
  });

  // Die gemeinsame Übersicht ersetzt die alte, lange Liste.
  document.addEventListener('DOMContentLoaded', () => { window.showPrinterStatus = panel; });
  // Live: Liste und Zähler im geöffneten Dialog folgen den Änderungen in der Datenbank.
  document.addEventListener('machines:updated', () => {
    if (!document.getElementById('machinePanelList')) return;
    panelState.items = collectMachines();
    renderPanel();
  });

  window.MachineStatus = {
    buttons, set, normalize, label: status => LABELS[normalize(status)] || status, panel,
    search: term => { panelState.term = term; panelState.limit = PAGE; renderPanel(); },
    filter: key => { panelState.filter = key; panelState.limit = PAGE; renderPanel(); },
    more: () => { panelState.limit += PAGE; renderPanel(); },
    // Problem zu einer Maschine melden (setzt sie nach der Meldung auf "Defekt")
    report: (collection, id, name) => { window.__problemCollection = collection; window.reportPrinterProblem?.(id, name); }
  };
})();
