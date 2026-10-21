// Integration test against the local demo emulator only. No production credentials.
const assert = require('node:assert/strict');
const host=process.env.FIRESTORE_EMULATOR_HOST;
if (!host || !/^(127\.0\.0\.1|localhost):/.test(host)) throw new Error('Local emulator required');
const prefix='projects/demo-pellettrackr/databases/(default)/documents';
const base='http://'+host+'/v1/'+prefix;
const token=uid=>[Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url'),
  Buffer.from(JSON.stringify({sub:uid,user_id:uid,aud:'demo-pellettrackr',iss:'https://securetoken.google.com/demo-pellettrackr',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,firebase:{sign_in_provider:'password'}})).toString('base64url'),''].join('.');
function value(v) {
  if(v===null)return {nullValue:null};
  if(typeof v==='boolean')return {booleanValue:v};
  if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};
  if(v?.timestamp)return {timestampValue:v.timestamp};
  if(typeof v==='object')return {mapValue:{fields:fields(v)}};
  return {stringValue:v};
}
const fields=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,value(v)]));
async function request(path,who,method='GET',body) {
  const r=await fetch(base+path,{method,headers:{Authorization:'Bearer '+(who==='owner'?'owner':token(who)),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  return {status:r.status,body:await r.json()};
}
async function put(path,who,obj){return request('/'+path,who,'PATCH',{fields:fields(obj)});}
const allow=r=>assert.ok(r.status<300,JSON.stringify(r));
const deny=r=>assert.equal(r.status,403,JSON.stringify(r));
function fromFields(raw) {
  return Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,
    v.stringValue ?? (v.integerValue!==undefined?Number(v.integerValue):v.doubleValue!==undefined?v.doubleValue:v.booleanValue!==undefined?v.booleanValue:v.timestampValue?{timestamp:v.timestampValue}:v.mapValue?fromFields(v.mapValue.fields):null)]));
}
async function writeTraining(before,after,action,who='admin') {
  const record={update:{name:prefix+'/safetyTrainings/t',fields:fields(after)},updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]};
  if(!before)record.updateTransforms.push({fieldPath:'createdAt',setToServerValue:'REQUEST_TIME'});
  const event={userId:after.userId,revision:after.revision,action,by:who,byName:'Test',before,after};
  const history={update:{name:prefix+'/safetyTrainings/t/history/'+after.revision,fields:fields(event)},
    updateTransforms:[{fieldPath:'at',setToServerValue:'REQUEST_TIME'},{fieldPath:'after.updatedAt',setToServerValue:'REQUEST_TIME'}]};
  if(!before)history.updateTransforms.push({fieldPath:'after.createdAt',setToServerValue:'REQUEST_TIME'});
  return request(':commit',who,'POST',{writes:[record,history]});
}
(async()=>{
  allow(await put('users/admin','owner',{isAdmin:true}));
  allow(await put('users/alice','owner',{isAdmin:false}));
  allow(await put('users/bob','owner',{isAdmin:false}));
  allow(await put('printers/m','owner',{name:'Printer'}));
  deny(await put('users/alice','alice',{isAdmin:true}));
  deny(await put('users/mallory','mallory',{isAdmin:true}));
  const initial={userId:'alice',machineId:'m',machineCollection:'printers',machineName:'Printer',status:'active',trainingDate:'2025-03-01',instructor:'Trainer',note:'',revision:1,updatedBy:'admin',createdBy:'admin'};
  deny(await put('safetyTrainings/t','alice',initial));
  deny(await put('safetyTrainings/t','admin',initial)); // no atomic history
  deny(await writeTraining(null,{...initial,createdBy:'alice',updatedBy:'alice'},'create','alice'));
  allow(await writeTraining(null,initial,'create'));
  const own=await request('/safetyTrainings/t','alice');
  allow(own); deny(await request('/safetyTrainings/t','bob'));
  allow(await request('/safetyTrainings/t/history/1','alice'));
  deny(await request('/safetyTrainings/t/history/1','bob'));
  deny(await request('/safetyTrainings/t/history/1','admin','DELETE'));
  const before=fromFields(own.body.fields);
  allow(await writeTraining(before,{...before,status:'revoked',revision:2},'revoke'));
  const revoked=fromFields((await request('/safetyTrainings/t','alice')).body.fields);
  deny(await writeTraining(revoked,{...revoked,status:'active',revision:3,updatedBy:'alice'},'renew','alice'));
  assert.equal((await request('/safetyTrainings/t','alice')).body.fields.status.stringValue,'revoked');
  deny(await request('/safetyTrainings/t','admin','DELETE'));
  deny(await put('safetyTrainingTypes/laser','alice',{name:'Laser'}));
  allow(await put('safetyTrainingTypes/laser','admin',{name:'Laserschein'}));
  // Billing: group and prices cannot be selected or forged by the customer.
  deny(await put('users/alice','alice',{isAdmin:false,billingGroup:'students'}));
  deny(await put('users/new-user','new-user',{isAdmin:false,billingGroup:'students'}));
  allow(await put('users/alice','admin',{isAdmin:false,billingGroup:'external'}));
  const rate={mode:'hour',rateCents:3800,materialRule:'workshop'};
  const free={mode:'free',rateCents:0,materialRule:'workshop'};
  const policy={machineCollection:'printers',machineId:'m',rates:{standard:free,students:free,external:rate},revision:1,updatedBy:'admin'};
  const timedWrite=(path,who,data,field)=>request(':commit',who,'POST',{writes:[{update:{name:prefix+'/'+path,fields:fields(data)},updateTransforms:[{fieldPath:field,setToServerValue:'REQUEST_TIME'}]}]});
  deny(await timedWrite('billingPolicies/printers__m','alice',{...policy,updatedBy:'alice'},'updatedAt'));
  allow(await timedWrite('billingPolicies/printers__m','admin',policy,'updatedAt'));
  allow(await put('materials/pla','owner',{name:'PLA',price:30}));
  const billed={billingVersion:1,userId:'alice',billingGroup:'external',tariffSnapshot:rate,policyRevision:1,machineCollection:'printers',machineId:'m',
    printTime:90,ownMaterialUsed:false,materialId:'pla',materialMenge:0.2,materialPrice:30,masterbatchId:'',masterbatchMenge:0,masterbatchPrice:0,
    machineCents:5700,materialCents:600,additiveCents:0,totalCents:6300,printerCost:57,materialCost:6,masterbatchCost:0,totalCost:63,paid:false};
  allow(await timedWrite('entries/billed','alice',billed,'timestamp'));
  deny(await timedWrite('entries/forged-group','alice',{...billed,billingGroup:'students',tariffSnapshot:free,machineCents:0,totalCents:600,printerCost:0,totalCost:6},'timestamp'));
  deny(await timedWrite('entries/forged-price','alice',{...billed,totalCost:1},'timestamp'));
  deny(await timedWrite('entries/legacy-bypass','alice',{totalCost:0},'timestamp'));
  deny(await timedWrite('entries/stale-rate','alice',{...billed,policyRevision:0},'timestamp'));
  // An admin tariff edit does not mutate historical entries.
  allow(await timedWrite('billingPolicies/printers__m','admin',{...policy,revision:2,rates:{standard:free,external:{...rate,rateCents:4000}}},'updatedAt'));
  assert.equal((await request('/entries/billed','alice')).body.fields.totalCost.integerValue,'63');
  const flat={mode:'flat',rateCents:500,materialRule:'workshop'};
  allow(await timedWrite('billingPolicies/printers__m','admin',{...policy,revision:3,rates:{standard:flat}},'updatedAt'));
  allow(await timedWrite('entries/flat','alice',{...billed,tariffSnapshot:flat,policyRevision:3,printTime:0,machineCents:500,totalCents:1100,printerCost:5,totalCost:11},'timestamp'));
  allow(await put('masterbatches/color','owner',{price:0.1}));
  allow(await timedWrite('entries/own-material','alice',{...billed,tariffSnapshot:flat,policyRevision:3,ownMaterialUsed:true,
    materialId:'',materialMenge:0,materialPrice:0,materialCents:0,materialCost:0,masterbatchId:'color',masterbatchMenge:2,masterbatchPrice:0.1,
    additiveCents:20,masterbatchCost:0.2,machineCents:500,printerCost:5,totalCents:520,totalCost:5.2},'timestamp'));
  const minute={mode:'minute',rateCents:50,materialRule:'none'};
  allow(await timedWrite('billingPolicies/printers__m','admin',{...policy,revision:4,rates:{standard:minute}},'updatedAt'));
  allow(await timedWrite('entries/minutes','alice',{...billed,tariffSnapshot:minute,policyRevision:4,printTime:2.5,
    materialId:'',materialMenge:0,materialPrice:0,materialCents:0,materialCost:0,machineCents:125,printerCost:1.25,totalCents:125,totalCost:1.25},'timestamp'));
  // Eigene offene Aufträge: Job-Name/Notiz ja, Preise und fremde Aufträge nein.
  allow(await put('entries/own-open','owner',{userId:'alice',paid:false,jobName:'Alt',jobNotes:'',totalCost:5}));
  const patch=(path,who,data,mask)=>request('/'+path+'?'+mask.map(f=>'updateMask.fieldPaths='+f).join('&'),who,'PATCH',{fields:fields(data)});
  allow(await patch('entries/own-open','alice',{jobName:'Neu',jobNotes:'Notiz'},['jobName','jobNotes']));
  deny(await patch('entries/own-open','alice',{totalCost:0},['totalCost']));
  deny(await patch('entries/own-open','alice',{jobName:''},['jobName']));
  deny(await patch('entries/own-open','bob',{jobName:'Fremd'},['jobName']));
  allow(await put('entries/own-paid','owner',{userId:'alice',paid:true,jobName:'Alt',jobNotes:'',totalCost:5}));
  deny(await patch('entries/own-paid','alice',{jobName:'Neu'},['jobName']));
  allow(await patch('entries/own-open','admin',{totalCost:6},['totalCost']));
  // Druckerstatus: Nutzer dürfen nur den Status melden.
  allow(await put('printers/p1','owner',{name:'P1',status:'available'}));
  allow(await patch('printers/p1','alice',{status:'broken'},['status']));
  deny(await patch('printers/p1','alice',{status:'kaputt'},['status']));
  deny(await patch('printers/p1','alice',{name:'Umbenannt'},['name']));
  // Produktionsmaschinen: Status meldbar, Stammdaten nur für Admins.
  allow(await put('machines/laser1','owner',{name:'Laser',status:'available',active:true}));
  allow(await patch('machines/laser1','alice',{status:'broken'},['status']));
  deny(await patch('machines/laser1','alice',{active:false},['active']));
  deny(await patch('machines/laser1','alice',{materialTypes:['pellet']},['materialTypes']));
  allow(await patch('machines/laser1','admin',{materialTypes:['pellet'],supportsMasterbatch:false},['materialTypes','supportsMasterbatch']));
  // Equipment-Anfragen ('requests') nur für Admins.
  deny(await request('/requests','alice'));
  allow(await request('/requests','admin'));
  // Tutorial-Vorschläge: nur https-Links, nur als "pending", nur im eigenen Namen.
  const suggestion={machineCollection:'printers',machineId:'p1',machineName:'P1',kind:'tutorial',title:'Video',url:'https://youtube.com/watch?v=x',note:'',userId:'alice',userName:'Alice',status:'pending'};
  allow(await timedWrite('tutorialSuggestions/s1','alice',suggestion,'createdAt'));
  deny(await timedWrite('tutorialSuggestions/s2','alice',{...suggestion,url:'http://unsicher.de/x'},'createdAt'));
  deny(await timedWrite('tutorialSuggestions/s3','alice',{...suggestion,userId:'bob'},'createdAt'));
  deny(await timedWrite('tutorialSuggestions/s4','alice',{...suggestion,status:'approved'},'createdAt'));
  deny(await timedWrite('tutorialSuggestions/s5','alice',{...suggestion,extra:'x'},'createdAt'));
  allow(await timedWrite('tutorialSuggestions/s6','alice',{...suggestion,kind:'safety'},'createdAt'));
  deny(await timedWrite('tutorialSuggestions/s7','alice',{...suggestion,kind:'egal'},'createdAt'));
  // Wartungsverlauf: nur Admins, nur anhängen.
  const log={machineCollection:'machines',machineId:'laser1',machineName:'Laser',type:'Reinigung',description:'Linse gereinigt',createdBy:'admin'};
  deny(await timedWrite('maintenanceLogs/l1','alice',{...log,createdBy:'alice'},'createdAt'));
  allow(await timedWrite('maintenanceLogs/l1','admin',log,'createdAt'));
  deny(await timedWrite('maintenanceLogs/l2','admin',{...log,description:''},'createdAt'));
  deny(await timedWrite('maintenanceLogs/l3','admin',{...log,type:'Egal'},'createdAt'));
  deny(await request('/maintenanceLogs/l1','alice'));
  allow(await request('/maintenanceLogs/l1','admin'));
  deny(await patch('maintenanceLogs/l1','admin',{description:'geändert'},['description']));
  deny(await request('/maintenanceLogs/l1','admin','DELETE'));
  allow(await request('/tutorialSuggestions/s1','alice'));
  deny(await request('/tutorialSuggestions/s1','bob'));
  allow(await request('/tutorialSuggestions/s1','admin'));
  deny(await patch('tutorialSuggestions/s1','alice',{status:'approved'},['status']));
  allow(await patch('tutorialSuggestions/s1','admin',{status:'approved'},['status']));
  console.log('Entry edit, printer status and admin-only requests passed.');
  console.log('Billing integration: admin-only tariffs/groups, verified amount and immutable historical snapshot passed.');
  console.log('Firestore integration: ownership, admin escalation, atomic history and deletion protection passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
