export interface InventoryItemInterface {
  id: string;
  name: string;
  description: string;
  quantity: number;
  category: string;
  location: string;
  lastUpdated: Date;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
}