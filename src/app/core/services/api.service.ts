import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  protected readonly http = inject(HttpClient);
  protected readonly base = environment.apiBaseUrl;

  protected tenantId = '';

  setTenantId(id: string) { this.tenantId = id; }

  protected get<T>(path: string, params?: Record<string, string>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) Object.entries(params).forEach(([k, v]) => (httpParams = httpParams.set(k, v)));
    return this.http.get<ApiEnvelope<T>>(`${this.base}/${path}`, { params: httpParams }).pipe(
      map(r => this.unwrap(r)),
      catchError(this.handleError)
    );
  }

  protected post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<ApiEnvelope<T>>(`${this.base}/${path}`, body).pipe(
      map(r => this.unwrap(r)),
      catchError(this.handleError)
    );
  }

  protected put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<ApiEnvelope<T>>(`${this.base}/${path}`, body).pipe(
      map(r => this.unwrap(r)),
      catchError(this.handleError)
    );
  }

  protected patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<ApiEnvelope<T>>(`${this.base}/${path}`, body).pipe(
      map(r => this.unwrap(r)),
      catchError(this.handleError)
    );
  }

  protected httpDelete(path: string): Observable<void> {
    return this.http.delete(`${this.base}/${path}`).pipe(
      map(() => undefined as void),
      catchError(this.handleError)
    );
  }

  private unwrap<T>(r: ApiEnvelope<T>): T {
    if (!r.success) throw new Error(r.message || 'Request failed');
    return r.data as T;
  }

  private handleError = (err: unknown): Observable<never> => {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as Partial<ApiEnvelope<unknown>> | null;
      if (body?.message) return throwError(() => new Error(body.message));
      if (body?.errors?.length) return throwError(() => new Error(body.errors!.join(' ')));
      return throwError(() => new Error(`HTTP ${err.status}: ${err.statusText}`));
    }
    if (err instanceof Error) return throwError(() => err);
    return throwError(() => new Error('An unexpected error occurred'));
  };
}
