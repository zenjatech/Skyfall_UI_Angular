import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TableService } from '../../core/services/table.service';
import { MenuService } from '../../core/services/menu.service';
import { OrderService, OrderItemRequest } from '../../core/services/order.service';
import { PaymentService } from '../../core/services/payment.service';
import { BillingService } from '../../core/services/billing.service';
import { CustomerService } from '../../core/services/customer.service';
import { SettingsService } from '../../core/services/settings.service';
import { CafeTable } from '../../core/models/table.model';
import { Category, MenuItem } from '../../core/models/menu.model';
import { Order } from '../../core/models/order.model';
import { Payment } from '../../core/models/payment.model';
import { IconComponent } from '../../core/components/icon.component';

const STATUS_CFG: Record<string, { bg: string; border: string; label: string; labelColor: string; labelBg: string }> = {
  free:          { bg: '#FFFFFF', border: '#E8DBBF', label: 'Free',      labelColor: '#2A7A3A', labelBg: '#EBF7ED' },
  occupied:      { bg: '#FBF6EC', border: '#D4BF96', label: 'Occupied',  labelColor: '#B8923A', labelBg: '#F7EDD8' },
  bill_requested:{ bg: '#FEF3C7', border: '#D97706', label: 'Bill Req.', labelColor: '#92400E', labelBg: '#FEF3C7' },
  reserved:      { bg: '#EBF0F9', border: '#9ABADF', label: 'Reserved',  labelColor: '#1E4A8A', labelBg: '#DBEAFE' },
};

const LEGEND = [
  { label: 'Free',      dot: '#2A7A3A' },
  { label: 'Occupied',  dot: '#B8923A' },
  { label: 'Bill Req.', dot: '#D97706' },
  { label: 'Reserved',  dot: '#2A5A9A' },
];

interface CartLine { id: string; itemId: string; name: string; price: number; qty: number; isVeg: boolean; }
type PosTable = CafeTable & { orderId?: string; seatedAt?: string };

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [FormsModule, IconComponent],
  styles: [`
    :host { display: contents; }
    .pos { display: flex; flex-direction: column; height: calc(100vh - 58px); margin: -24px; overflow: hidden; background: #FAFAF7; }

    /* Header */
    .pos-head { height: 56px; background: #fff; border-bottom: 1px solid #E8DBBF; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; flex-shrink: 0; position: relative; }
    .pos-logo { display: flex; align-items: center; gap: 8px; }
    .pos-logo-circle { width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid #B8923A; background: #FBF6EC; display: flex; align-items: center; justify-content: center; }
    .pos-logo-name { font-family: var(--font-heading); font-size: 18px; font-weight: 600; color: #B8923A; letter-spacing: 0.08em; }
    .pos-title { position: absolute; left: 50%; transform: translateX(-50%); font-size: 13px; color: #7A7060; font-weight: 500; pointer-events: none; }
    .pos-right { display: flex; align-items: center; gap: 10px; }
    .clock-chip { display: flex; align-items: center; gap: 4px; color: #7A7060; font-size: 12px; }
    .signout-btn { display: flex; align-items: center; gap: 5px; background: transparent; border: 1px solid #E8DBBF; border-radius: 6px; padding: 5px 10px; cursor: pointer; color: #7A7060; font-size: 12px; font-family: var(--font-body); &:hover { background: #FBF6EC; } }

    /* Notice */
    .notice { position: fixed; top: 68px; left: 50%; transform: translateX(-50%); z-index: 20; background: #fff; border: 1px solid #E8DBBF; border-radius: 8px; box-shadow: 0 4px 24px rgba(184,146,58,0.1); color: #1A1A1A; font-size: 12px; padding: 9px 14px; white-space: nowrap; }

    /* Body */
    .pos-body { flex: 1; display: flex; overflow: hidden; }

    /* Table panel (left) */
    .table-panel { width: 38%; background: #fff; border-right: 1px solid #E8DBBF; display: flex; flex-direction: column; overflow: hidden; }
    .tp-head { padding: 12px 16px 10px; border-bottom: 1px solid #E8DBBF; flex-shrink: 0; }
    .tp-title { font-family: var(--font-heading); font-size: 16px; font-weight: 600; color: #1A1A1A; margin-bottom: 10px; }
    .new-order-btn { width: 100%; height: 36px; background: transparent; border: 1px solid #B8923A; border-radius: 8px; color: #B8923A; font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: var(--font-body); &:hover { background: #FBF6EC; } }
    .legend { padding: 8px 16px; border-bottom: 1px solid #F7EDD8; display: flex; gap: 12px; flex-wrap: wrap; flex-shrink: 0; }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
    .legend-label { font-size: 11px; color: #7A7060; }
    .tp-scroll { flex: 1; overflow-y: auto; padding: 12px; }
    .table-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .table-btn { min-height: 118px; border-radius: 10px; border: 1px solid; padding: 10px 8px; cursor: pointer; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; transition: box-shadow .15s; &:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); } &.selected { box-shadow: 0 0 0 2px #B8923A; } }
    .tb-num { font-family: var(--font-heading); font-size: 20px; font-weight: 600; color: #1A1A1A; line-height: 1; }
    .tb-cap { display: flex; align-items: center; gap: 3px; color: #7A7060; font-size: 10px; }
    .tb-status { font-size: 10px; font-weight: 500; padding: 2px 6px; border-radius: 4px; margin-top: 2px; }
    .tb-time { display: flex; align-items: center; gap: 2px; font-size: 10px; margin-top: 1px; }

    /* Menu panel (right) */
    .menu-panel { width: 62%; background: #FAFAF7; display: flex; flex-direction: column; overflow: hidden; }
    .no-table { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; }
    .no-table-title { font-family: var(--font-heading); font-size: 18px; color: #7A7060; }

    /* Table bar */
    .table-bar { min-height: 74px; padding: 14px 24px; background: #FAFAF7; border-bottom: 1px solid #E8DBBF; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex-shrink: 0; }
    .table-badge { background: #F7EDD8; color: #B8923A; font-family: var(--font-heading); font-size: 18px; padding: 8px 16px; border-radius: 8px; }
    .order-chip { background: #fff; border: 1px solid #E8DBBF; color: #7A7060; font-size: 11px; padding: 5px 9px; border-radius: 999px; }
    .seated-chip { display: flex; align-items: center; gap: 4px; color: #7A7060; font-size: 11px; }

    /* Add items — search + categories */
    .menu-controls { padding: 14px 24px 12px; background: #fff; border-bottom: 1px solid #F7EDD8; flex-shrink: 0; }
    .back-btn { font-size: 12px; color: #B8923A; background: transparent; border: none; cursor: pointer; padding: 0 0 10px; display: flex; align-items: center; gap: 4px; font-family: var(--font-body); }
    .search-wrap { position: relative; margin-bottom: 14px; }
    .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #7A7060; pointer-events: none; }
    .search-input { width: 100%; height: 44px; border: 1px solid #E8DBBF; border-radius: 8px; padding: 0 12px 0 38px; font-size: 13px; background: #fff; outline: none; font-family: var(--font-body); color: #1A1A1A; box-sizing: border-box; &::placeholder { color: #A8998A; } &:focus { border-color: #B8923A; box-shadow: 0 0 0 2px rgba(184,146,58,0.18); } }
    .cat-pills { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; }
    .cat-pill { flex-shrink: 0; padding: 7px 18px; border-radius: 20px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid; font-family: var(--font-body); transition: all .12s; &.active { border-color: #B8923A; background: #B8923A; color: #fff; } &:not(.active) { border-color: #E8DBBF; background: #fff; color: #7A7060; &:hover { background: #FBF6EC; } } }

    /* Menu items list */
    .menu-list { flex: 1; overflow-y: auto; padding: 16px 24px; display: flex; flex-direction: column; gap: 10px; }
    .menu-item { background: #fff; border: 1px solid #E8DBBF; border-radius: 10px; padding: 10px 14px; min-height: 70px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .mi-veg-dot { width: 14px; height: 14px; border-radius: 3px; border: 1.5px solid; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .mi-veg-inner { width: 7px; height: 7px; border-radius: 50%; }
    .mi-name { font-size: 14px; font-weight: 500; color: #1A1A1A; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mi-cat { font-size: 12px; color: #7A7060; margin-top: 3px; padding-left: 21px; }
    .mi-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    .mi-price { color: #B8923A; font-size: 16px; font-weight: 600; }
    .add-btn { width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid #B8923A; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: all .12s; &.in-cart { background: #B8923A; color: #fff; } &:not(.in-cart) { background: #fff; color: #B8923A; } }
    .no-items { text-align: center; color: #7A7060; font-size: 13px; margin-top: 48px; }

    /* Cart footer */
    .cart-footer { background: #fff; border-top: 1px solid #E8DBBF; padding: 14px 24px; flex-shrink: 0; }
    .empty-cart { text-align: center; color: #7A7060; font-size: 12px; padding: 7px 0; }
    .cart-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; max-height: 150px; overflow-y: auto; }
    .cart-row { display: flex; align-items: center; gap: 8px; }
    .cr-name { flex: 1; font-size: 13px; color: #1A1A1A; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .qty-btn { width: 28px; height: 28px; border-radius: 5px; border: 1px solid #E8DBBF; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #1A1A1A; }
    .qty-num { font-size: 13px; font-weight: 600; min-width: 20px; text-align: center; color: #1A1A1A; }
    .cr-price { font-size: 13px; color: #B8923A; min-width: 66px; text-align: right; }
    .remove-btn { background: none; border: none; cursor: pointer; color: #B03030; padding: 2px; display: flex; }
    .totals { border-top: 1px solid #F7EDD8; padding-top: 10px; display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
    .total-row { display: flex; justify-content: space-between; font-size: 12px; color: #7A7060; }
    .total-due { display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid #E8DBBF; padding-top: 8px; margin-top: 4px; }
    .due-label { font-family: var(--font-heading); font-size: 16px; font-weight: 600; color: #1A1A1A; }
    .due-val { font-family: var(--font-heading); font-size: 20px; font-weight: 600; color: #B8923A; }
    .cart-actions { display: flex; gap: 14px; }
    .kitchen-btn { flex: 1; height: 40px; background: #fff; border: 1.5px solid #B8923A; border-radius: 8px; color: #B8923A; font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: var(--font-body); &:hover:not(:disabled) { background: #FBF6EC; } &:disabled { opacity: .6; cursor: not-allowed; } }
    .bill-btn { flex: 1; height: 40px; border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: var(--font-body); &:disabled { cursor: not-allowed; } }

    /* Order view */
    .customer-row { padding: 10px 24px; background: #FBF6EC; border-bottom: 1px solid #E8DBBF; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .cr-cust-name { font-size: 13px; color: #1A1A1A; font-weight: 500; }
    .cr-cust-phone { font-size: 11px; color: #7A7060; }
    .ov-status-bar { padding: 10px 24px; background: #fff; border-bottom: 1px solid #E8DBBF; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-shrink: 0; }
    .ov-badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; text-transform: uppercase; }
    .mark-served-btn { height: 32px; border: 1px solid #2A7A3A; background: #EBF7ED; color: #2A7A3A; border-radius: 8px; padding: 0 12px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: var(--font-body); &:disabled { opacity: .65; cursor: not-allowed; } }
    .ov-items { flex: 1; overflow-y: auto; padding: 14px 24px; display: flex; flex-direction: column; gap: 8px; }
    .ov-item { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; background: #fff; border: 1px solid #E8DBBF; border-radius: 8px; padding: 10px 14px; }
    .ovi-name { font-size: 14px; font-weight: 500; color: #1A1A1A; }
    .ovi-sub { font-size: 11px; color: #7A7060; margin-top: 2px; }
    .ovi-status { display: inline-flex; margin-top: 5px; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; text-transform: uppercase; }
    .ovi-price { color: #B8923A; font-size: 14px; font-weight: 600; white-space: nowrap; }
    .ov-footer { background: #fff; border-top: 1px solid #E8DBBF; padding: 14px 24px; flex-shrink: 0; }
    .ov-totals { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
    .ov-total-row { display: flex; justify-content: space-between; font-size: 12px; color: #7A7060; }
    .ov-due-row { display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid #E8DBBF; padding-top: 8px; margin-top: 4px; font-family: var(--font-heading); font-weight: 600; }
    .ov-due-label { font-size: 16px; color: #1A1A1A; }
    .ov-due-val { font-size: 22px; color: #B8923A; }
    .ov-notice { border: 1px solid #E8DBBF; border-radius: 8px; background: #FAFAF7; color: #7A7060; padding: 9px 12px; font-size: 12px; text-align: center; margin-bottom: 10px; }
    .cash-pay-btn { width: 100%; height: 44px; border: none; border-radius: 8px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; margin-bottom: 10px; font-family: var(--font-body); &:disabled { cursor: not-allowed; opacity: .65; } }
    .ov-actions { display: flex; gap: 10px; }
    .add-items-btn { flex: 1; height: 38px; background: #fff; border: 1px solid #E8DBBF; border-radius: 8px; color: #7A7060; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; font-family: var(--font-body); &:hover { background: #FBF6EC; } }
    .upi-btn { flex: 2; height: 38px; border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; font-family: var(--font-body); &:disabled { cursor: not-allowed; } }
    .tip-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .tip-label { font-size: 12px; color: #7A7060; flex-shrink: 0; }
    .tip-input { flex: 1; height: 36px; border: 1px solid #E8DBBF; border-radius: 8px; padding: 0 10px; font-size: 14px; font-weight: 600; color: #1A1A1A; background: #fff; outline: none; font-family: var(--font-body); &:focus { border-color: #B8923A; } }

    /* Payment modal (bottom sheet) */
    .pay-backdrop { position: fixed; inset: 0; z-index: 60; display: flex; align-items: flex-end; justify-content: center; background: rgba(26,26,26,0.4); }
    @keyframes sheetIn { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .pay-sheet { position: relative; width: min(100%, 560px); max-height: 85vh; overflow-y: auto; border-radius: 20px 20px 0 0; background: #fff; box-shadow: 0 -16px 40px rgba(26,26,26,0.16); animation: sheetIn 180ms ease-out; }
    .drag-handle { width: 36px; height: 4px; margin: 10px auto 12px; border-radius: 99px; background: #E8DBBF; }
    .sheet-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 18px 12px; }
    .sheet-title { display: flex; align-items: baseline; gap: 10px; }
    .sheet-title h2 { margin: 0; color: #1A1A1A; font-family: var(--font-heading); font-size: 22px; font-weight: 600; }
    .sheet-title span { color: #B8923A; font-size: 18px; font-weight: 600; white-space: nowrap; }
    .sheet-close { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border: 1px solid #E8DBBF; border-radius: 8px; background: #fff; color: #7A7060; cursor: pointer; }
    .pay-mode-tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin: 16px 16px 10px; padding: 4px; border: 1px solid #E8DBBF; border-radius: 999px; background: #FBF6EC; }
    .pay-mode-tab { height: 38px; border: none; border-radius: 999px; background: transparent; color: #7A7060; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 12px; font-weight: 500; font-family: var(--font-body); white-space: nowrap; overflow: hidden; &.active { background: #fff; color: #B8923A; box-shadow: 0 3px 10px rgba(184,146,58,0.16); } }
    .split-toggle { margin: 0 16px 10px; display: flex; align-items: center; justify-content: space-between; color: #1A1A1A; font-size: 13px; font-weight: 500; cursor: pointer; }
    .split-toggle input { width: 18px; height: 18px; accent-color: #B8923A; cursor: pointer; }
    .split-grid { margin: 0 16px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .split-field { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #7A7060; }
    .split-field input { height: 38px; border: 1px solid #E8DBBF; border-radius: 8px; background: #fff; padding: 0 10px; color: #1A1A1A; font-size: 14px; outline: none; box-sizing: border-box; width: 100%; }
    .split-total-row { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; min-height: 36px; border-radius: 8px; padding: 0 10px; font-size: 12px; &.valid { border: 1px solid #E8DBBF; background: #FBF6EC; color: #7A7060; } &.invalid { border: 1px solid #f2c8c8; background: #fff7f7; color: #9b2d2d; } }
    .pay-err { margin: 0 16px 10px; border: 1px solid #f2c8c8; border-radius: 8px; background: #fff7f7; color: #9b2d2d; padding: 9px 10px; font-size: 12px; }
    .pay-ntc { margin: 0 16px 10px; border: 1px solid #E8DBBF; border-radius: 8px; background: #FBF6EC; color: #7A7060; padding: 9px 10px; font-size: 12px; }
    .mode-body { padding: 6px 16px 18px; display: flex; flex-direction: column; gap: 12px; }
    .cash-total { text-align: center; color: #B8923A; font-family: var(--font-heading); font-size: 32px; font-weight: 600; line-height: 1; }
    .cash-entered { min-height: 34px; text-align: center; color: #1A1A1A; font-size: 15px; font-weight: 600; }
    .keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .key-btn { height: 46px; border: 1px solid #E8DBBF; border-radius: 8px; background: #fff; color: #1A1A1A; font-size: 16px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: var(--font-body); &:hover { background: #FBF6EC; } }
    .change-row { display: flex; justify-content: space-between; align-items: center; background: #EBF7ED; color: #2A7A3A; padding: 10px; border-radius: 8px; font-size: 13px; }
    .primary-action { width: 100%; height: 48px; border: none; border-radius: 8px; background: #B8923A; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; font-family: var(--font-body); &:disabled { cursor: not-allowed; opacity: 0.48; } }
    .upi-placeholder { min-height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; border: 1px dashed #E8DBBF; border-radius: 12px; color: #7A7060; font-size: 13px; text-align: center; padding: 24px; }
    .card-copy { min-height: 120px; display: flex; align-items: center; justify-content: center; text-align: center; color: #7A7060; font-family: var(--font-heading); font-size: 18px; line-height: 1.25; }
    .pay-success-overlay { position: absolute; inset: 0; background: #fff; border-radius: 20px 20px 0 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; text-align: center; z-index: 2; }
    .pay-success-overlay h3 { margin: 0; color: #1A1A1A; font-family: var(--font-heading); font-size: 24px; font-weight: 600; }
    .pay-success-overlay p { margin: 0; color: #7A7060; font-size: 13px; }
    .success-check { width: 64px; height: 64px; border-radius: 50%; background: #EBF7ED; display: flex; align-items: center; justify-content: center; }
    .invoice-note { border-radius: 999px; background: #EBF7ED; color: #2A7A3A; padding: 6px 14px; font-size: 12px; font-weight: 600; }
    .done-btn { width: 160px; height: 44px; border: none; border-radius: 8px; background: #B8923A; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px; font-family: var(--font-body); }

    /* Customer modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-box { background: #fff; border-radius: 14px; width: 100%; max-width: 440px; box-shadow: 0 8px 40px rgba(0,0,0,0.18); overflow: hidden; }
    .modal-head { padding: 18px 22px 14px; border-bottom: 1px solid #E8DBBF; display: flex; align-items: center; justify-content: space-between; }
    .modal-title { font-family: var(--font-heading); font-size: 16px; font-weight: 600; color: #1A1A1A; }
    .modal-back { background: transparent; border: none; cursor: pointer; color: #7A7060; font-size: 13px; padding: 0; font-family: var(--font-body); }
    .modal-close { background: transparent; border: none; cursor: pointer; color: #7A7060; display: flex; }
    .modal-body { padding: 18px 22px; display: flex; flex-direction: column; gap: 14px; }
    .field-grp { display: flex; flex-direction: column; gap: 5px; }
    .field-lbl { font-size: 12px; font-weight: 500; color: #7A7060; }
    .field-inp { height: 40px; border: 1px solid #E8DBBF; border-radius: 8px; padding: 0 12px; font-size: 13px; width: 100%; outline: none; font-family: var(--font-body); box-sizing: border-box; &:focus { border-color: #B8923A; box-shadow: 0 0 0 2px rgba(184,146,58,0.18); } &.err { border-color: #B03030; background: #FFF5F5; } }
    .field-err { font-size: 11px; color: #B03030; }
    .phone-locked { display: flex; align-items: center; justify-content: space-between; background: #FBF6EC; border: 1px solid #E8DBBF; border-radius: 8px; padding: 9px 12px; font-size: 13px; color: #1A1A1A; font-weight: 500; }
    .opt-section { border-top: 1px dashed #E8DBBF; padding-top: 12px; }
    .opt-label { font-size: 11px; font-weight: 500; color: #B8923A; text-transform: uppercase; letter-spacing: 0.06em; }
    .modal-footer { padding: 0 22px 20px; display: flex; gap: 12px; }
    .modal-cancel { flex: 1; height: 40px; background: #fff; border: 1px solid #E8DBBF; border-radius: 8px; color: #7A7060; font-size: 13px; cursor: pointer; font-family: var(--font-body); }
    .modal-primary { flex: 2; height: 40px; background: #B8923A; border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: var(--font-body); &:disabled { opacity: .7; cursor: not-allowed; } }
  `],
  template: `
    <div class="pos">
      <!-- POS Header -->
      <header class="pos-head">
        <div class="pos-logo">
          <div class="pos-logo-circle">
            <app-icon name="star" [size]="13" [sw]="1.8" style="color:#B8923A"></app-icon>
          </div>
          <span class="pos-logo-name">SKYFALL</span>
        </div>
        <span class="pos-title">Staff POS</span>
        <div class="pos-right">
          <span class="clock-chip">
            <app-icon name="clock" [size]="13" [sw]="1.8"></app-icon>
            {{ currentTime }}
          </span>
          <button class="signout-btn">
            <app-icon name="log-out" [size]="13" [sw]="1.8"></app-icon>
            Sign Out
          </button>
        </div>
      </header>

      @if (notice()) {
        <div class="notice">{{ notice() }}</div>
      }

      <div class="pos-body">
        <!-- Left: Table map -->
        <aside class="table-panel">
          <div class="tp-head">
            <div class="tp-title">Table Map</div>
            <button class="new-order-btn" (click)="handleNewOrder()">
              <app-icon name="plus" [size]="14" [sw]="1.8"></app-icon>
              New Order
            </button>
          </div>
          <div class="legend">
            @for (l of legend; track l.label) {
              <div style="display:flex;align-items:center;gap:5px">
                <span class="legend-dot" [style.background]="l.dot"></span>
                <span class="legend-label">{{ l.label }}</span>
              </div>
            }
          </div>
          <div class="tp-scroll">
            <div class="table-grid">
              @for (t of tables(); track t.id) {
                <button class="table-btn"
                        [class.selected]="selectedTable()?.id === t.id"
                        [style.background]="tcfg(t.status).bg"
                        [style.border-color]="tcfg(t.status).border"
                        (click)="selectTable(t)">
                  <span class="tb-num">{{ t.tableNumber }}</span>
                  <span class="tb-cap">
                    <app-icon name="users" [size]="9" [sw]="1.8"></app-icon>
                    {{ t.capacity }}
                  </span>
                  <span class="tb-status"
                        [style.background]="tcfg(t.status).labelBg"
                        [style.color]="tcfg(t.status).labelColor">
                    {{ tcfg(t.status).label }}
                  </span>
                  @if (t.seatedAt) {
                    <span class="tb-time" [style.color]="tcfg(t.status).labelColor">
                      <app-icon name="clock" [size]="9" [sw]="1.8"></app-icon>
                      {{ t.seatedAt }}
                    </span>
                  }
                </button>
              }
            </div>
          </div>
        </aside>

        <!-- Right: Content panel -->
        <main class="menu-panel">
          @if (!selectedTable()) {
            <div class="no-table">
              <app-icon name="star" [size]="34" [sw]="1.8" style="color:#B8923A"></app-icon>
              <div class="no-table-title">Select a table to begin</div>
            </div>
          } @else {
            <!-- Table bar -->
            <div class="table-bar">
              <span class="table-badge">Table {{ selectedTable()!.tableNumber }}</span>
              @if (selectedTable()!.orderId) {
                <span class="order-chip">Order #{{ selectedTable()!.orderId!.slice(-8).toUpperCase() }}</span>
              } @else {
                <span class="order-chip">New order</span>
              }
              @if (selectedTable()!.seatedAt) {
                <span class="seated-chip">
                  <app-icon name="clock" [size]="11" [sw]="1.8"></app-icon>
                  Seated {{ selectedTable()!.seatedAt }}
                </span>
              }
            </div>

            <!-- ── ADD ITEMS MODE ─────────────────────── -->
            @if (panelMode() === 'add_items') {
              <div class="menu-controls">
                @if (selectedTable()!.orderId) {
                  <button class="back-btn" (click)="viewOrder()">← Back to order</button>
                }
                <div class="search-wrap">
                  <span class="search-icon"><app-icon name="search" [size]="16" [sw]="1.8"></app-icon></span>
                  <input class="search-input" type="text" placeholder="Search menu items..."
                         [ngModel]="search()" (ngModelChange)="search.set($event)" />
                </div>
                <div class="cat-pills">
                  <button class="cat-pill" [class.active]="!activeCat()" (click)="activeCat.set(null)">All</button>
                  @for (cat of categories(); track cat.id) {
                    <button class="cat-pill" [class.active]="activeCat()?.id === cat.id" (click)="activeCat.set(cat)">
                      {{ cat.name }}
                    </button>
                  }
                </div>
              </div>

              <div class="menu-list">
                @if (filteredItems().length === 0) {
                  <div class="no-items">No items found</div>
                } @else {
                  @for (item of filteredItems(); track item.id) {
                    <div class="menu-item">
                      <div style="min-width:0">
                        <div style="display:flex;align-items:center;gap:7px">
                          <span class="mi-veg-dot" [style.border-color]="item.isVeg ? '#2A7A3A' : '#B03030'">
                            <span class="mi-veg-inner" [style.background]="item.isVeg ? '#2A7A3A' : '#B03030'"></span>
                          </span>
                          <span class="mi-name">{{ item.name }}</span>
                        </div>
                        <div class="mi-cat">{{ item.categoryName }}</div>
                      </div>
                      <div class="mi-right">
                        <span class="mi-price">{{ fmt(item.basePrice) }}</span>
                        <button class="add-btn" [class.in-cart]="inCartSet().has(item.id)" (click)="addItem(item)">
                          <app-icon name="plus" [size]="14" [sw]="1.8"></app-icon>
                        </button>
                      </div>
                    </div>
                  }
                }
              </div>

              <div class="cart-footer">
                @if (cart().length === 0) {
                  <div class="empty-cart">
                    @if (selectedTable()!.orderId) {
                      No new items.
                      <span style="color:#B8923A;cursor:pointer;text-decoration:underline;margin-left:4px" (click)="viewOrder()">View current order</span>
                    } @else {
                      No items added yet. Tap + to add.
                    }
                  </div>
                } @else {
                  <div class="cart-list">
                    @for (line of cart(); track line.id) {
                      <div class="cart-row">
                        <span class="cr-name">{{ line.name }}</span>
                        <button class="qty-btn" (click)="decQty(line)">
                          <app-icon name="minus" [size]="13" [sw]="1.8"></app-icon>
                        </button>
                        <span class="qty-num">{{ line.qty }}</span>
                        <button class="qty-btn" (click)="incQty(line)">
                          <app-icon name="plus" [size]="13" [sw]="1.8"></app-icon>
                        </button>
                        <span class="cr-price">{{ fmt(line.price * line.qty) }}</span>
                        <button class="remove-btn" (click)="removeLine(line.id)">
                          <app-icon name="trash-2" [size]="14" [sw]="1.8"></app-icon>
                        </button>
                      </div>
                    }
                  </div>
                  <div class="totals">
                    <div class="total-row"><span>Subtotal</span><span>{{ fmt(subtotal()) }}</span></div>
                    <div class="total-row"><span>CGST 2.5%</span><span>{{ fmt(subtotal() * 0.025, 2) }}</span></div>
                    <div class="total-row"><span>SGST 2.5%</span><span>{{ fmt(subtotal() * 0.025, 2) }}</span></div>
                    <div class="total-due">
                      <span class="due-label">Total</span>
                      <span class="due-val">{{ fmt(total(), 2) }}</span>
                    </div>
                  </div>
                  <div class="cart-actions">
                    <button class="kitchen-btn" [disabled]="placing()" (click)="handleSendToKitchen()">
                      <app-icon name="chef-hat" [size]="15" [sw]="1.8"></app-icon>
                      {{ placing() ? 'Sending…' : 'Send to Kitchen' }}
                    </button>
                    <button class="bill-btn"
                            [style.background]="selectedTable()!.orderId ? '#B8923A' : '#D4BF96'"
                            [disabled]="placing() || !selectedTable()!.orderId"
                            (click)="goToBilling()">
                      <app-icon name="receipt-text" [size]="15" [sw]="1.8"></app-icon>
                      Bill & Pay
                    </button>
                  </div>
                }
              </div>
            }

            <!-- ── ORDER VIEW MODE ─────────────────────── -->
            @if (panelMode() === 'order_view') {
              @if (orderViewLoading()) {
                <div style="flex:1;display:flex;align-items:center;justify-content:center;color:#B8923A;font-family:var(--font-heading);font-size:16px">
                  Loading order...
                </div>
              } @else if (orderView()) {
                <!-- Customer row -->
                @if (orderView()!.customerName || orderView()!.customerPhone) {
                  <div class="customer-row">
                    <app-icon name="user-check" [size]="14" [sw]="1.8" style="color:#B8923A;flex-shrink:0"></app-icon>
                    <span class="cr-cust-name">{{ orderView()!.customerName ?? orderView()!.customerPhone }}</span>
                    @if (orderView()!.customerPhone && orderView()!.customerName) {
                      <span class="cr-cust-phone">{{ orderView()!.customerPhone }}</span>
                    }
                    @if (payStatus() === 'paid') {
                      <span style="margin-left:auto;font-size:11px;font-weight:600;color:#2A7A3A;background:#EBF7ED;padding:2px 8px;border-radius:999px">PAID</span>
                    }
                  </div>
                }

                <!-- Status bar -->
                <div class="ov-status-bar">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <span style="font-size:11px;font-weight:600;color:#A8998A;text-transform:uppercase;letter-spacing:0.08em">Status</span>
                    <span class="ov-badge"
                          [style.color]="orderStatusColor(orderView()!.status)"
                          [style.background]="orderStatusBg(orderView()!.status)">
                      {{ orderView()!.status }}
                    </span>
                    <span class="ov-badge"
                          [style.color]="payStatus() === 'paid' ? '#2A7A3A' : '#92400E'"
                          [style.background]="payStatus() === 'paid' ? '#EBF7ED' : '#FEF3C7'">
                      {{ payStatus() }}
                    </span>
                  </div>
                  @if (orderView()!.status === 'ready') {
                    <button class="mark-served-btn" [disabled]="markingServed()" (click)="markServed()">
                      {{ markingServed() ? 'Marking...' : 'Mark Served' }}
                    </button>
                  } @else if (orderView()!.status !== 'served') {
                    <span style="font-size:11px;color:#7A7060">Waiting for kitchen</span>
                  }
                </div>

                <!-- Items -->
                <div class="ov-items">
                  @for (item of orderView()!.items; track item.id) {
                    <div class="ov-item">
                      <div>
                        <div class="ovi-name">{{ item.quantity }} × {{ item.menuItemName }}</div>
                        @if (item.variantName) {
                          <div class="ovi-sub">{{ item.variantName }}</div>
                        }
                        @if (item.itemStatus) {
                          <span class="ovi-status"
                                [style.color]="itemStatusColor(item.itemStatus)"
                                [style.background]="itemStatusBg(item.itemStatus)">
                            {{ item.itemStatus }}
                          </span>
                        }
                      </div>
                      <span class="ovi-price">{{ fmt(item.quantity * item.unitPrice) }}</span>
                    </div>
                  }
                </div>

                <!-- Footer: totals + actions -->
                <div class="ov-footer">
                  <div class="ov-totals">
                    <div class="ov-total-row"><span>Subtotal</span><span>{{ fmt(orderView()!.subtotal) }}</span></div>
                    <div class="ov-total-row"><span>Tax</span><span>{{ fmt(orderView()!.taxAmount) }}</span></div>
                    @if (orderView()!.discountAmount > 0) {
                      <div class="ov-total-row"><span>Discount</span><span>-{{ fmt(orderView()!.discountAmount) }}</span></div>
                    }
                    @if (orderPaid() > 0) {
                      <div class="ov-total-row"><span>Paid</span><span>{{ fmt(orderPaid()) }}</span></div>
                    }
                    <div class="ov-due-row">
                      <span class="ov-due-label">Due</span>
                      <span class="ov-due-val">{{ fmt(orderDue()) }}</span>
                    </div>
                  </div>

                  @if (orderDue() > 0) {
                    @if (!canCollectPayment()) {
                      <div class="ov-notice">Payment unlocks after the order is marked as served.</div>
                    }
                    @if (canCollectPayment()) {
                      <div class="tip-row">
                        <span class="tip-label">Tip (₹) <span style="font-weight:400;color:#A8998A;font-size:11px">(optional)</span></span>
                        <input class="tip-input" type="number" min="0" step="1" placeholder="0"
                               [ngModel]="posTip()" (ngModelChange)="posTip.set(+$event || 0)" />
                      </div>
                    }
                    <button class="cash-pay-btn"
                            [style.background]="canCollectPayment() ? '#2A7A3A' : '#E8DBBF'"
                            [disabled]="quickPaying() || !canCollectPayment()"
                            (click)="quickCashPay()">
                      <app-icon name="receipt" [size]="15" [sw]="1.8"></app-icon>
                      {{ quickPaying() ? 'Recording...' : 'Mark Cash Paid  ·  ' + fmt(orderDue()) + (posTip() > 0 ? ' + ₹' + posTip() + ' tip' : '') }}
                    </button>
                    <div class="ov-actions">
                      <button class="add-items-btn" (click)="panelMode.set('add_items')">
                        <app-icon name="plus" [size]="13" [sw]="1.8"></app-icon>
                        Add Items
                      </button>
                      <button class="upi-btn"
                              [style.background]="canCollectPayment() ? '#B8923A' : '#D4BF96'"
                              [disabled]="!canCollectPayment()"
                              (click)="openPaymentModal()">
                        <app-icon name="credit-card" [size]="13" [sw]="1.8"></app-icon>
                        UPI / Card
                      </button>
                    </div>
                  } @else {
                    <div style="text-align:center;color:#2A7A3A;font-size:13px;font-weight:600;padding:8px 0">
                      Bill fully paid
                    </div>
                    <div class="ov-actions" style="margin-top:10px">
                      <button class="add-items-btn" (click)="panelMode.set('add_items')">
                        <app-icon name="plus" [size]="13" [sw]="1.8"></app-icon>
                        Add Items
                      </button>
                    </div>
                  }
                </div>
              } @else {
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px">
                  <div style="color:#7A7060;font-size:13px">Could not load order.</div>
                  <button style="font-size:12px;color:#B8923A;background:transparent;border:1px solid #E8DBBF;border-radius:6px;padding:6px 14px;cursor:pointer"
                          (click)="retryOrderView()">
                    Retry
                  </button>
                </div>
              }
            }
          }
        </main>
      </div>

      <!-- Payment modal (bottom sheet) -->
      @if (showPaymentModal()) {
        <div class="pay-backdrop" (click)="onBackdropClick($event)">
          <div class="pay-sheet">
            <div class="drag-handle"></div>
            <div class="sheet-head">
              <div class="sheet-title">
                <h2>Payment</h2>
                <span>{{ fmt(orderDue(), 2) }}</span>
              </div>
              <button class="sheet-close" (click)="closePaymentModal()">
                <app-icon name="x" [size]="18" [sw]="1.8"></app-icon>
              </button>
            </div>
            <div style="height:1px;background:#E8DBBF"></div>

            <!-- Mode tabs -->
            <div class="pay-mode-tabs">
              @for (m of payModes; track m.mode) {
                <button class="pay-mode-tab" [class.active]="payMode() === m.mode" (click)="payMode.set(m.mode)">
                  <app-icon [name]="m.icon" [size]="14" [sw]="1.8"></app-icon>
                  {{ m.label }}
                </button>
              }
            </div>

            <!-- Split toggle -->
            <label class="split-toggle">
              <span>Split payment</span>
              <input type="checkbox" [ngModel]="splitEnabled()" (ngModelChange)="splitEnabled.set($event)" />
            </label>

            @if (splitEnabled()) {
              <div class="split-grid">
                @for (m of payModes; track m.mode) {
                  <label class="split-field">
                    <span>{{ m.label }}</span>
                    <input type="text" inputmode="decimal"
                           [ngModel]="splitAmounts()[m.mode]"
                           (ngModelChange)="updateSplitAmount(m.mode, $event)" />
                  </label>
                }
                <div class="split-total-row" [class.valid]="splitValid()" [class.invalid]="!splitValid()">
                  <span>Split total</span>
                  <strong>{{ fmt(splitTotal(), 2) }}</strong>
                </div>
              </div>
            }

            @if (payError()) { <div class="pay-err">{{ payError() }}</div> }
            @if (payNotice()) { <div class="pay-ntc">{{ payNotice() }}</div> }

            <!-- Tip -->
            <div class="tip-row" style="margin: 8px 16px 4px">
              <span class="tip-label">Tip (₹) <span style="font-weight:400;color:#A8998A;font-size:11px">(optional)</span></span>
              <input class="tip-input" type="number" min="0" step="1" placeholder="0"
                     [ngModel]="modalTip()" (ngModelChange)="modalTip.set(+$event || 0)" />
            </div>

            <!-- Cash -->
            @if (payMode() === 'cash') {
              <div class="mode-body">
                <div class="cash-total">{{ fmt(activePayAmount(), 2) }}</div>
                <div class="cash-entered">{{ cashInput() ? fmt(cashReceived(), 2) : '₹0.00' }}</div>
                <div class="keypad">
                  @for (k of payKeys; track k) {
                    <button class="key-btn" (click)="pressCashKey(k)">
                      @if (k === 'backspace') {
                        <app-icon name="delete" [size]="17" [sw]="1.8"></app-icon>
                      } @else { {{ k }} }
                    </button>
                  }
                </div>
                @if (cashReceived() >= activePayAmount() && activePayAmount() > 0) {
                  <div class="change-row">
                    <span>Change</span>
                    <strong>{{ fmt(changeAmount(), 2) }}</strong>
                  </div>
                }
                <button class="primary-action"
                        [disabled]="!canSubmitPayment() || cashReceived() + 0.01 < activePayAmount() || submittingPayment()"
                        (click)="confirmCash()">
                  {{ submittingPayment() ? 'Confirming...' : 'Confirm Cash Payment' }}
                </button>
              </div>
            }

            <!-- UPI -->
            @if (payMode() === 'upi') {
              <div class="mode-body">
                <div class="upi-placeholder">
                  <app-icon name="qr-code" [size]="48" [sw]="1.4" style="color:#D4BF96"></app-icon>
                  <div style="color:#1A1A1A;font-family:var(--font-heading);font-size:20px;font-weight:600">{{ fmt(activePayAmount(), 2) }}</div>
                  <div>Ask the customer to scan the UPI QR on the POS terminal</div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:4px">
                    @for (app of upiApps; track app) {
                      <span style="border:1px solid #E8DBBF;border-radius:999px;background:#FBF6EC;color:#7A7060;padding:4px 10px;font-size:11px;font-weight:500">{{ app }}</span>
                    }
                  </div>
                </div>
                <button class="primary-action" [disabled]="!canSubmitPayment() || submittingPayment()" (click)="confirmUpi()">
                  {{ submittingPayment() ? 'Confirming...' : 'Confirm UPI Payment' }}
                </button>
              </div>
            }

            <!-- Debit / Credit -->
            @if (payMode() === 'debit_card' || payMode() === 'credit_card') {
              <div class="mode-body">
                <div class="card-copy">Present the POS terminal to the customer</div>
                <button class="primary-action" [disabled]="!canSubmitPayment() || submittingPayment()"
                        (click)="confirmCard(payMode() === 'debit_card' ? 'debit_card' : 'credit_card')">
                  {{ submittingPayment() ? 'Confirming...' : 'Confirm ' + (payMode() === 'debit_card' ? 'Debit' : 'Credit') + ' Payment' }}
                </button>
              </div>
            }

            <!-- Success overlay -->
            @if (paySuccess()) {
              <div class="pay-success-overlay">
                <div class="success-check">
                  <app-icon name="check" [size]="30" [sw]="2.2" style="color:#2A7A3A"></app-icon>
                </div>
                <h3>Payment Successful</h3>
                <p>{{ fmt(paySuccess()!.amount, 2) }} · {{ payModeLabel(paySuccess()!.mode) }}</p>
                <div class="invoice-note">Invoice sent</div>
                <button class="done-btn" (click)="closePaymentModal()">Done</button>
              </div>
            }
          </div>
        </div>
      }

      <!-- Customer modal -->
      @if (showCustomerModal()) {
        <div class="modal-overlay">
          <div class="modal-box">
            <div class="modal-head">
              @if (customerStep() === 'details') {
                <button class="modal-back" (click)="customerStep.set('phone'); cErrors.set({})">← Back</button>
              } @else {
                <div style="display:flex;align-items:center;gap:8px">
                  <app-icon name="user-check" [size]="18" [sw]="1.8" style="color:#B8923A"></app-icon>
                  <span class="modal-title">Customer Details</span>
                </div>
              }
              <button class="modal-close" (click)="showCustomerModal.set(false)">
                <app-icon name="x" [size]="18" [sw]="1.8"></app-icon>
              </button>
            </div>

            @if (customerStep() === 'phone') {
              <div class="modal-body">
                <div class="field-grp">
                  <label class="field-lbl">Mobile Number <span style="color:#B03030">*</span></label>
                  <input type="tel" placeholder="+91 98765 43210"
                         [ngModel]="cPhone()" (ngModelChange)="cPhone.set($event)"
                         (keydown.enter)="lookupCustomer()"
                         class="field-inp" [class.err]="cErrors()['phone']" />
                  @if (cErrors()['phone']) {
                    <span class="field-err">{{ cErrors()['phone'] }}</span>
                  }
                </div>
              </div>
              <div class="modal-footer">
                <button class="modal-cancel" (click)="showCustomerModal.set(false)">Cancel</button>
                <button class="modal-primary" [disabled]="lookingUp()" (click)="lookupCustomer()">
                  {{ lookingUp() ? 'Looking up…' : 'Continue' }}
                </button>
              </div>
            } @else {
              <div class="modal-body">
                <div class="phone-locked">
                  <span>{{ cPhone() }}</span>
                  <button style="background:transparent;border:none;cursor:pointer;color:#B8923A;font-size:12px;text-decoration:underline;font-family:var(--font-body)"
                          (click)="customerStep.set('phone'); cErrors.set({})">Change</button>
                </div>
                <div style="display:flex;gap:12px">
                  <div class="field-grp" style="flex:1">
                    <label class="field-lbl">Name <span style="color:#B03030">*</span></label>
                    <input type="text" placeholder="Guest name"
                           [ngModel]="cName()" (ngModelChange)="cName.set($event)"
                           class="field-inp" [class.err]="cErrors()['name']" />
                    @if (cErrors()['name']) { <span class="field-err">{{ cErrors()['name'] }}</span> }
                  </div>
                  <div class="field-grp" style="flex:1">
                    <label class="field-lbl">Email <span style="color:#B03030">*</span></label>
                    <input type="email" placeholder="guest@example.com"
                           [ngModel]="cEmail()" (ngModelChange)="cEmail.set($event)"
                           class="field-inp" [class.err]="cErrors()['email']" />
                    @if (cErrors()['email']) { <span class="field-err">{{ cErrors()['email'] }}</span> }
                  </div>
                </div>
                <div class="opt-section">
                  <div class="opt-label">Campaign Info (optional)</div>
                  <div style="display:flex;gap:12px;margin-top:10px">
                    <div class="field-grp" style="flex:1">
                      <label class="field-lbl">Birthday</label>
                      <input type="date" [ngModel]="cBirthday()" (ngModelChange)="cBirthday.set($event)" class="field-inp" />
                    </div>
                    <div class="field-grp" style="flex:1">
                      <label class="field-lbl">Anniversary</label>
                      <input type="date" [ngModel]="cAnniversary()" (ngModelChange)="cAnniversary.set($event)" class="field-inp" />
                    </div>
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button class="modal-cancel" (click)="showCustomerModal.set(false)">Cancel</button>
                <button class="modal-primary" [disabled]="placing()" (click)="submitCustomer()">
                  <app-icon name="chef-hat" [size]="15" [sw]="1.8"></app-icon>
                  {{ placing() ? 'Placing order...' : 'Confirm & Send to Kitchen' }}
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class PosComponent implements OnInit, OnDestroy {
  private router        = inject(Router);
  private tableService  = inject(TableService);
  private menuService   = inject(MenuService);
  private orderService  = inject(OrderService);
  private paymentService = inject(PaymentService);
  private billingService = inject(BillingService);
  private customerService = inject(CustomerService);
  private settingsService = inject(SettingsService);

  // Table + menu
  tables       = signal<PosTable[]>([]);
  categories   = signal<Category[]>([]);
  items        = signal<MenuItem[]>([]);
  selectedTable = signal<PosTable | null>(null);
  panelMode    = signal<'add_items' | 'order_view'>('add_items');

  // Cart
  cart      = signal<CartLine[]>([]);
  search    = signal('');
  activeCat = signal<Category | null>(null);
  placing   = signal(false);

  // Order view
  orderView        = signal<Order | null>(null);
  orderPayments    = signal<Payment[]>([]);
  orderViewLoading = signal(false);
  markingServed    = signal(false);
  quickPaying      = signal(false);
  posTip           = signal(0);

  // Customer modal
  showCustomerModal = signal(false);
  customerStep      = signal<'phone' | 'details'>('phone');
  cPhone     = signal('');
  cName      = signal('');
  cEmail     = signal('');
  cBirthday  = signal('');
  cAnniversary = signal('');
  cErrors    = signal<{ phone?: string; name?: string; email?: string }>({});
  lookingUp  = signal(false);

  // Payment modal
  showPaymentModal  = signal(false);
  payMode   = signal<'cash' | 'upi' | 'debit_card' | 'credit_card'>('cash');
  modalTip  = signal(0);
  cashInput = signal('');
  splitEnabled  = signal(false);
  splitAmounts  = signal<Record<string, string>>({ cash: '0', upi: '0', debit_card: '0', credit_card: '0' });
  submittingPayment = signal(false);
  paySuccess = signal<{ amount: number; mode: string } | null>(null);
  payError   = signal<string | null>(null);
  payNotice  = signal<string | null>(null);

  // Misc
  notice      = signal<string | null>(null);
  currentTime = '';
  readonly legend   = LEGEND;
  readonly payKeys  = ['1','2','3','4','5','6','7','8','9','.','0','backspace'];
  readonly payModes = [
    { mode: 'cash'        as const, label: 'Cash',   icon: 'banknote'     },
    { mode: 'upi'         as const, label: 'UPI QR', icon: 'qr-code'      },
    { mode: 'debit_card'  as const, label: 'Debit',  icon: 'credit-card'  },
    { mode: 'credit_card' as const, label: 'Credit', icon: 'receipt'      },
  ];
  readonly upiApps = ['GPay', 'PhonePe', 'Paytm'];
  private clockInterval?: ReturnType<typeof setInterval>;
  private noticeTimeout?: ReturnType<typeof setTimeout>;

  // Computed
  filteredItems = computed(() => {
    const cat = this.activeCat();
    const q   = this.search().trim().toLowerCase();
    return this.items().filter(i => {
      if (!i.isAvailable) return false;
      if (cat && i.categoryId !== cat.id) return false;
      if (q) return `${i.name} ${i.categoryName} ${i.description ?? ''}`.toLowerCase().includes(q);
      return true;
    });
  });

  subtotal  = computed(() => this.cart().reduce((s, l) => s + l.price * l.qty, 0));
  total     = computed(() => this.subtotal() * 1.05);
  inCartSet = computed(() => new Set(this.cart().map(l => l.itemId)));

  orderPaid = computed(() => this.orderPayments().filter(p => p.status === 'success').reduce((s, p) => s + p.amount, 0));
  orderDue  = computed(() => Math.max((this.orderView()?.totalAmount ?? 0) - this.orderPaid(), 0));
  payStatus = computed(() => {
    if (this.orderDue() <= 0) return 'paid';
    if (this.orderPaid() > 0) return 'partial';
    return 'unpaid';
  });
  canCollectPayment = computed(() => this.orderView()?.status === 'served');

  cashReceived    = computed(() => { const v = parseFloat(this.cashInput()) || 0; return Math.round(v * 100) / 100; });
  splitTotal      = computed(() => this.payModes.reduce((s, m) => s + (parseFloat(this.splitAmounts()[m.mode]) || 0), 0));
  splitValid      = computed(() => !this.splitEnabled() || Math.round(this.splitTotal() * 100) === Math.round(this.orderDue() * 100));
  activePayAmount = computed(() => this.splitEnabled() ? (parseFloat(this.splitAmounts()[this.payMode()]) || 0) : this.orderDue());
  changeAmount    = computed(() => Math.max(this.cashReceived() - this.activePayAmount(), 0));
  canSubmitPayment = computed(() => this.activePayAmount() > 0 && this.splitValid());

  ngOnInit(): void {
    this.tickClock();
    this.clockInterval = setInterval(() => this.tickClock(), 1000);
    this.loadPosData();
    this.menuService.getCategories().subscribe({ next: c => this.categories.set(c) });
    this.menuService.getItems().subscribe({ next: i => this.items.set(i) });
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.noticeTimeout) clearTimeout(this.noticeTimeout);
  }

  private tickClock(): void {
    this.currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  tcfg(status: string) { return STATUS_CFG[status] ?? STATUS_CFG['free']; }

  fmt(n: number, dec = 0): string {
    return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  orderStatusColor(s: string): string { return s === 'ready' ? '#2A7A3A' : s === 'served' ? '#2A5A9A' : '#8A6A24'; }
  orderStatusBg(s: string): string    { return s === 'ready' ? '#EBF7ED' : s === 'served' ? '#EBF0F9' : '#F7EDD8'; }
  itemStatusColor(s: string): string  { return s === 'ready' ? '#2A7A3A' : s === 'preparing' ? '#2A5A9A' : '#92400E'; }
  itemStatusBg(s: string): string     { return s === 'ready' ? '#EBF7ED' : s === 'preparing' ? '#EBF0F9' : '#FEF3C7'; }

  private mergeTables(tables: CafeTable[], orders: Order[]): PosTable[] {
    // Active (non-served) orders can promote a 'free' table to 'occupied'
    const activeByTable = new Map<string, Order>();
    // Any non-cancelled order provides the orderId for occupied tables
    const anyByTable    = new Map<string, Order>();

    orders.forEach(o => {
      const ex = anyByTable.get(o.tableId);
      if (!ex || o.createdAt > ex.createdAt) anyByTable.set(o.tableId, o);

      if (o.status !== 'served') {
        const exA = activeByTable.get(o.tableId);
        if (!exA || o.createdAt > exA.createdAt) activeByTable.set(o.tableId, o);
      }
    });

    return tables.map(t => {
      const activeOrder   = activeByTable.get(t.id);
      const computedStatus = t.status === 'free' && activeOrder ? 'occupied' : t.status;
      // Only expose orderId when the table is actually in use (served-but-unpaid included)
      const orderForId = (computedStatus === 'occupied' || computedStatus === 'bill_requested')
        ? anyByTable.get(t.id)
        : undefined;
      return {
        ...t,
        status: computedStatus,
        orderId: orderForId?.id,
        seatedAt: orderForId ? this.fmtTime(orderForId.createdAt) : undefined,
      };
    });
  }

  private fmtTime(iso: string): string {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  private loadPosData(): void {
    forkJoin({
      tables: this.tableService.getAll().pipe(catchError(() => of([] as CafeTable[]))),
      orders: this.orderService.getActive().pipe(catchError(() => of([] as Order[])))
    }).subscribe(({ tables, orders }) => this.tables.set(this.mergeTables(tables, orders)));
  }

  private refreshTables(): void {
    forkJoin({
      tables: this.tableService.getAll().pipe(catchError(() => of([] as CafeTable[]))),
      orders: this.orderService.getActive().pipe(catchError(() => of([] as Order[])))
    }).subscribe(({ tables, orders }) => {
      const merged = this.mergeTables(tables, orders);
      if (merged.length) this.tables.set(merged);
    });
  }

  loadOrderView(orderId: string): void {
    this.orderViewLoading.set(true);
    forkJoin({
      order:    this.orderService.getById(orderId).pipe(catchError(() => of(null as Order | null))),
      payments: this.paymentService.getByOrder(orderId).pipe(catchError(() => of([] as Payment[])))
    }).subscribe(({ order, payments }) => {
      this.orderView.set(order);
      this.orderPayments.set(payments);
      this.orderViewLoading.set(false);
    });
  }

  retryOrderView(): void {
    const orderId = this.selectedTable()?.orderId;
    if (orderId) this.loadOrderView(orderId);
  }

  selectTable(t: PosTable): void {
    this.selectedTable.set(t);
    this.cart.set([]);
    this.search.set('');
    this.activeCat.set(null);
    this.orderView.set(null);
    this.orderPayments.set([]);
    this.posTip.set(0);
    if (t.orderId && (t.status === 'occupied' || t.status === 'bill_requested')) {
      this.panelMode.set('order_view');
      this.loadOrderView(t.orderId);
    } else {
      this.panelMode.set('add_items');
    }
  }

  handleNewOrder(): void {
    const cur = this.selectedTable();
    const free = (cur?.status === 'free' ? cur : null) ?? this.tables().find(t => t.status === 'free') ?? null;
    if (!free) { this.showNoticeMsg('No free tables available.'); return; }
    this.selectTable(free);
    this.showNoticeMsg(`New order started for Table ${free.tableNumber}.`);
  }

  viewOrder(): void {
    const orderId = this.selectedTable()?.orderId;
    if (orderId) { this.panelMode.set('order_view'); this.loadOrderView(orderId); }
  }

  addItem(item: MenuItem): void {
    if (!item.isAvailable) return;
    const ex = this.cart().find(l => l.itemId === item.id);
    if (ex) {
      this.cart.update(list => list.map(l => l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l));
    } else {
      this.cart.update(list => [...list, { id: `${item.id}-${Date.now()}`, itemId: item.id, name: item.name, price: item.basePrice, qty: 1, isVeg: item.isVeg }]);
    }
  }

  incQty(line: CartLine): void { this.cart.update(list => list.map(l => l.id === line.id ? { ...l, qty: l.qty + 1 } : l)); }
  decQty(line: CartLine): void { this.cart.update(list => list.map(l => l.id === line.id ? { ...l, qty: l.qty - 1 } : l).filter(l => l.qty > 0)); }
  removeLine(id: string): void { this.cart.update(list => list.filter(l => l.id !== id)); }

  handleSendToKitchen(): void {
    const table = this.selectedTable();
    if (!table || this.cart().length === 0) return;
    if (table.orderId) {
      this.placeOrder(table.orderId, null);
    } else {
      this.cPhone.set(''); this.cName.set(''); this.cEmail.set('');
      this.cBirthday.set(''); this.cAnniversary.set('');
      this.cErrors.set({}); this.customerStep.set('phone');
      this.showCustomerModal.set(true);
    }
  }

  lookupCustomer(): void {
    const phone = this.cPhone().trim();
    if (!phone) { this.cErrors.set({ phone: 'Mobile is required' }); return; }
    this.cErrors.set({});
    this.lookingUp.set(true);
    this.customerService.upsert({ phone }).subscribe({
      next: c => {
        this.cName.set(c.name ?? '');
        this.cEmail.set(c.email ?? '');
        this.customerStep.set('details');
        this.lookingUp.set(false);
      },
      error: () => { this.customerStep.set('details'); this.lookingUp.set(false); }
    });
  }

  submitCustomer(): void {
    const name  = this.cName().trim();
    const email = this.cEmail().trim();
    const errs: { name?: string; email?: string } = {};
    if (!name) errs['name'] = 'Name is required';
    if (!email) errs['email'] = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs['email'] = 'Invalid email';
    if (Object.keys(errs).length) { this.cErrors.set(errs); return; }

    this.placing.set(true);
    this.customerService.upsert({ phone: this.cPhone().trim(), name, email }).subscribe({
      next: c => { this.showCustomerModal.set(false); this.placeOrder(null, c.id); },
      error: (err: Error) => {
        this.showCustomerModal.set(false);
        this.showNoticeMsg(err.message || 'Could not save customer.');
        this.placeOrder(null, null);
      }
    });
  }

  private effectiveTaxRate(): number {
    const s = this.settingsService.get();
    return s.gstEnabled ? s.taxRate / 100 : 0;
  }

  placeOrder(existingOrderId: string | null, customerId: string | null): void {
    const table = this.selectedTable();
    if (!table || this.cart().length === 0) { this.placing.set(false); return; }
    this.placing.set(true);
    const reqItems: OrderItemRequest[] = this.cart().map(l => ({ menuItemId: l.itemId, quantity: l.qty }));
    const taxRate = this.effectiveTaxRate();
    const req$ = existingOrderId
      ? this.orderService.addItems(existingOrderId, reqItems, taxRate)
      : this.orderService.create({ tableId: table.id, customerId: customerId ?? undefined, orderType: 'dine_in', items: reqItems, taxRate });

    req$.subscribe({
      next: order => {
        this.cart.set([]);
        this.placing.set(false);
        this.showNoticeMsg(`Order sent to kitchen for Table ${table.tableNumber}.`);
        const updated: PosTable = { ...table, status: 'occupied', orderId: order.id, seatedAt: table.seatedAt ?? this.fmtTime(order.createdAt) };
        this.selectedTable.set(updated);
        this.panelMode.set('order_view');
        this.loadOrderView(order.id);
        this.refreshTables();
      },
      error: (err: Error) => { this.placing.set(false); this.showNoticeMsg(err.message ?? 'Unable to send order.'); }
    });
  }

  markServed(): void {
    const orderId = this.selectedTable()?.orderId;
    if (!orderId) return;
    if (this.orderView()?.status !== 'ready') { this.showNoticeMsg('Kitchen must mark the order ready first.'); return; }
    this.markingServed.set(true);
    this.orderService.updateStatus(orderId, 'served').subscribe({
      next: order => {
        this.orderView.set(order);
        this.markingServed.set(false);
        this.showNoticeMsg('Order marked as served. Payment is now available.');
        this.refreshTables();
      },
      error: (err: Error) => { this.markingServed.set(false); this.showNoticeMsg(err.message || 'Could not mark as served.'); }
    });
  }

  quickCashPay(): void {
    const table   = this.selectedTable();
    const orderId = table?.orderId;
    if (!orderId || !this.canCollectPayment()) return;
    const due = this.orderDue();
    if (due <= 0) { this.showNoticeMsg('Order already fully paid.'); return; }

    this.quickPaying.set(true);

    this.billingService.generateInvoice(orderId).pipe(catchError(() => of(null))).subscribe(() => {
      this.paymentService.create({ orderId, mode: 'cash', amount: due, tip: this.posTip() }).subscribe({
        next: () => {
          this.quickPaying.set(false);
          this.showNoticeMsg('Cash payment recorded. Table cleared.');
          if (table) {
            this.tables.update(ts => ts.map(t => t.id === table.id ? { ...t, status: 'free' as const, orderId: undefined, seatedAt: undefined } : t));
          }
          this.selectedTable.set(null);
          this.orderView.set(null);
          this.panelMode.set('add_items');
          this.posTip.set(0);
          this.refreshTables();
        },
        error: (err: Error) => {
          this.quickPaying.set(false);
          this.showNoticeMsg(err.message || 'Could not record payment.');
          this.refreshTables();
        }
      });
    });
  }

  goToBilling(): void {
    const table = this.selectedTable();
    if (!table) return;
    if (this.cart().length > 0 && table.orderId) {
      this.placing.set(true);
      const reqItems: OrderItemRequest[] = this.cart().map(l => ({ menuItemId: l.itemId, quantity: l.qty }));
      this.orderService.addItems(table.orderId, reqItems, this.effectiveTaxRate()).subscribe({
        next: order => {
          this.cart.set([]);
          this.placing.set(false);
          this.panelMode.set('order_view');
          this.loadOrderView(order.id);
          this.refreshTables();
        },
        error: (err: Error) => { this.placing.set(false); this.showNoticeMsg(err.message ?? 'Unable to prepare bill.'); }
      });
      return;
    }
    if (this.cart().length > 0) { this.showNoticeMsg('Send items to kitchen first before billing.'); return; }
    if (table.orderId) {
      this.panelMode.set('order_view');
      this.loadOrderView(table.orderId);
      return;
    }
    this.showNoticeMsg('No active order for this table.');
  }

  openPaymentModal(): void {
    if (!this.canCollectPayment()) { this.showNoticeMsg('Payment is available only after the order is served.'); return; }
    const due = this.orderDue();
    this.payMode.set('cash');
    this.cashInput.set('');
    this.splitEnabled.set(false);
    this.splitAmounts.set({ cash: due.toFixed(2), upi: '0.00', debit_card: '0.00', credit_card: '0.00' });
    this.submittingPayment.set(false);
    this.paySuccess.set(null);
    this.payError.set(null);
    this.payNotice.set(null);
    this.modalTip.set(0);
    this.showPaymentModal.set(true);
  }

  closePaymentModal(): void {
    this.showPaymentModal.set(false);
    this.paySuccess.set(null);
  }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('pay-backdrop')) this.closePaymentModal();
  }

  pressCashKey(key: string): void {
    this.payError.set(null);
    if (key === 'backspace') { this.cashInput.update(v => v.slice(0, -1)); return; }
    const cur = this.cashInput();
    if (key === '.' && cur.includes('.')) return;
    if (cur.includes('.') && cur.split('.')[1]?.length >= 2) return;
    this.cashInput.update(v => v + key);
  }

  confirmCash(): void {
    if (this.cashReceived() + 0.01 < this.activePayAmount()) {
      this.payError.set('Cash received is less than the payment amount.');
      return;
    }
    this.submitPayment('cash', this.activePayAmount());
  }

  confirmUpi(): void   { this.submitPayment('upi', this.activePayAmount()); }
  confirmCard(mode: 'debit_card' | 'credit_card'): void { this.submitPayment(mode, this.activePayAmount()); }

  private submitPayment(mode: string, amount: number): void {
    const table   = this.selectedTable();
    const orderId = table?.orderId ?? this.orderView()?.id;
    if (!orderId) return;
    this.submittingPayment.set(true);
    this.payError.set(null);

    this.billingService.generateInvoice(orderId).pipe(catchError(() => of(null))).subscribe(() => {
      this.paymentService.create({ orderId, mode, amount, tip: this.modalTip() }).subscribe({
        next: () => {
          this.submittingPayment.set(false);
          this.paySuccess.set({ amount, mode });
          if (table) {
            this.tables.update(ts => ts.map(t => t.id === table.id
              ? { ...t, status: 'free' as const, orderId: undefined, seatedAt: undefined } : t));
          }
          setTimeout(() => {
            this.showPaymentModal.set(false);
            this.paySuccess.set(null);
            this.selectedTable.set(null);
            this.orderView.set(null);
            this.panelMode.set('add_items');
            this.showNoticeMsg('Payment recorded. Table cleared and invoice sent.');
            this.refreshTables();
          }, 3000);
        },
        error: (err: Error) => {
          this.submittingPayment.set(false);
          this.payError.set(err.message || 'Could not record payment.');
        }
      });
    });
  }

  updateSplitAmount(mode: string, value: string): void {
    const sanitized = value.replace(/[^\d.]/g, '');
    this.splitAmounts.update(sa => ({ ...sa, [mode]: sanitized }));
  }

  payModeLabel(mode: string): string {
    return { cash: 'Cash', upi: 'UPI QR', debit_card: 'Debit Card', credit_card: 'Credit Card' }[mode] ?? mode;
  }

  private showNoticeMsg(msg: string): void {
    this.notice.set(msg);
    if (this.noticeTimeout) clearTimeout(this.noticeTimeout);
    this.noticeTimeout = setTimeout(() => this.notice.set(null), 6000);
  }
}
