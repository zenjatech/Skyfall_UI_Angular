export interface CafeTable {
  id: string;
  tableNumber: number;
  qrCodeUrl: string | null;
  status: 'free' | 'occupied' | 'reserved' | 'bill_requested';
  capacity: number;
  createdAt: string;
}
