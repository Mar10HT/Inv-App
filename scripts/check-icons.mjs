// Fails when a component draws an icon that src/app/shared/icons.ts does not register.
// lucide-angular throws when an icon is missing, and the pages that use the rare ones (behind a
// permission, in an empty or an error state) are not rendered by a test, so it only showed at run time.
//
// Three things are checked, all from literal names (a name built from a variable cannot be resolved):
//   1. the icons named in a template: <lucide-icon name="X">, [name]="a ? 'X' : 'Y'", icon="X", icon: 'X'
//   2. the same names in kebab-case (lucide-angular turns "file-question" into FileQuestion)
//   3. any quoted PascalCase string in the code that is the name of a real lucide icon, which catches the
//      maps that feed a bound name, like { RESTORE: 'RotateCcw' }
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'src/app');
const iconsFile = join(src, 'shared/icons.ts');
const lucideList = join(root, 'node_modules/lucide-angular/icons/lucide-icons.d.ts');

const sourceFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts') && path !== iconsFile ? [path] : [];
  });

// The keys of the APP_ICONS map, and nothing else: a capitalised word in a comment is not a registered icon
const registry = readFileSync(iconsFile, 'utf8');
const body = registry.slice(registry.indexOf('export const APP_ICONS'));
const registered = new Set([...body.matchAll(/^\s+([A-Z][A-Za-z0-9]*),?\s*$/gm)].map((m) => m[1]));

const pascal = (kebab) => kebab.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
const icon = String.raw`[A-Z][A-Za-z0-9]*`;

// Names of the icons lucide has, for the third check. Without node_modules that check is skipped, loudly.
const lucide = existsSync(lucideList)
  ? new Set([...readFileSync(lucideList, 'utf8').matchAll(/export \{ default as (\w+) \}/g)].map((m) => m[1]))
  : null;
if (!lucide) console.warn('icons check: node_modules/lucide-angular not found, skipping the check of quoted icon names');

const used = new Map(); // icon name -> files that draw it
const add = (name, file) => used.set(name, (used.get(name) ?? new Set()).add(relative(src, file).replace(/\\/g, '/')));

for (const file of sourceFiles(src)) {
  const text = readFileSync(file, 'utf8');
  // <lucide-icon name="X">, <app-empty-state icon="X">, <app-stat-card icon="X">
  for (const m of text.matchAll(new RegExp(String.raw`<(?:lucide-icon|app-empty-state|app-stat-card)[^>]*?\s(?:icon|name)="(${icon})"`, 'g'))) add(m[1], file);
  // <lucide-icon name="kebab-case">
  for (const m of text.matchAll(/<lucide-icon[^>]*?\sname="([a-z][a-z0-9]*(?:-[a-z0-9]+)+)"/g)) add(pascal(m[1]), file);
  // [name]="cond ? 'A' : 'B'" and [icon]="..."
  for (const m of text.matchAll(/\[(?:name|icon)\]="([^"]+)"/g)) for (const q of m[1].matchAll(new RegExp(`'(${icon})'`, 'g'))) add(q[1], file);
  // icon: 'X' in data objects
  for (const m of text.matchAll(new RegExp(String.raw`\bicon:\s*'(${icon})'`, 'g'))) add(m[1], file);
  // any quoted name that is a real lucide icon, unless it is a text shown to the user (label: 'Donut')
  if (lucide) for (const m of text.matchAll(new RegExp(String.raw`(?<!\blabel:\s{0,3})(['"])(${icon})\1`, 'g'))) if (lucide.has(m[2])) add(m[2], file);
}

const missing = [...used].filter(([name]) => !registered.has(name));

if (missing.length) {
  console.error(`Icons used but not registered in src/app/shared/icons.ts (${missing.length}):`);
  for (const [name, files] of missing) console.error(`  ${name}  <- ${[...files].join(', ')}`);
  process.exit(1);
}

console.log(`icons check passed: all ${used.size} icons in use are registered.`);
