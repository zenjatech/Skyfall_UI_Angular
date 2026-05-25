import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    .login-wrap { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: var(--bg); }
    .login-card { width: 100%; max-width: 380px; padding: 40px; background: var(--surface); border-radius: 12px; border: 1px solid var(--border); }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
    .subtitle { color: var(--text-muted); margin: 0 0 28px; font-size: 14px; }
    .error { background: #7f1d1d; color: #fca5a5; padding: 10px 12px; border-radius: var(--radius); margin-bottom: 16px; font-size: 13px; }
    .btn-primary { width: 100%; justify-content: center; padding: 10px; margin-top: 4px; }
  `],
  template: `
    <div class="login-wrap">
      <div class="login-card">
        <h1>🍽 Skyfall</h1>
        <p class="subtitle">Restaurant Admin</p>

        @if (error()) {
          <div class="error">{{ error() }}</div>
        }

        <form (ngSubmit)="submit()">
          <div class="form-group">
            <label>Tenant ID</label>
            <input type="text" [(ngModel)]="tenantId" name="tenantId" placeholder="Enter tenant ID" required />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" [(ngModel)]="email" name="email" placeholder="staff@example.com" required />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" [(ngModel)]="password" name="password" placeholder="••••••••" required />
          </div>
          <button class="btn btn-primary" type="submit" [disabled]="loading()">
            {{ loading() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
      </div>
    </div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  tenantId = '';
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  submit(): void {
    if (!this.tenantId || !this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.tenantId, { email: this.email, password: this.password }).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err: Error) => { this.error.set(err.message); this.loading.set(false); }
    });
  }
}
