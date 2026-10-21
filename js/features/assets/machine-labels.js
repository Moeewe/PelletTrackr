// ==================== MACHINE LABELS ====================
// Druckbare QR-Etiketten für Maschinen. Ein Scan wählt die Maschine im Auftragsformular
// vor und öffnet direkt die Anleitung (siehe openMachineGuideFromUrl in auth.js).
(() => {
  'use strict';
  const COLLECTIONS = [
    { name: 'printers', label: 'Drucker' },
    { name: 'machines', label: 'Produktionsmaschinen' },
    { name: 'equipment', label: 'Equipment' }
  ];
  const SIZES = {
    small: { label: 'Klein · 60 × 40 mm (viele pro A4-Bogen)', w: 60, h: 40, qr: 28 },
    medium: { label: 'Mittel · 90 × 60 mm', w: 90, h: 60, qr: 42 },
    a6: { label: 'Schild · A6 (105 × 148 mm)', w: 105, h: 148, qr: 80 }
  };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let rows = [];

  async function requireAdmin() {
    const user = window.firebase?.auth?.().currentUser;
    if (!user) throw Error('Bitte anmelden.');
    const profile = await window.db.collection('users').doc(user.uid).get();
    if (profile.data()?.isAdmin !== true) throw Error('Nur Admins können Etiketten erstellen.');
  }

  // Immer die öffentliche Adresse verwenden, nie localhost – sonst funktionieren die Etiketten nicht.
  function baseUrl() {
    return (window.APP_PUBLIC_URL || window.location.origin).replace(/\/$/, '');
  }
  function machineUrl(row) {
    return `${baseUrl()}/?maschinenGuide=${encodeURIComponent(row.collection)}:${encodeURIComponent(row.id)}`;
  }

  async function open(preselectKeys = null) {
    try {
      await requireAdmin();
      const snaps = await Promise.all(COLLECTIONS.map(c => window.db.collection(c.name).get()));
      rows = snaps.flatMap((snap, i) => snap.docs
        .filter(doc => doc.data().active !== false && doc.data().name)
        .map(doc => ({ id: doc.id, collection: COLLECTIONS[i].name, group: COLLECTIONS[i].label, name: doc.data().name })))
        .sort((a, b) => a.group.localeCompare(b.group, 'de') || a.name.localeCompare(b.name, 'de'));
      const keyOf = row => `${row.collection}:${row.id}`;
      const checked = row => preselectKeys ? preselectKeys.includes(keyOf(row)) : row.collection !== 'equipment';
      let lastGroup = '';
      const list = rows.map((row, i) => {
        const heading = row.group !== lastGroup ? `<h4 class="label-group">${esc(row.group)}</h4>` : '';
        lastGroup = row.group;
        return `${heading}<label class="checkbox-label label-row"><input type="checkbox" class="checkbox-input" data-label-index="${i}" ${checked(row) ? 'checked' : ''}><span class="checkbox-text">${esc(row.name)}</span></label>`;
      }).join('');
      window.showModal(`<div class="modal-header"><h2>Maschinen-Etiketten</h2><button class="close-btn" onclick="closeModal()">&times;</button></div>
        <div class="modal-body">
          <p>Der QR-Code wählt die Maschine im Auftragsformular vor und öffnet direkt die Anleitung.</p>
          <label class="form-label" for="labelSize">Größe</label>
          <select id="labelSize" class="form-select">${Object.entries(SIZES).map(([key, s]) => `<option value="${key}">${esc(s.label)}</option>`).join('')}</select>
          <div class="label-list">${list || '<p>Keine Maschinen gefunden.</p>'}</div>
          <p><small>Adresse im QR-Code: ${esc(baseUrl())}</small></p>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Schließen</button><button class="btn btn-primary" onclick="MachineLabels.print()">Etiketten drucken</button></div>`,
        { clearStack: true, pushToStack: false });
    } catch (error) {
      window.toast.error(error.message || 'Etiketten konnten nicht geladen werden.');
    }
  }

  function qrDataUrl(text) {
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(holder);
    new window.QRCode(holder, { text, width: 512, height: 512, colorDark: '#000000', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
    const canvas = holder.querySelector('canvas');
    const url = canvas ? canvas.toDataURL('image/png') : holder.querySelector('img')?.src || '';
    holder.remove();
    return url;
  }

  function print() {
    if (typeof window.QRCode !== 'function') return window.toast.error('Der QR-Code-Generator konnte nicht geladen werden. Bitte Internetverbindung prüfen.');
    const selected = Array.from(document.querySelectorAll('[data-label-index]:checked')).map(box => rows[Number(box.dataset.labelIndex)]);
    if (!selected.length) return window.toast.warning('Bitte mindestens eine Maschine auswählen.');
    const size = SIZES[document.getElementById('labelSize').value] || SIZES.small;
    const labels = selected.map(row => `<div class="label"><div class="brand">Pellet<b>Trackr</b></div><img src="${qrDataUrl(machineUrl(row))}" alt=""><div class="name">${esc(row.name)}</div><div class="hint">Scannen: Maschine wählen &amp; Anleitung öffnen</div></div>`).join('');
    const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Maschinen-Etiketten</title><style>
      @page { size: A4; margin: 8mm; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; }
      .sheet { display: flex; flex-wrap: wrap; gap: 2mm; }
      .label { width: ${size.w}mm; height: ${size.h}mm; border: 0.3mm dashed #888; padding: 2mm; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; break-inside: avoid; page-break-inside: avoid; overflow: hidden; }
      .brand { font-size: ${Math.max(7, size.h / 7)}px; letter-spacing: .5px; }
      .brand b { background: #FFEB00; padding: 0 1mm; }
      img { width: ${size.qr}mm; height: ${size.qr}mm; image-rendering: pixelated; }
      .name { font-weight: 700; font-size: ${Math.max(9, size.h / 5)}px; line-height: 1.1; }
      .hint { font-size: ${Math.max(6, size.h / 9)}px; color: #333; }
    </style></head><body><div class="sheet">${labels}</div></body></html>`;
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    frame.srcdoc = html;
    frame.onload = () => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => frame.remove(), 60000);
    };
    document.body.appendChild(frame);
  }

  window.MachineLabels = { open, print, machineUrl };
})();
