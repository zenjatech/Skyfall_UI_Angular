import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { IconComponent } from '../../core/components/icon.component';
import { KotService } from '../../core/services/kot.service';
import { KOT } from '../../core/models/kot.model';

const STATUS_CFG: Record<string, { label: string; badgeBg: string; badgeColor: string; border: string; headerBg: string }> = {
  new: {
    label: 'NEW', badgeBg: '#FEF3C7', badgeColor: '#92400E',
    border: '#C47A2A', headerBg: '#FDF3E3',
  },
  acknowledged: {
    label: 'PREPARING', badgeBg: '#F7EDD8', badgeColor: '#8A6A24',
    border: '#E8DBBF', headerBg: '#FBF6EC',
  },
  completed: {
    label: 'READY', badgeBg: '#EBF7ED', badgeColor: '#2A7A3A',
    border: '#2A7A3A', headerBg: '#EBF7ED',
  },
};

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [],
  styles: [`
    :host { display: contents; }
    .wrap { margin: -24px; display: flex; flex-direction: column; min-height: calc(100vh - 58px); background: #fff; }

    /* Kitchen header */
    .kit-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 20px;
      border-bottom: 1px solid #E8DBBF;
      background: #fff;
      flex-shrink: 0;
    }
    .kit-title { font-family: var(--font-heading); font-size: 22px; font-weight: 500; color: #1A1A1A; line-height: 1; }
    .live-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .live-dot { width: 7px; height: 7px; border-radius: 50%; background: #2A7A3A; animation: livePulse 2s infinite; }
    @keyframes livePulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
    .live-text { font-size: 11px; color: #7A7060; }
    .kit-right { display: flex; align-items: center; gap: 20px; }
    .clock-wrap { text-align: right; }
    .clock-time { font-size: 18px; font-weight: 600; color: #1A1A1A; line-height: 1.1; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
    .clock-date { font-size: 11px; color: #7A7060; margin-top: 2px; }
    .autoprint-btn { display: flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 7px; border: 1px solid; background: none; font-size: 11px; font-weight: 500; cursor: pointer; font-family: var(--font-body); transition: all .15s;
      &.on  { border-color: #B8923A; background: #FBF6EC; color: #8A6A24; }
      &.off { border-color: #E8DBBF; background: transparent; color: #7A7060; }
    }
    .ap-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
    .gold-line { height: 1.5px; background: linear-gradient(90deg, transparent, #B8923A 20%, #B8923A 80%, transparent); flex-shrink: 0; }

    /* KOT grid */
    .kot-grid { padding: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }

    /* KOT card */
    .kot-card { background: #fff; border-radius: 12px; overflow: hidden; border: 1.5px solid; animation: kotIn .28s ease-out; }
    @keyframes kotIn { from { opacity:0; transform:translateY(-18px) scale(.97); } to { opacity:1; transform:none; } }
    .kot-head { padding: 9px 14px; border-bottom: 1px solid #E8DBBF; display: flex; align-items: center; justify-content: space-between; }
    .kot-label { font-size: 14px; font-weight: 500; color: #1A1A1A; line-height: 1.2; }
    .kot-time { font-size: 10px; color: #A8998A; margin-top: 2px; }
    .status-badge { display: inline-flex; align-items: center; gap: 3px; border-radius: 20px; padding: 2px 9px; font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
    .new-pulse { animation: newPulse 1.5s ease-in-out infinite; }
    @keyframes newPulse { 0%,100% { opacity:1; } 50% { opacity:.55; } }

    /* Items */
    .kot-items { }
    .kot-item { padding: 8px 14px; display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .item-divider { height: 1px; background: #E8DBBF; margin: 0 14px; }
    .item-name { font-size: 12px; color: #1A1A1A; line-height: 1.4; }
    .item-variant { font-size: 11px; color: #7A7060; margin-left: 4px; }
    .item-note { margin-top: 4px; padding: 3px 7px; border-radius: 4px; background: #FEF3C7; color: #92400E; font-size: 10px; line-height: 1.4; }
    .item-qty { font-size: 12px; font-weight: 600; color: #B8923A; white-space: nowrap; }

    /* Actions */
    .kot-actions { padding: 6px 12px 10px; display: flex; gap: 6px; }
    .action-btn { flex: 1; padding: 6px 0; border-radius: 7px; border: 1px solid; background: transparent; font-size: 12px; font-weight: 500; cursor: pointer; font-family: var(--font-body); transition: background .12s;
      &.acknowledge { border-color: #D4BF96; color: #8A6A24; &:hover { background: #F7EDD8; } }
      &.ready       { border-color: #2A7A3A; color: #2A7A3A; &:hover { background: #EBF7ED; } }
      &.done        { border-color: #E8DBBF; color: #A8998A; cursor: not-allowed; }
    }

    /* Empty / Loading */
    .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 65vh; gap: 16px; text-align: center; padding: 24px; }
    .empty-icon { width: 72px; height: 72px; border-radius: 50%; border: 1.5px solid #E8DBBF; background: #FBF6EC; display: flex; align-items: center; justify-content: center; font-size: 30px; }
    .empty-title { font-family: var(--font-heading); font-size: 22px; color: #1A1A1A; }
    .empty-sub { font-size: 13px; color: #7A7060; margin-top: 4px; }
    .spinner { width: 28px; height: 28px; border: 2px solid #E8DBBF; border-top-color: #B8923A; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .sk-grid { padding: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .sk-card { background: #fff; border: 1.5px solid #E8DBBF; border-radius: 12px; overflow: hidden; }
    .sk-head { background: #FBF6EC; padding: 9px 14px; border-bottom: 1px solid #E8DBBF; }
    .sk-line { height: 12px; border-radius: 4px; background: #E8DBBF; }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .kit-head         { flex-direction: column; align-items: flex-start; gap: 10px; padding: 10px 14px; }
      .clock-wrap       { display: none; }
      .kit-title        { font-size: 18px; }
      .autoprint-btn    { font-size: 10px; padding: 4px 10px; }
      .kot-grid         { padding: 10px; gap: 10px; }
    }
    @media (max-width: 400px) {
      .kot-grid         { grid-template-columns: 1fr; }
    }
  `],
  template: `
    <div class="wrap">
      <header class="kit-head">
        <div>
          <div class="kit-title">Kitchen Display</div>
          <div class="live-row">
            <span class="live-dot"></span>
            <span class="live-text">{{ loading() ? 'Connecting…' : 'Live · ' + activeCount() + ' active order' + (activeCount() !== 1 ? 's' : '') }}</span>
          </div>
        </div>
        <div class="kit-right">
          <div class="clock-wrap">
            <div class="clock-time">{{ clockTime }}</div>
            <div class="clock-date">{{ clockDate }}</div>
          </div>
          <button class="autoprint-btn" [class.on]="autoPrint" [class.off]="!autoPrint" (click)="autoPrint = !autoPrint">
            <span class="ap-dot" [style.background]="autoPrint ? '#B8923A' : '#A8998A'"></span>
            Auto-print: {{ autoPrint ? 'ON' : 'OFF' }}
          </button>
        </div>
      </header>
      <div class="gold-line"></div>

      @if (loading()) {
        <div class="sk-grid">
          @for (s of [1,2,3]; track s) {
            <div class="sk-card">
              <div class="sk-head">
                <div class="sk-line" style="width:150px"></div>
                <div class="sk-line" style="width:60px;margin-top:6px"></div>
              </div>
              <div style="padding:8px 14px">
                @for (r of [1,2]; track r) {
                  <div style="display:flex;justify-content:space-between;padding:6px 0">
                    <div class="sk-line" style="width:58%"></div>
                    <div class="sk-line" style="width:24px"></div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      } @else if (kots().length === 0) {
        <div class="empty">
          <div class="empty-icon">🍽️</div>
          <div>
            <div class="empty-title">No active orders</div>
            <div class="empty-sub">Kitchen is clear</div>
          </div>
        </div>
      } @else {
        <div class="kot-grid">
          @for (kot of kots(); track kot.id) {
            <article class="kot-card" [style.border-color]="cfg(kot.status).border">
              <div class="kot-head" [style.background]="cfg(kot.status).headerBg">
                <div>
                  <div class="kot-label">Table {{ kot.tableNumber }} · KOT #{{ kot.kotNumber }}</div>
                  <div class="kot-time">{{ elapsed(kot.createdAt) }}</div>
                </div>
                <span class="status-badge" [class.new-pulse]="kot.status === 'new'"
                      [style.background]="cfg(kot.status).badgeBg"
                      [style.color]="cfg(kot.status).badgeColor">
                  @if (kot.status === 'completed') {
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3 5.5L6.5 2" stroke="#2A7A3A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  }
                  {{ cfg(kot.status).label }}
                </span>
              </div>

              <div class="kot-items">
                @for (item of parseItems(kot.itemsJson); track $index) {
                  @if ($index > 0) { <div class="item-divider"></div> }
                  <div class="kot-item">
                    <div style="flex:1;min-width:0">
                      <div class="item-name">
                        {{ item.name ?? item.Name ?? 'Item' }}
                        @if (item.variant_name ?? item.Variant) {
                          <span class="item-variant">({{ item.variant_name ?? item.Variant }})</span>
                        }
                      </div>
                      @if (item.special_instructions) {
                        <div class="item-note">{{ item.special_instructions }}</div>
                      }
                    </div>
                    <span class="item-qty">×{{ item.quantity ?? item.Quantity ?? 1 }}</span>
                  </div>
                }
              </div>

              <div class="kot-actions">
                @if (kot.status === 'new') {
                  <button class="action-btn acknowledge" (click)="acknowledge(kot)">Acknowledge</button>
                  <button class="action-btn ready" (click)="complete(kot)">Mark Ready</button>
                } @else if (kot.status === 'acknowledged') {
                  <button class="action-btn ready" (click)="complete(kot)">Mark Ready</button>
                } @else {
                  <button class="action-btn done" disabled>✓ Waiter Notified</button>
                }
              </div>
            </article>
          }
        </div>
      }
    </div>
  `
})
export class KitchenComponent implements OnInit, OnDestroy {
  private kotService = inject(KotService);
  kots = signal<KOT[]>([]);
  loading = signal(true);
  autoPrint = true;
  clockTime = '';
  clockDate = '';
  private clockInterval?: ReturnType<typeof setInterval>;
  private pollInterval?: ReturnType<typeof setInterval>;

  activeCount() { return this.kots().filter(k => k.status !== 'completed').length; }

  ngOnInit(): void {
    this.tick();
    this.clockInterval = setInterval(() => this.tick(), 1000);
    this.load();
    this.pollInterval = setInterval(() => this.load(true), 5000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  private tick(): void {
    const now = new Date();
    this.clockTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
    this.clockDate = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  load(silent = false): void {
    if (!silent) this.loading.set(true);
    this.kotService.getAll().subscribe({
      next: data => { this.kots.set(data.filter(k => k.status !== 'completed')); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  cfg(status: string) {
    return STATUS_CFG[status] ?? STATUS_CFG['new'];
  }

  elapsed(date: string | Date): string {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  parseItems(json: string): any[] {
    try { return JSON.parse(json); } catch { return []; }
  }

  acknowledge(kot: KOT): void {
    this.kotService.updateStatus(kot.id, 'acknowledged').subscribe({
      next: updated => this.kots.update(list => list.map(k => k.id === updated.id ? updated : k))
    });
  }

  complete(kot: KOT): void {
    this.kotService.updateStatus(kot.id, 'completed').subscribe({
      next: () => this.kots.update(list => list.filter(k => k.id !== kot.id))
    });
  }
}
