export interface KOT {
  id: string;
  orderId: string;
  kotNumber: number;
  itemsJson: string;
  status: 'new' | 'acknowledged' | 'completed';
  printedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tableNumber: number;
}
