import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SharedData } from '../../services/shared-data/shared-data.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface Item {
  id: number;
  name: string;
  description: string;
  category: string;
  quantity: number;
  price: number;
  status: string;
}

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  userName: string = 'John Doe';
  totalUsers: number = 156;
  totalItems: number = 432;
  totalValue: number = 45230.50;

  items: Item[] = [
    { id: 1, name: "Laptop Dell XPS", description: "High-performance laptop for professional use", category: "Electronics", quantity: 25, price: 899.99, status: "in-stock" },
    { id: 2, name: "Office Chair", description: "Ergonomic office chair with lumbar support", category: "Furniture", quantity: 8, price: 245.50, status: "low-stock" },
    { id: 3, name: "Wireless Mouse", description: "Bluetooth wireless mouse with rechargeable battery", category: "Electronics", quantity: 0, price: 29.99, status: "out-of-stock" },
    { id: 4, name: "Desk Lamp", description: "LED desk lamp with adjustable brightness", category: "Furniture", quantity: 15, price: 45.00, status: "in-stock" },
    { id: 5, name: "Keyboard Mechanical", description: "Mechanical keyboard with RGB backlighting", category: "Electronics", quantity: 32, price: 125.00, status: "in-stock" },
    { id: 6, name: "Monitor 24\"", description: "Full HD 24-inch monitor with HDMI input", category: "Electronics", quantity: 12, price: 299.99, status: "in-stock" },
  ];

  constructor(private sharedData: SharedData) {
    console.log("Dashboard component created!");
  }

   viewItem(item: Item) {
    console.log('View item:', item);
  }

  editItem(item: Item) {
    console.log('Edit item:', item);
  }

  deleteItem(item: Item) {
    console.log('Delete item:', item);
  }
}