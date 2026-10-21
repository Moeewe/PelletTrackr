const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const context={window:{},document:{getElementById:()=>null},Intl};
vm.runInNewContext(fs.readFileSync('js/features/billing.js','utf8'),context);
const calculate=context.window.Billing.calculate;
const input={minutes:90,quantity:0.2,materialPrice:30,additiveQuantity:2,additivePrice:0.1,ownMaterial:false};
test('flat fee once per order plus workshop material, regardless of duration',()=>{
  const r=calculate({mode:'flat',rateCents:500,materialRule:'workshop'},input);
  assert.equal(r.machineCents,500);assert.equal(r.totalCents,1120);
  assert.equal(calculate({mode:'flat',rateCents:500,materialRule:'workshop'},{...input,minutes:0}).totalCents,1120);
});
test('student free machine, external hourly and laser per-minute without material',()=>{
  assert.equal(calculate({mode:'free',rateCents:0,materialRule:'workshop'},input).totalCents,620);
  assert.equal(calculate({mode:'hour',rateCents:3800,materialRule:'workshop'},input).totalCents,6320);
  assert.equal(calculate({mode:'minute',rateCents:50,materialRule:'none'},{...input,minutes:2.5}).totalCents,125);
});
test('own base material is free; separately selected workshop masterbatch remains billed',()=>{
  const r=calculate({mode:'flat',rateCents:500,materialRule:'workshop'},{...input,ownMaterial:true});
  assert.equal(r.materialCents,0);assert.equal(r.additiveCents,20);assert.equal(r.totalCents,520);
});
test('unconfigured legacy rates retain existing behavior',()=>{
  const t={mode:'legacy',rateCents:1800,materialRule:'workshop'};
  assert.equal(calculate(t,input).totalCents,620);
  assert.equal(calculate(t,{...input,ownMaterial:true}).totalCents,2700);
});
test('invalid values are rejected and rounding happens in cents',()=>{
  assert.throws(()=>calculate({mode:'hour',rateCents:-1,materialRule:'none'},input));
  assert.throws(()=>calculate({mode:'hour',rateCents:100,materialRule:'none'},{...input,minutes:-2}));
  assert.equal(calculate({mode:'hour',rateCents:100,materialRule:'none'},{...input,minutes:1}).totalCents,2);
});
