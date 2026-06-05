import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Category, MenuItem } from '../models/menu.model';
import { Customer } from '../models/customer.model';
import { Order } from '../models/order.model';
import { PublicBilling } from '../models/payment.model';
import { OrderItemRequest } from './order.service';
import { CafeTable } from '../models/table.model';

export interface PublicMenu {
  categories: Category[];
  items: MenuItem[];
}

export interface CustomerIdentify {
  customer: Customer;
  isNew: boolean;
}

@Injectable({ providedIn: 'root' })
export class PublicService extends ApiService {
  getMenu(): Observable<PublicMenu> {
    return this.get<PublicMenu>('public/menu');
  }

  getTable(tableId: string): Observable<CafeTable> {
    if (/^\d+$/.test(tableId)) {
      return this.get<CafeTable>(`public/tables/by-number/${Number(tableId)}`);
    }

    return this.get<CafeTable>(`public/tables/${tableId}`);
  }

  identifyCustomer(body: {
    phone: string;
    name?: string;
    email?: string;
    birthday?: string;
    anniversary?: string;
    specialEventDate?: string;
    specialEventName?: string;
  }): Observable<CustomerIdentify> {
    return this.post<CustomerIdentify>('public/customers/identify', body);
  }

  createOrder(body: {
    tableId: string;
    customerId?: string;
    orderType?: string;
    specialInstructions?: string;
    items: OrderItemRequest[];
  }): Observable<Order> {
    return this.post<Order>('public/orders', body);
  }

  getOrder(orderId: string): Observable<Order> {
    return this.get<Order>(`public/orders/${orderId}`);
  }

  getBilling(orderId: string): Observable<PublicBilling> {
    return this.get<PublicBilling>(`public/billing/${orderId}`);
  }
}
