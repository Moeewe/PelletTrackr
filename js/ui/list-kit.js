// ==================== LIST KIT ====================
// Ein gemeinsames System für lange Listen (Maschinen, Drucker, Equipment, Nutzer, Unterweisungen …):
//   - erst nur eine Seite zeigen, der Rest kommt per "weitere anzeigen"
//   - optional Suche und Status-Filter mit Zählern
//   - kleine Listen bleiben unverändert (Bedienelemente erst ab "minItems")
// Die Listen werden weiterhin von ihren Modulen gerendert; das Kit erkennt sie nach dem Rendern
// und blendet Einträge nur aus. Dadurch muss kein Modul umgebaut werden.
(function () {
  const DEFAULT_PAGE = 12;
  const MIN_ITEMS = 8;

  // Reihenfolge zählt: der erste passende Eintrag gewinnt.
  const CONFIGS = [
    { selector: '#equipmentList', item: '.equipment-item', search: false, page: 12, noun: 'Equipment',
      filters: [
        { label: 'Alle' },
        { label: 'Angefragt', test: el => el.classList.contains('has-pending-request') },
        { label: 'Frei', test: el => /verfügbar/i.test(el.querySelector('.equipment-status')?.textContent || '') },
        { label: 'Ausgeliehen', test: el => /ausgeliehen/i.test(el.querySelector('.equipment-status')?.textContent || '') }
      ] },
    { selector: '#safetyRows .safety-grid', item: ':scope > article', search: false, page: 12, noun: 'Einträge' },
    { selector: '.managed-user-list', item: ':scope > article', search: false, page: 20, noun: 'Personen' },
    { selector: '.material-grid', item: '.material-card', search: true, page: 12, noun: 'Materialien', placeholder: 'Material suchen …', minItems: 6,
      filters: [
        { label: 'Alle' },
        { label: 'Pellets', test: el => el.dataset.type === 'pellet' },
        { label: 'Filament', test: el => el.dataset.type === 'filament' }
      ] },
    { selector: '#printerGrid', item: '.printer-row', search: false, page: 20, noun: 'Drucker' },
    { selector: '.knowledge-tiles', item: ':scope > button', search: true, page: 12, noun: 'Maschinen', placeholder: 'Maschine suchen …' },
    { selector: '.label-list', item: 'label.label-row', search: true, page: 30, noun: 'Maschinen', placeholder: 'Maschine suchen …' },
    { selector: '.safety-manager .safety-grid', item: ':scope > article', search: true, page: 12, noun: 'Einträge', placeholder: 'Suchen …' },
    { selector: '.modal-body .safety-grid', item: ':scope > article', search: true, page: 12, noun: 'Einträge', placeholder: 'Suchen …' }
  ];

  const states = new WeakMap();
  let busy = false;

  const itemsOf = (container, config) => Array.from(container.querySelectorAll(config.item))
    .filter(el => el.parentElement === container || !config.item.startsWith(':scope'));

  // Nur schreiben, wenn sich der Text ändert – sonst löst das Kit über den Observer sich selbst aus.
  const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };

  function apply(container, config) {
    const state = states.get(container);
    const items = itemsOf(container, config);
    const term = state.term.trim().toLowerCase();
    const filter = config.filters?.[state.filter];
    const matches = items.filter(el => (!filter?.test || filter.test(el)) && (!term || el.textContent.toLowerCase().includes(term)));
    const visible = new Set(matches.slice(0, state.limit));
    items.forEach(el => { el.hidden = !visible.has(el); });

    if (state.chips && config.filters) {
      state.chips.forEach((chip, i) => {
        const f = config.filters[i];
        const n = items.filter(el => (!f.test || f.test(el)) && (!term || el.textContent.toLowerCase().includes(term))).length;
        setText(chip, `${f.label} (${n})`);
        chip.classList.toggle('active', i === state.filter);
      });
    }
    const hiddenCount = matches.length - visible.size;
    state.more.hidden = hiddenCount <= 0;
    setText(state.more.querySelector('span'), `${visible.size} von ${matches.length} angezeigt`);
    setText(state.more.querySelector('button'), `${Math.min(config.page, hiddenCount)} weitere anzeigen`);
    state.empty.hidden = matches.length > 0;
  }

  function build(container, config) {
    const items = itemsOf(container, config);
    if (items.length < (config.minItems || MIN_ITEMS)) return;
    const state = { term: '', filter: 0, limit: config.page || DEFAULT_PAGE, chips: null };
    states.set(container, state);
    container.dataset.listKit = '1';

    const toolbar = document.createElement('div');
    toolbar.className = 'lk-toolbar';
    toolbar.dataset.listKitFor = '1';
    if (config.search) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'search-input';
      input.placeholder = config.placeholder || 'Suchen …';
      input.autocomplete = 'off';
      input.addEventListener('input', () => { state.term = input.value; state.limit = config.page; apply(container, config); });
      toolbar.appendChild(input);
    }
    if (config.filters) {
      const bar = document.createElement('div');
      bar.className = 'printer-filters';
      state.chips = config.filters.map((f, i) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'filter-chip';
        chip.addEventListener('click', () => { state.filter = i; state.limit = config.page; apply(container, config); });
        bar.appendChild(chip);
        return chip;
      });
      toolbar.appendChild(bar);
    }
    if (toolbar.childElementCount) container.before(toolbar);

    state.empty = document.createElement('p');
    state.empty.className = 'printer-empty';
    state.empty.textContent = 'Keine passenden Einträge.';
    state.more = document.createElement('div');
    state.more.className = 'entry-show-more';
    state.more.innerHTML = '<span></span><button type="button" class="btn btn-secondary"></button>';
    state.more.querySelector('button').addEventListener('click', () => { state.limit += config.page; apply(container, config); });
    container.after(state.empty, state.more);
    apply(container, config);
  }

  function refresh(container, config) {
    // Inhalt wurde neu gerendert: Suche und Filter beibehalten, neue Einträge einordnen.
    const state = states.get(container);
    if (!state) return build(container, config);
    apply(container, config);
  }

  function scan(root) {
    if (busy) return;
    busy = true;
    try {
      const seen = new Set();
      for (const config of CONFIGS) {
        root.querySelectorAll?.(config.selector).forEach(container => {
          if (seen.has(container)) return;
          seen.add(container);
          if (container.dataset.listKit === '1') refresh(container, config); else build(container, config);
        });
        if (root.matches?.(config.selector) && !seen.has(root)) {
          seen.add(root);
          if (root.dataset.listKit === '1') refresh(root, config); else build(root, config);
        }
      }
    } finally { busy = false; }
  }

  function start() {
    scan(document);
    new MutationObserver(mutations => {
      if (busy) return;
      // Nur auf echte Inhaltsänderungen reagieren, gebündelt (Rendern ersetzt oft viele Knoten).
      const relevant = mutations.some(m => Array.from(m.addedNodes).some(n => n.nodeType === 1 && !n.closest?.('.entry-show-more, .lk-toolbar')));
      if (relevant) scan(document);
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.ListKit = { scan };
})();
