import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { signal } from '@angular/core';

import { CommandPalette } from './command-palette';
import { InventoryService } from '../../../services/inventory/inventory.service';
import { AuthService } from '../../../services/auth.service';
import { provideTestBedDefaults } from '../../../../testing/test-providers';
import { item } from '../../../../testing/report-fixtures';

// The inventory search is debounced by 200 ms.
const pastDebounce = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 250));

describe('CommandPalette search', () => {
  let fixture: ComponentFixture<CommandPalette>;
  let component: CommandPalette;
  let el: HTMLElement;

  const type = (value: string): void => {
    const input = el.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const allCommands = (): number => component.filteredItems().length;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommandPalette],
      providers: [
        ...provideTestBedDefaults(),
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
        { provide: AuthService, useValue: { currentUser: signal(null) } },
        {
          provide: InventoryService,
          useValue: { items: signal([item({ id: 'i1', name: 'Laptop Dell', category: 'Computers' })]) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CommandPalette);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('starts with every navigation entry and action', () => {
    expect(allCommands()).toBeGreaterThan(5);
    expect(component.inventoryItems()).toEqual([]);
  });

  it('filters as soon as a single character is typed', () => {
    const total = allCommands();

    type('w');

    const shown = component.filteredItems();
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThan(total);
    for (const command of shown) {
      expect(`${command.label} ${command.description ?? ''}`.toLowerCase()).toContain('w');
    }
  });

  it('shows the whole list again once the search is cleared', async () => {
    const total = allCommands();

    type('inv');
    await pastDebounce();
    expect(allCommands()).toBeLessThan(total);

    type('');

    expect(allCommands()).toBe(total);
  });

  it('shows the no results message for a query that matches nothing', () => {
    type('zzzzzz');

    expect(component.filteredItems()).toEqual([]);
    expect(el.textContent).toContain('COMMAND_PALETTE.NO_RESULTS');
  });

  it('finds inventory items once two characters are typed', async () => {
    type('lap');
    await pastDebounce();
    fixture.detectChanges();

    expect(component.inventoryItems().map((i) => i.label)).toEqual(['Laptop Dell']);
  });
});
