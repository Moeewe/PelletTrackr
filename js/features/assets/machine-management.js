// Admin catalogue for manufacturing assets. Equipment lending remains separate.
(() => {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const db = () => window.db.collection('machines');
  async function requireAdmin() {
    const user=window.firebase?.auth?.().currentUser;
    if(!user) throw Error('Bitte anmelden.');
    const profile=await window.db.collection('users').doc(user.uid).get();
    if(profile.data()?.isAdmin!==true) throw Error('Nur Admins können Produktionsmaschinen verwalten.');
    return user;
  }
  function modal(body, backAction) {
    window.showModal('<div class="modal-header"><h2>Produktionsmaschinen</h2>'+(backAction
      ? '<button class="btn btn-secondary" onclick="'+backAction+'">Zurück</button>'
      : '<button class="btn btn-secondary" onclick="closeModal()">Schließen</button>')+'</div><div class="modal-body">'+body+'</div>',{clearStack:true,pushToStack:false});
  }
  async function open() {
    try {
      await requireAdmin();
      const snap=await db().get();
      const rows=snap.docs.map(d=>({id:d.id,collection:'machines',...d.data()})).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'de'));
      window.machineManagerRows=rows;
      modal('<p>Hier legst du Laser, CNC-Fräsen, Roboter und weitere Fertigungsmaschinen an. Zu jeder Maschine gehören eine Anleitung und ein QR-Code. Drucker und Equipment verwaltest du in ihren eigenen Bereichen; alle Anleitungen findest du gesammelt unter „Maschinen &amp; Anleitungen“. Deaktivierte Maschinen bleiben für alte Aufträge und Unterweisungen erhalten.</p>'+
        '<button class="btn btn-primary" onclick="MachineManager.edit(-1)">Maschine hinzufügen</button>'+
        (rows.length ? '<div class="safety-grid">'+rows.map((m,i)=>'<article class="safety-card"><h3>'+esc(m.name)+'</h3><p>'+esc(window.machineKindLabel(m))+(m.model?' · '+esc(m.model):'')+' · '+(m.active===false?'Deaktiviert':'Aktiv')+'</p>'+
          '<p>'+(Array.isArray(m.guideSteps)&&m.guideSteps.length?'Anleitung: '+m.guideSteps.length+' Schritte':'Noch keine eigene Anleitung')+'</p>'+
          '<div class="safety-actions"><button class="btn btn-secondary" onclick="MachineManager.edit('+i+')">Bearbeiten</button>'+
          '<button class="btn btn-secondary" onclick="MachineManager.guide('+i+')">Anleitung</button>'+
          '<button class="btn btn-secondary" onclick="MachineManager.qr('+i+')">QR / Etikett</button></div></article>').join('')+'</div>'
        : '<p>Noch keine Produktionsmaschinen angelegt.</p>'));
    } catch(e) { window.toast.error(e.message); }
  }
  function guide(index) {
    const machine=window.machineManagerRows?.[index];
    if(!machine?.id) return window.toast.warning('Bitte speichere die Maschine zuerst.');
    window.KnowledgeAdmin.editGuide('machines',machine.id,'MachineManager.open()');
  }
  function edit(index=-1) {
    const m=window.machineManagerRows?.[index]||{};
    modal('<h3>'+(m.id?'Maschine bearbeiten':'Neue Produktionsmaschine')+'</h3><label>Name<input id="machineName" class="form-input" maxlength="140" placeholder="z. B. Weber DXR25 oder UR5" value="'+esc(m.name||'')+'"></label><label>Modell<input id="machineModel" class="form-input" maxlength="140" placeholder="Trotec Speedy 500 / Zünd CNC / UR5" value="'+esc(m.model||'')+'"></label><label>Maschinentyp<select id="machineJobType" class="form-select"><option value="laser" '+((m.machineType||m.category)==='laser'?'selected':'')+'>Laser</option><option value="cnc" '+((m.machineType||m.category)==='cnc'?'selected':'')+'>CNC-Fräse</option><option value="weber_dxr" '+((m.machineType||m.category)==='weber_dxr'?'selected':'')+'>Großroboter · Weber DXR25</option><option value="ur5" '+((m.machineType||m.category)==='ur5'?'selected':'')+'>Kleiner Roboterarm · Universal Robots UR5</option><option value="other" '+(!['laser','cnc','weber_dxr','ur5'].includes(m.machineType||m.category)?'selected':'')+'>Sonstige Maschine</option></select></label><label>Einweisungsart (optional)<input id="machineTraining" class="form-input" maxlength="160" placeholder="z. B. Laserschein · Trotec Speedy 500" value="'+esc(m.trainingTypeName||'')+'"></label><label>Status<select id="machineStatus" class="form-select"><option value="available" '+((m.status||'available')==='available'?'selected':'')+'>Verfügbar</option><option value="in_use" '+(m.status==='in_use'?'selected':'')+'>In Betrieb</option><option value="maintenance" '+(m.status==='maintenance'?'selected':'')+'>Wartung</option><option value="broken" '+(m.status==='broken'?'selected':'')+'>Defekt</option></select></label><label class="checkbox-label"><input id="machineActive" type="checkbox" '+(m.active!==false?'checked':'')+'> Aktiv und für neue Aufträge auswählbar</label><p>Nach dem Speichern kannst du im Bereich „Tarife &amp; Nutzergruppen“ Preise und Materialregeln pro Nutzergruppe festlegen.</p><button class="btn btn-primary" onclick="MachineManager.save('+(m.id?JSON.stringify(m.id):'null')+')">Speichern</button>',"MachineManager.open()");
  }
  function qr(index) {
    const machine=window.machineManagerRows?.[index];
    if(!machine?.id) return window.toast.warning('Bitte speichere die Maschine zuerst.');
    window.MachineLabels.open(['machines:'+machine.id]);
  }
  async function save(id) {
    try {
      const user=await requireAdmin(), name=document.getElementById('machineName').value.trim();
      if(!name) throw Error('Bitte einen Maschinennamen eingeben.');
      const type=document.getElementById('machineJobType').value;
      const jobTypes={laser:['Lasern'],cnc:['CNC-Fräsen'],weber_dxr:['Roboter','Weber DXR25'],ur5:['Roboter','Universal Robots UR5'],other:['Weitere Fertigung']}[type];
      const data={name,model:document.getElementById('machineModel').value.trim(),machineType:type,category:type,jobTypes,
        status:document.getElementById('machineStatus').value,
        trainingTypeName:document.getElementById('machineTraining').value.trim(),requiresSafetyTraining:Boolean(document.getElementById('machineTraining').value.trim()),
        active:document.getElementById('machineActive').checked,updatedBy:user.uid,updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()};
      if(id) await db().doc(id).update(data); else await db().add({...data,createdBy:user.uid,createdAt:window.firebase.firestore.FieldValue.serverTimestamp()});
      window.toast.success('Produktionsmaschine gespeichert.'); await open();
      window.loadPrinters?.();
    } catch(e) {window.toast.error(e.message);}
  }
  window.MachineManager={open,edit,save,qr,guide};
})();
