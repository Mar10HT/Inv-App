import { FormControl } from '@angular/forms';

import { STRONG_PASSWORD_PATTERN, strongPasswordRules } from './password.validators';

const errorsFor = (value: string): string[] =>
  Object.keys(strongPasswordRules(new FormControl(value)) ?? {}).sort();

describe('password.validators', () => {
  describe('strongPasswordRules', () => {
    it('accepts a password that meets every rule', () => {
      expect(strongPasswordRules(new FormControl('Abcdef1@'))).toBeNull();
    });

    it('reports each rule that fails', () => {
      expect(errorsFor('Abc1@')).toEqual(['minLength']);
      expect(errorsFor('abcdefg1@')).toEqual(['uppercase']);
      expect(errorsFor('ABCDEFG1@')).toEqual(['lowercase']);
      expect(errorsFor('Abcdefgh@')).toEqual(['number']);
      expect(errorsFor('Abcdefg12')).toEqual(['special']);
    });

    it('rejects characters the API does not accept, even when they look like symbols', () => {
      // The API only allows letters, digits and @$!%*?&.
      expect(errorsFor('Abcdef1@#')).toEqual(['invalidChars']);
      expect(errorsFor('Abcdef1@ x')).toEqual(['invalidChars']);
      expect(errorsFor('Abcdef1#')).toEqual(['invalidChars', 'special']);
    });

    it('does not flag the length of an empty value, required covers it', () => {
      expect(errorsFor('')).not.toContain('minLength');
    });
  });

  describe('STRONG_PASSWORD_PATTERN', () => {
    const samples = [
      'Abcdef1@',
      'Abcdefg1$',
      'abcdefg1@',
      'ABCDEFG1@',
      'Abcdefgh@',
      'Abcdefg12',
      'Abcdef1#',
      'Abcdef1@ x',
      'Abcdef1@#',
      'Ab1@',
      ''
    ];

    it('agrees with strongPasswordRules on every sample, so the two forms of the policy cannot drift', () => {
      for (const sample of samples) {
        const byRules = strongPasswordRules(new FormControl(sample)) === null;
        // The pattern does not check the minimum length, which forms cover with minLength(8).
        const byPattern = STRONG_PASSWORD_PATTERN.test(sample) && sample.length >= 8;
        expect(byPattern).withContext(`"${sample}"`).toBe(byRules);
      }
    });
  });
});
