import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Category, MenuItem } from '../models/menu.model';

@Injectable({ providedIn: 'root' })
export class MenuService extends ApiService {
  getCategories(): Observable<Category[]> { return this.get<Category[]>('menu/categories'); }
  createCategory(body: { name: string; icon?: string; displayOrder?: number }): Observable<Category> { return this.post<Category>('menu/categories', body); }
  updateCategory(id: string, body: Partial<{ name: string; icon: string; displayOrder: number; isActive: boolean }>): Observable<Category> { return this.put<Category>(`menu/categories/${id}`, body); }
  deleteCategory(id: string): Observable<void> { return this.httpDelete(`menu/categories/${id}`); }

  getItems(categoryId?: string): Observable<MenuItem[]> {
    return this.get<MenuItem[]>('menu/items', categoryId ? { categoryId } : undefined);
  }
  getItemById(id: string): Observable<MenuItem> { return this.get<MenuItem>(`menu/items/${id}`); }
  createItem(body: { categoryId: string; name: string; description?: string; basePrice: number; isVeg?: boolean; prepTimeMinutes?: number }): Observable<MenuItem> { return this.post<MenuItem>('menu/items', body); }
  updateItem(id: string, body: Partial<{ name: string; description: string; basePrice: number; isAvailable: boolean; isVeg: boolean; categoryId: string }>): Observable<MenuItem> { return this.put<MenuItem>(`menu/items/${id}`, body); }
  deleteItem(id: string): Observable<void> { return this.httpDelete(`menu/items/${id}`); }
}
