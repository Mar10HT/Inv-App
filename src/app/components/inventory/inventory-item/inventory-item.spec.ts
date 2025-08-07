import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventoryItem } from './inventory-item';  // Changed to import the component

describe('InventoryItem', () => {  // Updated name
  let component: InventoryItem;  // Changed type
  let fixture: ComponentFixture<InventoryItem>;  // Changed type

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventoryItem]  // Changed to component
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