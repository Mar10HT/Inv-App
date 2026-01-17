import { Component, inject, signal, computed, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { InventoryService } from '../../../services/inventory/inventory.service';
import { AuthService } from '../../../services/auth.service';
import { UserRole } from '../../../interfaces/user.interface';

interface CommandItem {
  id: string;
  type: 'navigation' | 'action' | 'item' | 'recent';
  icon: string;
  label: string;
  description?: string;
  shortcut?: string;
  action: () => void;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/70 backdrop-blur-sm"
        (click)="close()">
      </div>

      <!-- Command Palette -->
      <div class="relative w-full max-w-2xl mx-4 bg-[#1a1a1a] rounded-xl shadow-2xl border border-slate-700/50 overflow-hidden">
        <!-- Search Input -->
        <div class="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
          <lucide-icon name="Search" class="text-slate-400"></lucide-icon>
          <input
            #searchInput
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange($event)"
            [placeholder]="'COMMAND_PALETTE.PLACEHOLDER' | translate"
            class="flex-1 bg-transparent text-white text-lg placeholder-slate-500 focus:outline-none"
            autocomplete="off"
          />
          <kbd class="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-slate-400 bg-slate-800 rounded border border-slate-700">
            ESC
          </kbd>
        </div>

        <!-- Results -->
        <div class="max-h-[60vh] overflow-y-auto">
          @if (filteredItems().length === 0 && searchQuery.length > 0) {
            <div class="px-4 py-8 text-center text-slate-500">
              <lucide-icon name="SearchX" class="!w-10 !h-10 mb-2"></lucide-icon>
              <p>{{ 'COMMAND_PALETTE.NO_RESULTS' | translate }}</p>
            </div>
          }

          <!-- Navigation Section -->
          @if (navigationItems().length > 0) {
            <div class="px-3 py-2">
              <p class="px-2 py-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
                {{ 'COMMAND_PALETTE.NAVIGATION' | translate }}
              </p>
              @for (item of navigationItems(); track item.id; let i = $index) {
                <button
                  (click)="executeCommand(item)"
                  (mouseenter)="selectedIndex.set(getGlobalIndex('navigation', i))"
                  [ngClass]="{'bg-slate-700/50': selectedIndex() === getGlobalIndex('navigation', i)}"
                  class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors group">
                  <div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-teal-500/20">
                    <lucide-icon [name]="item.icon" class="!w-4 !h-4 text-slate-400 group-hover:text-teal-500"></lucide-icon>
                  </div>
                  <div class="flex-1 text-left">
                    <p class="text-sm text-white">{{ item.label }}</p>
                    @if (item.description) {
                      <p class="text-xs text-slate-500">{{ item.description }}</p>
                    }
                  </div>
                  @if (item.shortcut) {
                    <kbd class="px-2 py-0.5 text-xs text-slate-400 bg-slate-800 rounded">{{ item.shortcut }}</kbd>
                  }
                </button>
              }
            </div>
          }

          <!-- Actions Section -->
          @if (actionItems().length > 0) {
            <div class="px-3 py-2 border-t border-slate-700/30">
              <p class="px-2 py-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
                {{ 'COMMAND_PALETTE.ACTIONS' | translate }}
              </p>
              @for (item of actionItems(); track item.id; let i = $index) {
                <button
                  (click)="executeCommand(item)"
                  (mouseenter)="selectedIndex.set(getGlobalIndex('action', i))"
                  [ngClass]="{'bg-slate-700/50': selectedIndex() === getGlobalIndex('action', i)}"
                  class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors group">
                  <div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-blue-500/20">
                    <lucide-icon [name]="item.icon" class="!w-4 !h-4 text-slate-400 group-hover:text-blue-400"></lucide-icon>
                  </div>
                  <div class="flex-1 text-left">
                    <p class="text-sm text-white">{{ item.label }}</p>
                  </div>
                </button>
              }
            </div>
          }

          <!-- Inventory Items Section -->
          @if (inventoryItems().length > 0) {
            <div class="px-3 py-2 border-t border-slate-700/30">
              <p class="px-2 py-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
                {{ 'COMMAND_PALETTE.INVENTORY' | translate }}
              </p>
              @for (item of inventoryItems(); track item.id; let i = $index) {
                <button
                  (click)="executeCommand(item)"
                  (mouseenter)="selectedIndex.set(getGlobalIndex('item', i))"
                  [ngClass]="{'bg-slate-700/50': selectedIndex() === getGlobalIndex('item', i)}"
                  class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors group">
                  <div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-emerald-500/20">
                    <lucide-icon name="Package" class="!w-4 !h-4 text-slate-400 group-hover:text-emerald-400"></lucide-icon>
                  </div>
                  <div class="flex-1 text-left min-w-0">
                    <p class="text-sm text-white truncate">{{ item.label }}</p>
                    @if (item.description) {
                      <p class="text-xs text-slate-500 truncate">{{ item.description }}</p>
                    }
                  </div>
                </button>
              }
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="px-4 py-2 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-500">
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1">
              <kbd class="px-1.5 py-0.5 bg-slate-800 rounded">↑↓</kbd>
              {{ 'COMMAND_PALETTE.NAVIGATE' | translate }}
            </span>
            <span class="flex items-center gap-1">
              <kbd class="px-1.5 py-0.5 bg-slate-800 rounded">↵</kbd>
              {{ 'COMMAND_PALETTE.SELECT' | translate }}
            </span>
          </div>
          <span class="flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 bg-slate-800 rounded">ESC</kbd>
            {{ 'COMMAND_PALETTE.CLOSE' | translate }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class CommandPalette implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  private router = inject(Router);
  private dialogRef = inject(MatDialogRef<CommandPalette>);
  private inventoryService = inject(InventoryService);
  private authService = inject(AuthService);
  private translate = inject(TranslateService);

  searchQuery = '';
  selectedIndex = signal(0);

  private searchSubject = new Subject<string>();
  private allCommands = signal<CommandItem[]>([]);

  // Filtered items by type
  navigationItems = computed(() =>
    this.filteredItems().filter(item => item.type === 'navigation')
  );

  actionItems = computed(() =>
    this.filteredItems().filter(item => item.type === 'action')
  );

  inventoryItems = computed(() =>
    this.filteredItems().filter(item => item.type === 'item')
  );

  filteredItems = computed(() => {
    const query = this.searchQuery.toLowerCase().trim();
    const commands = this.allCommands();

    if (!query) {
      // Show navigation and actions by default
      return commands.filter(c => c.type === 'navigation' || c.type === 'action');
    }

    return commands.filter(item =>
      item.label.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    this.initializeCommands();
    this.loadInventoryItems();

    // Focus input after view init
    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    }, 100);

    // Debounced search for inventory items
    this.searchSubject.pipe(
      debounceTime(200),
      distinctUntilChanged()
    ).subscribe(() => {
      this.loadInventoryItems();
    });
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    const items = this.filteredItems();

    switch (event.key) {
      case 'Escape':
        this.close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex.update(i => Math.min(i + 1, items.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex.update(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        const selectedItem = items[this.selectedIndex()];
        if (selectedItem) {
          this.executeCommand(selectedItem);
        }
        break;
    }
  }

  onSearchChange(query: string): void {
    this.selectedIndex.set(0);
    this.searchSubject.next(query);
  }

  executeCommand(item: CommandItem): void {
    item.action();
    this.close();
  }

  close(): void {
    this.dialogRef.close();
  }

  getGlobalIndex(type: string, localIndex: number): number {
    const items = this.filteredItems();
    let offset = 0;

    if (type === 'action') {
      offset = this.navigationItems().length;
    } else if (type === 'item') {
      offset = this.navigationItems().length + this.actionItems().length;
    }

    return offset + localIndex;
  }

  private initializeCommands(): void {
    const user = this.authService.currentUser();
    const isAdmin = user?.role === UserRole.SYSTEM_ADMIN || user?.role === UserRole.WAREHOUSE_MANAGER;

    const commands: CommandItem[] = [
      // Navigation
      {
        id: 'nav-dashboard',
        type: 'navigation',
        icon: 'LayoutDashboard',
        label: this.translate.instant('NAV.DASHBOARD'),
        description: this.translate.instant('COMMAND_PALETTE.DESC.DASHBOARD'),
        action: () => this.router.navigate(['/dashboard'])
      },
      {
        id: 'nav-inventory',
        type: 'navigation',
        icon: 'Package',
        label: this.translate.instant('NAV.INVENTORY'),
        description: this.translate.instant('COMMAND_PALETTE.DESC.INVENTORY'),
        action: () => this.router.navigate(['/inventory'])
      },
      {
        id: 'nav-warehouses',
        type: 'navigation',
        icon: 'Warehouse',
        label: this.translate.instant('NAV.WAREHOUSES'),
        description: this.translate.instant('COMMAND_PALETTE.DESC.WAREHOUSES'),
        action: () => this.router.navigate(['/warehouses'])
      },
      {
        id: 'nav-transactions',
        type: 'navigation',
        icon: 'Receipt',
        label: this.translate.instant('NAV.TRANSACTIONS'),
        description: this.translate.instant('COMMAND_PALETTE.DESC.TRANSACTIONS'),
        action: () => this.router.navigate(['/transactions'])
      },
      {
        id: 'nav-loans',
        type: 'navigation',
        icon: 'ArrowLeftRight',
        label: this.translate.instant('NAV.LOANS'),
        description: this.translate.instant('COMMAND_PALETTE.DESC.LOANS'),
        action: () => this.router.navigate(['/loans'])
      },
      {
        id: 'nav-reports',
        type: 'navigation',
        icon: 'BarChart3',
        label: this.translate.instant('NAV.REPORTS'),
        description: this.translate.instant('COMMAND_PALETTE.DESC.REPORTS'),
        action: () => this.router.navigate(['/reports'])
      },
      {
        id: 'nav-suppliers',
        type: 'navigation',
        icon: 'Truck',
        label: this.translate.instant('NAV.SUPPLIERS'),
        description: this.translate.instant('COMMAND_PALETTE.DESC.SUPPLIERS'),
        action: () => this.router.navigate(['/suppliers'])
      },
      {
        id: 'nav-categories',
        type: 'navigation',
        icon: 'Tag',
        label: this.translate.instant('NAV.CATEGORIES'),
        description: this.translate.instant('COMMAND_PALETTE.DESC.CATEGORIES'),
        action: () => this.router.navigate(['/categories'])
      },
      {
        id: 'nav-profile',
        type: 'navigation',
        icon: 'User',
        label: this.translate.instant('NAV.PROFILE'),
        action: () => this.router.navigate(['/profile'])
      },
      {
        id: 'nav-settings',
        type: 'navigation',
        icon: 'Settings',
        label: this.translate.instant('NAV.SETTINGS'),
        action: () => this.router.navigate(['/settings'])
      },

      // Actions
      {
        id: 'action-new-item',
        type: 'action',
        icon: 'PlusCircle',
        label: this.translate.instant('COMMAND_PALETTE.NEW_ITEM'),
        action: () => this.router.navigate(['/inventory/add'])
      },
      {
        id: 'action-logout',
        type: 'action',
        icon: 'LogOut',
        label: this.translate.instant('COMMAND_PALETTE.LOGOUT'),
        action: () => {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
      }
    ];

    // Admin-only commands
    if (isAdmin) {
      commands.push(
        {
          id: 'nav-users',
          type: 'navigation',
          icon: 'Users',
          label: this.translate.instant('NAV.USERS'),
          description: this.translate.instant('COMMAND_PALETTE.DESC.USERS'),
          action: () => this.router.navigate(['/users'])
        },
        {
          id: 'nav-audit',
          type: 'navigation',
          icon: 'History',
          label: this.translate.instant('NAV.AUDIT'),
          description: this.translate.instant('COMMAND_PALETTE.DESC.AUDIT'),
          action: () => this.router.navigate(['/audit'])
        }
      );
    }

    this.allCommands.set(commands);
  }

  private loadInventoryItems(): void {
    const items = this.inventoryService.items();
    const query = this.searchQuery.toLowerCase().trim();

    if (!query || query.length < 2) return;

    const matchingItems: CommandItem[] = items
      .filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.serviceTag?.toLowerCase().includes(query) ||
        item.model?.toLowerCase().includes(query)
      )
      .slice(0, 5)
      .map(item => ({
        id: `item-${item.id}`,
        type: 'item' as const,
        icon: 'Package',
        label: item.name,
        description: `${item.category || ''} ${item.warehouse?.name ? '• ' + item.warehouse.name : ''}`.trim(),
        action: () => this.router.navigate(['/inventory/edit', item.id])
      }));

    this.allCommands.update(commands => {
      // Remove old inventory items and add new ones
      const filtered = commands.filter(c => c.type !== 'item');
      return [...filtered, ...matchingItems];
    });
  }
}
