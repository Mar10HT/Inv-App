import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventoryItem } from './inventory-item';  // Changed to import the component
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTestBedDefaults } from '../../../../testing/test-providers';

describe('InventoryItem', () => {  // Updated name
  let component: InventoryItem;  // Changed type
  let fixture: ComponentFixture<InventoryItem>;  // Changed type

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryItem],  // Changed to component
      providers: [
        ...provideTestBedDefaults(),
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
        { provide: MAT_DIALOG_DATA, useValue: { itemId: 'test-item-id' } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventoryItem);  // Changed to component
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});