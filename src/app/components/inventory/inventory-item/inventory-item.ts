import { Component } from '@angular/core';
import { InventoryItemInterface } from '../../../interfaces/inventory-item.interface';  // Import the interface, not the component

@Component({
  selector: 'app-inventory-item',
  standalone: true,
  imports: [],
  templateUrl: './inventory-item.html',
  styleUrl: './inventory-item.css'
})
export class InventoryItem {
  item?: InventoryItemInterface;  // Now you can use the interface
}