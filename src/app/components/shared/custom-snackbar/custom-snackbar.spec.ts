import { TestBed } from '@angular/core/testing';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

import { CustomSnackbar, CustomSnackbarData } from './custom-snackbar';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

describe('CustomSnackbar', () => {
  const create = async (data: CustomSnackbarData) => {
    const dismiss = jasmine.createSpy('dismiss');
    await TestBed.configureTestingModule({
      imports: [CustomSnackbar],
      providers: [
        ...provideTestBedDefaults(),
        { provide: MAT_SNACK_BAR_DATA, useValue: data },
        { provide: MatSnackBarRef, useValue: { dismiss } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(CustomSnackbar);
    fixture.detectChanges();
    return { fixture, dismiss, el: fixture.nativeElement as HTMLElement, component: fixture.componentInstance };
  };

  const looks: [CustomSnackbarData['type'], string, string, string][] = [
    ['success', 'Check', 'bg-[var(--color-primary)]', 'border-[var(--color-primary)]'],
    ['error', 'AlertCircle', 'bg-red-700', 'border-red-700'],
    ['warning', 'AlertTriangle', 'bg-amber-700', 'border-amber-700'],
    ['info', 'Info', 'bg-blue-700', 'border-blue-700']
  ];

  for (const [type, icon, background, border] of looks) {
    it(`looks like a ${type} message`, async () => {
      const { component } = await create({ message: 'Hello', type });

      expect(component.icon).toBe(icon);
      expect(component.iconBgClass).toBe(background);
      expect(component.borderClass).toBe(border);
    });
  }

  it('falls back to the info look for a type it does not know', async () => {
    const { component } = await create({ message: 'Hello', type: 'other' as CustomSnackbarData['type'] });

    expect([component.icon, component.iconBgClass, component.borderClass]).toEqual(['Info', 'bg-blue-700', 'border-blue-700']);
  });

  it('shows the message with the border of its type', async () => {
    const { el } = await create({ message: 'Saved the item', type: 'success' });

    expect(el.textContent).toContain('Saved the item');
    expect(el.querySelector('.border-\\[var\\(--color-primary\\)\\]')).not.toBeNull();
  });

  it('dismisses itself from the close button', async () => {
    const { el, dismiss } = await create({ message: 'Hello', type: 'info' });

    el.querySelector('button')?.click();

    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
