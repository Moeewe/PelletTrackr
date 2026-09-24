// Safety training records: stable person/machine references, append-only history.
// No writes are performed until an administrator explicitly saves a form.
(() => {
  'use strict';
  const recordsCollection = 'safetyTrainings';
  const typesCollection = 'safetyTrainingTypes';
  const state = { users: [], machines: [], records: [], own: [], unsub: [], generation: 0, busy: false };
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const docs = snapshot => snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  const key = m => JSON.stringify([m.collection, m.id]);
  const recordKey = r => r.machineCollection && r.machineId ? JSON.stringify([r.machineCollection, r.machineId]) : null;
  const today = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-'); };
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || value > today()) return false;
    const d = new Date(value + 'T12:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === value;
  }
  function date(value) {
    if (!value) return '—';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split('-').reverse().join('.');
    const d = value.toDate ? value.toDate() : new Date(value);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString('de-DE') : '—';
  }
  const statusLabel = s => ({active:'Eingewiesen', revoked:'Entzogen', missing:'Nicht hinterlegt'}[s] || 'Unbekannt');
  const machineStatus = s => ({available:'Verfügbar',printing:'In Betrieb',in_use:'In Betrieb',maintenance:'Wartung',broken:'Defekt',borrowed:'Ausgeliehen',rented:'Ausgeliehen'}[s] || 'Status unbekannt');
  const notify = (message, type='error') => window.toast?.[type]?.(message);
  const button = (label, action, kind='secondary', options={}) => window.ButtonFactory[kind](esc(label), action, options);
  const option = (value, label) => '<option value="' + esc(value) + '">' + esc(label) + '</option>';
  function actor() {
    const user = window.firebase?.auth?.().currentUser;
    if (!user || (window.currentUser?.uid && window.currentUser.uid !== user.uid)) throw new Error('Bitte mit einem Firebase-Konto anmelden.');
    return user;
  }
  async function requireAdmin() {
    const user = actor();
    const profile = await window.db.collection('users').doc(user.uid).get();
    if (!profile.exists || profile.data().isAdmin !== true) throw new Error('Für diese Funktion sind bestätigte Adminrechte erforderlich.');
    return user;
  }
  async function machines() {
    const collections = ['printers','equipment','machines',typesCollection];
    const snapshots = await Promise.all(collections.map(c => window.db.collection(c).get()));
    return snapshots.flatMap((s,i) => docs(s).map(d => ({...d, collection:collections[i]})))
      .filter(m => m.name).sort((a,b) => a.name.localeCompare(b.name,'de'));
  }
  function machineName(r) {
    return state.machines.find(m => key(m) === recordKey(r))?.name || r.machineName || r.equipmentName || 'Nicht zugeordnete Unterweisung';
  }
  function badge(r) {
    return '<span class="safety-badge safety-' + (r?.status === 'active' ? 'active' : r?.status === 'revoked' ? 'revoked' : 'missing') + '">' + statusLabel(r?.status || 'missing') + '</span>';
  }
  function isRequired(m) { return m.collection === typesCollection || m.requiresSafetyTraining === true; }
  function renderOwn() {
    const el = $('userSafetyTrainingList');
    if (!el) return;
    const shown = state.machines.filter(m => isRequired(m) || state.own.some(r => recordKey(r) === key(m)));
    const unmatched = state.own.filter(r => !state.machines.some(m => key(m) === recordKey(r)));
    const rows = shown.map(m => {
      const r = state.own.find(r => recordKey(r) === key(m));
      return '<article class="safety-card"><h3>' + esc(m.name) + '</h3><p>' + esc(m.collection === typesCollection ? 'Unterweisungsart' : machineStatus(m.status)) + '</p>' + badge(r) +
        '<p>Unterweisung: ' + date(r?.trainingDate) + '</p>' + (r?.instructor ? '<p>Durchgeführt von: '+esc(r.instructor)+'</p>' : '') + (r?.status === 'revoked' ? '<p>Entzogen: '+date(r.revokedAt)+'</p>' : '') +
        (r?.note ? '<p>'+esc(r.note)+'</p>' : '') + '</article>';
    });
    rows.push(...unmatched.map(r => '<article class="safety-card"><h3>'+esc(machineName(r))+'</h3>'+badge(r)+'<p>Unterweisung: '+date(r.trainingDate)+'</p><p>Zuordnung fehlt oder Maschine wurde entfernt. Bitte die Werkstatt kontaktieren.</p></article>'));
    el.innerHTML = '<div class="safety-grid">'+rows.join('')+'</div>' + (!rows.length ? '<p>Noch keine Unterweisungen hinterlegt.</p>' : '');
  }
  function cleanup() {
    state.generation++;
    state.unsub.splice(0).forEach(fn => fn());
    state.own = [];
    if ($('userSafetyTrainingList')) $('userSafetyTrainingList').textContent = 'Bitte anmelden, um eigene Unterweisungen zu sehen.';
  }
  async function loadOwn() {
    cleanup();
    if ($('userSafetyTrainingList')) $('userSafetyTrainingList').textContent = 'Unterweisungen werden geladen …';
    const generation = state.generation;
    try {
      const user = actor();
      state.machines = await machines();
      if (generation !== state.generation) return;
      state.unsub.push(window.db.collection(recordsCollection).where('userId','==',user.uid).onSnapshot(snapshot => {
        if (generation !== state.generation) return;
        state.own = docs(snapshot); renderOwn();
      }, () => {
        if (generation === state.generation && $('userSafetyTrainingList')) $('userSafetyTrainingList').textContent = 'Unterweisungen konnten nicht geladen werden. Bitte erneut anmelden oder die Werkstatt kontaktieren.';
      }));
    } catch (error) { if ($('userSafetyTrainingList')) $('userSafetyTrainingList').textContent = error.message; }
  }
  async function loadAdmin() {
    await requireAdmin();
    const [users, records, assets] = await Promise.all([window.db.collection('users').get(), window.db.collection(recordsCollection).get(), machines()]);
    state.users = docs(users).sort((a,b) => (a.name || a.email || a.id).localeCompare(b.name || b.email || b.id,'de'));
    state.records = docs(records);
    state.machines = assets;
  }
  function openModal(title, content) {
    window.showModal('<div class="modal-header safety-header"><h2>'+esc(title)+'</h2>'+button('Schließen','closeModal()')+'</div><div class="modal-body safety-manager">'+content+'</div>', {clearStack:true,pushToStack:false});
  }
  async function manager() {
    try {
      await loadAdmin();
      openModal('Sicherheitsunterweisungen', '<p>Laserschein, Roboter- und Maschineneinweisungen mit Datum dokumentieren. Für mehrere gleichartige Laser eine gemeinsame Unterweisungsart wie „Laserschein · Trotec Speedy 500“ anlegen und den Nachweis dort einmalig pro Person führen.</p>'+
        '<div class="safety-actions">'+button('Einweisung hinterlegen','SafetyTraining.edit()', 'primary')+button('Maschinen & Unterweisungsarten','SafetyTraining.settings()')+
        (typeof window.showUserManager === 'function' ? button('Zur Nutzerverwaltung','closeModal();showUserManager()') : '')+'</div>'+
        '<div class="safety-filters"><label>Person suchen<input id="safetySearch" class="form-input" oninput="SafetyTraining.render()" placeholder="Name, E-Mail oder Kennung"></label>'+
        '<label>Maschine<select id="safetyMachineFilter" class="form-select" onchange="SafetyTraining.render()">'+option('','Alle Maschinen')+state.machines.map(m=>option(key(m),m.name)).join('')+'</select></label>'+
        '<label>Status<select id="safetyStatusFilter" class="form-select" onchange="SafetyTraining.render()">'+option('','Alle')+option('active','Eingewiesen')+option('revoked','Entzogen')+option('missing','Nicht hinterlegt')+'</select></label>'+
        '<label>Sortierung<select id="safetySort" class="form-select" onchange="SafetyTraining.render()">'+option('name','Person A–Z')+option('machine','Maschine A–Z')+option('date','Neueste Unterweisung')+'</select></label></div><div id="safetyRows"></div>');
      render();
    } catch(error) { notify(error.message); }
  }
  function render() {
    if (!$('safetyRows')) return;
    const search = ($('safetySearch')?.value || '').toLocaleLowerCase('de');
    const filter = $('safetyStatusFilter')?.value || '';
    const machine = $('safetyMachineFilter')?.value || '';
    const rows = [...state.records];
    // Missing records are explicit in the overall overview, without creating database documents.
    state.users.forEach(u => state.machines.filter(isRequired).forEach(m => {
      if (!rows.some(r => r.userId === u.id && recordKey(r) === key(m))) rows.push({userId:u.id,userName:u.name,userEmail:u.email,machineId:m.id,machineCollection:m.collection,machineName:m.name,status:'missing'});
    }));
    const filtered = rows.filter(r => {
      const u = state.users.find(u => u.id === r.userId) || {};
      return (!filter || r.status === filter) && (!machine || recordKey(r) === machine) &&
        [u.name,r.userName,u.email,r.userEmail,u.kennung].join(' ').toLocaleLowerCase('de').includes(search);
    });
    filtered.sort((a,b) => $('safetySort')?.value === 'machine' ? machineName(a).localeCompare(machineName(b),'de') :
      $('safetySort')?.value === 'date' ? String(b.trainingDate || '').localeCompare(String(a.trainingDate || '')) :
      String(a.userName || a.userId).localeCompare(String(b.userName || b.userId),'de'));
    $('safetyRows').innerHTML = '<p>'+filtered.length+' Einträge</p><div class="safety-grid">'+filtered.map(r => {
      const idx = state.records.indexOf(r);
      const uid = state.users.findIndex(u => u.id === r.userId);
      const mid = state.machines.findIndex(m => key(m) === recordKey(r));
      const m = state.machines[mid];
      return '<article class="safety-card"><h3>'+esc(r.userName || r.userEmail || r.userId)+'</h3><p>'+esc(r.userEmail || '')+'</p><h4>'+esc(machineName(r))+'</h4>'+
        '<p>'+esc(m ? m.collection === typesCollection ? 'Unterweisungsart' : machineStatus(m.status) : 'Zuordnung fehlt / Maschine entfernt')+'</p>'+badge(r)+
        '<p>Unterweisung: '+date(r.trainingDate)+'</p>'+(r.status === 'revoked' ? '<p>Entzogen: '+date(r.revokedAt)+'</p>' : '')+
        '<div class="safety-actions">'+(idx < 0 ? button('Hinterlegen','SafetyTraining.edit(-1,'+uid+','+mid+')','primary') :
        button('Historie','SafetyTraining.history('+idx+')')+
        (mid >= 0 ? button(r.status === 'active' ? 'Bearbeiten / erneuern' : 'Erneut einweisen','SafetyTraining.edit('+idx+')') : '')+
        (r.status === 'active' ? button('Entziehen','SafetyTraining.revoke('+idx+')','danger') : ''))+'</div></article>';
    }).join('')+'</div>';
  }
  function edit(index=-1, userIndex=-1, machineIndex=-1) {
    const r = state.records[index];
    openModal(r ? 'Unterweisung bearbeiten / erneut bestätigen' : 'Unterweisung hinterlegen',
      '<label>Person<select id="safetyUser" class="form-select" '+(r ? 'disabled' : '')+'>'+option('','Bitte auswählen')+state.users.map((u,i)=>option(i,(u.name || u.email || u.id)+' · '+(u.email || u.kennung || u.id))).join('')+'</select></label>'+
      '<label>Maschine / Unterweisungsart<select id="safetyAsset" class="form-select" '+(r ? 'disabled' : '')+'>'+option('','Bitte auswählen')+state.machines.map((m,i)=>option(i,m.name+' · '+(m.collection === typesCollection ? 'Unterweisungsart' : m.collection === 'equipment' ? 'Equipment' : (m.jobTypes||[]).join(' / ') || 'Maschine'))).join('')+'</select></label>'+
      '<label>Datum der Unterweisung<input id="safetyDate" class="form-input" type="date" max="'+today()+'" value="'+today()+'"></label>'+
      '<label>Durchgeführt von<input id="safetyInstructor" class="form-input" maxlength="160" placeholder="Name der einweisenden Person"></label>'+
      '<label>Notiz / Nachweisnummer<textarea id="safetyNote" class="form-input" maxlength="2000"></textarea></label>'+
      '<p>Die Bestätigung und spätere Änderungen werden in der Historie dokumentiert.</p><div class="safety-actions">'+
      button('Speichern','SafetyTraining.save('+index+')','primary',{id:'safetySave'})+button('Abbrechen','showSafetyTrainingManager()')+'</div>');
    $('safetyUser').value = r ? state.users.findIndex(u=>u.id === r.userId) : userIndex >= 0 ? userIndex : '';
    $('safetyAsset').value = r ? state.machines.findIndex(m=>key(m) === recordKey(r)) : machineIndex >= 0 ? machineIndex : '';
    $('safetyInstructor').value = r?.instructor || window.currentUser?.name || '';
    $('safetyNote').value = r?.note || '';
    if (r?.status === 'active') {
      const d = r.trainingDate?.toDate ? r.trainingDate.toDate() : new Date(r.trainingDate);
      if (Number.isFinite(d.getTime())) $('safetyDate').value = d.toISOString().slice(0,10);
    }
  }
  async function documentId(userId, machineKey) {
    const data = new TextEncoder().encode(JSON.stringify([userId, machineKey]));
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)), b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function change(ref, changes, expectedRevision, action) {
    const admin = await requireAdmin();
    await window.db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const before = snap.exists ? snap.data() : null;
      if ((before?.revision || 0) !== expectedRevision) throw new Error('Eintrag wurde inzwischen geändert. Bitte Übersicht neu öffnen.');
      const revision = expectedRevision + 1;
      const timestamp = window.firebase.firestore.FieldValue.serverTimestamp();
      const after = {...(before || {}),...changes,revision,updatedBy:admin.uid,updatedByName:window.currentUser?.name || '',updatedAt:timestamp};
      if (!before) Object.assign(after,{createdAt:timestamp,createdBy:admin.uid});
      if (action === 'revoke') Object.assign(after,{revokedAt:timestamp,revokedBy:admin.uid});
      tx.set(ref,after);
      tx.set(ref.collection('history').doc(String(revision)),{
        userId:after.userId,revision,action,at:timestamp,by:admin.uid,byName:window.currentUser?.name || '',
        before:before || null,after
      });
    });
  }
  async function save(index) {
    if (state.busy) return;
    const user = state.users[Number($('safetyUser')?.value)];
    const m = state.machines[Number($('safetyAsset')?.value)];
    const trainingDate = $('safetyDate')?.value;
    const instructor = $('safetyInstructor')?.value.trim();
    if (!$('safetyUser')?.value || !$('safetyAsset')?.value || !user || !m || !validDate(trainingDate) || !instructor) return notify('Bitte Person, Maschine, ein gültiges Datum (nicht in der Zukunft) und die einweisende Person angeben.');
    state.busy = true;
    if ($('safetySave')) $('safetySave').disabled = true;
    try {
      // Only exact document references match. Never infer permission from a similar name.
      const matches = state.records.filter(r=>r.userId === user.id && recordKey(r) === key(m));
      if (matches.length > 1) throw new Error('Mehrere Alt-Einträge vorhanden. Bitte zuerst administrativ prüfen lassen.');
      const existing = state.records[index] || matches[0];
      const ref = window.db.collection(recordsCollection).doc(existing?.id || await documentId(user.id,key(m)));
      const machineDoc = await window.db.collection(m.collection).doc(m.id).get();
      if (!machineDoc.exists) throw new Error('Die Maschine wurde inzwischen entfernt.');
      await change(ref,{
        userId:user.id,userName:user.name || '',userEmail:user.email || '',
        machineCollection:m.collection,machineId:m.id,machineName:m.name,
        status:'active',trainingDate,instructor,note:$('safetyNote').value.trim(),
        revokedAt:null,revokedBy:null
      },existing?.revision || 0, existing ? existing.status === 'revoked' ? 'renew' : 'update' : 'create');
      notify('Unterweisung gespeichert.','success'); await manager(); loadOwn();
    } catch(error) { notify(error.message); }
    finally { state.busy=false; if ($('safetySave')) $('safetySave').disabled=false; }
  }
  async function revoke(index) {
    const r=state.records[index];
    if (!r || state.busy) return;
    const confirmed = await window.toast.confirm('Unterweisung für '+(r.userName || r.userId)+' an '+machineName(r)+' entziehen? Die Historie bleibt erhalten.','Entziehen','Abbrechen');
    if (!confirmed) return;
    state.busy=true;
    try {
      await change(window.db.collection(recordsCollection).doc(r.id),{status:'revoked'},r.revision || 0,'revoke');
      notify('Unterweisung entzogen.','success'); await manager(); loadOwn();
    } catch(error) { notify(error.message); } finally { state.busy=false; }
  }
  async function history(index) {
    const r=state.records[index];
    if (!r) return;
    try {
      await requireAdmin();
      const snapshot=await window.db.collection(recordsCollection).doc(r.id).collection('history').orderBy('revision','desc').get();
      const entries=docs(snapshot);
      openModal('Historie · '+machineName(r),'<p>'+esc(r.userName || r.userId)+'</p>'+
        (!entries.length ? '<p>Alt-Eintrag ohne frühere Historie. Änderungen werden ab dieser Version protokolliert.</p>' : entries.map(e=>
          '<article class="safety-card"><h3>'+esc({create:'Hinterlegt',update:'Geändert',renew:'Erneut eingewiesen',revoke:'Entzogen'}[e.action] || e.action)+'</h3>'+
          '<p>'+date(e.at)+' · '+esc(e.byName || e.by)+'</p><p>Unterweisung am '+date(e.after?.trainingDate)+' · '+esc(e.after?.instructor || '')+'</p>'+
          '<p>'+esc(e.after?.note || '')+'</p></article>').join(''))+button('Zur Übersicht','showSafetyTrainingManager()'));
    } catch(error) { notify(error.message); }
  }
  function settings() {
    openModal('Maschinen & Unterweisungsarten','<p>Vorhandene Maschinen auswählen, für die eine Unterweisung erforderlich ist. Allgemeine Nachweise wie „Laserschein“ können unabhängig von einer bestimmten Maschine erfasst werden.</p>'+
      '<div class="safety-grid">'+state.machines.map((m,i)=>'<article class="safety-card"><h3>'+esc(m.name)+'</h3><p>'+esc(m.collection)+'</p>'+
        (m.collection === typesCollection ? '<p>Allgemeine Unterweisungsart</p>' : button(isRequired(m) ? 'Unterweisungspflicht deaktivieren' : 'Unterweisung erforderlich','SafetyTraining.requirement('+i+','+!isRequired(m)+')'))+'</article>').join('')+'</div>'+
      '<label>Neue Unterweisungsart<input class="form-input" id="safetyTypeName" maxlength="160" placeholder="Laserschein · Trotec Speedy 500"></label>'+
      '<div class="safety-actions">'+button('Unterweisungsart anlegen','SafetyTraining.addType()','primary')+button('Zur Übersicht','showSafetyTrainingManager()')+'</div>');
  }
  async function requirement(index, value) {
    try {
      await requireAdmin(); const m=state.machines[index];
      await window.db.collection(m.collection).doc(m.id).update({requiresSafetyTraining:value});
      await loadAdmin(); settings();
    } catch(error) { notify(error.message); }
  }
  async function addType() {
    const name=$('safetyTypeName')?.value.trim();
    if (!name) return notify('Bitte einen Namen angeben.');
    try {
      const user=await requireAdmin();
      const id=await documentId('type',name.toLocaleLowerCase('de'));
      const ref=window.db.collection(typesCollection).doc(id);
      await window.db.runTransaction(async tx=>{
        if ((await tx.get(ref)).exists) throw new Error('Diese Unterweisungsart existiert bereits.');
        tx.set(ref,{name,createdBy:user.uid,createdAt:window.firebase.firestore.FieldValue.serverTimestamp()});
      });
      await loadAdmin(); settings();
    } catch(error) { notify(error.message); }
  }
  window.SafetyTraining={edit,save,revoke,history,settings,requirement,addType,render,cleanup};
  window.showSafetyTrainingManager=manager;
  window.initializeSafetyTrainingsForUser=loadOwn;
  window.loadUserSafetyTrainings=loadOwn;
  // Pure helpers exposed only in the isolated test harness.
  if (window.__SAFETY_TEST__) window.__safetyTest={validDate,recordKey,key,documentId,change,state,renderOwn};
})();
