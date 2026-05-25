export interface OrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  addonsJson: string | null;
  specialInstructions: string | null;
  itemStatus: string;
}

export interface Order {
  id: string;
  tableId: string;
  tableNumber: number;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  placedByStaffId: string | null;
  placedByStaffName: string | null;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  orderType: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  specialInstructions: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}
