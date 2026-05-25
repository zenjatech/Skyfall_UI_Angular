import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CafeTable } from '../models/table.model';

@Injectable({ providedIn: 'root' })
export class TableService extends ApiService {
  getAll(): Observable<CafeTable[]> { return this.get<CafeTable[]>('tables'); }
  getById(id: string): Observable<CafeTable> { return this.get<CafeTable>(`tables/${id}`); }
  create(body: { tableNumber: number; capacity: number }): Observable<CafeTable> { return this.post<CafeTable>('tables', body); }
  update(id: string, body: Partial<{ capacity: number; status: string }>): Observable<CafeTable> { return this.put<CafeTable>(`tables/${id}`, body); }
  delete(id: string): Observable<void> { return this.httpDelete(`tables/${id}`); }
}
