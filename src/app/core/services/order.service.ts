import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Order } from '../models/order.model';

export interface OrderItemRequest {
  menuItemId: string;
  variantId?: string;
  quantity: number;
  addonIds?: string[];
  specialInstructions?: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService extends ApiService {
  getAll(status?: string): Observable<Order[]> {
    return this.get<Order[]>('orders', status ? { status } : undefined);
  }

  getActive(): Observable<Order[]> {
    return this.getAll().pipe(
      map(orders => orders.filter(o => o.status !== 'cancelled'))
    );
  }

  getById(id: string): Observable<Order> { return this.get<Order>(`orders/${id}`); }

  create(body: { tableId: string; customerId?: string; orderType?: string; items: OrderItemRequest[]; specialInstructions?: string; taxRate?: number }): Observable<Order> {
    return this.post<Order>('orders', body);
  }

  updateStatus(id: string, status: string): Observable<Order> {
    return this.patch<Order>(`orders/${id}/status`, { status });
  }

  addItems(id: string, items: OrderItemRequest[], taxRate?: number): Observable<Order> {
    return this.post<Order>(`orders/${id}/items`, { items, taxRate });
  }
}
