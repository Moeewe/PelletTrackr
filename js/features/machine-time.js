(function () {
  const collections = ['machines', 'printers', 'equipment'];
  let tickHandle = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = cents => new Intl.NumberFormat('de-DE', {style:'currency',currency:'EUR'}).format((Number(cents)||0)/100);
  const keyFor = (collection, id) => `${collection}__${id}`;
  const getUser = () => firebase.auth().currentUser;
  const getCallable = name => firebase.functions('europe-west1').httpsCallable(name);

  async function open() {
    if (!getUser() || !window.currentUser?.kennung) return window.toast.warning('Bitte melde dich zuerst mit deinem Nutzerkonto an.');
    try {
      const uid = getUser().uid;
      const profileSnap = await window.db.collection('users').doc(uid).get();
      const profile = profileSnap.exists ? profileSnap.data() : {};
      const isAdmin = profile.isAdmin === true;
      const group = profile.billingGroup || 'standard';
      const [machineSets, policySnap] = await Promise.all([
        Promise.all(collections.map(collection => window.db.collection(collection).get())),
        window.db.collection('billingPolicies').get()
      ]);
      const policies = new Map(policySnap.docs.map(doc => [doc.id, doc.data()]));
      const machines = machineSets.flatMap((snapshot, index) => snapshot.docs.map(doc => {
        const machine = doc.data();
        const policy = policies.get(keyFor(collections[index], doc.id));
        const tariff = policy?.rates?.[group] || policy?.rates?.standard;
        return {id:doc.id, collection:collections[index], name:machine.name || doc.id, machine, tariff, policy};
      })).filter(item => item.machine.active !== false && item.machine.status !== 'maintenance' && item.machine.status !== 'broken'
        && ['minute','hour'].includes(item.tariff?.mode) && item.tariff.materialRule === 'none' && item.tariff.rateCents > 0)
        .sort((a,b)=>a.name.localeCompare(b.name,'de'));

      const sessionsQuery = isAdmin
        ? window.db.collection('activeMachineSessions')
        : window.db.collection('activeMachineSessions').where('userId','==',uid);
      const activeSnap = await sessionsQuery.get();
      const sessions = activeSnap.docs.map(doc => ({key:doc.id,...doc.data()}));
      render({machines, sessions, isAdmin, group, uid});
    } catch (error) {
      window.toast.error('Maschinenzeit konnte nicht geladen werden: ' + (error.message || error));
    }
  }

  function render(state, notice = '') {
    if (tickHandle) clearInterval(tickHandle);
    const owned = state.sessions.find(session => session.userId === state.uid);
    const options = state.machines.map(item => {
      const occupied = state.sessions.some(session => session.key === keyFor(item.collection,item.id));
      const rate = item.tariff.mode === 'minute' ? `${money(item.tariff.rateCents)} / Minute` : `${money(item.tariff.rateCents)} / Stunde`;
      return `<option value="${esc(item.collection)}|${esc(item.id)}" ${occupied?'disabled':''}>${esc(item.name)} · ${rate}${occupied?' · belegt':''}</option>`;
    }).join('');
    const ownSession = owned ? `<section class="machine-time-running"><h3>Deine laufende Nutzung</h3><p><strong>${esc(owned.machineName)}</strong></p><p class="machine-time-clock" data-session-clock="${esc(owned.sessionId)}">00:00:00</p><p class="machine-time-cost" data-session-cost="${esc(owned.sessionId)}">Vorläufig: ${money(0)}</p><button class="btn btn-primary" onclick="MachineTime.stop('${esc(owned.sessionId)}')">Nutzung beenden</button></section>` : '';
    const activeRows = state.sessions.length ? `<section><h3>${state.isAdmin?'Aktuell belegte Maschinen':'Weitere laufende Nutzungen'}</h3><div class="machine-time-list">${state.sessions.map(session => `<article class="machine-time-session"><div><strong>${esc(session.machineName)}</strong><small>${esc(session.userName || 'Nutzer')} · seit ${new Date(session.startedAtMs).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</small><small data-session-clock="${esc(session.sessionId)}">wird geladen …</small><small data-session-cost="${esc(session.sessionId)}"></small></div>${state.isAdmin?`<button class="btn btn-secondary" onclick="MachineTime.stop('${esc(session.sessionId)}')">Beenden</button>`:''}</article>`).join('')}</div></section>` : '<p class="machine-time-empty">Aktuell läuft keine Nutzung über die Zeiterfassung.</p>';
    const content = `<div class="modal-header"><h2>Maschinenzeit</h2><button class="close-btn" onclick="closeModal()">&times;</button></div><div class="modal-body machine-time-panel">${notice?`<p class="machine-time-notice">${esc(notice)}</p>`:''}<p>Deine Abrechnungsgruppe: <strong>${esc(state.group)}</strong>. Der angezeigte Betrag ist vorläufig; beim Beenden wird die Zeit serverseitig abgerechnet.</p>${ownSession}${!owned?`<section><h3>Nutzung starten</h3>${options?`<label>Maschine<select id="machineTimeSelection" class="form-select">${options}</select></label><button class="btn btn-primary" onclick="MachineTime.start()">Nutzung starten</button>`:'<p>Für deine Nutzergruppe sind noch keine Maschinen mit Minuten- oder Stundentarif eingerichtet.</p>'}</section>`:''}${activeRows}</div>`;
    window.showModal(content,{clearStack:true,pushToStack:false});
    updateClocks(state.sessions);
    tickHandle = setInterval(() => updateClocks(state.sessions), 1000);
  }

  function updateClocks(sessions) {
    const modal = document.getElementById('modal');
    if (!modal?.classList.contains('active')) {
      if (tickHandle) clearInterval(tickHandle);
      tickHandle = null;
      return;
    }
    for (const session of sessions) {
      const elapsed = Math.max(0,Date.now()-Number(session.startedAtMs||Date.now()));
      const seconds = Math.floor(elapsed/1000);
      const clock = `${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds%3600/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
      const tariff = session.tariffSnapshot || {};
      const unitMs = tariff.mode === 'minute' ? 60000 : 3600000;
      const cents = Math.round(elapsed*(Number(tariff.rateCents)||0)/unitMs);
      document.querySelectorAll(`[data-session-clock="${CSS.escape(session.sessionId)}"]`).forEach(node => node.textContent = clock);
      document.querySelectorAll(`[data-session-cost="${CSS.escape(session.sessionId)}"]`).forEach(node => node.textContent = `Vorläufig: ${money(cents)}`);
    }
  }

  async function start() {
    const value = document.getElementById('machineTimeSelection')?.value;
    if (!value) return window.toast.warning('Bitte wähle eine Maschine aus.');
    const [machineCollection,machineId] = value.split('|');
    try {
      await getUser().getIdToken(true);
      await getCallable('startMachineSession')({machineCollection,machineId});
      window.toast.success('Maschinenzeit läuft.');
      await open();
    } catch (error) { window.toast.error(error.message || 'Nutzung konnte nicht gestartet werden.'); }
  }

  async function stop(sessionId) {
    if (!await window.toast.confirm('Maschinenzeit jetzt beenden? Der Auftrag wird als noch nicht bezahlt verbucht.','Nutzung beenden','Weiter nutzen')) return;
    try {
      await getUser().getIdToken(true);
      const response = await getCallable('finishMachineSession')({sessionId});
      const result = response.data || {};
      window.toast.success(`Zeit beendet: ${money(result.machineCents)} · ${Math.round((result.durationMs||0)/60000)} Minuten. Der Betrag ist als offen vorgemerkt.`);
      await open();
    } catch (error) { window.toast.error(error.message || 'Nutzung konnte nicht beendet werden.'); }
  }

  window.MachineTime = {open,start,stop};
})();
