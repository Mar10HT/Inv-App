import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { TransactionService } from '../../services/transaction.service';
import { WarehouseService } from '../../services/warehouse.service';
import { UserService } from '../../services/user.service';
import { InventoryService } from '../../services/inventory/inventory.service';
import { TransactionType } from '../../interfaces/transaction.interface';

export interface TransactionFormDialogData {
  mode: 'add';
}

@Component({
  selector: 'app-transaction-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    TranslateModule
  ],
  template: `
    <div class="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
        <div>
          <h2 class="text-xl font-semibold text-slate-300">
            {{ 'TRANSACTION.ADD' | translate }}
          </h2>
        </div>
        <button
          type="button"
          (click)="dialogRef.close()"
          class="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-[#2a2a2a] transition-colors">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="p-6 space-y-6 overflow-y-auto flex-1">
        <!-- Type -->
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-2">
            {{ 'TRANSACTION.TYPE' | translate }} *
          </label>
          <select
            formControlName="type"
            class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-300 focus:outline-none focus:border-[#4d7c6f] transition-colors cursor-pointer">
            <option value="IN">{{ 'TRANSACTION.TYPES.IN' | translate }}</option>
            <option value="OUT">{{ 'TRANSACTION.TYPES.OUT' | translate }}</option>
            <option value="TRANSFER">{{ 'TRANSACTION.TYPES.TRANSFER' | translate }}</option>
          </select>
        </div>

        <!-- Source Warehouse (for OUT and TRANSFER) -->
        @if (form.get('type')?.value === 'OUT' || form.get('type')?.value === 'TRANSFER') {
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-2">
              {{ 'TRANSACTION.SOURCE_WAREHOUSE' | translate }} *
            </label>
            <select
              formControlName="sourceWarehouseId"
              class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-300 focus:outline-none focus:border-[#4d7c6f] transition-colors cursor-pointer"
              [class.!border-rose-500]="form.get('sourceWarehouseId')?.invalid && form.get('sourceWarehouseId')?.touched">
              <option value="">{{ 'COMMON.NONE' | translate }}</option>
              @for (warehouse of warehouses(); track warehouse.id) {
                <option [value]="warehouse.id">{{ warehouse.name }}</option>
              }
            </select>
            @if (form.get('sourceWarehouseId')?.invalid && form.get('sourceWarehouseId')?.touched) {
              <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.REQUIRED' | translate }}</p>
            }
          </div>
        }

        <!-- Destination Warehouse (for IN and TRANSFER) -->
        @if (form.get('type')?.value === 'IN' || form.get('type')?.value === 'TRANSFER') {
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-2">
              {{ 'TRANSACTION.DEST_WAREHOUSE' | translate }} *
            </label>
            <select
              formControlName="destinationWarehouseId"
              class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-300 focus:outline-none focus:border-[#4d7c6f] transition-colors cursor-pointer"
              [class.!border-rose-500]="form.get('destinationWarehouseId')?.invalid && form.get('destinationWarehouseId')?.touched">
              <option value="">{{ 'COMMON.NONE' | translate }}</option>
              @for (warehouse of warehouses(); track warehouse.id) {
                <option [value]="warehouse.id">{{ warehouse.name }}</option>
              }
            </select>
            @if (form.get('destinationWarehouseId')?.invalid && form.get('destinationWarehouseId')?.touched) {
              <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.REQUIRED' | translate }}</p>
            }
          </div>
        }

        <!-- User -->
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-2">
            {{ 'TRANSACTION.USER' | translate }} *
          </label>
          <select
            formControlName="userId"
            class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-300 focus:outline-none focus:border-[#4d7c6f] transition-colors cursor-pointer"
            [class.!border-rose-500]="form.get('userId')?.invalid && form.get('userId')?.touched">
            <option value="">{{ 'COMMON.NONE' | translate }}</option>
            @for (user of users(); track user.id) {
              <option [value]="user.id">{{ user.name || user.email }}</option>
            }
          </select>
          @if (form.get('userId')?.invalid && form.get('userId')?.touched) {
            <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.REQUIRED' | translate }}</p>
          }
        </div>

        <!-- Date -->
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-2">
            {{ 'TRANSACTION.DATE' | translate }} *
          </label>
          <input
            type="datetime-local"
            formControlName="date"
            class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-300 focus:outline-none focus:border-[#4d7c6f] transition-colors"
            [class.!border-rose-500]="form.get('date')?.invalid && form.get('date')?.touched"
          />
          @if (form.get('date')?.invalid && form.get('date')?.touched) {
            <p class="text-rose-400 text-sm mt-1">{{ 'FORM.VALIDATION.REQUIRED' | translate }}</p>
          }
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-2">
            {{ 'TRANSACTION.NOTES' | translate }}
          </label>
          <textarea
            formControlName="notes"
            rows="2"
            class="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors resize-none"
            [placeholder]="'TRANSACTION.NOTES' | translate"
          ></textarea>
        </div>

        <!-- Items -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <label class="text-sm font-medium text-slate-400">
              {{ 'TRANSACTION.ITEMS' | translate }} *
            </label>
            <button
              type="button"
              (click)="addItem()"
              class="text-sm text-[#4d7c6f] hover:text-[#5d8c7f] flex items-center gap-1">
              <mat-icon class="!text-lg">add</mat-icon>
              {{ 'TRANSACTION.ADD_ITEM' | translate }}
            </button>
          </div>

          <div formArrayName="items" class="space-y-3">
            @for (item of itemsArray.controls; track $index; let i = $index) {
              <div [formGroupName]="i" class="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                <div class="flex items-start gap-3">
                  <div class="flex-1 space-y-3">
                    <select
                      formControlName="inventoryItemId"
                      class="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-[#4d7c6f] transition-colors cursor-pointer">
                      <option value="">{{ 'TRANSACTION.SELECT_ITEM' | translate }}</option>
                      @for (invItem of inventoryItems(); track invItem.id) {
                        <option [value]="invItem.id">{{ invItem.name }} ({{ invItem.quantity }} disponibles)</option>
                      }
                    </select>
                    <div class="flex gap-3">
                      <input
                        type="number"
                        formControlName="quantity"
                        min="1"
                        class="w-24 bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-[#4d7c6f] transition-colors"
                        placeholder="Qty"
                      />
                      <input
                        type="text"
                        formControlName="notes"
                        class="flex-1 bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-slate-300 text-sm placeholder-slate-600 focus:outline-none focus:border-[#4d7c6f] transition-colors"
                        placeholder="Notes (optional)"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    (click)="removeItem(i)"
                    class="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors">
                    <mat-icon class="!text-lg">delete</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>

          @if (itemsArray.length === 0) {
            <p class="text-slate-500 text-sm text-center py-4">{{ 'TRANSACTION.NO_ITEMS' | translate }}</p>
          }
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-[#2a2a2a]">
          <button
            type="button"
            (click)="dialogRef.close()"
            class="px-6 py-2.5 rounded-lg bg-[#2a2a2a] text-slate-400 hover:bg-[#3a3a3a] hover:text-slate-300 transition-colors font-medium">
            {{ 'COMMON.CANCEL' | translate }}
          </button>
          <button
            type="submit"
            [disabled]="form.invalid || itemsArray.length === 0 || saving()"
            class="px-6 py-2.5 rounded-lg bg-[#4d7c6f] text-white hover:bg-[#5d8c7f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2">
            @if (saving()) {
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            }
            {{ 'COMMON.SAVE' | translate }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class TransactionFormDialog implements OnInit {
  dialogRef = inject(MatDialogRef<TransactionFormDialog>);
  data = inject<TransactionFormDialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private transactionService = inject(TransactionService);
  private warehouseService = inject(WarehouseService);
  private userService = inject(UserService);
  private inventoryService = inject(InventoryService);

  saving = signal(false);
  warehouses = this.warehouseService.warehouses;
  users = this.userService.users;
  inventoryItems = this.inventoryService.items;

  form: FormGroup = this.fb.group({
    type: [TransactionType.IN, Validators.required],
    sourceWarehouseId: [''],
    destinationWarehouseId: [''],
    userId: ['', Validators.required],
    date: [this.getCurrentDateTime(), Validators.required],
    notes: [''],
    items: this.fb.array([])
  });

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  ngOnInit(): void {
    // Load data
    this.warehouseService.getAll().subscribe();
    this.userService.getAll().subscribe();
    this.inventoryService.loadItems();

    // Add initial item
    this.addItem();
  }

  private getCurrentDateTime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  addItem(): void {
    const itemGroup = this.fb.group({
      inventoryItemId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      notes: ['']
    });
    this.itemsArray.push(itemGroup);
  }

  removeItem(index: number): void {
    this.itemsArray.removeAt(index);
  }

  onSubmit(): void {
    if (this.form.invalid || this.itemsArray.length === 0) return;

    this.saving.set(true);
    const formValue = this.form.value;

    // Clean up empty warehouse IDs
    if (!formValue.sourceWarehouseId) delete formValue.sourceWarehouseId;
    if (!formValue.destinationWarehouseId) delete formValue.destinationWarehouseId;

    // Convert date to ISO string
    formValue.date = new Date(formValue.date).toISOString();

    this.transactionService.create(formValue).subscribe({
      next: () => {
        this.dialogRef.close({ saved: true });
      },
      error: () => {
        this.saving.set(false);
      }
    });
  }
}
