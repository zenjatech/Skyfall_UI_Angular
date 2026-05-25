import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe, TitleCasePipe } from '@angular/common';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, TitleCasePipe],
  styles: [`
    .shell { display: flex; height: 100vh; overflow: hidden; }
    nav {
      width: 220px; min-width: 220px; background: var(--surface); border-right: 1px solid var(--border);
      display: flex; flex-direction: column; padding: 0;
    }
    .logo { padding: 20px 16px; font-size: 18px; font-weight: 700; color: var(--primary); border-bottom: 1px solid var(--border); }
    .nav-links { flex: 1; padding: 12px 0; overflow-y: auto; }
    .nav-item {
      display: flex; align-items: center; gap: 10px; padding: 10px 16px; color: var(--text-muted);
      text-decoration: none; font-size: 14px; border-radius: 0; transition: all .15s;
      &:hover, &.active { background: var(--surface-2); color: var(--text); }
      &.active { border-left: 3px solid var(--primary); }
    }
    .nav-icon { font-size: 16px; width: 20px; text-align: center; }
    .user-bar {
      padding: 12px 16px; border-top: 1px solid var(--border); font-size: 13px;
      .name { font-weight: 600; color: var(--text); }
      .role { color: var(--text-muted); font-size: 12px; }
      .logout { margin-top: 8px; }
    }
    .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .content { flex: 1; overflow-y: auto; padding: 24px; }
  `],
  template: `
    <div class="shell">
      <nav>
        <div class="logo">🍽 Skyfall</div>
        <div class="nav-links">
          <a class="nav-item" routerLink="/dashboard" routerLinkActive="active"><span class="nav-icon">📊</span> Dashboard</a>
          <a class="nav-item" routerLink="/pos" routerLinkActive="active"><span class="nav-icon">🛒</span> POS</a>
          <a class="nav-item" routerLink="/kitchen" routerLinkActive="active"><span class="nav-icon">👨‍🍳</span> Kitchen</a>
          <a class="nav-item" routerLink="/orders" routerLinkActive="active"><span class="nav-icon">📋</span> Orders</a>
          <a class="nav-item" routerLink="/tables" routerLinkActive="active"><span class="nav-icon">🪑</span> Tables</a>
          <a class="nav-item" routerLink="/menu" routerLinkActive="active"><span class="nav-icon">🍔</span> Menu</a>
          <a class="nav-item" routerLink="/staff" routerLinkActive="active"><span class="nav-icon">👤</span> Staff</a>
          <a class="nav-item" routerLink="/customers" routerLinkActive="active"><span class="nav-icon">🧑‍🤝‍🧑</span> Customers</a>
        </div>
        @if (user$ | async; as user) {
          <div class="user-bar">
            <div class="name">{{ user.name }}</div>
            <div class="role">{{ user.role | titlecase }}</div>
            <button class="btn btn-ghost logout" (click)="logout()">Sign out</button>
          </div>
        }
      </nav>
      <div class="main">
        <div class="content"><router-outlet /></div>
      </div>
    </div>
  `
})
export class ShellComponent {
  private auth = inject(AuthService);
  readonly user$ = this.auth.user$;
  logout() { this.auth.logout(); }
}
