import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Customer } from '../models/customer.model';

@Injectable({ providedIn: 'root' })
export class CustomerService extends ApiService {
  getAll(): Observable<Customer[]> { return this.get<Customer[]>('customers'); }
  getById(id: string): Observable<Customer> { return this.get<Customer>(`customers/${id}`); }
  upsert(body: { phone: string; name?: string; email?: string }): Observable<Customer> { return this.post<Customer>('customers/upsert', body); }
  delete(id: string): Observable<void> { return this.httpDelete(`customers/${id}`); }
}
