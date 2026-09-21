import { Component, computed, signal, effect, OnInit, AfterViewInit, ViewChild, ChangeDetectionStrategy, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { downloadStyledXLSX } from '../../../utils/xlsx.utils';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Angular Material imports - only what's actually used
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { NgxPermissionsModule } from 'ngx-permissions';

import { InventoryService } from '.././../../services/inventory/inventory.service';
import { NotificationService } from '../../../services/notification.service';
import { InventoryItemInterface, InventoryStatus, ItemType } from '../../../interfaces/inventory-item.interface';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { InventoryItem } from '../inventory-item/inventory-item';
import { ImportDialog } from '../../import/import-dialog';
import { SkeletonCardComponent } from '../../shared/skeleton/skeleton-card';
import { SkeletonTableComponent } from '../../shared/skeleton/skeleton-table';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    LucideAngularModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslateModule,
    ScrollingModule,
    NgxPermissionsModule,
    SkeletonCardComponent,
    SkeletonTableComponent
  ],
  template: `
<div class="min-h-screen bg-surface p-6">
  <div class="max-w-[1600px] mx-auto">
    <!-- Header Section -->
    <div class="mb-8">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 class="text-4xl font-bold text-foreground mb-2">{{ 'DASHBOARD.TITLE' | translate }}</h1>
          <p class="text-[var(--color-on-surface-variant)] text-lg">{{ 'DASHBOARD.SUBTITLE' | translate }}</p>
        </div>
        <ng-container *ngxPermissionsOnly="['inventory:create']">
          <button
            (click)="addNewItem()"
            class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-6 py-3 rounded-lg transition-all flex items-center gap-2 w-fit font-medium">
            <lucide-icon name="Plus" class="!w-5 !h-5"></lucide-icon>
            {{ 'DASHBOARD.ADD_NEW_ITEM' | translate }}
          </button>
        </ng-container>
      </div>
    </div>

    <!-- Stats Cards -->
    @if (loading()) {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        @for (card of [1, 2, 3, 4]; track $index) {
          <app-skeleton-card />
        }
      </div>
    } @else {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Total Items -->
        <div class="bg-surface-variant border border-theme rounded-xl p-6 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'DASHBOARD.TOTAL_ITEMS' | translate }}</p>
            <p class="text-3xl font-bold text-foreground">{{ stats().total }}</p>
          </div>
          <div class="bg-[var(--color-surface-elevated)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="Package" class="!text-[var(--color-on-surface-variant)] !w-6 !h-6"></lucide-icon>
          </div>
        </div>
      </div>

      <!-- In Stock -->
      <div class="bg-surface-variant border border-theme rounded-xl p-6 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'DASHBOARD.IN_STOCK' | translate }}</p>
            <p class="text-3xl font-bold text-foreground">{{ stats().inStock }}</p>
          </div>
          <div class="bg-[var(--color-primary-container)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="CheckCircle2" class="!text-[var(--color-primary)] !w-6 !h-6"></lucide-icon>
          </div>
        </div>
      </div>

      <!-- Low Stock -->
      <div class="bg-surface-variant border border-theme rounded-xl p-6 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'DASHBOARD.LOW_STOCK' | translate }}</p>
            <p class="text-3xl font-bold text-foreground">{{ stats().lowStock }}</p>
          </div>
          <div class="bg-[var(--color-warning-bg)] p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0">
            <lucide-icon name="AlertTriangle" class="!text-orange-600 !w-6 !h-6"></lucide-icon>
          </div>
        </div>
      </div>

      <!-- Out of Stock -->
      <div class="bg-surface-variant border border-theme rounded-xl p-6 hover:border-[var(--color-border)] transition-all">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-[var(--color-on-surface-variant)]">{{ 'DASHBOARD.OUT_OF_STOCK' | translate }}</p>
            <p class="text-3xl font-bold text-foreground">{{ stats().outOfStock }}</p>
          </div>
          <div class="p-3 rounded-lg flex items-center justify-center w-12 h-12 flex-shrink-0" style="background-color: var(--color-error-bg)">
            <lucide-icon name="AlertCircle" class="!w-6 !h-6" style="color: var(--color-status-error)"></lucide-icon>
          </div>
        </div>
      </div>
      </div>
    }

    <!-- Filters Section - REDESIGNED -->
    <div class="bg-surface-variant border border-theme rounded-xl p-6 mb-8">
      <div class="flex flex-col lg:flex-row gap-4">
        <!-- Search Input -->
        <div class="flex-1">
          <div class="relative">
            <input
              #searchInput
              type="text"
              [value]="searchQuery()"
              (input)="onSearchChange(searchInput.value)"
              [placeholder]="'INVENTORY.SEARCH_PLACEHOLDER' | translate"
              class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 pl-11 text-foreground placeholder-[var(--color-on-surface-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
            />
            <lucide-icon name="Search" class="absolute left-3 top-1/2 -translate-y-1/2 !text-[var(--color-on-surface-variant)] !w-5 !h-5"></lucide-icon>
          </div>
        </div>

        <!-- Category Select -->
        <div class="lg:w-48">
          <select
            [value]="selectedCategory()"
            (change)="onCategoryChange($any($event.target).value)"
            class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all cursor-pointer appearance-none custom-select-chevron"
          >
            <option value="all">{{ 'INVENTORY.ALL_CATEGORIES' | translate }}</option>
            @for (category of categories(); track category) {
              <option [value]="category">{{category}}</option>
            }
          </select>
        </div>

        <!-- Location Select -->
        <div class="lg:w-48">
          <select
            [value]="selectedLocation()"
            (change)="onLocationChange($any($event.target).value)"
            class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all cursor-pointer appearance-none custom-select-chevron"
          >
            <option value="all">{{ 'INVENTORY.ALL_LOCATIONS' | translate }}</option>
            @for (location of locations(); track location) {
              <option [value]="location">{{location}}</option>
            }
          </select>
        </div>

        <!-- Status Select -->
        <div class="lg:w-48">
          <select
            [value]="selectedStatus()"
            (change)="onStatusChange($any($event.target).value)"
            class="w-full bg-[var(--color-surface-elevated)] border border-theme rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all cursor-pointer appearance-none custom-select-chevron"
          >
            <option value="all">{{ 'INVENTORY.ALL_STATUS' | translate }}</option>
            <option [value]="InventoryStatus.IN_STOCK">{{ 'INVENTORY.STATUS.IN_STOCK' | translate }}</option>
            <option [value]="InventoryStatus.LOW_STOCK">{{ 'INVENTORY.STATUS.LOW_STOCK' | translate }}</option>
            <option [value]="InventoryStatus.OUT_OF_STOCK">{{ 'INVENTORY.STATUS.OUT_OF_STOCK' | translate }}</option>
            <option [value]="InventoryStatus.IN_USE">{{ 'INVENTORY.STATUS.IN_USE' | translate }}</option>
          </select>
        </div>

        <!-- Clear Filters Button -->
        @if (searchQuery() !== '' || selectedCategory() !== 'all' || selectedLocation() !== 'all' || selectedStatus() !== 'all') {
          <button
            (click)="clearFilters()"
            class="bg-transparent border border-[var(--color-border)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-elevated)] hover:text-foreground px-4 py-3 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap">
            <lucide-icon name="X" class="!w-4 !h-4"></lucide-icon>
            {{ 'INVENTORY.LIST.CLEAR_FILTERS' | translate }}
          </button>
        }
      </div>
    </div>

    <!-- Data Table -->
    <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
      <!-- Table Header -->
      <div class="px-6 py-4 border-b border-theme flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-xl font-semibold text-foreground">{{ 'DASHBOARD.RECENT_ITEMS' | translate }}</h2>
          <p class="text-[var(--color-on-surface-variant)] text-sm mt-1">{{ 'INVENTORY.LIST.ITEMS_COUNT' | translate:{ count: totalItems() } }}</p>
        </div>
        <div class="flex items-center gap-2">
          <ng-container *ngxPermissionsOnly="['inventory:create']">
            <button
              (click)="openImportDialog()"
              class="bg-transparent border border-[var(--color-border)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-elevated)] hover:text-foreground px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium">
              <lucide-icon name="Upload" class="!w-4 !h-4"></lucide-icon>
              {{ 'COMMON.IMPORT' | translate }}
            </button>
          </ng-container>
          <button
            (click)="exportData()"
            class="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium">
            <lucide-icon name="Download" class="!w-4 !h-4"></lucide-icon>
            {{ 'COMMON.EXPORT' | translate }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <!-- Desktop Skeleton -->
        <div class="hidden lg:block p-6">
          <app-skeleton-table [rows]="10" [columns]="8" />
        </div>
        <!-- Mobile Skeleton -->
        <div class="lg:hidden p-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            @for (card of [1, 2, 3, 4, 5, 6]; track $index) {
              <app-skeleton-card />
            }
          </div>
        </div>
      } @else {
        <!-- Desktop Table View with Virtual Scrolling -->
        <div class="hidden lg:block overflow-hidden">
          <!-- Table Header (fixed) -->
          <div class="grid grid-cols-[2fr_1fr_1fr_0.7fr_1fr_1fr_1fr_120px] bg-[var(--color-surface)]">
            <div class="px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'DASHBOARD.TABLE.ITEM' | translate }}</div>
            <div class="px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'DASHBOARD.TABLE.CATEGORY' | translate }}</div>
            <div class="px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'DASHBOARD.TABLE.MODEL' | translate }}</div>
            <div class="px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'DASHBOARD.TABLE.QUANTITY' | translate }}</div>
            <div class="px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'DASHBOARD.TABLE.LOCATION' | translate }}</div>
            <div class="px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'DASHBOARD.TABLE.LAST_UPDATED' | translate }}</div>
            <div class="px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'DASHBOARD.TABLE.STATUS' | translate }}</div>
            <div class="px-6 py-4 text-xs font-medium text-[var(--color-on-surface-variant)] uppercase tracking-wider">{{ 'COMMON.ACTIONS' | translate }}</div>
          </div>

          <!-- Virtual Scroll Viewport -->
          @if (filteredItems().length > 0) {
            <cdk-virtual-scroll-viewport
              [itemSize]="65"
              [style.height.px]="Math.min(filteredItems().length * 65, 650)"
              class="virtual-scroll-viewport">
              <div
                *cdkVirtualFor="let item of filteredItems(); trackBy: trackByFn"
                role="button"
                tabindex="0"
                (click)="viewItem(item)"
                (keydown.enter)="viewItem(item)"
                class="grid grid-cols-[2fr_1fr_1fr_0.7fr_1fr_1fr_1fr_120px] items-start border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-variant)] transition-colors cursor-pointer group"
                style="height: 65px;">
                <!-- Item Column -->
                <div class="px-6 py-3">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-[var(--color-primary-container)] rounded-lg flex items-center justify-center flex-shrink-0">
                      <lucide-icon name="Package" class="!text-[var(--color-primary)] !w-4 !h-4"></lucide-icon>
                    </div>
                    <div class="min-w-0">
                      <p class="font-medium text-foreground truncate">{{ item.name }}</p>
                      @if (item.description) {
                        <p class="hidden xl:block text-sm text-[var(--color-on-surface-variant)] truncate" [title]="item.description">
                          {{ item.description }}
                        </p>
                      }
                    </div>
                  </div>
                </div>

                <!-- Category Column -->
                <div class="px-6 py-3 min-w-0">
                  <p class="text-[var(--color-on-surface-variant)] text-sm truncate" [title]="item.category">{{ item.category }}</p>
                </div>

                <!-- Model Column -->
                <div class="px-6 py-3 min-w-0">
                  <p class="text-[var(--color-on-surface-variant)] text-sm truncate" [title]="item.model || '-'">{{ item.model || '-' }}</p>
                </div>

                <!-- Quantity Column -->
                <div class="px-6 py-3 min-w-0">
                  <p class="text-foreground font-medium truncate">{{ item.quantity }}</p>
                </div>

                <!-- Location Column -->
                <div class="px-6 py-3 min-w-0">
                  <div class="flex items-center gap-2 text-[var(--color-on-surface-variant)] text-sm min-w-0">
                    <lucide-icon name="MapPin" class="!w-3.5 !h-3.5 !text-[var(--color-on-surface-variant)] flex-shrink-0"></lucide-icon>
                    <span class="truncate" [title]="item.warehouse?.name || ''">{{ item.warehouse?.name }}</span>
                  </div>
                </div>

                <!-- Last Updated Column -->
                <div class="px-6 py-3 min-w-0">
                  <p class="text-[var(--color-on-surface-variant)] text-sm truncate">{{ formatDate(item.updatedAt) }}</p>
                </div>

                <!-- Status Column -->
                <div class="px-6 py-3">
                  <span
                    [ngClass]="{
                      'bg-[var(--color-success-bg)] text-[var(--color-status-success)] border border-[var(--color-success-border)]': item.status === InventoryStatus.IN_STOCK,
                      'bg-[var(--color-warning-bg)] text-[var(--color-status-warning)] border border-[var(--color-warning-border)]': item.status === InventoryStatus.LOW_STOCK,
                      'bg-[var(--color-error-bg)] text-[var(--color-status-error)] border border-[var(--color-error-border)]': item.status === InventoryStatus.OUT_OF_STOCK,
                      'bg-[var(--color-info-bg)] text-[var(--color-status-info)] border border-[var(--color-info-border)]': item.status === InventoryStatus.IN_USE
                    }"
                    class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium">
                    {{ getStatusText(item) }}
                  </span>
                </div>

                <!-- Actions Column -->
                <div class="px-6 py-3" role="presentation" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      (click)="$event.stopPropagation(); viewItem(item)"
                      [attr.aria-label]="('COMMON.VIEW' | translate) + ' ' + item.name"
                      class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-info)] hover:bg-[var(--color-info-bg)] transition-colors flex items-center justify-center">
                      <lucide-icon name="Eye" class="!w-5 !h-5"></lucide-icon>
                    </button>
                    <ng-container *ngxPermissionsOnly="['inventory:edit']">
                      <button
                        type="button"
                        (click)="$event.stopPropagation(); editItem(item)"
                        [attr.aria-label]="('COMMON.EDIT' | translate) + ' ' + item.name"
                        class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors flex items-center justify-center">
                        <lucide-icon name="Pencil" class="!w-5 !h-5"></lucide-icon>
                      </button>
                    </ng-container>
                    <ng-container *ngxPermissionsOnly="['inventory:delete']">
                      <button
                        type="button"
                        (click)="$event.stopPropagation(); deleteItem(item)"
                        [attr.aria-label]="('COMMON.DELETE' | translate) + ' ' + item.name"
                        class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors flex items-center justify-center">
                        <lucide-icon name="Trash2" class="!w-5 !h-5"></lucide-icon>
                      </button>
                    </ng-container>
                  </div>
                </div>
              </div>
            </cdk-virtual-scroll-viewport>
          } @else {
            <!-- Empty State -->
            <div class="px-6 py-16 text-center">
              <lucide-icon name="Package" class="!w-14 !h-14 !text-[var(--color-on-surface-muted)] mb-4"></lucide-icon>
              <h3 class="text-lg font-semibold text-[var(--color-on-surface-variant)] mb-2">{{ 'INVENTORY.LIST.NO_ITEMS_FOUND' | translate }}</h3>
              <p class="text-[var(--color-on-surface-muted)]">{{ 'INVENTORY.LIST.ADJUST_FILTERS' | translate }}</p>
            </div>
          }
        </div>

        <!-- Mobile Card View - GRID 2 COLUMNS -->
        <div class="lg:hidden p-4">
        @if (paginatedItems().length === 0) {
          <div class="p-8 text-center">
            <lucide-icon name="Package" class="!w-14 !h-14 !text-[var(--color-on-surface-muted)] mb-4"></lucide-icon>
            <h3 class="text-lg font-semibold text-[var(--color-on-surface-variant)] mb-2">{{ 'INVENTORY.LIST.NO_ITEMS_FOUND' | translate }}</h3>
            <p class="text-[var(--color-on-surface-muted)]">{{ 'INVENTORY.LIST.ADJUST_FILTERS' | translate }}</p>
          </div>
        }

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          @for (item of paginatedItems(); track item.id) {
            <div
              class="bg-[var(--color-surface)] border border-theme rounded-xl p-3 hover:border-[var(--color-border)] transition-colors cursor-pointer"
              role="button"
              tabindex="0"
              (click)="viewItem(item)"
              (keydown.enter)="viewItem(item)">
              <!-- Status Badge -->
              <div class="flex justify-between items-start mb-2">
                <div class="w-8 h-8 bg-[var(--color-primary-container)] rounded-lg flex items-center justify-center flex-shrink-0">
                  <lucide-icon name="Package" class="!text-[var(--color-primary)] !w-4 !h-4"></lucide-icon>
                </div>
                <span
                  [ngClass]="{
                    'bg-[var(--color-success-bg)] text-[var(--color-status-success)]': item.status === InventoryStatus.IN_STOCK,
                    'bg-[var(--color-warning-bg)] text-[var(--color-status-warning)]': item.status === InventoryStatus.LOW_STOCK,
                    'bg-[var(--color-error-bg)] text-[var(--color-status-error)]': item.status === InventoryStatus.OUT_OF_STOCK,
                    'bg-[var(--color-info-bg)] text-[var(--color-status-info)]': item.status === InventoryStatus.IN_USE
                  }"
                  class="px-1.5 py-0.5 rounded text-[10px] font-medium">
                  {{ getStatusText(item) }}
                </span>
              </div>

              <!-- Item Name -->
              <h3 class="font-semibold text-foreground text-sm mb-1 truncate">{{ item.name }}</h3>
              <p class="text-[var(--color-on-surface-variant)] text-xs truncate mb-2">{{ item.category }}</p>

              <!-- Quick Info -->
              <div class="flex items-center justify-between text-xs mb-2">
                <span class="text-[var(--color-on-surface-variant)]">{{ 'COMMON.QTY_SHORT' | translate }}: <span class="text-foreground font-medium">{{ item.quantity }}</span></span>
                <div class="flex items-center gap-1 text-[var(--color-on-surface-variant)] truncate max-w-[60%]">
                  <lucide-icon name="MapPin" class="!w-3 !h-3"></lucide-icon>
                  <span class="truncate">{{ item.warehouse?.name }}</span>
                </div>
              </div>

              <!-- Actions -->
              <div
                class="flex justify-end gap-1 pt-2 border-t border-[var(--color-border-subtle)]"
                role="presentation"
                (click)="$event.stopPropagation()"
                (keydown)="$event.stopPropagation()">
                <button
                  type="button"
                  (click)="$event.stopPropagation(); viewItem(item)"
                  [attr.aria-label]="('COMMON.VIEW' | translate) + ' ' + item.name"
                  class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-info)] hover:bg-[var(--color-info-bg)] transition-colors">
                  <lucide-icon name="Eye" class="!w-4 !h-4"></lucide-icon>
                </button>
                <ng-container *ngxPermissionsOnly="['inventory:edit']">
                  <button
                    type="button"
                    (click)="$event.stopPropagation(); editItem(item)"
                    [attr.aria-label]="('COMMON.EDIT' | translate) + ' ' + item.name"
                    class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors">
                    <lucide-icon name="Pencil" class="!w-4 !h-4"></lucide-icon>
                  </button>
                </ng-container>
                <ng-container *ngxPermissionsOnly="['inventory:delete']">
                  <button
                    type="button"
                    (click)="$event.stopPropagation(); deleteItem(item)"
                    [attr.aria-label]="('COMMON.DELETE' | translate) + ' ' + item.name"
                    class="p-1.5 rounded-lg text-[var(--color-on-surface-variant)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-error-bg)] transition-colors">
                    <lucide-icon name="Trash2" class="!w-4 !h-4"></lucide-icon>
                  </button>
                </ng-container>
              </div>
            </div>
          }
        </div>
        </div>
      }

      <!-- Paginator (mobile only - desktop uses virtual scroll) -->
      <div class="border-t border-theme px-4 py-2 lg:hidden">
        <mat-paginator
          [length]="totalItems()"
          [pageIndex]="pageIndex()"
          [pageSize]="pageSize()"
          [pageSizeOptions]="[10, 25, 50, 100]"
          (page)="onPageChange($event)"
          showFirstLastButtons
          class="!bg-transparent"
          aria-label="Select page">
        </mat-paginator>
      </div>
      <!-- Desktop item count -->
      <div class="hidden lg:flex border-t border-theme px-6 py-3 justify-between items-center text-sm text-[var(--color-on-surface-variant)]">
        <span>{{ 'INVENTORY.LIST.ITEMS_COUNT' | translate:{ count: filteredItems().length } }}</span>
      </div>
    </div>
  </div>
</div>
  `,
  styleUrl: './inventory-list.css'
})
export class InventoryList implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Expose enums and utilities to template
  InventoryStatus = InventoryStatus;
  ItemType = ItemType;
  Math = Math;

  // Data source for the table
  dataSource = new MatTableDataSource<InventoryItemInterface>([]);

  // Table columns
  displayedColumns: string[] = ['name', 'category', 'quantity', 'status', 'warehouse', 'updatedAt', 'actions'];

  // Filter signals
  searchQuery = signal('');
  selectedCategory = signal('all');
  selectedLocation = signal('all');
  selectedStatus = signal<string>('all');

  // Pagination signals
  pageIndex = signal(0);
  pageSize = signal(10);

  // Debounced search
  private searchSubject = new Subject<string>();

  // Computed values
  categories = computed(() => this.inventoryService.categories());
  locations = computed(() => this.inventoryService.locations());
  loading = computed(() => this.inventoryService.loading());

  // Reactive filtered items with computed signal
  filteredItems = computed(() => {
    const search = this.searchQuery().toLowerCase();
    const category = this.selectedCategory();
    const location = this.selectedLocation();
    const status = this.selectedStatus();
    const allItems = this.inventoryService.items();

    return allItems.filter(item => {
      const matchesSearch = !search ||
        item.name.toLowerCase().includes(search) ||
        (item.description?.toLowerCase().includes(search) ?? false) ||
        (item.model?.toLowerCase().includes(search) ?? false);

      const matchesCategory = category === 'all' || item.category === category;
      const matchesLocation = location === 'all' || item.warehouse?.name === location;
      const matchesStatus = status === 'all' || item.status === status;

      return matchesSearch && matchesCategory && matchesLocation && matchesStatus;
    });
  });

  // Paginated items for display
  paginatedItems = computed(() => {
    const items = this.filteredItems();
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return items.slice(start, end);
  });

  // Total count for paginator
  totalItems = computed(() => this.filteredItems().length);

  // Single iteration for all stats
  stats = computed(() => {
    const items = this.filteredItems();

    return items.reduce((acc, item) => {
      acc.total++;
      if (item.status === InventoryStatus.IN_STOCK) acc.inStock++;
      else if (item.status === InventoryStatus.LOW_STOCK) acc.lowStock++;
      else if (item.status === InventoryStatus.OUT_OF_STOCK) acc.outOfStock++;
      else if (item.status === InventoryStatus.IN_USE) acc.inUse++;
      return acc;
    }, { total: 0, inStock: 0, lowStock: 0, outOfStock: 0, inUse: 0 });
  });

  private inventoryService = inject(InventoryService);
  private dialog = inject(MatDialog);
  private notifications = inject(NotificationService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  constructor() {
    // Auto-sync filtered items with table data source and handle pagination
    effect(() => {
      const filteredData = this.filteredItems();
      this.dataSource.data = filteredData;

      // Adjust pagination if current page is out of bounds
      if (this.paginator) {
        const pageSize = this.paginator.pageSize;
        const maxPage = Math.ceil(filteredData.length / pageSize) - 1;
        const currentPage = this.paginator.pageIndex;

        if (currentPage > maxPage && maxPage >= 0) {
          // Go to last valid page
          this.paginator.pageIndex = maxPage;
        } else if (filteredData.length === 0) {
          // Reset to first page if no results
          this.paginator.pageIndex = 0;
        }
      }
    });
  }

  ngOnInit(): void {
    // Debounced search - waits 300ms after last keystroke
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(value => {
      this.searchQuery.set(value);
      this.pageIndex.set(0);
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Custom sort for status
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'status': {
          const statusOrder: Record<string, number> = {
            [InventoryStatus.OUT_OF_STOCK]: 0,
            [InventoryStatus.LOW_STOCK]: 1,
            [InventoryStatus.IN_USE]: 2,
            [InventoryStatus.IN_STOCK]: 3
          };
          return statusOrder[item.status] ?? 0;
        }
        case 'updatedAt':
          return new Date(item.updatedAt).getTime();
        case 'warehouse':
          return item.warehouse?.name ?? '';
        default: {
          const val = (item as unknown as Record<string, unknown>)[property];
          if (val instanceof Date) return val.getTime();
          if (typeof val === 'string' || typeof val === 'number') return val;
          return '';
        }
      }
    };
  }

  // Debounced search input
  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  // Filter change handlers
  onCategoryChange(category: string): void {
    this.selectedCategory.set(category || 'all');
    this.pageIndex.set(0);
  }

  onLocationChange(location: string): void {
    this.selectedLocation.set(location || 'all');
    this.pageIndex.set(0);
  }

  onStatusChange(status: string): void {
    this.selectedStatus.set(status || 'all');
    this.pageIndex.set(0);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
    this.selectedLocation.set('all');
    this.selectedStatus.set('all');
    this.pageIndex.set(0);
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  // CRUD Operations
  viewItem(item: InventoryItemInterface): void {
    this.dialog.open(InventoryItem, {
      data: { itemId: item.id },
      width: '800px',
      maxWidth: '95vw',
      panelClass: 'item-detail-dialog'
    });
  }

  editItem(item: InventoryItemInterface): void {
    this.router.navigate(['/inventory/edit', item.id]);
  }

  deleteItem(item: InventoryItemInterface): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      data: {
        title: this.translate.instant('INVENTORY.DELETE_CONFIRM.TITLE'),
        message: this.translate.instant('INVENTORY.DELETE_CONFIRM.MESSAGE', { name: item.name }),
        confirmText: this.translate.instant('COMMON.DELETE'),
        cancelText: this.translate.instant('COMMON.CANCEL'),
        type: 'danger'
      },
      panelClass: 'confirm-dialog-container'
    });

    dialogRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(confirmed => {
      if (confirmed) {
        this.inventoryService.deleteItem(item.id).pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: () => {
            this.notifications.deleted('NOTIFICATIONS.ENTITIES.ITEM', item.name);
          },
          error: (err) => {
            this.notifications.handleError(err, 'NOTIFICATIONS.ENTITIES.ITEM');
          }
        });
      }
    });
  }

  // Utility methods
  getStatusText(item: InventoryItemInterface): string {
    // For UNIQUE items with IN_USE status
    if (item.status === InventoryStatus.IN_USE) {
      return this.translate.instant('INVENTORY.STATUS.IN_USE');
    }
    // For UNIQUE items, show "Available" or "Not Available"
    if (item.itemType === ItemType.UNIQUE) {
      return item.status === InventoryStatus.IN_STOCK
        ? this.translate.instant('INVENTORY.STATUS.AVAILABLE')
        : this.translate.instant('INVENTORY.STATUS.NOT_AVAILABLE');
    }
    // For BULK items, show translated status
    const statusKey = `INVENTORY.STATUS.${item.status}`;
    return this.translate.instant(statusKey);
  }

  getStatusColor(status: InventoryStatus): string {
    switch (status) {
      case InventoryStatus.IN_STOCK: return 'primary';
      case InventoryStatus.LOW_STOCK: return 'accent';
      case InventoryStatus.OUT_OF_STOCK: return 'warn';
      case InventoryStatus.IN_USE: return 'info';
      default: return 'primary';
    }
  }

  getStatusIcon(status: InventoryStatus): string {
    switch (status) {
      case InventoryStatus.IN_STOCK: return 'check_circle';
      case InventoryStatus.LOW_STOCK: return 'warning';
      case InventoryStatus.OUT_OF_STOCK: return 'error';
      case InventoryStatus.IN_USE: return 'person';
      default: return 'help';
    }
  }

  // Memoized date formatter - created once, reused for all items
  private readonly dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return this.dateFormatter.format(d);
  }

  // Add new item
  addNewItem(): void {
    this.router.navigate(['/inventory/add']);
  }

  // Open import dialog
  openImportDialog(): void {
    const dialogRef = this.dialog.open(ImportDialog, {
      width: '800px',
      maxWidth: '95vw',
      disableClose: true,
      panelClass: 'import-dialog-container'
    });

    dialogRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(imported => {
      if (imported) {
        this.inventoryService.refresh();
      }
    });
  }

  // Export functionality
  async exportData(): Promise<void> {
    const rows = this.dataSource.data.map(item => ({
      [this.translate.instant('DASHBOARD.TABLE.ITEM')]:         item.name,
      [this.translate.instant('ITEM_DETAIL.DESCRIPTION')]:      item.description ?? '',
      [this.translate.instant('DASHBOARD.TABLE.QUANTITY')]:     item.quantity,
      [this.translate.instant('DASHBOARD.TABLE.CATEGORY')]:     item.category,
      [this.translate.instant('DASHBOARD.TABLE.WAREHOUSE')]:    item.warehouse?.name ?? '',
      [this.translate.instant('COMMON.STATUS')]:                 item.status,
      [this.translate.instant('DASHBOARD.TABLE.LAST_UPDATED')]: this.formatDate(item.updatedAt),
    }));

    await downloadStyledXLSX(rows, {
      sheetName:      'Inventory',
      filename:       `inventory-${new Date().toISOString().split('T')[0]}.xlsx`,
      headerColor:    '4D7C6F',
      colWidths:      [30, 40, 10, 20, 22, 14, 18],
      statusColIndex: 5, // Status column
    });
  }

  trackByFn(index: number, item: InventoryItemInterface): string {
    return item.id;
  }

}
