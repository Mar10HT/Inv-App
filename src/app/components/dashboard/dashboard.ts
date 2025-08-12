import { Component } from '@angular/core';
import { SharedData } from '../../services/shared-data.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips'; // For status chips

export interface Item {
  id: number;
  name: string;
  category: string;
  quantity: number;
  price: number;
  status: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, MatIconModule, MatTableModule, MatButtonModule, MatChipsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  userName: string = 'John Doe';
  totalUsers: number = 156;
  totalItems: number = 432;
  totalValue: number = 45230.50;

  displayedColumns: string[] = ['name', 'category', 'quantity', 'price', 'status', 'actions'];

  items: Item[] = [
    { id: 1, name: "Laptop Dell XPS", category: "Electronics", quantity: 25, price: 899.99, status: "In Stock" },
    { id: 2, name: "Office Chair", category: "Furniture", quantity: 8, price: 245.50, status: "Low Stock" },
    { id: 3, name: "Wireless Mouse", category: "Electronics", quantity: 0, price: 29.99, status: "Out of Stock" },
    { id: 4, name: "Desk Lamp", category: "Furniture", quantity: 15, price: 45.00, status: "In Stock" },
    { id: 5, name: "Keyboard Mechanical", category: "Electronics", quantity: 32, price: 125.00, status: "In Stock" },
    { id: 6, name: "Monitor 24\"", category: "Electronics", quantity: 12, price: 299.99, status: "In Stock" },
  ];

  constructor(private sharedData: SharedData) {
    console.log("Dashboard component created!");
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'In Stock': return 'bg-[color-mix(in_srgb,var(--secondary)_20%,transparent)] text-[var(--secondary)]';
      case 'Low Stock': return 'bg-[color-mix(in_srgb,var(--tertiary)_20%,transparent)] text-[var(--tertiary)]';
      case 'Out of Stock': return 'bg-[color-mix(in_srgb,var(--error)_20%,transparent)] text-[var(--error)]';
      default: return 'bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] text-[var(--primary)]';
    }
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