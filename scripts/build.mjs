import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const staging = mkdtempSync(join(root, '.build-staging-'));
for (const name of ['index.html','styles.css','favicon.svg','manifest.webmanifest','auth-action.html','ux-helpers.js','web-app-modular.js','js','styles','HTML','assets','data','_redirects']) {
  if (existsSync(join(root,name))) cpSync(join(root,name),join(staging,name),{recursive:true});
}
for (const name of ['impressum','datenschutz']) {
  const html=readFileSync(join(root,'HTML',name+'.html'),'utf8').replace('href="../styles.css"','href="styles.css"');
  writeFileSync(join(staging,name+'.html'),html);
}
// Inline the @import chain of styles.css into one file: one request instead of 16 sequential ones.
const cssPath=join(staging,'styles.css');
if (existsSync(cssPath)) {
  const css=readFileSync(cssPath,'utf8').replace(/@import url\(['"]\.\/([^'"]+)['"]\);?/g,(m,file)=>{
    const f=join(root,file);
    return existsSync(f)?readFileSync(f,'utf8'):m;
  });
  writeFileSync(cssPath,css);
}
// Preserve the previous build instead of deleting it; never touch source files.
if (existsSync(join(root,'dist'))) {
  mkdirSync(join(root,'.build-backups'),{recursive:true});
  renameSync(join(root,'dist'),join(root,'.build-backups',String(Date.now())));
}
renameSync(staging,join(root,'dist'));
console.log('Build bereit: dist/ (vorheriger Build in .build-backups gesichert)');
