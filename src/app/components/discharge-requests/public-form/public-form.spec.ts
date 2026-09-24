import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { PublicFormComponent } from './public-form';
import { DischargeRequestService } from '../../../services/discharge-request.service';
import { AvailableItem } from '../../../interfaces/discharge-request.interface';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

const available = (id: string, name: string, category: string, warehouseName: string): AvailableItem => ({
  id,
  name,
  quantity: 5,
  category,
  itemType: 'BULK',
  warehouseId: warehouseName,
  warehouseName
});

const items = [
  available('a', 'Cable', 'Parts', 'Main'),
  available('b', 'Router', 'Network', 'Main'),
  available('c', 'Switch', 'Network', 'Backup')
];

describe('PublicFormComponent item search', () => {
  let fixture: ComponentFixture<PublicFormComponent>;
  let component: PublicFormComponent;
  let el: HTMLElement;

  // Option labels of the item picker, without the "select an item" placeholder.
  const pickerItems = (): string[] =>
    Array.from(el.querySelectorAll('select option'))
      .slice(1)
      .map((o) => o.textContent?.trim().split(' - ')[0] ?? '');

  const search = (value: string): void => {
    const input = el.querySelector('input[type="text"][class*="pl-11"]') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicFormComponent],
      providers: [
        ...provideTestBedDefaults(),
        { provide: DischargeRequestService, useValue: { getAvailableItems: () => of(items) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PublicFormComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    component.addItem();
    fixture.detectChanges();
  });

  it('lists every available item before searching', () => {
    expect(pickerItems()).toEqual(['Cable', 'Router', 'Switch']);
  });

  it('narrows the picker as the user types', () => {
    search('router');

    expect(pickerItems()).toEqual(['Router']);
  });

  it('matches on the category and on the warehouse too', () => {
    search('network');
    expect(pickerItems()).toEqual(['Router', 'Switch']);

    search('backup');
    expect(pickerItems()).toEqual(['Switch']);
  });

  it('shows everything again when the search is cleared', () => {
    search('router');
    search('');

    expect(pickerItems()).toEqual(['Cable', 'Router', 'Switch']);
  });

  it('clears the search when the form is reset', () => {
    search('router');

    component.resetForm();
    component.addItem();
    fixture.detectChanges();

    expect(pickerItems()).toEqual(['Cable', 'Router', 'Switch']);
  });
});
