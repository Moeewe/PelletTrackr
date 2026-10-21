// Erzeugt data/larger-slicer.json aus einem lokalen Klon des Repos LARGER.slicer.
// Aufruf:  node scripts/build-knowledge.mjs "/Pfad/zu/LARGER.slicer"
// Die Hilfe in der App nutzt diese Datei für Dokumentenlisten, Inhaltsverzeichnisse, Suche und Fehlerhilfe –
// ohne zur Laufzeit GitHub abzufragen. Nach Änderungen an den Anleitungen das Skript erneut ausführen.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoDir = process.argv[2];
if (!repoDir || !existsSync(join(repoDir, 'README.md'))) {
  console.error('Bitte den Pfad zum LARGER.slicer-Ordner angeben.');
  process.exit(1);
}
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO = 'Moeewe/LARGER.slicer';
const WEBER = 'EXAMPLE FILES/00 - WEBER : GINGER [Robotic] 3D Printing/00 - WEBER - DXR25 - README/';
const DOCS = [
  { id: 'weber-de', machines: ['weber'], kind: 'Bedienanleitung', lang: 'de', path: WEBER + 'README Weber DXR25 PRINTER QUICK START GUIDE GERMAN.md' },
  { id: 'weber-en', machines: ['weber'], kind: 'Bedienanleitung', lang: 'en', path: WEBER + 'README Weber DXR25 PRINTER QUICK START GUIDE ENGLISH.md' },
  { id: 'kuka-de', machines: ['weber'], kind: 'Fehlerbehebung', lang: 'de', path: 'LARGERslicer/documentations/KUKA_ROBOT_TROUBLESHOOTING_DE.md' },
  { id: 'kuka-en', machines: ['weber'], kind: 'Fehlerbehebung', lang: 'en', path: 'LARGERslicer/documentations/KUKA_ROBOT_TROUBLESHOOTING.md' },
  { id: 'dxr-go', machines: ['weber', 'ginger'], kind: 'Checkliste', lang: 'de', path: 'LARGERslicer/documentations/SCHALTSCHRANK_ZETTEL_DXR_GOCHECK_DE.md' },
  { id: 'dxr-nogo', machines: ['weber', 'ginger'], kind: 'Checkliste', lang: 'de', path: 'LARGERslicer/documentations/SCHALTSCHRANK_ZETTEL_NOGO_HILFE_DE.md' },
  { id: 'ginger', machines: ['ginger'], kind: 'Bedienanleitung', lang: 'en', path: 'EXAMPLE FILES/00 - WEBER : GINGER [Robotic] 3D Printing/00 - GINGER - ONE - README/README GINGER 00 QUICK START GUIDE.md' },
  { id: 'ur5', machines: ['ur5'], kind: 'Bedienanleitung', lang: 'en', path: 'EXAMPLE FILES/00 - UNIVERSAL ROBOTS - UR5/README UR5 00 QUICK START GUIDE.md' },
  { id: 'zuend', machines: ['zuend'], kind: 'Bedienanleitung', lang: 'en', path: 'EXAMPLE FILES/00 - ZUENDT - 3D CNC MILLING/README Zünd G3 L-2500 CNC MILLING QUICK START GUIDE.md' },
  { id: 'cnc-program', machines: ['zuend'], kind: 'Referenz', lang: 'en', path: 'LARGERslicer/documentations/CNC_PROGRAM_README.md' },
  { id: 'hpgl', machines: ['zuend'], kind: 'Referenz', lang: 'en', path: 'LARGERslicer/documentations/HPGL_XX_COMMANDS.md' },
  { id: 'overview', machines: ['all'], kind: 'Überblick', lang: 'en', path: 'README.md' },
  { id: 'docs-index', machines: ['all'], kind: 'Überblick', lang: 'en', path: 'LARGERslicer/documentations/README.md' }
];

const slug = text => text.toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
const clean = text => String(text)
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  .replace(/\[([^\]]+)\]\((?:<[^>]*>|[^)]*)\)/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/[`*_>#]/g, '')
  .replace(/\s+/g, ' ').trim();
const cells = line => line.trim().replace(/^\||\|$/g, '').split('|').map(c => clean(c));

function parse(markdown) {
  const sections = [];
  const toc = [];
  const faq = [];
  const counts = new Map();
  let current = { title: '', anchor: '', level: 1, lines: [] };
  let inCode = false;
  let tableHeader = null;
  const push = () => { if (current.lines.length || current.title) sections.push(current); };
  for (const raw of markdown.split('\n')) {
    if (/^\s*```/.test(raw)) { inCode = !inCode; continue; }
    if (inCode) continue;
    const heading = /^(#{1,4})\s+(.*)$/.exec(raw);
    if (heading) {
      push();
      const title = clean(heading[2]);
      let anchor = slug(title);
      const seen = counts.get(anchor) || 0; counts.set(anchor, seen + 1);
      if (seen) anchor += '-' + seen;
      current = { title, anchor, level: heading[1].length, lines: [] };
      if (heading[1].length === 2) toc.push({ title, anchor });
      tableHeader = null;
      continue;
    }
    if (/^\s*\|/.test(raw)) {
      if (/^\s*\|[\s:|-]+\|\s*$/.test(raw)) continue;
      const row = cells(raw);
      if (!tableHeader) { tableHeader = row; continue; }
      const first = (tableHeader[0] || '').toLowerCase();
      if (/(problem|symptom|fehler|issue)/.test(first) && row.length >= 2 && row[0] && row[1]) faq.push({ question: row[0], answer: row[1], anchor: current.anchor });
      current.lines.push(row.filter(Boolean).join(' – '));
      continue;
    }
    tableHeader = null;
    const text = clean(raw);
    if (text) current.lines.push(text);
  }
  push();
  return {
    toc,
    faq,
    sections: sections.map(s => ({ title: s.title, anchor: s.anchor, text: s.lines.join(' ').slice(0, 1400) })).filter(s => s.text.length > 40)
  };
}

let commit = '';
try { commit = execSync('git rev-parse --short HEAD', { cwd: repoDir }).toString().trim(); } catch (_) { /* kein Git */ }

const docs = [];
const faq = [];
for (const doc of DOCS) {
  const file = join(repoDir, doc.path);
  if (!existsSync(file)) { console.warn('Fehlt:', doc.path); continue; }
  const markdown = readFileSync(file, 'utf8');
  const title = clean((/^#\s+(.*)$/m.exec(markdown) || [, doc.id])[1]);
  const parsed = parse(markdown);
  const url = `https://github.com/${REPO}/blob/main/${doc.path.split('/').map(encodeURIComponent).join('/')}`;
  docs.push({ id: doc.id, title, machines: doc.machines, kind: doc.kind, lang: doc.lang, url, toc: parsed.toc, sections: parsed.sections });
  parsed.faq.slice(0, 60).forEach(item => faq.push({ ...item, docId: doc.id, machines: doc.machines }));
}

mkdirSync(join(root, 'data'), { recursive: true });
const out = { source: { repo: REPO, branch: 'main', commit, generatedAt: new Date().toISOString().slice(0, 10) }, docs, faq };
writeFileSync(join(root, 'data/larger-slicer.json'), JSON.stringify(out));
console.log(`${docs.length} Dokumente, ${docs.reduce((n, d) => n + d.sections.length, 0)} Abschnitte, ${faq.length} Fehlerhilfen → data/larger-slicer.json (${Math.round(JSON.stringify(out).length / 1024)} KB)`);
