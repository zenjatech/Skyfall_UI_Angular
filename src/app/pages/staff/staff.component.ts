import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StaffService } from '../../core/services/staff.service';
import { Staff } from '../../core/models/staff.model';
import { IconComponent } from '../../core/components/icon.component';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [FormsModule, IconComponent],
  styles: [`
    .wrap { display: flex; flex-direction: column; gap: 22px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0; }
    .page-title { font-family: var(--font-heading); font-size: 22px; font-weight: 600; color: #1A1A1A; margin: 0; }
    .add-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; border: none; background: #B8923A; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; font-family: var(--font-body); transition: background .15s;
      &:hover { background: #8A6A24; }
    }
    .sc { border-radius: 12px; border: 1px solid #E8DBBF; background: #fff; overflow: hidden; }
    .sc-head { display: flex; align-items: center; justify-content: space-between; min-height: 54px; padding: 0 20px; border-bottom: 1px solid #E8DBBF; }
    .sc-title { font-family: var(--font-heading); font-size: 16px; font-weight: 600; color: #1A1A1A; margin: 0; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table thead tr { background: #FAFAF7; text-align: left; }
    .data-table th { padding: 10px 16px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; color: #A8998A; }
    .data-table td { padding: 12px 16px; font-size: 12px; color: #1A1A1A; }
    .data-table tr:not(:first-child) td { border-top: 1px solid #E8DBBF; }
    .data-table tr:hover td { background: #FBF6EC; }
    .staff-cell { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: #F7EDD8; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #8A6A24; flex-shrink: 0; }
    .staff-name { font-size: 12px; font-weight: 600; color: #1A1A1A; }
    .staff-email { font-size: 10px; color: #A8998A; }
    .role-chip { display: inline-block; border-radius: 10px; border: 1px solid #E8DBBF; background: #F4EFE6; padding: 3px 8px; font-size: 10px; font-weight: 500; color: #7A7060; text-transform: capitalize; }
    .active-dot { display: inline-flex; align-items: center; gap: 6px; font-size: 12px;
      &::before { content:''; display:inline-block; width:7px; height:7px; border-radius:50%; }
      &.yes { color: #2A7A3A; &::before { background:#2A7A3A; } }
      &.no  { color: #A8998A; &::before { background:#A8998A; } }
    }
    .action-btns { display: flex; gap: 8px; }
    .act-btn { display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 10px; border-radius: 6px; font-size: 11px; font-weight: 500; cursor: pointer; font-family: var(--font-body); transition: background .12s;
      &.edit { border: 1px solid #E8DBBF; background: #fff; color: #7A7060; &:hover { background: #FBF6EC; color: #8A6A24; } }
      &.del  { border: 1px solid #FBEAEA; background: #fff; color: #B03030; &:hover { background: #FBEAEA; } }
    }
    .loading-center { display: flex; align-items: center; justify-content: center; padding: 48px; }
    .spinner { width: 28px; height: 28px; border: 2px solid #E8DBBF; border-top-color: #B8923A; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { padding: 48px 24px; text-align: center; color: #7A7060; }

    /* Modal */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(26,26,26,.45); display: flex; align-items: center; justify-content: center; z-index: 100; animation: fadeIn .15s ease-out; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    .modal-panel { background: #fff; border-radius: 14px; border: 1px solid #E8DBBF; box-shadow: 0 20px 60px rgba(184,146,58,0.15); width: 460px; max-width: 94vw; padding: 28px; }
    .modal-title { font-family: var(--font-heading); font-size: 20px; font-weight: 600; color: #1A1A1A; margin: 0 0 20px; }
    .form-group { margin-bottom: 14px; label { display: block; font-size: 11px; color: #7A7060; margin-bottom: 5px; } }
    .field-input { min-height: 40px; width: 100%; border-radius: 8px; border: 1px solid #E8DBBF; background: #FAFAF7; padding: 0 12px; font-size: 13px; color: #1A1A1A; outline: none; transition: border-color .15s; font-family: var(--font-body);
      &::placeholder { color: #A8998A; }
      &:focus { border-color: #B8923A; box-shadow: 0 0 0 2px rgba(184,146,58,0.18); }
    }
    .modal-footer { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; padding-top: 16px; border-top: 1px solid #E8DBBF; }
    .btn-cancel { padding: 8px 16px; border-radius: 8px; border: 1px solid #E8DBBF; background: transparent; color: #7A7060; font-size: 13px; font-weight: 500; cursor: pointer; font-family: var(--font-body); &:hover { background: #FBF6EC; } }
    .btn-save { padding: 8px 16px; border-radius: 8px; border: none; background: #B8923A; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; font-family: var(--font-body); &:hover { background: #8A6A24; } }
  `],
  template: `
    <div class="wrap">
      <div class="page-header">
        <h1 class="page-title">Staff</h1>
        <button class="add-btn" (click)="openAdd()">
          <app-icon name="plus" [size]="14" [sw]="1.8"></app-icon>
          Add Staff
        </button>
      </div>

      <div class="sc">
        <div class="sc-head">
          <h2 class="sc-title">Team Members</h2>
          @if (!loading()) { <span style="font-size:11px;color:#7A7060">{{ staff().length }} members</span> }
        </div>

        @if (loading()) {
          <div class="loading-center"><div class="spinner"></div></div>
        } @else if (staff().length === 0) {
          <div class="empty-state">No staff members found.</div>
        } @else {
          <table class="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              @for (s of staff(); track s.id) {
                <tr>
                  <td>
                    <div class="staff-cell">
                      <div class="avatar">{{ initials(s.name) }}</div>
                      <div class="staff-name">{{ s.name }}</div>
                    </div>
                  </td>
                  <td style="color:#7A7060">{{ s.email }}</td>
                  <td><span class="role-chip">{{ s.role }}</span></td>
                  <td><span class="active-dot {{ s.isActive ? 'yes' : 'no' }}">{{ s.isActive ? 'Active' : 'Inactive' }}</span></td>
                  <td>
                    <div class="action-btns">
                      <button class="act-btn edit" (click)="openEdit(s)">
                        <app-icon name="pen" [size]="12" [sw]="1.8"></app-icon>
                        Edit
                      </button>
                      <button class="act-btn del" (click)="remove(s.id)">
                        <app-icon name="trash-2" [size]="12" [sw]="1.8"></app-icon>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    @if (showModal()) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal-panel" (click)="$event.stopPropagation()">
          <h2 class="modal-title">{{ editingId() ? 'Edit Staff' : 'Add Staff Member' }}</h2>

          <div class="form-group"><label>Name</label><input class="field-input" [(ngModel)]="form.name" placeholder="Full name" /></div>
          @if (!editingId()) {
            <div class="form-group"><label>Email</label><input class="field-input" type="email" [(ngModel)]="form.email" placeholder="staff@example.com" /></div>
            <div class="form-group"><label>Password</label><input class="field-input" type="password" [(ngModel)]="form.password" placeholder="••••••••" /></div>
          }
          <div class="form-group">
            <label>Role</label>
            <select class="field-input" [(ngModel)]="form.role">
              <option value="admin">Admin</option>
              <option value="waiter">Waiter</option>
              <option value="kitchen">Kitchen</option>
            </select>
          </div>
          @if (editingId()) {
            <div class="form-group">
              <label>Status</label>
              <select class="field-input" [(ngModel)]="form.isActive">
                <option [ngValue]="true">Active</option>
                <option [ngValue]="false">Inactive</option>
              </select>
            </div>
          }

          <div class="modal-footer">
            <button class="btn-cancel" (click)="closeModal()">Cancel</button>
            <button class="btn-save" (click)="save()">Save</button>
          </div>
        </div>
      </div>
    }
  `
})
export class StaffComponent implements OnInit {
  private staffService = inject(StaffService);
  staff = signal<Staff[]>([]);
  loading = signal(true);
  showModal = signal(false);
  editingId = signal<string | null>(null);
  form: any = { name: '', email: '', password: '', role: 'waiter', isActive: true };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.staffService.getAll().subscribe({ next: d => { this.staff.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  initials(name: string): string { return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase(); }

  openAdd(): void { this.form = { name: '', email: '', password: '', role: 'waiter' }; this.editingId.set(null); this.showModal.set(true); }
  openEdit(s: Staff): void { this.form = { name: s.name, role: s.role, isActive: s.isActive }; this.editingId.set(s.id); this.showModal.set(true); }
  closeModal(): void { this.showModal.set(false); }

  save(): void {
    const id = this.editingId();
    const obs = id
      ? this.staffService.update(id, { name: this.form.name, role: this.form.role, isActive: this.form.isActive })
      : this.staffService.create({ name: this.form.name, email: this.form.email, password: this.form.password, role: this.form.role });
    obs.subscribe({ next: () => { this.load(); this.closeModal(); } });
  }

  remove(id: string): void {
    if (!confirm('Delete this staff member?')) return;
    this.staffService.delete(id).subscribe({ next: () => this.load() });
  }
}
