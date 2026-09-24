import { safeReturnUrl } from './return-url.utils';

describe('safeReturnUrl', () => {
  it('keeps a path inside the app', () => {
    expect(safeReturnUrl('/loans')).toBe('/loans');
    expect(safeReturnUrl('/inventory/edit/42?tab=info')).toBe('/inventory/edit/42?tab=info');
  });

  it('falls back to the dashboard when there is nothing usable', () => {
    expect(safeReturnUrl(undefined)).toBe('/dashboard');
    expect(safeReturnUrl(null)).toBe('/dashboard');
    expect(safeReturnUrl('')).toBe('/dashboard');
  });

  it('rejects anything that could point outside the app', () => {
    expect(safeReturnUrl('https://evil.example')).toBe('/dashboard');
    expect(safeReturnUrl('//evil.example')).toBe('/dashboard');
    expect(safeReturnUrl('/\\evil.example')).toBe('/dashboard');
    expect(safeReturnUrl('javascript:alert(1)')).toBe('/dashboard');
    expect(safeReturnUrl('loans')).toBe('/dashboard');
  });

  it('rejects a repeated query parameter, which arrives as an array', () => {
    expect(safeReturnUrl(['/a', '/b'])).toBe('/dashboard');
  });
});
