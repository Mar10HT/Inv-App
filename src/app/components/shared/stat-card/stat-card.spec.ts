import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatCard, StatTone } from './stat-card';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

describe('StatCard', () => {
  let fixture: ComponentFixture<StatCard>;
  let el: HTMLElement;

  const value = (): HTMLElement => el.querySelector('p.text-2xl') as HTMLElement;
  const badge = (): HTMLElement => el.querySelector('div.p-3') as HTMLElement;
  const icon = (): SVGElement => el.querySelector('lucide-icon svg') as SVGElement;

  const render = (inputs: { tone?: StatTone; value?: string | number } = {}): void => {
    fixture.componentRef.setInput('label', 'Pending');
    fixture.componentRef.setInput('value', inputs.value ?? 7);
    fixture.componentRef.setInput('icon', 'Clock');
    if (inputs.tone) fixture.componentRef.setInput('tone', inputs.tone);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCard],
      providers: [...provideTestBedDefaults()]
    }).compileComponents();

    fixture = TestBed.createComponent(StatCard);
    el = fixture.nativeElement as HTMLElement;
  });

  it('shows the label and the value', () => {
    render();

    expect(el.textContent).toContain('Pending');
    expect(value().textContent?.trim()).toBe('7');
  });

  it('shows a zero, not an empty card', () => {
    render({ value: 0 });

    expect(value().textContent?.trim()).toBe('0');
  });

  it('draws the icon it is given', () => {
    render();

    expect(icon().classList).toContain('lucide-Clock');
  });

  it('is neutral by default', () => {
    render();

    expect(value().classList).toContain('text-foreground');
    expect(badge().classList).toContain('bg-[var(--color-surface-elevated)]');
    expect(icon().classList).toContain('!text-[var(--color-on-surface-variant)]');
  });

  const tones: [StatTone, string, string][] = [
    ['info', 'status-info', 'info-bg'],
    ['success', 'status-success', 'success-bg'],
    ['error', 'status-error', 'error-bg'],
    ['amber', 'accent-amber', 'accent-amber-bg'],
    ['violet', 'accent-violet', 'accent-violet-bg']
  ];

  tones.forEach(([tone, color, background]) => {
    it(`colors the ${tone} card with the ${color} token`, () => {
      render({ tone });

      expect(value().classList).toContain(`text-[var(--color-${color})]`);
      expect(badge().classList).toContain(`bg-[var(--color-${background})]`);
      expect(icon().classList).toContain(`!text-[var(--color-${color})]`);
    });
  });

  it('keeps the base sizes of the icon and the badge', () => {
    render({ tone: 'error' });

    expect(icon().classList).toContain('!w-5');
    expect(icon().classList).toContain('!h-5');
    expect(badge().classList).toContain('rounded-lg');
  });
});
