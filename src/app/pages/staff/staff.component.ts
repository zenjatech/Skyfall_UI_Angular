import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { StaffService } from '../../core/services/staff.service';
import { Staff } from '../../core/models/staff.model';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [FormsModule, DatePipe, TitleCasePipe],
  styles: [`
    .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: var(--surface); border-radius: 12px; padding: 28px; width: 400px; max-width: 90vw; }
    .modal h2 { margin: 0 0 20px; font-size: 18px; }
    .modal-footer { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
  `],
  template: `
    <div class="page-header"><h1>Staff</h1><button class="btn btn-primary" (click)="openAdd()">+ Add Staff</button></div>

    @if (loading()) { <div class="loading"><div class="spinner"></div></div>
    } @else {
      <div class="card table-wrapper">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
          <tbody>
            @for (s of staff(); track s.id) {
              <tr>
                <td>{{ s.name }}</td>
                <td>{{ s.email }}</td>
                <td><span class="badge badge-info">{{ s.role | titlecase }}</span></td>
                <td><span class="badge" [class]="s.isActive ? 'badge-success' : 'badge-neutral'">{{ s.isActive ? 'Active' : 'Inactive' }}</span></td>
                <td>{{ s.lastLoginAt ? (s.lastLoginAt | date:'dd MMM, HH:mm') : '—' }}</td>
                <td>
                  <button class="btn btn-ghost" style="font-size:12px;padding:4px 8px" (click)="openEdit(s)">Edit</button>
                  <button class="btn btn-ghost" style="font-size:12px;padding:4px 8px;color:var(--danger)" (click)="remove(s.id)">Delete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (showModal()) {
      <div class="modal-bg" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h2>{{ editingId() ? 'Edit Staff' : 'New Staff' }}</h2>
          <div class="form-group"><label>Name</label><input [(ngModel)]="form.name" /></div>
          @if (!editingId()) {
            <div class="form-group"><label>Email</label><input type="email" [(ngModel)]="form.email" /></div>
            <div class="form-group"><label>Password</label><input type="password" [(ngModel)]="form.password" /></div>
          }
          <div class="form-group">
            <label>Role</label>
            <select [(ngModel)]="form.role">
              <option value="admin">Admin</option>
              <option value="waiter">Waiter</option>
              <option value="kitchen">Kitchen</option>
            </select>
          </div>
          @if (editingId()) {
            <div class="form-group">
              <label>Active</label>
              <select [(ngModel)]="form.isActive">
                <option [ngValue]="true">Yes</option>
                <option [ngValue]="false">No</option>
              </select>
            </div>
          }
          <div class="modal-footer">
            <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="save()">Save</button>
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

  openAdd(): void { this.form = { name: '', email: '', password: '', role: 'waiter' }; this.editingId.set(null); this.showModal.set(true); }
  openEdit(s: Staff): void { this.form = { name: s.name, role: s.role, isActive: s.isActive }; this.editingId.set(s.id); this.showModal.set(true); }
  closeModal(): void { this.showModal.set(false); }

  save(): void {
    const id = this.editingId();
    const obs = id ? this.staffService.update(id, { name: this.form.name, role: this.form.role, isActive: this.form.isActive })
      : this.staffService.create({ name: this.form.name, email: this.form.email, password: this.form.password, role: this.form.role });
    obs.subscribe({ next: () => { this.load(); this.closeModal(); } });
  }

  remove(id: string): void {
    if (!confirm('Delete staff member?')) return;
    this.staffService.delete(id).subscribe({ next: () => this.load() });
  }
}
