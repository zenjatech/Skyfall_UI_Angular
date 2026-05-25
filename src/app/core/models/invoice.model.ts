export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  pdfUrl: string | null;
  whatsappSent: boolean;
  smsSent: boolean;
  billedByStaffId: string | null;
  billedByStaffName: string | null;
  createdAt: string;
}
