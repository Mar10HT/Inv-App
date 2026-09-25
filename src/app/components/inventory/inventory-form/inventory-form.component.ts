import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { InventoryService } from '../../../services/inventory/inventory.service';
import { WarehouseService } from '../../../services/warehouse.service';
import { SupplierService } from '../../../services/supplier.service';
import { UserService } from '../../../services/user.service';
import { CategoryService } from '../../../services/category.service';
import { LoggerService } from '../../../services/logger.service';
import { ItemType, Currency, CreateInventoryItemDto, InventoryStatus } from '../../../interfaces/inventory-item.interface';
import { UserRole } from '../../../interfaces/user.interface';

@Component({
  selector: 'app-inventory-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    MatProgressSpinnerModule,
    TranslateModule
  ],
  template: `
<div class="min-h-screen bg-surface p-6">
  <div class="max-w-3xl mx-auto flex flex-col gap-6">
    <!-- Header -->
    <div class="flex flex-col gap-4">
      <button
        type="button"
        (click)="onCancel()"
        class="self-start flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-variant border border-theme text-on-surface-variant text-[13px] font-medium hover:bg-surface transition-colors"
      >
        <lucide-icon name="ArrowLeft" class="!w-4 !h-4"></lucide-icon>
        {{ 'COMMON.BACK' | translate }}
      </button>
      <div class="flex flex-col gap-1">
        <h1 class="text-[28px] font-bold text-foreground">
          @if (isEditMode()) { {{ 'INVENTORY.FORM.EDIT_TITLE' | translate }} } @else { {{ 'INVENTORY.FORM.ADD_TITLE' | translate }} }
        </h1>
        <p class="text-sm text-on-surface-variant">
          @if (isEditMode()) { {{ 'INVENTORY.FORM.EDIT_SUBTITLE' | translate }} } @else { {{ 'INVENTORY.FORM.ADD_SUBTITLE' | translate }} }
        </p>
      </div>
      <span class="text-xs text-on-surface-variant">* {{ 'FORM.REQUIRED_FIELDS' | translate }}</span>
    </div>

    <!-- Form -->
    <form [formGroup]="inventoryForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-6">

      <!-- Item Type Toggle -->
      <div class="bg-surface-variant rounded-xl border border-theme p-1 flex gap-1">
        <!-- Bulk Tab -->
        <button type="button"
          (click)="inventoryForm.get('itemType')?.setValue(ItemType.BULK); onItemTypeChange(ItemType.BULK)"
          class="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-lg py-2.5 px-4 transition-all cursor-pointer"
          [ngClass]="itemTypeControl?.value === ItemType.BULK
            ? 'bg-[var(--color-primary)] text-white'
            : 'text-on-surface-variant hover:bg-surface'">
          <div class="flex items-center gap-2">
            <lucide-icon name="Layers" class="!w-[18px] !h-[18px]"></lucide-icon>
            <span class="text-sm font-medium">{{ 'INVENTORY.FORM.ITEM_TYPE.BULK' | translate }}</span>
          </div>
          <span class="text-[11px]" [ngClass]="itemTypeControl?.value === ItemType.BULK ? 'opacity-70' : ''">
            {{ 'INVENTORY.FORM.ITEM_TYPE.BULK_HINT' | translate }}
          </span>
        </button>
        <!-- Unique Tab -->
        <button type="button"
          (click)="inventoryForm.get('itemType')?.setValue(ItemType.UNIQUE); onItemTypeChange(ItemType.UNIQUE)"
          class="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-lg py-2.5 px-4 transition-all cursor-pointer"
          [ngClass]="itemTypeControl?.value === ItemType.UNIQUE
            ? 'bg-[var(--color-primary)] text-white'
            : 'text-on-surface-variant hover:bg-surface'">
          <div class="flex items-center gap-2">
            <lucide-icon name="Scan" class="!w-[18px] !h-[18px]"></lucide-icon>
            <span class="text-sm font-semibold">{{ 'INVENTORY.FORM.ITEM_TYPE.UNIQUE' | translate }}</span>
          </div>
          <span class="text-[11px]" [ngClass]="itemTypeControl?.value === ItemType.UNIQUE ? 'opacity-70' : ''">
            {{ 'INVENTORY.FORM.ITEM_TYPE.UNIQUE_HINT' | translate }}
          </span>
        </button>
      </div>

      <!-- Divider -->
      <div class="h-px bg-[var(--color-border)]"></div>

      <!-- Card 1: Basic Information -->
      <div class="bg-surface-variant rounded-xl border border-theme p-6 flex flex-col gap-5">
        <!-- Header -->
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10">
            <lucide-icon name="Info" class="!w-[18px] !h-[18px] text-green-500"></lucide-icon>
          </div>
          <h3 class="text-base font-semibold text-foreground">{{ 'INVENTORY.FORM.BASIC_INFO.TITLE' | translate }}</h3>
        </div>

        <!-- Row 1: Name + Category -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Name -->
          <div class="flex flex-col gap-1.5">
            <label for="item-name" class="text-[13px] font-medium text-foreground">{{ 'INVENTORY.FORM.BASIC_INFO.NAME' | translate }} *</label>
            <div class="flex items-center gap-2 bg-surface border border-theme rounded-lg px-3.5 py-2.5 focus-within:border-[var(--color-primary)] transition-colors">
              <lucide-icon name="Type" class="!w-[18px] !h-[18px] text-on-surface-variant shrink-0"></lucide-icon>
              <input id="item-name" type="text" formControlName="name"
                [placeholder]="'INVENTORY.FORM.BASIC_INFO.NAME_PLACEHOLDER' | translate"
                class="flex-1 bg-transparent text-foreground text-sm placeholder-[var(--color-on-surface-muted)] outline-none min-w-0" />
            </div>
            @if (hasError('name')) {
              <span class="text-xs text-[var(--color-status-error)]">{{ getErrorMessage('name') }}</span>
            }
          </div>

          <!-- Category (select dropdown) -->
          <div class="flex flex-col gap-1.5">
            <label for="item-category" class="text-[13px] font-medium text-foreground">{{ 'INVENTORY.FORM.BASIC_INFO.CATEGORY' | translate }} *</label>
            <div class="flex items-center bg-surface border border-theme rounded-lg pl-3.5 pr-3 py-2.5 focus-within:border-[var(--color-primary)] transition-colors">
              <select id="item-category" formControlName="category"
                class="flex-1 bg-transparent text-foreground text-sm appearance-none outline-none min-w-0 custom-select">
                <option value="" disabled>{{ 'INVENTORY.FORM.BASIC_INFO.CATEGORY_PLACEHOLDER' | translate }}</option>
                @for (category of categories(); track category.id) {
                  <option [value]="category.name">{{ category.name }}</option>
                }
              </select>
              <lucide-icon name="ChevronDown" class="!w-4 !h-4 text-on-surface-variant shrink-0 pointer-events-none"></lucide-icon>
            </div>
            @if (hasError('category')) {
              <span class="text-xs text-[var(--color-status-error)]">{{ getErrorMessage('category') }}</span>
            }
          </div>
        </div>

        <!-- Row 2: Model + Warehouse -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Model -->
          <div class="flex flex-col gap-1.5">
            <label for="item-model" class="text-[13px] font-medium text-foreground">{{ 'INVENTORY.FORM.BASIC_INFO.MODEL' | translate }}</label>
            <div class="flex items-center gap-2 bg-surface border border-theme rounded-lg px-3.5 py-2.5 focus-within:border-[var(--color-primary)] transition-colors">
              <lucide-icon name="Cpu" class="!w-[18px] !h-[18px] text-on-surface-variant shrink-0"></lucide-icon>
              <input id="item-model" type="text" formControlName="model"
                [placeholder]="'INVENTORY.FORM.BASIC_INFO.MODEL_PLACEHOLDER' | translate"
                class="flex-1 bg-transparent text-foreground text-sm placeholder-[var(--color-on-surface-muted)] outline-none min-w-0" />
            </div>
          </div>

          <!-- Warehouse (select dropdown) -->
          <div class="flex flex-col gap-1.5">
            <label for="item-warehouseId" class="text-[13px] font-medium text-foreground">{{ 'INVENTORY.FORM.WAREHOUSE.LABEL' | translate }} *</label>
            <div class="flex items-center bg-surface border border-theme rounded-lg pl-3.5 pr-3 py-2.5 focus-within:border-[var(--color-primary)] transition-colors">
              <select id="item-warehouseId" formControlName="warehouseId"
                class="flex-1 bg-transparent text-foreground text-sm appearance-none outline-none min-w-0 custom-select">
                <option value="" disabled>{{ 'INVENTORY.FORM.WAREHOUSE.HINT' | translate }}</option>
                @for (warehouse of warehouses(); track warehouse.id) {
                  <option [value]="warehouse.id">{{ warehouse.name }} - {{ warehouse.location }}</option>
                }
              </select>
              <lucide-icon name="ChevronDown" class="!w-4 !h-4 text-on-surface-variant shrink-0 pointer-events-none"></lucide-icon>
            </div>
            @if (hasError('warehouseId')) {
              <span class="text-xs text-[var(--color-status-error)]">{{ getErrorMessage('warehouseId') }}</span>
            }
          </div>
        </div>

        <!-- Row 3: Description (full width) -->
        <div class="flex flex-col gap-1.5">
          <label for="item-description" class="text-[13px] font-medium text-foreground">{{ 'INVENTORY.FORM.BASIC_INFO.DESCRIPTION' | translate }} *</label>
          <textarea id="item-description" formControlName="description" rows="3"
            [placeholder]="'INVENTORY.FORM.BASIC_INFO.DESCRIPTION_PLACEHOLDER' | translate"
            class="w-full px-3.5 py-2.5 bg-surface border border-theme rounded-lg text-foreground text-sm placeholder-[var(--color-on-surface-muted)] focus:border-[var(--color-primary)] focus:outline-none transition-colors resize-none"></textarea>
          @if (hasError('description')) {
            <span class="text-xs text-[var(--color-status-error)]">{{ getErrorMessage('description') }}</span>
          }
        </div>
      </div>

      <!-- Card 2: Identifiers -->
      <div class="bg-surface-variant rounded-xl border border-theme p-6 flex flex-col gap-5">
        <!-- Header -->
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10">
            <lucide-icon name="QrCode" class="!w-[18px] !h-[18px] text-indigo-400"></lucide-icon>
          </div>
          <h3 class="text-base font-semibold text-foreground">{{ 'INVENTORY.FORM.IDENTIFIERS.TITLE' | translate }}</h3>
          @if (isUniqueItem()) {
            <span class="px-2 py-0.5 rounded-full bg-[var(--color-primary-container)] text-[var(--color-primary)] text-[11px] font-semibold">UNIQUE only</span>
          } @else {
            <span class="px-2 py-0.5 rounded-full bg-indigo-500/15 text-[var(--color-primary)] text-[11px] font-semibold">{{ 'COMMON.OPTIONAL' | translate }}</span>
          }
        </div>

        <!-- Fields -->
        @if (isUniqueItem()) {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Service Tag -->
            <div class="flex flex-col gap-1.5">
              <label for="item-serviceTag" class="text-[13px] font-medium text-foreground">{{ 'INVENTORY.FORM.IDENTIFIERS.SERVICE_TAG' | translate }} *</label>
              <div class="flex items-center gap-2 bg-surface border border-theme rounded-lg px-3.5 py-2.5 focus-within:border-[var(--color-primary)] transition-colors">
                <lucide-icon name="Tag" class="!w-[18px] !h-[18px] text-on-surface-variant shrink-0"></lucide-icon>
                <input id="item-serviceTag" type="text" formControlName="serviceTag"
                  [placeholder]="'INVENTORY.FORM.IDENTIFIERS.SERVICE_TAG_PLACEHOLDER' | translate"
                  class="flex-1 bg-transparent text-foreground text-sm placeholder-[var(--color-on-surface-muted)] outline-none min-w-0" />
              </div>
              @if (hasError('serviceTag')) {
                <span class="text-xs text-[var(--color-status-error)]">{{ getErrorMessage('serviceTag') }}</span>
              }
            </div>
            <!-- Serial Number -->
            <div class="flex flex-col gap-1.5">
              <label for="item-serialNumber" class="text-[13px] font-medium text-foreground">{{ 'INVENTORY.FORM.IDENTIFIERS.SERIAL_NUMBER' | translate }}</label>
              <div class="flex items-center gap-2 bg-surface border border-theme rounded-lg px-3.5 py-2.5 focus-within:border-[var(--color-primary)] transition-colors">
                <lucide-icon name="Hash" class="!w-[18px] !h-[18px] text-on-surface-variant shrink-0"></lucide-icon>
                <input id="item-serialNumber" type="text" formControlName="serialNumber"
                  [placeholder]="'INVENTORY.FORM.IDENTIFIERS.SERIAL_NUMBER_PLACEHOLDER' | translate"
                  class="flex-1 bg-transparent text-foreground text-sm placeholder-[var(--color-on-surface-muted)] outline-none min-w-0" />
              </div>
            </div>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- SKU -->
            <div class="flex flex-col gap-1.5">
              <label for="item-sku" class="text-[13px] font-medium text-foreground">{{ 'INVENTORY.FORM.IDENTIFIERS.SKU' | translate }}</label>
              <div class="flex items-center gap-2 bg-surface border border-theme rounded-lg px-3.5 py-2.5 focus-within:border-[var(--color-primary)] transition-colors">
                <lucide-icon name="Package" class="!w-[18px] !h-[18px] text-on-surface-variant shrink-0"></lucide-icon>
                <input id="item-sku" type="text" formControlName="sku"
                  [placeholder]="'INVENTORY.FORM.IDENTIFIERS.SKU_PLACEHOLDER' | translate"
                  class="flex-1 bg-transparent text-foreground text-sm placeholder-[var(--color-on-surface-muted)] outline-none min-w-0" />
              </div>
            </div>
            <!-- Barcode -->
            <div class="flex flex-col gap-1.5">
              <label for="item-barcode" class="text-[13px] font-medium text-foreground">{{ 'INVENTORY.FORM.IDENTIFIERS.BARCODE' | translate }}</label>
              <div class="flex items-center gap-2 bg-surface border border-theme rounded-lg px-3.5 py-2.5 focus-within:border-[var(--color-primary)] transition-colors">
                <lucide-icon name="Scan" class="!w-[18px] !h-[18px] text-on-surface-variant shrink-0"></lucide-icon>
                <input id="item-barcode" type="text" formControlName="barcode"
                  [placeholder]="'INVENTORY.FORM.IDENTIFIERS.BARCODE_PLACEHOLDER' | translate"
                  class="flex-1 bg-transparent text-foreground text-sm placeholder-[var(--color-on-surface-muted)] outline-none min-w-0" />
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Card 3: Quantity & Stock -->
      <div class="bg-surface-variant rounded-xl border border-theme p-6 flex flex-col gap-5">
        <!-- Header -->
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10">
            <lucide-icon name="Package" class="!w-[18px] !h-[18px] text-[var(--color-status-warning)]"></lucide-icon>
          </div>
          <h3 class="text-base font-semibold text-foreground">{{ 'INVENTORY.FORM.QUANTITY.TITLE' | translate }}</h3>
        </div>

        <!-- Fields -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Current Quantity -->
          <div class="flex flex-col gap-1.5">
            <label for="item-quantity" class="text-[13px] font-medium text-foreground">{{ 'INVENTORY.FORM.QUANTITY.CURRENT' | translate }} *</label>
            <div class="flex items-center gap-2 bg-surface border border-theme rounded-lg px-3.5 py-2.5 focus-within:border-[var(--color-primary)] transition-colors">
              <lucide-icon name="Package" class="!w-[18px] !h-[18px] text-on-surface-variant shrink-0"></lucide-icon>
              <input id="item-quantity" type="number" formControlName="quantity" placeholder="0"
                class="flex-1 bg-transparent text-foreground text-sm placeholder-[var(--color-on-surface-muted)] outline-none min-w-0" />
            </div>
            @if (hasError('quantity')) {
              <span class="text-xs text-[var(--color-status-error)]">{{ getErrorMessage('quantity') }}</span>
            }
          </div>
          <!-- Minimum Quantity -->
          <div class="flex flex-col gap-1.5">
            <label for="item-minQuantity" class="text-[13px] font-medium text-foreground">{{ 'INVENTORY.FORM.QUANTITY.MINIMUM' | translate }}</label>
            <div class="flex items-center gap-2 bg-surface border border-theme rounded-lg px-3.5 py-2.5 focus-within:border-[var(--color-primary)] transition-colors">
              <lucide-icon name="AlertTriangle" class="!w-[18px] !h-[18px] text-on-surface-variant shrink-0"></lucide-icon>
              <input id="item-minQuantity" type="number" formControlName="minQuantity" placeholder="0"
                class="flex-1 bg-transparent text-foreground text-sm placeholder-[var(--color-on-surface-muted)] outline-none min-w-0" />
            </div>
          </div>
        </div>

        <!-- Hint text -->
        <span class="text-xs text-on-surface-variant">
          @if (isUniqueItem()) {
            {{ 'INVENTORY.FORM.QUANTITY.UNIQUE_HINT' | translate }}
          } @else {
            {{ 'INVENTORY.FORM.QUANTITY.BULK_HINT' | translate }}
          }
        </span>
      </div>

      <!-- Card 4: Price & Supplier -->
      <div class="bg-surface-variant rounded-xl border border-theme p-6 flex flex-col gap-5">
        <!-- Header -->
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-yellow-500/10">
            <lucide-icon name="DollarSign" class="!w-[18px] !h-[18px] text-yellow-500"></lucide-icon>
          </div>
          <h3 class="text-base font-semibold text-foreground">{{ 'INVENTORY.FORM.PRICE.TITLE' | translate }}</h3>
        </div>

        <!-- Row 1: Price + Currency -->
        <div class="flex gap-4">
          <!-- Price -->
          <div class="flex flex-col gap-1.5 flex-1">
            <label for="item-price" class="text-[13px] font-medium text-foreground">{{ 'INVENTORY.FORM.PRICE.AMOUNT' | translate }} *</label>
            <div class="flex items-center gap-2 bg-surface border border-theme rounded-lg px-3.5 py-2.5 focus-within:border-[var(--color-primary)] transition-colors">
              <lucide-icon name="DollarSign" class="!w-[18px] !h-[18px] text-on-surface-variant shrink-0"></lucide-icon>
              <input id="item-price" type="number" step="0.01" formControlName="price" placeholder="0.00"
                class="flex-1 bg-transparent text-foreground text-sm placeholder-[var(--color-on-surface-muted)] outline-none min-w-0" />
            </div>
          </div>
          <!-- Currency -->
          <div class="flex flex-col gap-1.5 w-[200px]">
            <label for="item-currency" class="text-[13px] font-medium text-foreground">{{ 'INVENTORY.FORM.PRICE.CURRENCY' | translate }} *</label>
            <div class="flex items-center bg-surface border border-theme rounded-lg pl-3.5 pr-3 py-2.5 focus-within:border-[var(--color-primary)] transition-colors">
              <select id="item-currency" formControlName="currency"
                class="flex-1 bg-transparent text-foreground text-sm appearance-none outline-none min-w-0 custom-select">
                <option [value]="Currency.HNL">HNL (L)</option>
                <option [value]="Currency.USD">USD ($)</option>
              </select>
              <lucide-icon name="ChevronDown" class="!w-4 !h-4 text-on-surface-variant shrink-0 pointer-events-none"></lucide-icon>
            </div>
          </div>
        </div>

        <!-- Row 2: Supplier (full width) -->
        <div class="flex flex-col gap-1.5">
          <label for="item-supplierId" class="text-[13px] font-medium text-foreground">{{ 'INVENTORY.FORM.SUPPLIER.LABEL' | translate }}</label>
          <div class="flex items-center bg-surface border border-theme rounded-lg pl-3.5 pr-3 py-2.5 focus-within:border-[var(--color-primary)] transition-colors">
            <select id="item-supplierId" formControlName="supplierId"
              class="flex-1 bg-transparent text-foreground text-sm appearance-none outline-none min-w-0 custom-select">
              <option value="">{{ 'INVENTORY.FORM.SUPPLIER.NONE' | translate }}</option>
              @for (supplier of suppliers(); track supplier.id) {
                <option [value]="supplier.id">{{ supplier.name }}@if (supplier.location) { - {{ supplier.location }}}</option>
              }
            </select>
            <lucide-icon name="ChevronDown" class="!w-4 !h-4 text-on-surface-variant shrink-0 pointer-events-none"></lucide-icon>
          </div>
        </div>
      </div>

      <!-- Card 5: Assignment (UNIQUE only) -->
      @if (isUniqueItem()) {
        <div class="bg-surface-variant rounded-xl border border-theme p-6 flex flex-col gap-5">
          <!-- Header -->
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-pink-500/10">
              <lucide-icon name="User" class="!w-[18px] !h-[18px] text-pink-500"></lucide-icon>
            </div>
            <h3 class="text-base font-semibold text-foreground">{{ 'INVENTORY.FORM.ASSIGNMENT.TITLE' | translate }}</h3>
            <span class="px-2 py-0.5 rounded-full bg-[var(--color-primary-container)] text-[var(--color-primary)] text-[11px] font-semibold">UNIQUE only</span>
          </div>

          <!-- Assigned User -->
          <div class="flex flex-col gap-1.5">
            <label for="item-assignedToUserId" class="text-[13px] font-medium text-foreground">{{ 'INVENTORY.FORM.ASSIGNMENT.USER' | translate }}</label>
            <div class="flex items-center bg-surface border border-theme rounded-lg pl-3.5 pr-3 py-2.5 focus-within:border-[var(--color-primary)] transition-colors">
              <select id="item-assignedToUserId" formControlName="assignedToUserId"
                class="flex-1 bg-transparent text-foreground text-sm appearance-none outline-none min-w-0 custom-select">
                <option value="">{{ 'INVENTORY.FORM.ASSIGNMENT.UNASSIGNED' | translate }}</option>
                @for (user of assignableUsers(); track user.id) {
                  <option [value]="user.id">{{ user.name }} ({{ user.email }}) - {{ user.role }}</option>
                }
              </select>
              <lucide-icon name="ChevronDown" class="!w-4 !h-4 text-on-surface-variant shrink-0 pointer-events-none"></lucide-icon>
            </div>
          </div>

          <!-- Hint -->
          <span class="text-xs text-on-surface-variant">{{ 'INVENTORY.FORM.ASSIGNMENT.HINT' | translate }}</span>
        </div>
      }

      <!-- Form Actions -->
      <div class="flex justify-end gap-3 pt-2">
        <button type="button" (click)="onCancel()" [disabled]="loading()"
          class="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-variant border border-theme text-foreground text-sm font-medium hover:bg-surface transition-colors disabled:opacity-50">
          <lucide-icon name="X" class="!w-[18px] !h-[18px]"></lucide-icon>
          {{ 'COMMON.CANCEL' | translate }}
        </button>
        <button type="submit" [disabled]="inventoryForm.invalid || loading()"
          class="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          @if (loading()) {
            <mat-spinner diameter="18"></mat-spinner>
          } @else {
            <lucide-icon name="Save" class="!w-[18px] !h-[18px]"></lucide-icon>
          }
          {{ 'COMMON.SAVE' | translate }}
        </button>
      </div>
    </form>
  </div>
</div>
  `,
  styleUrl: './inventory-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private inventoryService = inject(InventoryService);
  private warehouseService = inject(WarehouseService);
  private supplierService = inject(SupplierService);
  private userService = inject(UserService);
  private categoryService = inject(CategoryService);
  private translate = inject(TranslateService);
  private logger = inject(LoggerService);

  // Enums for template
  ItemType = ItemType;
  Currency = Currency;
  UserRole = UserRole;

  // Edit mode
  isEditMode = signal<boolean>(false);
  itemId = signal<string | null>(null);

  // Form
  inventoryForm!: FormGroup;

  // Data signals
  warehouses = this.warehouseService.warehouses;
  suppliers = this.supplierService.suppliers;
  users = this.userService.users;
  categories = this.categoryService.categories;

  // Loading states
  loading = signal<boolean>(false);

  // Item type signal (writable so it updates when user toggles)
  isUniqueItem = signal<boolean>(false);

  assignableUsers = computed(() =>
    this.users().filter(user =>
      user.role === UserRole.USER || user.role === UserRole.EXTERNAL
    )
  );

  // Form controls shortcuts
  get itemTypeControl() {
    return this.inventoryForm?.get('itemType');
  }

  get warehouseIdControl() {
    return this.inventoryForm?.get('warehouseId');
  }

  get currencyControl() {
    return this.inventoryForm?.get('currency');
  }

  constructor() {
    // Effect to handle dynamic validations when itemType changes
    effect(() => {
      const isUnique = this.isUniqueItem();

      if (this.inventoryForm) {
        const serviceTagControl = this.inventoryForm.get('serviceTag');
        const serialNumberControl = this.inventoryForm.get('serialNumber');
        const skuControl = this.inventoryForm.get('sku');
        const barcodeControl = this.inventoryForm.get('barcode');
        const quantityControl = this.inventoryForm.get('quantity');
        const minQuantityControl = this.inventoryForm.get('minQuantity');

        if (isUnique) {
          // UNIQUE items: require serviceTag OR serialNumber, quantity can be 0 or 1
          serviceTagControl?.setValidators([Validators.required]);
          serialNumberControl?.clearValidators();
          skuControl?.clearValidators();
          barcodeControl?.clearValidators();

          // UNIQUE items can only have quantity 0 or 1
          quantityControl?.enable();
          quantityControl?.setValidators([Validators.required, Validators.min(0), Validators.max(1)]);
          // Don't force quantity to 1, let user choose 0 or 1
          minQuantityControl?.setValue(1);
          minQuantityControl?.disable();
        } else {
          // BULK items: SKU and barcode are optional, enable quantity
          serviceTagControl?.clearValidators();
          serialNumberControl?.clearValidators();
          skuControl?.clearValidators();
          barcodeControl?.clearValidators();

          // Enable quantity editing
          quantityControl?.enable();
          quantityControl?.setValidators([Validators.required, Validators.min(0)]);
          minQuantityControl?.enable();
          minQuantityControl?.setValidators([Validators.min(0)]);
        }

        // Update validity
        serviceTagControl?.updateValueAndValidity();
        serialNumberControl?.updateValueAndValidity();
        skuControl?.updateValueAndValidity();
        barcodeControl?.updateValueAndValidity();
        quantityControl?.updateValueAndValidity();
        minQuantityControl?.updateValueAndValidity();
      }
    });
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadData();
    this.checkEditMode();
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.itemId.set(id);
      this.loadItemForEdit(id);
    }
  }

  private loadItemForEdit(id: string): void {
    this.loading.set(true);
    this.inventoryService.getItemById(id).subscribe({
      next: (item) => {
        this.inventoryForm.patchValue({
          name: item.name,
          description: item.description,
          category: item.category,
          model: item.model || '',
          itemType: item.itemType,
          serviceTag: item.serviceTag || '',
          serialNumber: item.serialNumber || '',
          sku: item.sku || '',
          barcode: item.barcode || '',
          quantity: item.quantity,
          minQuantity: item.minQuantity,
          price: item.price,
          currency: item.currency,
          warehouseId: item.warehouseId,
          supplierId: item.supplierId || '',
          assignedToUserId: item.assignedToUserId || ''
        });
        // Update signal so conditional sections and validators react
        this.isUniqueItem.set(item.itemType === ItemType.UNIQUE);
        this.loading.set(false);
      },
      error: (error) => {
        this.logger.error('Error loading item', error);
        this.loading.set(false);
        this.router.navigate(['/inventory']);
      }
    });
  }

  private initializeForm(): void {
    this.inventoryForm = this.fb.group({
      // Basic info
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required]],
      category: ['', Validators.required],
      model: [''],

      // Item type (UNIQUE vs BULK)
      itemType: [ItemType.BULK, Validators.required],

      // Identifiers (dynamic validation)
      serviceTag: [''],
      serialNumber: [''],
      sku: [''],
      barcode: [''],

      // Quantity (dynamic based on type)
      quantity: [0, [Validators.required, Validators.min(0)]],
      minQuantity: [0, [Validators.required, Validators.min(0)]],

      // Price
      price: [0, [Validators.required, Validators.min(0)]],
      currency: [Currency.HNL, Validators.required],

      // Relations
      warehouseId: ['', Validators.required],
      supplierId: [''],

      // Assignment (only for UNIQUE items)
      assignedToUserId: ['']
    });

    // Trigger initial validation setup
    this.itemTypeControl?.setValue(ItemType.BULK);
  }

  private loadData(): void {
    // Load warehouses
    this.warehouseService.getAll().subscribe({
      error: (error) => this.logger.error('Error loading warehouses', error)
    });

    // Load suppliers
    this.supplierService.getAll().subscribe({
      error: (error) => this.logger.error('Error loading suppliers', error)
    });

    // Load users
    this.userService.getAll().subscribe({
      error: (error) => this.logger.error('Error loading users', error)
    });

    // Load categories
    this.categoryService.getAll().subscribe({
      error: (error) => this.logger.error('Error loading categories', error)
    });
  }

  onItemTypeChange(type: ItemType): void {
    // Update the signal so conditional sections and validators react
    this.isUniqueItem.set(type === ItemType.UNIQUE);
    // Clear fields when switching type
    if (type === ItemType.UNIQUE) {
      this.inventoryForm.patchValue({
        sku: '',
        barcode: '',
        quantity: 1,
        minQuantity: 1,
        assignedToUserId: ''
      });
    } else {
      this.inventoryForm.patchValue({
        serviceTag: '',
        serialNumber: '',
        assignedToUserId: ''
      });
    }
  }

  onSubmit(): void {
    if (this.inventoryForm.invalid) {
      this.inventoryForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    // Get form values
    const formValue = this.inventoryForm.getRawValue();

    // Build DTO based on item type
    const dto: CreateInventoryItemDto = {
      name: formValue.name,
      description: formValue.description,
      category: formValue.category,
      model: formValue.model,
      itemType: formValue.itemType,
      quantity: formValue.quantity,
      minQuantity: formValue.minQuantity,
      price: formValue.price,
      currency: formValue.currency,
      warehouseId: formValue.warehouseId,
      status: this.calculateStatus(formValue)
    };

    // Add optional fields based on item type
    if (formValue.itemType === ItemType.UNIQUE) {
      if (formValue.serviceTag) dto.serviceTag = formValue.serviceTag;
      if (formValue.serialNumber) dto.serialNumber = formValue.serialNumber;
      if (formValue.assignedToUserId) dto.assignedToUserId = formValue.assignedToUserId;
    } else {
      // BULK items: SKU and barcode are optional
      if (formValue.sku) dto.sku = formValue.sku;
      if (formValue.barcode) dto.barcode = formValue.barcode;
    }

    // Add supplier if selected
    if (formValue.supplierId) {
      dto.supplierId = formValue.supplierId;
    }

    // Create or Update item
    if (this.isEditMode() && this.itemId()) {
      this.inventoryService.updateItem(this.itemId()!, dto).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/inventory']);
        },
        error: (error) => {
          this.logger.error('Error updating item', error);
          this.loading.set(false);
        }
      });
    } else {
      this.inventoryService.createItem(dto).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/inventory']);
        },
        error: (error) => {
          this.logger.error('Error creating item', error);
          this.loading.set(false);
        }
      });
    }
  }

  private calculateStatus(formValue: Pick<CreateInventoryItemDto, 'itemType' | 'assignedToUserId' | 'quantity' | 'minQuantity'>): InventoryStatus {
    if (formValue.itemType === ItemType.UNIQUE) {
      // The minimum of a UNIQUE item is fixed at 1, so the BULK rule below would call the single
      // unit it has "low stock". This is the rule the API applies when it creates an item and is not sent a status.
      if (formValue.assignedToUserId) return InventoryStatus.IN_USE;
      return formValue.quantity === 1 ? InventoryStatus.IN_STOCK : InventoryStatus.OUT_OF_STOCK;
    }
    if (formValue.quantity === 0) return InventoryStatus.OUT_OF_STOCK;
    if (formValue.quantity <= (formValue.minQuantity ?? 0)) return InventoryStatus.LOW_STOCK;
    return InventoryStatus.IN_STOCK;
  }

  onCancel(): void {
    this.router.navigate(['/inventory']);
  }

  // Helper methods for template
  getErrorMessage(controlName: string): string {
    const control = this.inventoryForm.get(controlName);

    if (control?.hasError('required')) {
      return this.translate.instant('FORM.VALIDATION.REQUIRED');
    }

    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return this.translate.instant('FORM.VALIDATION.MIN_LENGTH', { length: minLength });
    }

    if (control?.hasError('min')) {
      return this.translate.instant('FORM.VALIDATION.MIN_VALUE', { value: 0 });
    }

    return '';
  }

  hasError(controlName: string): boolean {
    const control = this.inventoryForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}



