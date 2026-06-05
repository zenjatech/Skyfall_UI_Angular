export interface Payment {
  id: string;
  orderId: string;
  mode: 'cash' | 'upi' | 'debit_card' | 'credit_card' | string;
  amount: number;
  tip: number;
  status: 'pending' | 'success' | 'failed' | 'refunded' | string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
}

export interface PublicBilling {
  orderId: string;
  invoiceNumber: string | null;
  items: import('./order.model').OrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid' | string;
  payments: Payment[];
}
