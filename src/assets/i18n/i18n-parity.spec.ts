import ES from './es.json';
import EN from './en.json';

/** Every key path of a translation file, e.g. "API_ERRORS.INSUFFICIENT_STOCK". */
const keyPaths = (node: unknown, prefix = ''): string[] =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) => keyPaths(value, prefix ? `${prefix}.${key}` : key))
    : [prefix];

describe('translation files', () => {
  it('translate the same API error codes in Spanish and English', () => {
    const es = keyPaths((ES as Record<string, unknown>)['API_ERRORS'], 'API_ERRORS');
    const en = keyPaths((EN as Record<string, unknown>)['API_ERRORS'], 'API_ERRORS');

    expect(es.filter((k) => !en.includes(k))).withContext('missing in en.json').toEqual([]);
    expect(en.filter((k) => !es.includes(k))).withContext('missing in es.json').toEqual([]);
  });
});
