import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Invoice } from '../models/invoice.model';
import { DashboardAnalytics } from '../models/analytics.model';

@Injectable({ providedIn: 'root' })
export class BillingService extends ApiService {
  generateInvoice(orderId: string): Observable<Invoice> {
    return this.post<Invoice>(`billing/orders/${orderId}/invoice`, {});
  }
  getInvoice(orderId: string): Observable<Invoice> {
    return this.get<Invoice>(`billing/orders/${orderId}/invoice`);
  }
  getDashboardAnalytics(): Observable<DashboardAnalytics> {
    return this.get<DashboardAnalytics>('analytics/dashboard');
  }
}
