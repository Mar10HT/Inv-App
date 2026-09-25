// Fails when en.json and es.json drift apart, or when code references a
// translation key that does not exist. Only literal keys ('NAMESPACE.KEY') are
// checked: dynamic ones such as 'STATUS.' + status cannot be resolved statically.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../src', import.meta.url));
const load = (lang) => JSON.parse(readFileSync(join(src, 'assets/i18n', `${lang}.json`), 'utf8'));

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' ? flatten(value, path) : [path];
  });

const sourceFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|html)$/.test(entry.name) && !entry.name.endsWith('.spec.ts') ? [path] : [];
  });

const en = load('en');
const enKeys = new Set(flatten(en));
const esKeys = new Set(flatten(load('es')));
const namespaces = new Set(Object.keys(en));

const problems = [];

for (const key of enKeys) if (!esKeys.has(key)) problems.push(`missing in es.json: ${key}`);
for (const key of esKeys) if (!enKeys.has(key)) problems.push(`missing in en.json: ${key}`);

const literalKey = /['"`]([A-Z][A-Z0-9_]*(?:\.[A-Za-z0-9_]+)+)['"`]/g;
const usedIn = new Map();
for (const file of sourceFiles(join(src, 'app'))) {
  for (const [, key] of readFileSync(file, 'utf8').matchAll(literalKey)) {
    if (!namespaces.has(key.split('.')[0])) continue;
    usedIn.set(key, usedIn.get(key) ?? relative(src, file).replaceAll('\\', '/'));
  }
}
for (const [key, file] of usedIn) {
  if (!enKeys.has(key) || !esKeys.has(key)) problems.push(`used but not translated: ${key} (${file})`);
}

if (problems.length) {
  console.error(`i18n check failed:\n${problems.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`i18n check passed: ${enKeys.size} keys, en and es in parity, every literal key used in src/app exists.`);
