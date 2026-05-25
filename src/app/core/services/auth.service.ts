import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest } from '../models/auth.model';

interface ApiEnvelope<T> { success: boolean; message: string; data?: T; errors?: string[]; }

const TOKEN_KEY = 'sf_token';
const TENANT_KEY = 'sf_tenant';
const USER_KEY = 'sf_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private authState = new BehaviorSubject<AuthResponse | null>(this.loadStoredUser());
  readonly user$ = this.authState.asObservable();

  get token(): string | null { return localStorage.getItem(TOKEN_KEY); }
  get tenantId(): string { return localStorage.getItem(TENANT_KEY) ?? ''; }
  get isLoggedIn(): boolean { return !!this.token; }
  get currentUser(): AuthResponse | null { return this.authState.value; }

  login(tenantId: string, req: LoginRequest): Observable<AuthResponse> {
    return this.http.post<ApiEnvelope<AuthResponse>>(
      `${environment.apiBaseUrl}/auth/login`,
      req,
      { headers: { 'X-Tenant-Id': tenantId } }
    ).pipe(
      map(r => {
        if (!r.success || !r.data) throw new Error(r.message || 'Login failed');
        return r.data;
      }),
      tap(auth => {
        localStorage.setItem(TOKEN_KEY, auth.token);
        localStorage.setItem(TENANT_KEY, tenantId);
        localStorage.setItem(USER_KEY, JSON.stringify(auth));
        this.authState.next(auth);
      }),
      catchError(err => throwError(() => err))
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TENANT_KEY);
    localStorage.removeItem(USER_KEY);
    this.authState.next(null);
    this.router.navigate(['/login']);
  }

  private loadStoredUser(): AuthResponse | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
}
