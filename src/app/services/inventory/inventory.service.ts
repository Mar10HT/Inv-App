import { Injectable, signal, computed } from '@angular/core';
import { InventoryItemInterface } from '../../interfaces/inventory-item.interface';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
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
      // Fresh Produce
      { id: '1', name: 'Organic Bananas', description: 'Fresh organic bananas, per bunch', quantity: 24, category: 'Fresh Produce', location: 'Aisle 1-A', lastUpdated: new Date(2024, 0, 15), status: 'in-stock' },
      { id: '2', name: 'Red Apples', description: 'Crisp red apples, per lb', quantity: 5, category: 'Fresh Produce', location: 'Aisle 1-A', lastUpdated: new Date(2024, 0, 14), status: 'low-stock' },
      { id: '3', name: 'Fresh Spinach', description: 'Baby spinach leaves, 5oz bag', quantity: 0, category: 'Fresh Produce', location: 'Aisle 1-B', lastUpdated: new Date(2024, 0, 13), status: 'out-of-stock' },
      { id: '4', name: 'Organic Carrots', description: 'Fresh organic carrots, 2lb bag', quantity: 18, category: 'Fresh Produce', location: 'Aisle 1-A', lastUpdated: new Date(2024, 0, 16), status: 'in-stock' },
      { id: '5', name: 'Roma Tomatoes', description: 'Fresh roma tomatoes, per lb', quantity: 12, category: 'Fresh Produce', location: 'Aisle 1-B', lastUpdated: new Date(2024, 0, 15), status: 'in-stock' },
      
      // Dairy
      { id: '6', name: 'Whole Milk', description: 'Fresh whole milk, 1 gallon', quantity: 15, category: 'Dairy', location: 'Dairy Section', lastUpdated: new Date(2024, 0, 16), status: 'in-stock' },
      { id: '7', name: 'Greek Yogurt', description: 'Plain Greek yogurt, 32oz', quantity: 3, category: 'Dairy', location: 'Dairy Section', lastUpdated: new Date(2024, 0, 14), status: 'low-stock' },
      { id: '8', name: 'Cheddar Cheese', description: 'Sharp cheddar cheese, 8oz block', quantity: 22, category: 'Dairy', location: 'Dairy Section', lastUpdated: new Date(2024, 0, 15), status: 'in-stock' },
      { id: '9', name: 'Butter', description: 'Unsalted butter, 1lb', quantity: 8, category: 'Dairy', location: 'Dairy Section', lastUpdated: new Date(2024, 0, 16), status: 'low-stock' },
      
      // Bakery
      { id: '10', name: 'Whole Wheat Bread', description: 'Fresh whole wheat bread loaf', quantity: 12, category: 'Bakery', location: 'Bakery Section', lastUpdated: new Date(2024, 0, 16), status: 'in-stock' },
      { id: '11', name: 'Croissants', description: 'Butter croissants, pack of 6', quantity: 0, category: 'Bakery', location: 'Bakery Section', lastUpdated: new Date(2024, 0, 13), status: 'out-of-stock' },
      { id: '12', name: 'Bagels', description: 'Everything bagels, pack of 6', quantity: 16, category: 'Bakery', location: 'Bakery Section', lastUpdated: new Date(2024, 0, 15), status: 'in-stock' },
      
      // Beverages
      { id: '13', name: 'Orange Juice', description: 'Fresh squeezed orange juice, 64oz', quantity: 9, category: 'Beverages', location: 'Aisle 5', lastUpdated: new Date(2024, 0, 15), status: 'low-stock' },
      { id: '14', name: 'Sparkling Water', description: 'Lemon sparkling water, 12-pack', quantity: 25, category: 'Beverages', location: 'Aisle 5', lastUpdated: new Date(2024, 0, 16), status: 'in-stock' },
      { id: '15', name: 'Coffee Beans', description: 'Medium roast coffee beans, 12oz bag', quantity: 14, category: 'Beverages', location: 'Aisle 6', lastUpdated: new Date(2024, 0, 14), status: 'in-stock' },
      
      // Meat & Seafood
      { id: '16', name: 'Chicken Breast', description: 'Boneless chicken breast, per lb', quantity: 6, category: 'Meat & Seafood', location: 'Meat Counter', lastUpdated: new Date(2024, 0, 16), status: 'low-stock' },
      { id: '17', name: 'Ground Beef', description: '85/15 ground beef, per lb', quantity: 18, category: 'Meat & Seafood', location: 'Meat Counter', lastUpdated: new Date(2024, 0, 15), status: 'in-stock' },
      { id: '18', name: 'Fresh Salmon', description: 'Atlantic salmon fillet, per lb', quantity: 8, category: 'Meat & Seafood', location: 'Seafood Counter', lastUpdated: new Date(2024, 0, 16), status: 'low-stock' },
      
      // Pantry & Dry Goods
      { id: '19', name: 'Pasta', description: 'Spaghetti pasta, 1lb box', quantity: 30, category: 'Pantry & Dry Goods', location: 'Aisle 3', lastUpdated: new Date(2024, 0, 14), status: 'in-stock' },
      { id: '20', name: 'Rice', description: 'Long grain white rice, 5lb bag', quantity: 12, category: 'Pantry & Dry Goods', location: 'Aisle 3', lastUpdated: new Date(2024, 0, 15), status: 'in-stock' },
      { id: '21', name: 'Olive Oil', description: 'Extra virgin olive oil, 500ml', quantity: 7, category: 'Pantry & Dry Goods', location: 'Aisle 4', lastUpdated: new Date(2024, 0, 13), status: 'low-stock' },
      
      // Frozen Foods
      { id: '22', name: 'Frozen Peas', description: 'Frozen green peas, 16oz bag', quantity: 0, category: 'Frozen Foods', location: 'Frozen Aisle', lastUpdated: new Date(2024, 0, 12), status: 'out-of-stock' },
      { id: '23', name: 'Ice Cream', description: 'Vanilla ice cream, 1.5qt', quantity: 11, category: 'Frozen Foods', location: 'Frozen Aisle', lastUpdated: new Date(2024, 0, 16), status: 'in-stock' },
      { id: '24', name: 'Frozen Pizza', description: 'Pepperoni pizza, 12 inch', quantity: 4, category: 'Frozen Foods', location: 'Frozen Aisle', lastUpdated: new Date(2024, 0, 14), status: 'low-stock' },
      
      // Health & Beauty
      { id: '25', name: 'Shampoo', description: 'Moisturizing shampoo, 16oz', quantity: 13, category: 'Health & Beauty', location: 'Aisle 8', lastUpdated: new Date(2024, 0, 15), status: 'in-stock' },
      { id: '26', name: 'Toothpaste', description: 'Fluoride toothpaste, 4oz tube', quantity: 9, category: 'Health & Beauty', location: 'Aisle 8', lastUpdated: new Date(2024, 0, 14), status: 'low-stock' },
      
      // Household
      { id: '27', name: 'Paper Towels', description: 'Absorbent paper towels, 8-pack', quantity: 16, category: 'Household', location: 'Aisle 9', lastUpdated: new Date(2024, 0, 16), status: 'in-stock' },
      { id: '28', name: 'Dish Soap', description: 'Liquid dish soap, 24oz', quantity: 2, category: 'Household', location: 'Aisle 9', lastUpdated: new Date(2024, 0, 13), status: 'low-stock' },
      { id: '29', name: 'Laundry Detergent', description: 'Liquid laundry detergent, 64oz', quantity: 0, category: 'Household', location: 'Aisle 10', lastUpdated: new Date(2024, 0, 11), status: 'out-of-stock' },
      { id: '30', name: 'Toilet Paper', description: 'Soft toilet paper, 12-pack', quantity: 21, category: 'Household', location: 'Aisle 9', lastUpdated: new Date(2024, 0, 16), status: 'in-stock' }
    ];

    this.itemsSignal.set(mockData);
    this.saveToStorage();
  }

  // CRUD Operations
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

  updateItem(id: string, updates: Partial<Omit<InventoryItemInterface, 'id'>>): void {
    const currentItems = this.itemsSignal();
    const updatedItems = currentItems.map(item => 
      item.id === id 
        ? { ...item, ...updates, lastUpdated: new Date() }
        : item
    );
    
    this.itemsSignal.set(updatedItems);
    this.saveToStorage();
  }

  deleteItem(id: string): void {
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