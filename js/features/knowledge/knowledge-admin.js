// Admin-maintained local guides and links, shown alongside repository READMEs.
(() => {
  'use strict';
  let articles=[];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function checkAdmin() {
    const user=window.firebase?.auth?.().currentUser;
    if(!user) throw Error('Bitte anmelden.');
    if((await window.db.collection('users').doc(user.uid).get()).data()?.isAdmin!==true) throw Error('Nur Admins können Anleitungen pflegen.');
    return user;
  }
  function show() {
    window.showModal('<div class="modal-header"><h2>Technische Anleitungen</h2><button class="btn btn-secondary" onclick="closeModal()">Schließen</button></div><div class="modal-body">'+
      '<p>Pflege ergänzende, geprüfte Werkstatt-Anleitungen hier. GitHub-READMEs bleiben direkt verlinkt und werden nicht kopiert. Diese Inhalte erscheinen im Hilfe-Assistenten und sind für angemeldete Nutzer lesbar.</p>'+articles.map((a,i)=>'<article class="safety-card"><h3>'+esc(a.title)+'</h3><p>'+esc(a.machineName||'Allgemein')+'</p><button class="btn btn-secondary" onclick="KnowledgeAdmin.edit('+i+')">Bearbeiten</button></article>').join('')+
      '<button class="btn btn-primary" onclick="KnowledgeAdmin.edit(-1)">Anleitung hinzufügen</button></div>',{clearStack:true,pushToStack:false});
  }
  async function open() {
    try {await checkAdmin(); const s=await window.db.collection('knowledgeArticles').get();articles=s.docs.map(d=>({id:d.id,...d.data()}));show();}
    catch(e){window.toast.error(e.message);}
  }
  function edit(i=-1) {
    const a=articles[i]||{};
    window.showModal('<div class="modal-header"><h2>'+(a.id?'Anleitung bearbeiten':'Anleitung hinzufügen')+'</h2><button class="btn btn-secondary" onclick="KnowledgeAdmin.open()">Zurück</button></div><div class="modal-body"><label>Titel<input id="knowledgeTitle" class="form-input" maxlength="180" value="'+esc(a.title||'')+'"></label><label>Maschine / Bereich<input id="knowledgeMachine" class="form-input" maxlength="140" placeholder="z. B. Trotec Speedy 500" value="'+esc(a.machineName||'')+'"></label><label>Anleitung<textarea id="knowledgeBody" class="form-input" rows="12" maxlength="20000">'+esc(a.body||'')+'</textarea></label><label>Weiterführender Link (optional)<input id="knowledgeUrl" class="form-input" type="url" maxlength="1000" value="'+esc(a.url||'')+'"></label><button class="btn btn-primary" onclick="KnowledgeAdmin.save('+JSON.stringify(a.id||null)+')">Speichern</button>'+(a.id?'<button class="btn btn-danger" onclick="KnowledgeAdmin.remove('+JSON.stringify(a.id)+')">Entfernen</button>':'')+'</div>',{clearStack:true,pushToStack:false});
  }
  async function save(id) {
    try {const user=await checkAdmin(),title=document.getElementById('knowledgeTitle').value.trim(),body=document.getElementById('knowledgeBody').value.trim(),url=document.getElementById('knowledgeUrl').value.trim();
      if(!title||!body)throw Error('Titel und Anleitungstext sind erforderlich.'); if(url&&!/^https:\/\//i.test(url))throw Error('Links müssen mit https:// beginnen.');
      const data={title,body,machineName:document.getElementById('knowledgeMachine').value.trim(),url,updatedBy:user.uid,updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()};
      if(id)await window.db.collection('knowledgeArticles').doc(id).update(data);else await window.db.collection('knowledgeArticles').add({...data,createdBy:user.uid,createdAt:window.firebase.firestore.FieldValue.serverTimestamp()});
      window.toast.success('Anleitung gespeichert.');await open();
    }catch(e){window.toast.error(e.message);}
  }
  async function remove(id){try{await checkAdmin();await window.db.collection('knowledgeArticles').doc(id).delete();window.toast.success('Anleitung entfernt.');await open();}catch(e){window.toast.error(e.message);}}
  window.KnowledgeAdmin={open,edit,save,remove};
})();
