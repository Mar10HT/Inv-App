import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { InventoryItemInterface, CreateInventoryItemDto, UpdateInventoryItemDto, ItemType, Currency } from '../../interfaces/inventory-item.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/inventory`;
  private readonly STORAGE_KEY = 'inventory_items';
  private itemsSignal = signal<InventoryItemInterface[]>([]);
  
  // Public computed signals
  items = computed(() => this.itemsSignal());
  categories = computed(() => {
    const uniqueCategories = [...new Set(this.items().map(item => item.category))];
    return uniqueCategories.sort();
  });
  
  locations = computed(() => {
    const uniqueLocations = [...new Set(this.items().map(item => item.location))];
    return uniqueLocations.sort();
  });

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsedItems = JSON.parse(stored).map((item: any) => ({
          ...item,
          lastUpdated: new Date(item.lastUpdated)
        }));
        this.itemsSignal.set(parsedItems);
      } catch (error) {
        console.error('Error loading from localStorage:', error);
        this.initializeWithMockData();
      }
    } else {
      this.initializeWithMockData();
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.itemsSignal()));
  }

  private initializeWithMockData(): void {
    const mockData: InventoryItemInterface[] = [
      // BULK Items
      {
        id: '1',
        name: 'Tornillos M6x20mm',
        description: 'Tornillos hexagonales de acero inoxidable',
        quantity: 500,
        minQuantity: 100,
        category: 'Ferretería',
        location: 'Estante A-3',
        lastUpdated: new Date(2024, 0, 15),
        status: 'in-stock',
        itemType: ItemType.BULK,
        sku: 'TOR-M6-20',
        barcode: '7501234567890',
        price: 0.50,
        currency: Currency.HNL,
        warehouseId: 'warehouse-1'
      },
      {
        id: '2',
        name: 'Papel Bond Carta',
        description: 'Resma de papel bond tamaño carta, 500 hojas',
        quantity: 15,
        minQuantity: 20,
        category: 'Oficina',
        location: 'Bodega Principal',
        lastUpdated: new Date(2024, 0, 14),
        status: 'low-stock',
        itemType: ItemType.BULK,
        sku: 'PAP-BON-CTA',
        barcode: '7501234567891',
        price: 85.00,
        currency: Currency.HNL,
        warehouseId: 'warehouse-1'
      },
      // UNIQUE Items
      {
        id: '3',
        name: 'Laptop Dell Latitude 5420',
        description: 'Laptop empresarial Intel Core i5, 16GB RAM, 512GB SSD',
        quantity: 1,
        minQuantity: 1,
        category: 'Electrónica',
        location: 'Oficina TI',
        lastUpdated: new Date(2024, 0, 16),
        status: 'in-stock',
        itemType: ItemType.UNIQUE,
        serviceTag: 'DEL123456AB',
        serialNumber: 'SN123456789',
        price: 25000.00,
        currency: Currency.HNL,
        warehouseId: 'warehouse-1'
      },
      {
        id: '4',
        name: 'Monitor HP 24"',
        description: 'Monitor Full HD 24 pulgadas, entrada HDMI y DisplayPort',
        quantity: 1,
        minQuantity: 1,
        category: 'Electrónica',
        location: 'Almacén 2',
        lastUpdated: new Date(2024, 0, 15),
        status: 'in-stock',
        itemType: ItemType.UNIQUE,
        serviceTag: 'HP987654XY',
        price: 4500.00,
        currency: Currency.HNL,
        warehouseId: 'warehouse-1'
      },
      {
        id: '5',
        name: 'Impresora Multifuncional Canon',
        description: 'Impresora multifuncional a color con WiFi',
        quantity: 1,
        minQuantity: 1,
        category: 'Electrónica',
        location: 'Sala de Impresión',
        lastUpdated: new Date(2024, 0, 13),
        status: 'in-stock',
        itemType: ItemType.UNIQUE,
        serviceTag: 'CAN456789ZZ',
        serialNumber: 'CNSER987654',
        price: 6800.00,
        currency: Currency.HNL,
        warehouseId: 'warehouse-1',
        assignedToUserId: 'user-1',
        assignedAt: new Date(2024, 0, 13)
      }
    ];

    this.itemsSignal.set(mockData);
    this.saveToStorage();
  }

  // HTTP API Methods
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  getAllItems(): Observable<InventoryItemInterface[]> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.get<InventoryItemInterface[]>(this.apiUrl).pipe(
      tap({
        next: (items) => {
          const itemsWithDates = items.map(item => ({
            ...item,
            lastUpdated: new Date(item.lastUpdated),
            assignedAt: item.assignedAt ? new Date(item.assignedAt) : undefined
          }));
          this.itemsSignal.set(itemsWithDates);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
          // Fallback to localStorage if API fails
          this.loadFromStorage();
        }
      })
    );
  }

  createItem(item: CreateInventoryItemDto): Observable<InventoryItemInterface> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.post<InventoryItemInterface>(this.apiUrl, item).pipe(
      tap({
        next: (newItem) => {
          const itemWithDates = {
            ...newItem,
            lastUpdated: new Date(newItem.lastUpdated),
            assignedAt: newItem.assignedAt ? new Date(newItem.assignedAt) : undefined
          };
          this.itemsSignal.update(items => [...items, itemWithDates]);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  updateItem(id: string, updates: UpdateInventoryItemDto): Observable<InventoryItemInterface> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.put<InventoryItemInterface>(`${this.apiUrl}/${id}`, updates).pipe(
      tap({
        next: (updatedItem) => {
          const itemWithDates = {
            ...updatedItem,
            lastUpdated: new Date(updatedItem.lastUpdated),
            assignedAt: updatedItem.assignedAt ? new Date(updatedItem.assignedAt) : undefined
          };
          this.itemsSignal.update(items =>
            items.map(item => item.id === id ? itemWithDates : item)
          );
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  deleteItem(id: string): Observable<void> {
    this.loading.set(true);
    this.error.set(null);

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap({
        next: () => {
          this.itemsSignal.update(items => items.filter(item => item.id !== id));
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message);
          this.loading.set(false);
        }
      })
    );
  }

  // Legacy local methods (kept for backward compatibility)
  addItem(item: Omit<InventoryItemInterface, 'id' | 'lastUpdated'>): void {
    const newItem: InventoryItemInterface = {
      ...item,
      id: this.generateId(),
      lastUpdated: new Date()
    };

    const currentItems = this.itemsSignal();
    this.itemsSignal.set([...currentItems, newItem]);
    this.saveToStorage();
  }

  updateItemLocal(id: string, updates: Partial<Omit<InventoryItemInterface, 'id'>>): void {
    const currentItems = this.itemsSignal();
    const updatedItems = currentItems.map(item =>
      item.id === id
        ? { ...item, ...updates, lastUpdated: new Date() }
        : item
    );

    this.itemsSignal.set(updatedItems);
    this.saveToStorage();
  }

  deleteItemLocal(id: string): void {
    const currentItems = this.itemsSignal();
    const filteredItems = currentItems.filter(item => item.id !== id);
    this.itemsSignal.set(filteredItems);
    this.saveToStorage();
  }

  getItemById(id: string): InventoryItemInterface | undefined {
    return this.items().find(item => item.id === id);
  }

  // Filter methods
  getFilteredItems(filters: {
    search?: string;
    category?: string;
    location?: string;
    status?: string;
  }): InventoryItemInterface[] {
    let filtered = this.items();

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    if (filters.location && filters.location !== 'all') {
      filtered = filtered.filter(item => item.location === filters.location);
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    return filtered;
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // Utility methods
  getTotalItems(): number {
    return this.items().length;
  }

  getItemsByStatus(status: 'in-stock' | 'low-stock' | 'out-of-stock'): InventoryItemInterface[] {
    return this.items().filter(item => item.status === status);
  }

  getLowStockItems(): InventoryItemInterface[] {
    return this.items().filter(item => item.status === 'low-stock' || item.status === 'out-of-stock');
  }

  // Clear all data (for testing)
  clearAllData(): void {
    this.itemsSignal.set([]);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  // Reset to mock data
  resetToMockData(): void {
    this.clearAllData();
    this.initializeWithMockData();
  }
}