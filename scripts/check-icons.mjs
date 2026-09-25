// Fails when a component draws an icon that src/app/shared/icons.ts does not register.
// lucide-angular throws when an icon is missing, and the pages that use the rare ones (behind a
// permission, in an empty or an error state) are not rendered by a test, so it only showed at run time.
// Only literal names are checked: an icon name built from a variable cannot be resolved statically.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../src/app', import.meta.url));
const iconsFile = join(src, 'shared/icons.ts');

const sourceFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|html)$/.test(entry.name) && !entry.name.endsWith('.spec.ts') && path !== iconsFile ? [path] : [];
  });

// Every capitalised identifier in the registry file: the imports and the APP_ICONS map
const registered = new Set([...readFileSync(iconsFile, 'utf8').matchAll(/\b([A-Z][A-Za-z0-9]+)\b/g)].map((m) => m[1]));

const used = new Map(); // icon name -> files that draw it
const add = (name, file) => used.set(name, [...(used.get(name) ?? []), relative(src, file).replace(/\\/g, '/')]);

for (const file of sourceFiles(src)) {
  const text = readFileSync(file, 'utf8');
  // <lucide-icon name="X">, <app-empty-state icon="X">, <app-stat-card icon="X">
  for (const m of text.matchAll(/<(?:lucide-icon|app-empty-state|app-stat-card)[^>]*?\s(?:icon|name)="([A-Z][A-Za-z0-9]+)"/g)) add(m[1], file);
  // [name]="cond ? 'A' : 'B'" and [icon]="..."
  for (const m of text.matchAll(/\[(?:name|icon)\]="([^"]+)"/g)) for (const q of m[1].matchAll(/'([A-Z][A-Za-z0-9]+)'/g)) add(q[1], file);
  // icon: 'X' in data objects
  for (const m of text.matchAll(/\bicon:\s*'([A-Z][A-Za-z0-9]+)'/g)) add(m[1], file);
}

const missing = [...used].filter(([name]) => !registered.has(name));

if (missing.length) {
  console.error(`Icons used but not registered in src/app/shared/icons.ts (${missing.length}):`);
  for (const [name, files] of missing) console.error(`  ${name}  <- ${[...new Set(files)].join(', ')}`);
  process.exit(1);
}

console.log(`icons check passed: all ${used.size} icons in use are registered.`);
