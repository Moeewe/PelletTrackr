const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
test('user overview stays compact, escapes names and does not fabricate missing identifiers',()=>{
 const table={innerHTML:''};const context={window:{},document:{getElementById:()=>table},console};
 vm.createContext(context);vm.runInContext(fs.readFileSync('js/features/users/user-management.js','utf8'),context);
 context.renderUsersTable([{name:'<img src=x>',email:'test@example.invalid',entries:[],unpaidAmount:0}]);
 assert.match(table.innerHTML,/managed-user-overview/);assert.match(table.innerHTML,/<details/);
 assert.match(table.innerHTML,/Nicht zugeordnet/);assert.match(table.innerHTML,/&lt;img/);
 assert.doesNotMatch(table.innerHTML,/<table|undefined|<img/);
});
test('search and sorting are applied together, including after reopening',()=>{
 const table={innerHTML:''};const elements={usersTable:table,userManagerSearchInput:{value:'Sam'},userManagerSortSelect:{value:'name-desc'}};
 const context={window:{allUsers:[{name:'Sam A',kennung:'a'},{name:'Sam Z',kennung:'z'},{name:'Alex',kennung:'x'}]},document:{getElementById:id=>elements[id]},console};
 vm.createContext(context);vm.runInContext(fs.readFileSync('js/features/users/user-management.js','utf8'),context);
 context.searchUsers();assert.doesNotMatch(table.innerHTML,/Alex/);assert.ok(table.innerHTML.indexOf('Sam Z')<table.innerHTML.indexOf('Sam A'));
 context.sortUsers();assert.match(table.innerHTML,/2 Personen/);
});
