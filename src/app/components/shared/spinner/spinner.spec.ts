import { TestBed } from '@angular/core/testing';

import { Spinner } from './spinner';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

describe('Spinner', () => {
  const create = async (inputs: Record<string, string> = {}) => {
    await TestBed.configureTestingModule({
      imports: [Spinner],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();
    const fixture = TestBed.createComponent(Spinner);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('div') as HTMLElement;
  };

  it('is announced to assistive technology as a loading status', async () => {
    const circle = await create();

    expect(circle.getAttribute('role')).toBe('status');
    expect(circle.getAttribute('aria-label')).toBe('COMMON.LOADING');
  });

  it('spins, and stops when the user asks for reduced motion', async () => {
    const circle = await create();

    expect(circle.classList).toContain('animate-spin');
    expect(circle.classList).toContain('motion-reduce:animate-none');
  });

  it('is a large primary spinner by default', async () => {
    const circle = await create();

    expect(circle.classList).toContain('h-8');
    expect(circle.classList).toContain('w-8');
    expect(circle.classList).toContain('border-[var(--color-primary)]');
  });

  [
    ['sm', 'h-4', 'w-4'],
    ['md', 'h-6', 'w-6'],
    ['lg', 'h-8', 'w-8'],
    ['xl', 'h-10', 'w-10']
  ].forEach(([size, height, width]) => {
    it(`draws the ${size} size as ${height} ${width}`, async () => {
      const circle = await create({ size });

      expect(circle.classList).toContain(height);
      expect(circle.classList).toContain(width);
    });
  });

  it('is white on request, for use inside a colored button', async () => {
    const circle = await create({ tone: 'white' });

    expect(circle.classList).toContain('border-white');
    expect(circle.classList).not.toContain('border-[var(--color-primary)]');
  });
});
