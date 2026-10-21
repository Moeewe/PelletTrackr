const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup() {
  const elements = {};
  for (const name of ['user','admin']) {
    elements[name+'SearchInput'] = {value:''};
    elements[name+'SortSelect'] = {value:'date-desc'};
    elements[name+'EntriesTable'] = {innerHTML:'',classList:{toggle(cls,on){ this[cls]=on; }}};
  }
  const context = {window:{}, document:{getElementById:id=>elements[id]}, console};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/features/entries/entry-rendering.js','utf8'),context);
  return {context,elements};
}
test('user and admin empty lists have a styled, explanatory status instead of a bare paragraph',()=>{
  const {context,elements}=setup();
  context.renderUserEntries([]); context.renderAdminEntries([]);
  for (const name of ['user','admin']) {
    assert.equal(elements[name+'EntriesTable'].classList['is-empty'],true);
    assert.match(elements[name+'EntriesTable'].innerHTML,/class="entry-empty-state" role="status"/);
    assert.match(elements[name+'EntriesTable'].innerHTML,/<h3>Noch keine Aufträge vorhanden<\/h3>/);
  }
});
test('filtered empty results explain search and filters without echoing search markup',()=>{
  const {context,elements}=setup();
  elements.userSearchInput.value='<img src=x>';
  elements.adminSortSelect.value='status-paid';
  context.renderUserEntries([]); context.renderAdminEntries([]);
  for (const name of ['user','admin']) {
    assert.match(elements[name+'EntriesTable'].innerHTML,/Keine passenden Aufträge gefunden/);
    assert.doesNotMatch(elements[name+'EntriesTable'].innerHTML,/<img/);
  }
});
