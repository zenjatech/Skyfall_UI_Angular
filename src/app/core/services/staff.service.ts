import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Staff } from '../models/staff.model';

@Injectable({ providedIn: 'root' })
export class StaffService extends ApiService {
  getAll(): Observable<Staff[]> { return this.get<Staff[]>('staff'); }
  getById(id: string): Observable<Staff> { return this.get<Staff>(`staff/${id}`); }
  create(body: { name: string; email: string; password: string; role: string }): Observable<Staff> { return this.post<Staff>('staff', body); }
  update(id: string, body: Partial<{ name: string; role: string; isActive: boolean }>): Observable<Staff> { return this.put<Staff>(`staff/${id}`, body); }
  delete(id: string): Observable<void> { return this.httpDelete(`staff/${id}`); }
}
