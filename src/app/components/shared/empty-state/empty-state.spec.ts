import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { EmptyState } from './empty-state';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

@Component({
  standalone: true,
  imports: [EmptyState],
  template: `
    <app-empty-state icon="Tag" heading="No categories" [description]="description">
      <button type="button">Add category</button>
    </app-empty-state>
  `
})
class HostWithAction {
  description: string | undefined = 'Create the first one';
}

@Component({
  standalone: true,
  imports: [EmptyState],
  template: `<app-empty-state icon="Tag" heading="No roles"></app-empty-state>`
})
class HostWithoutAction {}

describe('EmptyState', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [...provideTestBedDefaults()] }));

  it('shows the icon, the heading and the description', () => {
    const fixture = TestBed.createComponent(HostWithAction);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('svg')?.classList).toContain('lucide-Tag');
    expect(el.querySelector('p.text-lg')?.textContent?.trim()).toBe('No categories');
    expect(el.querySelector('p.text-sm')?.textContent?.trim()).toBe('Create the first one');
  });

  it('shows the content given to it, for an action', () => {
    const fixture = TestBed.createComponent(HostWithAction);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('button')?.textContent).toBe('Add category');
  });

  it('leaves out the description line when there is none', () => {
    const fixture = TestBed.createComponent(HostWithAction);
    fixture.componentInstance.description = undefined;
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('p.text-sm')).toBeNull();
  });

  it('works with only an icon and a heading', () => {
    const fixture = TestBed.createComponent(HostWithoutAction);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('p.text-lg')?.textContent?.trim()).toBe('No roles');
    expect(el.querySelector('p.text-sm')).toBeNull();
    expect(el.querySelector('button')).toBeNull();
  });
});
