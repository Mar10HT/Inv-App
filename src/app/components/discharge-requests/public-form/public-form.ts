import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { DischargeRequestService } from '../../../services/discharge-request.service';
import { AvailableItem } from '../../../interfaces/discharge-request.interface';

@Component({
  selector: 'app-public-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
  template: `
    <div class="min-h-screen bg-surface flex items-center justify-center p-4">
      <div class="w-full max-w-2xl">
        <!-- Header -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-[#4d7c6f]/20 rounded-2xl mb-4">
            <lucide-icon name="ClipboardList" class="!w-8 !h-8 !text-[#4d7c6f]"></lucide-icon>
          </div>
          <h1 class="text-3xl font-bold text-foreground mb-2">{{ 'DISCHARGES.PUBLIC_FORM.TITLE' | translate }}</h1>
          <p class="text-slate-500">{{ 'DISCHARGES.PUBLIC_FORM.SUBTITLE' | translate }}</p>
        </div>

        @if (submitted()) {
          <!-- Success State -->
          <div class="bg-surface-variant border border-theme rounded-xl p-8 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-emerald-950/50 rounded-full mb-4">
              <lucide-icon name="CheckCircle2" class="!w-8 !h-8 !text-emerald-400"></lucide-icon>
            </div>
            <h2 class="text-2xl font-bold text-foreground mb-2">{{ 'DISCHARGES.PUBLIC_FORM.SUCCESS_TITLE' | translate }}</h2>
            <p class="text-slate-400 mb-2">
              {{ 'DISCHARGES.PUBLIC_FORM.SUCCESS_MESSAGE' | translate:{ count: requestsCreated() } }}
            </p>
            <p class="text-slate-500 text-sm mb-6">{{ 'DISCHARGES.PUBLIC_FORM.SUCCESS_HINT' | translate }}</p>
            <button
              (click)="resetForm()"
              class="bg-[#4d7c6f] hover:bg-[#5d8c7f] text-white px-6 py-3 rounded-lg transition-all font-medium">
              {{ 'DISCHARGES.PUBLIC_FORM.NEW_REQUEST' | translate }}
            </button>
          </div>
        } @else {
          <!-- Form -->
          <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
            <!-- Requester Info -->
            <div class="p-6 border-b border-theme">
              <h2 class="text-lg font-semibold text-foreground mb-4">{{ 'DISCHARGES.PUBLIC_FORM.REQUESTER_INFO' | translate }}</h2>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'DISCHARGES.PUBLIC_FORM.NAME' | translate }} *</label>
                  <input
                    type="text"
                    [(ngModel)]="requesterName"
                    class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground placeholder-slate-500 focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] transition-all"
                    [placeholder]="'DISCHARGES.PUBLIC_FORM.NAME_PLACEHOLDER' | translate"
                  />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'DISCHARGES.PUBLIC_FORM.POSITION' | translate }}</label>
                    <input
                      type="text"
                      [(ngModel)]="requesterPosition"
                      class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground placeholder-slate-500 focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] transition-all"
                      [placeholder]="'DISCHARGES.PUBLIC_FORM.POSITION_PLACEHOLDER' | translate"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'DISCHARGES.PUBLIC_FORM.PHONE' | translate }}</label>
                    <input
                      type="tel"
                      [(ngModel)]="requesterPhone"
                      class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground placeholder-slate-500 focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] transition-all"
                      [placeholder]="'DISCHARGES.PUBLIC_FORM.PHONE_PLACEHOLDER' | translate"
                    />
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'DISCHARGES.PUBLIC_FORM.NEEDED_BY' | translate }}</label>
                    <input
                      type="date"
                      [(ngModel)]="neededByDate"
                      class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-400 mb-2">{{ 'DISCHARGES.PUBLIC_FORM.JUSTIFICATION' | translate }}</label>
                  <textarea
                    [(ngModel)]="justification"
                    rows="2"
                    class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 text-foreground placeholder-slate-500 focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] resize-none transition-all"
                    [placeholder]="'DISCHARGES.PUBLIC_FORM.JUSTIFICATION_PLACEHOLDER' | translate"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Items Selection -->
            <div class="p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-foreground">{{ 'DISCHARGES.PUBLIC_FORM.ITEMS' | translate }} *</h2>
                <button
                  type="button"
                  (click)="addItem()"
                  class="text-sm text-[#4d7c6f] hover:text-[#5d8c7f] flex items-center gap-1 font-medium">
                  <lucide-icon name="Plus" class="!w-4 !h-4"></lucide-icon>
                  {{ 'DISCHARGES.PUBLIC_FORM.ADD_ITEM' | translate }}
                </button>
              </div>

              <!-- Search -->
              @if (availableItems().length > 0) {
                <div class="relative mb-4">
                  <input
                    type="text"
                    [(ngModel)]="itemSearch"
                    [placeholder]="'DISCHARGES.PUBLIC_FORM.SEARCH_ITEMS' | translate"
                    class="w-full bg-[#242424] border border-theme rounded-lg px-4 py-3 pl-11 text-foreground placeholder-slate-500 focus:outline-none focus:border-[#4d7c6f] focus:ring-1 focus:ring-[#4d7c6f] transition-all"
                  />
                  <lucide-icon name="Search" class="absolute left-3 top-1/2 -translate-y-1/2 !text-slate-500 !w-5 !h-5"></lucide-icon>
                </div>
              }

              <!-- Selected Items -->
              <div class="space-y-3">
                @for (item of selectedItems(); track $index; let i = $index) {
                  <div class="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                    <div class="flex items-start gap-3">
                      <div class="flex-1 space-y-3">
                        <select
                          [ngModel]="item.inventoryItemId"
                          (ngModelChange)="updateItemId(i, $event)"
                          class="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[#4d7c6f] transition-colors cursor-pointer">
                          <option value="">{{ 'DISCHARGES.PUBLIC_FORM.SELECT_ITEM' | translate }}</option>
                          @for (avItem of filteredAvailableItems(); track avItem.id) {
                            <option [value]="avItem.id" [disabled]="isItemAlreadySelected(avItem.id, i)">
                              {{ avItem.name }} - {{ avItem.warehouseName }} ({{ avItem.quantity }} {{ 'DISCHARGES.PUBLIC_FORM.AVAILABLE' | translate }})
                            </option>
                          }
                        </select>
                        <div class="flex items-center gap-3">
                          <input
                            type="number"
                            [ngModel]="item.quantity"
                            (ngModelChange)="updateItemQuantity(i, $event)"
                            min="1"
                            [max]="getMaxQuantity(item.inventoryItemId)"
                            class="w-28 bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-[#4d7c6f] transition-colors"
                            [placeholder]="'DISCHARGES.PUBLIC_FORM.QTY' | translate"
                          />
                          @if (getSelectedItemName(item.inventoryItemId)) {
                            <span class="text-slate-500 text-sm">{{ getSelectedItemName(item.inventoryItemId) }}</span>
                          }
                        </div>
                      </div>
                      <button
                        type="button"
                        (click)="removeItem(i)"
                        class="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors">
                        <lucide-icon name="Trash2" class="!w-4 !h-4"></lucide-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>

              @if (selectedItems().length === 0) {
                <div class="text-center py-8">
                  <lucide-icon name="Package" class="!w-12 !h-12 !text-slate-700 mb-3 mx-auto"></lucide-icon>
                  <p class="text-slate-500 text-sm">{{ 'DISCHARGES.PUBLIC_FORM.NO_ITEMS' | translate }}</p>
                </div>
              }
            </div>

            <!-- Error Message -->
            @if (errorMessage()) {
              <div class="mx-6 mb-4 p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-400 text-sm">
                {{ errorMessage() }}
              </div>
            }

            <!-- Submit -->
            <div class="px-6 py-4 border-t border-theme flex justify-end gap-3">
              <button
                (click)="submitRequest()"
                [disabled]="!canSubmit() || submitting()"
                class="bg-[#4d7c6f] hover:bg-[#5d8c7f] disabled:bg-slate-700 disabled:text-slate-500 text-white px-8 py-3 rounded-lg transition-all font-medium flex items-center gap-2">
                @if (submitting()) {
                  <lucide-icon name="Loader2" class="!w-5 !h-5 !text-current animate-spin"></lucide-icon>
                }
                {{ 'DISCHARGES.PUBLIC_FORM.SUBMIT' | translate }}
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class PublicFormComponent implements OnInit {
  private dischargeService = inject(DischargeRequestService);
  private translate = inject(TranslateService);

  // Requester info
  requesterName = '';
  requesterPosition = '';
  requesterPhone = '';
  neededByDate = '';
  justification = '';

  // Item search
  itemSearch = '';

  // Items
  selectedItems = signal<{ inventoryItemId: string; quantity: number }[]>([]);
  availableItems = signal<AvailableItem[]>([]);

  // State
  submitting = signal(false);
  submitted = signal(false);
  requestsCreated = signal(0);
  errorMessage = signal<string | null>(null);

  filteredAvailableItems = computed(() => {
    const items = this.availableItems();
    const search = this.itemSearch.toLowerCase();
    if (!search) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search) ||
        item.warehouseName.toLowerCase().includes(search),
    );
  });

  ngOnInit(): void {
    this.dischargeService.getAvailableItems().subscribe((items) => {
      this.availableItems.set(items);
    });
  }

  addItem(): void {
    this.selectedItems.update((items) => [...items, { inventoryItemId: '', quantity: 1 }]);
  }

  updateItemId(index: number, itemId: string): void {
    this.selectedItems.update((items) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], inventoryItemId: itemId };
      return newItems;
    });
  }

  updateItemQuantity(index: number, quantity: number): void {
    this.selectedItems.update((items) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], quantity: quantity || 1 };
      return newItems;
    });
  }

  removeItem(index: number): void {
    this.selectedItems.update((items) => items.filter((_, i) => i !== index));
  }

  isItemAlreadySelected(itemId: string, currentIndex: number): boolean {
    return this.selectedItems().some((item, i) => i !== currentIndex && item.inventoryItemId === itemId);
  }

  getMaxQuantity(inventoryItemId: string): number {
    const item = this.availableItems().find((i) => i.id === inventoryItemId);
    return item?.quantity || 999;
  }

  getSelectedItemName(inventoryItemId: string): string {
    if (!inventoryItemId) return '';
    const item = this.availableItems().find((i) => i.id === inventoryItemId);
    return item ? `${item.warehouseName}` : '';
  }

  canSubmit(): boolean {
    const items = this.selectedItems();
    const hasValidItems = items.length > 0 && items.every((item) => item.inventoryItemId && item.quantity > 0);
    return !!this.requesterName.trim() && hasValidItems;
  }

  submitRequest(): void {
    if (!this.canSubmit()) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.dischargeService
      .createPublicRequest({
        requesterName: this.requesterName.trim(),
        requesterPosition: this.requesterPosition.trim() || undefined,
        requesterPhone: this.requesterPhone.trim() || undefined,
        neededByDate: this.neededByDate || undefined,
        justification: this.justification.trim() || undefined,
        items: this.selectedItems().filter((i) => i.inventoryItemId),
      })
      .subscribe({
        next: (result) => {
          this.submitting.set(false);
          if (result) {
            this.requestsCreated.set(result.requestsCreated);
            this.submitted.set(true);
          } else {
            this.errorMessage.set(this.translate.instant('DISCHARGES.PUBLIC_FORM.ERROR'));
          }
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(err.error?.message || this.translate.instant('DISCHARGES.PUBLIC_FORM.ERROR'));
        },
      });
  }

  resetForm(): void {
    this.requesterName = '';
    this.requesterPosition = '';
    this.requesterPhone = '';
    this.neededByDate = '';
    this.justification = '';
    this.itemSearch = '';
    this.selectedItems.set([]);
    this.submitted.set(false);
    this.requestsCreated.set(0);
    this.errorMessage.set(null);
  }
}
