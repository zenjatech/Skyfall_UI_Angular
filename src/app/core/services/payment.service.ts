import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Payment } from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class PaymentService extends ApiService {
  getByOrder(orderId: string): Observable<Payment[]> {
    return this.get<Payment[]>(`payments/orders/${orderId}`);
  }

  create(body: {
    orderId: string;
    mode: 'cash' | 'upi' | 'debit_card' | 'credit_card' | string;
    amount: number;
    tip?: number;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  }): Observable<Payment> {
    return this.post<Payment>('payments', body);
  }
}
