const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const {webcrypto} = require('node:crypto');
function harness() {
  const data = new Map();
  const elements = {userSafetyTrainingList:{innerHTML:'',textContent:''}};
  let admin = true;
  const ref = path => ({path, doc:id=>ref(path+'/'+id), collection:name=>ref(path+'/'+name),
    get:async()=>path === 'users/admin' ? {exists:true,data:()=>({isAdmin:admin})} : {exists:data.has(path),data:()=>data.get(path)}});
  const window = {__SAFETY_TEST__:true, currentUser:{uid:'admin',name:'Test Admin'},
    firebase:{auth:()=>({currentUser:{uid:'admin'}}),firestore:{FieldValue:{serverTimestamp:()=> 'SERVER_TIME'}}},
    db:{collection:name=>ref(name),runTransaction:async callback=>{
      const writes=[];
      await callback({get:r=>r.get(),set:(r,d)=>writes.push([r.path,d])});
      for (const [p,d] of writes) data.set(p,d);
    }}};
  vm.runInNewContext(fs.readFileSync('js/features/safety/safety-training-management.js','utf8'),{window,document:{getElementById:id=>elements[id]},TextEncoder,crypto:webcrypto,console});
  return {window,h:window.__safetyTest,data,ref,elements,setAdmin:value=>{admin=value;}};
}
test('invalid dates and future dates are rejected',()=>{
  const {h}=harness();
  assert.equal(h.validDate('2025-02-30'),false);
  assert.equal(h.validDate('2099-01-01'),false);
  assert.equal(h.validDate('2024-02-29'),true);
});
test('same names and IDs in different collections never share a qualification',async()=>{
  const {h}=harness();
  assert.notEqual(h.key({collection:'printers',id:'same'}),h.key({collection:'equipment',id:'same'}));
  assert.equal(h.recordKey({equipmentName:'Ginger',equipmentId:'ginger'}),null);
  assert.notEqual(await h.documentId('a','printers:x'),await h.documentId('b','printers:x'));
  assert.equal(await h.documentId('a','printers:x'),await h.documentId('a','printers:x'));
});
test('create, revoke and renew preserve prior states with actor and date',async()=>{
  const {h,data,ref}=harness();
  const r=ref('safetyTrainings/test');
  await h.change(r,{userId:'u',status:'active',trainingDate:'2025-01-20',instructor:'Trainer'},0,'create');
  await h.change(r,{status:'revoked'},1,'revoke');
  await h.change(r,{status:'active',trainingDate:'2025-06-20',revokedAt:null,revokedBy:null},2,'renew');
  assert.equal(data.get(r.path).revision,3);
  assert.equal(data.get(r.path+'/history/2').after.status,'revoked');
  assert.equal(data.get(r.path+'/history/3').before.revokedBy,'admin');
  assert.equal(data.get(r.path+'/history/1').after.trainingDate,'2025-01-20');
});
test('stale edits and a second create cannot overwrite a record',async()=>{
  const {h,data,ref}=harness(),r=ref('safetyTrainings/test');
  await h.change(r,{userId:'u',status:'active'},0,'create');
  await assert.rejects(h.change(r,{status:'revoked'},0,'revoke'),/inzwischen/);
  assert.equal(data.get(r.path).status,'active');
  assert.equal(data.size,2);
});
test('admin flag in local session alone never authorizes a write',async()=>{
  const {h,data,ref,setAdmin,window}=harness();
  setAdmin(false); window.currentUser.isAdmin=true;
  await assert.rejects(h.change(ref('safetyTrainings/test'),{},0,'create'),/Adminrechte/);
  assert.equal(data.size,0);
});
test('own overview preserves removed machines and escapes untrusted names',()=>{
  const {h,elements}=harness();
  h.state.own=[{userId:'u',machineId:'gone',machineCollection:'printers',machineName:'<img onerror=alert(1)>',status:'revoked',trainingDate:'2025-01-20'}];
  h.renderOwn();
  assert.match(elements.userSafetyTrainingList.innerHTML,/Maschine wurde entfernt/);
  assert.match(elements.userSafetyTrainingList.innerHTML,/&lt;img/);
  assert.doesNotMatch(elements.userSafetyTrainingList.innerHTML,/<img/);
});
test('a shared training group covers every machine of the group, but nothing else',()=>{
  const {h}=harness();
  const laser1={collection:'machines',id:'l1',trainingGroup:'Laserschein'};
  const laser2={collection:'machines',id:'l2',trainingGroup:'Laserschein'};
  const cnc={collection:'machines',id:'c1',trainingGroup:'CNC'};
  const plain={collection:'machines',id:'p1'};
  h.state.machines=[laser1,laser2,cnc,plain];
  const record={machineCollection:'machines',machineId:'l1',trainingGroup:'Laserschein',status:'active'};
  assert.equal(h.covers(record,laser1),true);
  assert.equal(h.covers(record,laser2),true,'second laser is covered by the shared group');
  assert.equal(h.covers(record,cnc),false);
  assert.equal(h.covers(record,plain),false);
  // older records without a stored group use the group of the machine they were issued for
  const legacy={machineCollection:'machines',machineId:'l1',status:'active'};
  assert.equal(h.covers(legacy,laser2),true);
  assert.equal(h.covers(legacy,cnc),false);
});
