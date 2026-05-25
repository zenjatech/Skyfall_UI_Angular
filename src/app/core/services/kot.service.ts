import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { KOT } from '../models/kot.model';

@Injectable({ providedIn: 'root' })
export class KotService extends ApiService {
  getAll(status?: string): Observable<KOT[]> {
    return this.get<KOT[]>('kots', status ? { status } : undefined);
  }
  updateStatus(id: string, status: string): Observable<KOT> {
    return this.patch<KOT>(`kots/${id}/status`, { status });
  }
}
