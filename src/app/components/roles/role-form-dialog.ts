import { Component, inject, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { RolesService } from '../../services/roles.service';
import { RoleSummary, PermissionGroup, PermissionGroupItem } from '../../interfaces/role.interface';

export interface RoleFormDialogData {
  mode: 'add' | 'edit';
  role?: RoleSummary;
}

@Component({
  selector: 'app-role-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatDialogModule, LucideAngularModule, TranslateModule],
  template: `
    <div class="bg-[var(--color-surface-variant)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden w-full">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-subtle)]">
        <h2 class="text-xl font-semibold text-foreground">
          {{ (data.mode === 'add' ? 'ROLES.ADD' : 'ROLES.EDIT') | translate }}
        </h2>
        <button type="button" (click)="dialogRef.close()"
          class="p-2 rounded-lg text-[var(--color-on-surface-variant)] hover:text-foreground hover:bg-[var(--color-surface-elevated)] transition-colors">
          <lucide-icon name="X"></lucide-icon>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

        <!-- Name (create only) -->
        @if (data.mode === 'add') {
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'ROLES.NAME' | translate }} *
            </label>
            <input type="text" [(ngModel)]="nameValue"
              class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-4 py-3 text-foreground placeholder-[var(--color-on-surface-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors uppercase"
              [placeholder]="'ROLES.NAME_HINT' | translate" />
          </div>
        } @else {
          <div>
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
              {{ 'ROLES.NAME' | translate }}
            </label>
            <p class="px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg text-foreground font-mono text-sm">
              {{ data.role!.name }}
            </p>
          </div>
        }

        <!-- Display Name -->
        <div>
          <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
            {{ 'ROLES.DISPLAY_NAME' | translate }} *
          </label>
          <input type="text" [(ngModel)]="displayNameValue"
            class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-4 py-3 text-foreground placeholder-[var(--color-on-surface-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            [placeholder]="'ROLES.DISPLAY_NAME' | translate" />
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-2">
            {{ 'ROLES.DESCRIPTION' | translate }}
          </label>
          <textarea [(ngModel)]="descriptionValue" rows="2"
            class="w-full bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-4 py-3 text-foreground placeholder-[var(--color-on-surface-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
            [placeholder]="'ROLES.DESCRIPTION' | translate"></textarea>
        </div>

        <!-- Permissions -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <label class="block text-sm font-medium text-[var(--color-on-surface-variant)]">
              {{ 'ROLES.PERMISSIONS' | translate }}
              <span class="ml-2 text-xs font-normal text-[var(--color-primary)]">
                {{ selectedCount() }} {{ 'ROLES.SELECTED' | translate }}
              </span>
            </label>
          </div>

          @if (loadingPermissions()) {
            <div class="flex items-center gap-2 text-[var(--color-on-surface-variant)] text-sm py-4">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-primary)]"></div>
              {{ 'COMMON.LOADING' | translate }}...
            </div>
          } @else {
            <div class="space-y-3">
              @for (group of permissionGroups(); track group.module) {
                <div class="border border-[var(--color-border-subtle)] rounded-lg overflow-hidden">
                  <!-- Module header -->
                  <button type="button"
                    (click)="toggleGroup(group.module)"
                    class="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] transition-colors">
                    <div class="flex items-center gap-3">
                      <span class="text-sm font-semibold text-foreground capitalize">{{ group.module }}</span>
                      <span class="text-xs text-[var(--color-on-surface-muted)]">
                        {{ selectedInGroup(group) }}/{{ group.permissions.length }}
                      </span>
                    </div>
                    <lucide-icon [name]="expandedGroups().has(group.module) ? 'ChevronUp' : 'ChevronDown'"
                      class="!w-4 !h-4 text-[var(--color-on-surface-variant)]"></lucide-icon>
                  </button>
                  <!-- Permissions list -->
                  @if (expandedGroups().has(group.module)) {
                    <div class="divide-y divide-[var(--color-border-subtle)]">
                      @for (perm of group.permissions; track perm.id) {
                        <label class="flex items-start gap-3 px-4 py-3 bg-[var(--color-surface-variant)] hover:bg-[var(--color-surface-elevated)] cursor-pointer transition-colors">
                          <input type="checkbox"
                            [checked]="selectedPermissionIds().has(perm.id)"
                            (change)="togglePermission(perm.id)"
                            class="mt-0.5 w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
                          <div class="flex-1 min-w-0">
                            <p class="text-sm text-foreground font-mono">{{ perm.key }}</p>
                            <p class="text-xs text-[var(--color-on-surface-muted)] mt-0.5">{{ perm.description }}</p>
                          </div>
                        </label>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-3 px-6 py-4 border-t border-[var(--color-border-subtle)]">
        <button type="button" (click)="dialogRef.close()"
          class="px-6 py-2.5 rounded-lg bg-[var(--color-surface-elevated)] text-[var(--color-on-surface-variant)] hover:text-foreground transition-colors font-medium">
          {{ 'COMMON.CANCEL' | translate }}
        </button>
        <button type="button" (click)="save()"
          [disabled]="!isValid() || saving()"
          class="px-6 py-2.5 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2">
          @if (saving()) {
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          }
          {{ 'COMMON.SAVE' | translate }}
        </button>
      </div>
    </div>
  `
})
export class RoleFormDialog implements OnInit {
  dialogRef = inject(MatDialogRef<RoleFormDialog>);
  data = inject<RoleFormDialogData>(MAT_DIALOG_DATA);
  private rolesService = inject(RolesService);

  saving = signal(false);
  loadingPermissions = signal(false);
  permissionGroups = signal<PermissionGroup[]>([]);
  selectedPermissionIds = signal<Set<string>>(new Set());
  expandedGroups = signal<Set<string>>(new Set());

  nameValue = '';
  displayNameValue = '';
  descriptionValue = '';

  selectedCount = computed(() => this.selectedPermissionIds().size);

  isValid = computed(() => {
    if (this.data.mode === 'add' && !this.nameValue.trim()) return false;
    return !!this.displayNameValue.trim();
  });

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.role) {
      this.displayNameValue = this.data.role.displayName;
      this.descriptionValue = this.data.role.description ?? '';
    }
    this.loadPermissions();
  }

  toggleGroup(module: string): void {
    this.expandedGroups.update(s => {
      const n = new Set(s);
      n.has(module) ? n.delete(module) : n.add(module);
      return n;
    });
  }

  togglePermission(id: string): void {
    this.selectedPermissionIds.update(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  selectedInGroup(group: PermissionGroup): number {
    return group.permissions.filter(p => this.selectedPermissionIds().has(p.id)).length;
  }

  save(): void {
    if (!this.isValid() || this.saving()) return;
    this.saving.set(true);

    const permissionIds = [...this.selectedPermissionIds()];

    if (this.data.mode === 'add') {
      this.rolesService.create({
        name: this.nameValue.trim().toUpperCase().replace(/\s+/g, '_'),
        displayName: this.displayNameValue.trim(),
        description: this.descriptionValue.trim() || undefined,
        permissionIds,
      }).subscribe({
        next: () => this.dialogRef.close({ saved: true }),
        error: () => this.saving.set(false),
      });
    } else {
      this.rolesService.update(this.data.role!.id, {
        displayName: this.displayNameValue.trim(),
        description: this.descriptionValue.trim() || undefined,
        permissionIds,
      }).subscribe({
        next: () => this.dialogRef.close({ saved: true }),
        error: () => this.saving.set(false),
      });
    }
  }

  private loadPermissions(): void {
    this.loadingPermissions.set(true);
    this.rolesService.getPermissions().subscribe({
      next: (groups) => {
        this.permissionGroups.set(groups);
        // Expand all groups by default
        this.expandedGroups.set(new Set(groups.map(g => g.module)));
        this.loadingPermissions.set(false);

        // Pre-select permissions if editing
        if (this.data.mode === 'edit' && this.data.role) {
          this.rolesService.getOne(this.data.role.id).subscribe({
            next: (detail) => {
              this.selectedPermissionIds.set(new Set(detail.permissions.map(p => p.id)));
            },
          });
        }
      },
      error: () => this.loadingPermissions.set(false),
    });
  }
}
