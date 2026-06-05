import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../core/components/icon.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IconComponent],
  styles: [`
    .login-wrap {
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      background: var(--background);
      padding: 24px;
    }
    .login-card {
      width: 100%; max-width: 380px;
      background: #fff;
      border: 1px solid #E8DBBF;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(184,146,58,0.1);
      overflow: hidden;
    }
    .card-top {
      padding: 32px 32px 0;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
    }
    .brand-logo {
      width: 96px; height: 96px;
      object-fit: contain;
      margin-bottom: 4px;
    }
    .brand-name {
      font-family: var(--font-heading);
      font-size: 22px; font-weight: 600;
      color: #B8923A;
      letter-spacing: 0.1em;
    }
    .brand-portal {
      font-size: 11px;
      color: #7A7060;
      letter-spacing: 0.05em;
    }
    .gold-divider {
      margin: 20px 32px;
      height: 1px;
      background: linear-gradient(to right, transparent, #B8923A, transparent);
    }
    .card-body {
      padding: 0 32px 32px;
    }
    .welcome {
      font-family: var(--font-heading);
      font-size: 20px; font-weight: 500;
      color: #1A1A1A;
      margin: 0 0 20px;
    }
    .login-form {
      display: flex; flex-direction: column; gap: 16px;
    }
    .field {
      display: flex; flex-direction: column; gap: 5px;
      label { font-size: 11px; color: #7A7060; }
    }
    .pw-wrap {
      position: relative;
      input { padding-right: 40px; }
    }
    .pw-toggle {
      position: absolute; right: 10px; top: 50%;
      transform: translateY(-50%);
      background: none; border: none; cursor: pointer;
      color: #7A7060; padding: 2px;
      display: flex; align-items: center;
    }
    .error-msg {
      background: #FBEAEA; color: #B03030;
      font-size: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid rgba(176,48,48,0.15);
    }
    .submit-btn {
      width: 100%; height: 44px;
      background: #B8923A; color: #fff;
      border: none; border-radius: 8px;
      font-size: 14px; font-weight: 500;
      font-family: var(--font-body);
      cursor: pointer;
      transition: background .15s;
      margin-top: 4px;
      &:hover:not(:disabled) { background: #8A6A24; }
      &:disabled { background: #D4BF96; cursor: not-allowed; }
    }
  `],
  template: `
    <div class="login-wrap">
      <div class="login-card">
        <div class="card-top">
          <img class="brand-logo" src="assets/logo.jpg" alt="Skyfall Lounge">
          <div class="brand-portal">Staff Portal</div>
        </div>

        <div class="gold-divider"></div>

        <div class="card-body">
          <h1 class="welcome">Welcome back</h1>

          <form class="login-form" (ngSubmit)="submit()">
            <div class="field">
              <label for="tenantId">Tenant ID</label>
              <input id="tenantId" type="text" class="field-input"
                     [(ngModel)]="tenantId" name="tenantId"
                     placeholder="Enter tenant ID" required />
            </div>

            <div class="field">
              <label for="email">Email address</label>
              <input id="email" type="email" class="field-input"
                     [(ngModel)]="email" name="email"
                     placeholder="staff@skyfalllounge.com" required />
            </div>

            <div class="field">
              <label for="password">Password</label>
              <div class="pw-wrap">
                <input id="password" [type]="showPw ? 'text' : 'password'"
                       class="field-input"
                       [(ngModel)]="password" name="password"
                       placeholder="••••••••" required />
                <button type="button" class="pw-toggle"
                        [attr.aria-label]="showPw ? 'Hide password' : 'Show password'"
                        (click)="showPw = !showPw">
                  <app-icon [name]="showPw ? 'eye-off' : 'eye'" [size]="15" [sw]="1.8"></app-icon>
                </button>
              </div>
            </div>

            @if (error()) {
              <div class="error-msg">{{ error() }}</div>
            }

            <button type="submit" class="submit-btn" [disabled]="loading()">
              {{ loading() ? 'Signing in…' : 'Sign In' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  tenantId = '';
  email = '';
  password = '';
  showPw = false;
  loading = signal(false);
  error = signal('');

  ngOnInit(): void {
    const bypass = environment.devBypass;
    if (bypass) {
      this.tenantId = bypass.tenantId;
      this.email = bypass.email;
      this.password = bypass.password;
      this.submit();
    }
  }

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
