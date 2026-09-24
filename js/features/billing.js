// Shared pricing engine: preview and new entries use the same calculation.
(() => {
  'use strict';
  const groups = {standard:'Standard / nicht zugeordnet', students:'Studierende', staff:'Mitarbeitende', external:'Externe'};
  const modes = {legacy:'Bisherige Regel',free:'Keine Maschinenkosten',flat:'Pauschale pro Auftrag',minute:'Pro Minute',hour:'Pro Stunde'};
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const euro = n => new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n);
  const cents = n => Math.round(n*100 + 0.00000001);
  const number = v => { const n=Number(String(v || '0').replace(',','.')); if(!Number.isFinite(n)||n<0)throw Error('Bitte gültige, nicht negative Zahlen eingeben.'); return n; };
  const policyId = (collection,id) => collection+'__'+id;
  let machines=[], users=[], policies={}, selection=null, revision=0, previewSequence=0, saving=false;
  function calculate({mode,rateCents,materialRule}, {minutes,quantity,materialPrice,additiveQuantity,additivePrice,ownMaterial}) {
    if(!Object.hasOwn(modes,mode) || !['workshop','none'].includes(materialRule) || !Number.isSafeInteger(rateCents) || rateCents<0)throw Error('Ungültiger Tarif. Bitte die Verwaltung kontaktieren.');
    [minutes,quantity,materialPrice,additiveQuantity,additivePrice].forEach(number);
    const machine = mode==='flat' ? rateCents : mode==='free' ? 0 : Math.round(minutes*rateCents/(mode==='minute'?1:60));
    const material = materialRule==='none'||ownMaterial ? 0 : cents(quantity*materialPrice);
    const additive = materialRule==='none'||(mode==='legacy'&&ownMaterial) ? 0 : cents(additiveQuantity*additivePrice);
    const machineCents = mode==='legacy'&&!ownMaterial ? 0 : machine;
    return {machineCents,materialCents:material,additiveCents:additive,totalCents:machineCents+material+additive};
  }
  async function admin() {
    const uid=window.firebase.auth().currentUser?.uid;
    if(!uid || (await window.db.collection('users').doc(uid).get()).data()?.isAdmin!==true)throw Error('Bestätigte Adminrechte erforderlich.');
    return uid;
  }
  async function named(collection,name) {
    if(!name)return null;
    const result=await window.db.collection(collection).where('name','==',name).get();
    if(result.docs.length!==1)throw Error('Material fehlt oder ist nicht eindeutig: '+name);
    return {id:result.docs[0].id,...result.docs[0].data()};
  }
  async function quote() {
    const uid=window.firebase.auth().currentUser?.uid;
    if(!uid)throw Error('Bitte anmelden.');
    const profile=(await window.db.collection('users').doc(uid).get()).data();
    if(!profile)throw Error('Benutzerprofil fehlt.');
    const group=profile.billingGroup || 'standard';
    if(!Object.hasOwn(groups,group))throw Error('Unbekannte Abrechnungsgruppe. Bitte die Verwaltung kontaktieren.');
    const option=$('printer').selectedOptions[0];
    const selected=Boolean($('printer').value);
    const collection=option?.dataset.collection || 'printers';
    const id=selected?option?.dataset.machineId:'';
    if(selected&&!id)throw Error('Maschinenliste bitte neu laden.');
    const minutes=number($('printTime').value);
    const ownMaterial=$('ownMaterialUsed').checked;
    let machine=null,policy=null;
    if(selected) {
      const doc=await window.db.collection(collection).doc(id).get();
      if(!doc.exists)throw Error('Maschine nicht mehr vorhanden.');
      machine=doc.data();
      if(machine.active===false)throw Error('Diese Maschine ist nicht mehr für neue Aufträge freigegeben.');
      const p=await window.db.collection('billingPolicies').doc(policyId(collection,id)).get();
      policy=p.exists?p.data():null;
    }
    const tariff=policy ? (policy.rates[group] || policy.rates.standard) : {mode:'legacy',rateCents:cents(number(machine?.pricePerHour)),materialRule:'workshop'};
    if(selected&&['hour','minute','legacy'].includes(tariff.mode)&&minutes<=0)throw Error('Bitte die Nutzungszeit in Minuten angeben.');
    const chargeMaterial=tariff.materialRule!=='none';
    const material=chargeMaterial&&!ownMaterial?await named('materials',$('material').value):null;
    const additive=chargeMaterial&&!(tariff.mode==='legacy'&&ownMaterial)?await named('masterbatches',$('masterbatch').value):null;
    const input={minutes,quantity:material?number($('materialMenge').value):0,materialPrice:material?number(material.price):0,
      additiveQuantity:additive?number($('masterbatchMenge').value):0,additivePrice:additive?number(additive.price):0,ownMaterial};
    if(material&&input.quantity<=0 || additive&&input.additiveQuantity<=0)throw Error('Bitte eine Materialmenge größer als null angeben.');
    if(!selected&&!material&&!additive)throw Error('Bitte eine Maschine oder Material auswählen.');
    return {uid,profile,group,collection:selected?collection:'',id:id||'',machine,material,additive,input,tariff,
      policyRevision:policy?.revision||0,...calculate(tariff,input)};
  }
  async function preview() {
    const seq=++previewSequence;
    try {
      const q=await quote(); if(seq!==previewSequence)return;
      $('costPreview').textContent=euro(q.totalCents/100);
      $('costBreakdown').textContent=groups[q.group]+' · '+modes[q.tariff.mode]+': Maschine '+euro(q.machineCents/100)+' + Material '+euro((q.materialCents+q.additiveCents)/100)+'.';
    }catch(error){if(seq===previewSequence){$('costPreview').textContent='—';$('costBreakdown').textContent=error.message;}}
  }
  async function addEntry() {
    if(saving)return; saving=true;
    try {
      const q=await quote();
      const entry={name:q.profile.name||window.currentUser.name,kennung:q.profile.kennung||window.currentUser.kennung||q.uid,
        userId:q.uid,billingVersion:1,billingGroup:q.group,tariffSnapshot:q.tariff,policyRevision:q.policyRevision,
        machineCollection:q.collection,machineId:q.id,printer:q.machine?.name||'',machineName:q.machine?.name||'',operationType:q.machine?.jobTypes?.[0]||'3D-Druck',printTime:q.input.minutes,durationMinutes:q.input.minutes,
        printerPricePerHour:q.machine?.pricePerHour||0,printerCost:q.machineCents/100,
        material:q.material?.name||'',materialId:q.material?.id||'',materialMenge:q.input.quantity,materialPrice:q.input.materialPrice,materialCost:q.materialCents/100,
        masterbatch:q.additive?.name||'',masterbatchId:q.additive?.id||'',masterbatchMenge:q.input.additiveQuantity,masterbatchPrice:q.input.additivePrice,masterbatchCost:q.additiveCents/100,
        ownMaterialUsed:q.input.ownMaterial,totalCost:q.totalCents/100,machineCents:q.machineCents,materialCents:q.materialCents,additiveCents:q.additiveCents,totalCents:q.totalCents,
        jobName:$('jobName').value.trim()||'Maschinennutzung',jobNotes:$('jobNotes').value.trim(),timestamp:window.firebase.firestore.FieldValue.serverTimestamp(),paid:false};
      await window.db.collection('entries').add(entry);
      window.clearForm(); $('costBreakdown').textContent='Tarif wird nach Maschinen- und Materialauswahl angezeigt.';
      window.loadUserStats?.();window.loadUserEntries?.();
      window.toast.success('Auftrag gespeichert. Der angewendete Tarif bleibt im Auftrag erhalten.');
    }catch(error){window.toast.error(error.message);}finally{saving=false;}
  }
  function modal(body) {window.showModal('<div class="modal-header safety-header"><h2>Tarife & Nutzergruppen</h2><button class="btn btn-secondary" onclick="closeModal()">Schließen</button></div><div class="modal-body safety-manager">'+body+'</div>',{clearStack:true,pushToStack:false});}
  async function open() {
    try {
      await admin();
      const [p,e,m,u,r]=await Promise.all(['printers','equipment','machines','users','billingPolicies'].map(c=>window.db.collection(c).get()));
      machines=[...p.docs.map(d=>({...d.data(),id:d.id,collection:'printers'})),...e.docs.map(d=>({...d.data(),id:d.id,collection:'equipment'})),...m.docs.map(d=>({...d.data(),id:d.id,collection:'machines'}))];
      users=u.docs.map(d=>({...d.data(),id:d.id})); policies=Object.fromEntries(r.docs.map(d=>[d.id,d.data()]));
      modal('<p>Tarife gelten je Maschine und Nutzergruppe. Ohne neuen Tarif bleibt die bisherige Abrechnung bestehen. Eine Pauschale gilt pro Auftrag, Zeitpreise werden anteilig berechnet. Bestehende Aufträge bleiben unverändert.</p>'+
        '<h3>Maschinentarife</h3><div class="safety-grid">'+machines.map((m,i)=>'<article class="safety-card"><h4>'+esc(m.name)+'</h4><p>'+esc(m.jobTypes?.join(' · ')||(m.collection==='printers'?'3D-Druck':m.collection==='equipment'?'Equipment':'Maschine'))+' · '+(policies[policyId(m.collection,m.id)]?'Tarif hinterlegt':'Bisherige Regel')+'</p><button class="btn btn-secondary" onclick="Billing.edit('+i+')">Tarif bearbeiten</button></article>').join('')+'</div>'+('<button class="btn btn-secondary" onclick="MachineManager.open()">Produktionsmaschinen verwalten</button>')+
        '<h3>Nutzergruppen zuweisen</h3><p>Nutzer können ihre Abrechnungsgruppe nicht selbst ändern. Nicht zugeordnete Personen verwenden den Standardtarif.</p>'+
        '<label>Person<select id="billingUser" class="form-select" onchange="Billing.showGroup()">'+users.map((u,i)=>'<option value="'+i+'">'+esc(u.name||u.email||u.id)+'</option>').join('')+'</select></label>'+
        '<label>Abrechnungsgruppe<select id="billingGroup" class="form-select">'+Object.entries(groups).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></label><button class="btn btn-primary" onclick="Billing.saveGroup()">Gruppenzuordnung speichern</button>');
      showGroup();
    }catch(error){window.toast.error(error.message);}
  }
  function showGroup() {const u=users[Number($('billingUser').value)];$('billingGroup').value=u?.billingGroup||'standard';}
  async function saveGroup() {
    try {await admin();const u=users[Number($('billingUser').value)];if(!u)throw Error('Bitte eine Person auswählen.');
      await window.db.collection('users').doc(u.id).update({billingGroup:$('billingGroup').value});window.toast.success('Abrechnungsgruppe gespeichert.');await open();
    }catch(error){window.toast.error(error.message);}
  }
  function edit(index) {
    selection=machines[index];const policy=policies[policyId(selection.collection,selection.id)];revision=policy?.revision||0;
    modal('<h3>'+esc(selection.name)+'</h3><p>„Standard übernehmen“ gilt nur, wenn für die Gruppe kein eigener Tarif hinterlegt ist. Eigenes Material wird nicht berechnet; separat ausgewählter Werkstatt-Masterbatch wird bei neuen Tarifen zusätzlich berechnet. Für Laser „Kein Material berechnen“ wählen.</p>'+
      Object.entries(groups).map(([g,label])=>{
        const r=policy?.rates[g] || (g==='standard'?{mode:'legacy',rateCents:cents(number(selection.pricePerHour)),materialRule:'workshop'}:{mode:'inherit',rateCents:0,materialRule:'workshop'});
        return '<fieldset class="billing-rate"><legend>'+label+'</legend><label>Abrechnung<select id="mode-'+g+'" class="form-select">'+Object.entries(g==='standard'?modes:{inherit:'Standard übernehmen',...modes}).map(([k,v])=>'<option value="'+k+'" '+(k===r.mode?'selected':'')+'>'+v+'</option>').join('')+'</select></label>'+
          '<label>Betrag (€ je Auftrag / Minute / Stunde)<input id="rate-'+g+'" class="form-input" type="number" min="0" max="100000" step="0.01" value="'+r.rateCents/100+'"></label>'+
          '<label>Material<select id="material-'+g+'" class="form-select"><option value="workshop">Werkstattmaterial nach Menge berechnen</option><option value="none" '+(r.materialRule==='none'?'selected':'')+'>Kein Material berechnen</option></select></label></fieldset>';
      }).join('')+'<p>Bei „Keine Maschinenkosten“ wird der Betrag ignoriert. „Bisherige Regel“: Stundenkosten nur bei eigenem Material, sonst ausschließlich Materialkosten.</p><div class="safety-actions"><button class="btn btn-primary" onclick="Billing.savePolicy()">Tarife speichern</button><button class="btn btn-secondary" onclick="Billing.open()">Zurück</button></div>');
  }
  async function savePolicy() {
    try {
      const uid=await admin(),rates={};
      for(const g of Object.keys(groups)) {
        const mode=$('mode-'+g).value;if(mode==='inherit')continue;
        const amount=number($('rate-'+g).value);if(amount>100000||Math.abs(amount*100-Math.round(amount*100))>0.00001)throw Error('Beträge mit höchstens zwei Nachkommastellen eingeben.');
        rates[g]={mode,rateCents:mode==='free'?0:cents(amount),materialRule:$('material-'+g).value};
      }
      const ref=window.db.collection('billingPolicies').doc(policyId(selection.collection,selection.id));
      await window.db.runTransaction(async tx=>{
        const old=await tx.get(ref);if((old.data()?.revision||0)!==revision)throw Error('Tarif wurde inzwischen geändert. Bitte neu öffnen.');
        tx.set(ref,{machineCollection:selection.collection,machineId:selection.id,rates,revision:revision+1,updatedBy:uid,updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()});
      });
      window.toast.success('Tarife gespeichert. Sie gelten für neue Aufträge.');await open();
    }catch(error){window.toast.error(error.message);}
  }
  window.Billing={calculate,quote,preview,addEntry,open,edit,savePolicy,showGroup,saveGroup};
})();
