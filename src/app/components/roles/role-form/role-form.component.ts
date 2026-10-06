import { Component, inject, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { RolesService } from '../../../services/roles.service';
import { NotificationService } from '../../../services/notification.service';
import { ApiError } from '../../../interfaces/api-error.interface';
import { PermissionGroup } from '../../../interfaces/role.interface';
import { Spinner } from '../../shared/spinner/spinner';

@Component({
  selector: 'app-role-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, LucideAngularModule, TranslateModule, Spinner],
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
          @if (isEditMode()) { {{ 'ROLES.EDIT' | translate }} } @else { {{ 'ROLES.ADD' | translate }} }
        </h1>
        <p class="text-sm text-on-surface-variant">
          @if (isEditMode()) { {{ 'ROLES.EDIT_SUBTITLE' | translate }} } @else { {{ 'ROLES.ADD_SUBTITLE' | translate }} }
        </p>
      </div>
    </div>

    <!-- Form -->
    <div class="flex flex-col gap-6">

      <!-- Name (create only) -->
      @if (!isEditMode()) {
        <div>
          <label for="role-name" class="block text-sm font-medium text-on-surface-variant mb-2">
            {{ 'ROLES.NAME' | translate }} *
          </label>
          <input type="text" id="role-name" [(ngModel)]="nameValue"
            class="w-full bg-surface-variant border border-theme rounded-lg px-4 py-3 text-foreground placeholder-[var(--color-on-surface-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors uppercase"
            [placeholder]="'ROLES.NAME_HINT' | translate" />
        </div>
      } @else {
        <div>
          <div class="block text-sm font-medium text-on-surface-variant mb-2">
            {{ 'ROLES.NAME' | translate }}
          </div>
          <p class="px-4 py-3 bg-surface-variant border border-theme rounded-lg text-foreground font-mono text-sm">
            {{ roleName() }}
          </p>
        </div>
      }

      <!-- Display Name -->
      <div>
        <label for="role-display-name" class="block text-sm font-medium text-on-surface-variant mb-2">
          {{ 'ROLES.DISPLAY_NAME' | translate }} *
        </label>
        <input type="text" id="role-display-name" [(ngModel)]="displayNameValue"
          class="w-full bg-surface-variant border border-theme rounded-lg px-4 py-3 text-foreground placeholder-[var(--color-on-surface-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          [placeholder]="'ROLES.DISPLAY_NAME' | translate" />
      </div>

      <!-- Description -->
      <div>
        <label for="role-description" class="block text-sm font-medium text-on-surface-variant mb-2">
          {{ 'ROLES.DESCRIPTION' | translate }}
        </label>
        <textarea id="role-description" [(ngModel)]="descriptionValue" rows="2"
          class="w-full bg-surface-variant border border-theme rounded-lg px-4 py-3 text-foreground placeholder-[var(--color-on-surface-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
          [placeholder]="'ROLES.DESCRIPTION' | translate"></textarea>
      </div>

      <!-- Permissions -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <div class="block text-sm font-medium text-on-surface-variant">
            {{ 'ROLES.PERMISSIONS' | translate }}
            @if (!isSystemAdmin()) {
              <span class="ml-2 text-xs font-normal text-[var(--color-primary)]">
                {{ selectedCount() }} {{ 'ROLES.SELECTED' | translate }}
              </span>
            }
          </div>
        </div>

        @if (isSystemAdmin()) {
          <div class="flex items-start gap-3 px-4 py-3 bg-surface-variant border border-theme rounded-lg text-sm text-on-surface-variant">
            <lucide-icon name="ShieldCheck" class="!w-4 !h-4 mt-0.5 flex-shrink-0 text-[var(--color-primary)]"></lucide-icon>
            {{ 'ROLES.SYSTEM_ADMIN_NOTE' | translate }}
          </div>
        } @else if (loadingPermissions()) {
          <div class="flex items-center gap-2 text-on-surface-variant text-sm py-4">
            <app-spinner size="sm"></app-spinner>
            {{ 'COMMON.LOADING' | translate }}...
          </div>
        } @else {
          <div class="flex flex-col gap-3">
            @for (group of permissionGroups(); track group.module) {
              <div class="border border-theme rounded-lg overflow-hidden">
                <!-- Module header -->
                <button type="button"
                  (click)="toggleGroup(group.module)"
                  class="w-full flex items-center justify-between px-4 py-3 bg-surface-variant hover:bg-surface transition-colors">
                  <div class="flex items-center gap-3">
                    <span class="text-sm font-semibold text-foreground capitalize">{{ group.module }}</span>
                    <span class="text-xs text-[var(--color-on-surface-muted)]">
                      {{ selectedInGroup(group) }}/{{ group.permissions.length }}
                    </span>
                  </div>
                  <lucide-icon [name]="expandedGroups().has(group.module) ? 'ChevronUp' : 'ChevronDown'"
                    class="!w-4 !h-4 text-on-surface-variant"></lucide-icon>
                </button>
                <!-- Permissions list -->
                @if (expandedGroups().has(group.module)) {
                  <div class="divide-y divide-[var(--color-border-subtle)]">
                    @for (perm of group.permissions; track perm.id) {
                      <label class="flex items-start gap-3 px-4 py-3 bg-surface hover:bg-surface-variant cursor-pointer transition-colors">
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

      <!-- Form Actions -->
      <div class="flex justify-end gap-3 pt-2">
        <button type="button" (click)="onCancel()" [disabled]="saving()"
          class="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface-variant border border-theme text-foreground text-sm font-medium hover:bg-surface transition-colors disabled:opacity-50">
          <lucide-icon name="X" class="!w-[18px] !h-[18px]"></lucide-icon>
          {{ 'COMMON.CANCEL' | translate }}
        </button>
        <button type="button" (click)="save()"
          [disabled]="!isValid() || saving() || !permissionsReady()"
          class="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          @if (saving()) {
            <app-spinner size="sm" tone="white"></app-spinner>
          } @else {
            <lucide-icon name="Save" class="!w-[18px] !h-[18px]"></lucide-icon>
          }
          {{ 'COMMON.SAVE' | translate }}
        </button>
      </div>
    </div>
  </div>
</div>
  `
})
export class RoleFormComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private rolesService = inject(RolesService);
  private notifications = inject(NotificationService);

  roleId = signal<string | null>(null);
  isEditMode = computed(() => this.roleId() !== null);
  roleName = signal('');
  isSystemAdmin = signal(false);

  saving = signal(false);
  loadingPermissions = signal(false);
  permissionGroups = signal<PermissionGroup[]>([]);
  selectedPermissionIds = signal<Set<string>>(new Set());
  expandedGroups = signal<Set<string>>(new Set());
  // When editing, saving before the current permissions have loaded would replace them with an empty list
  permissionsReady = signal(false);

  // Signals, not plain fields: isValid() below only re-evaluates when a signal it reads changes.
  nameValue = signal('');
  displayNameValue = signal('');
  descriptionValue = '';

  selectedCount = computed(() => this.selectedPermissionIds().size);

  isValid = computed(() => {
    if (!this.isEditMode() && !this.nameValue().trim()) return false;
    return !!this.displayNameValue().trim();
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.roleId.set(id);
    this.permissionsReady.set(id === null);
    this.loadPermissions();
  }

  toggleGroup(module: string): void {
    this.expandedGroups.update(s => {
      const n = new Set(s);
      if (n.has(module)) {
        n.delete(module);
      } else {
        n.add(module);
      }
      return n;
    });
  }

  togglePermission(id: string): void {
    this.selectedPermissionIds.update(s => {
      const n = new Set(s);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  }

  selectedInGroup(group: PermissionGroup): number {
    return group.permissions.filter(p => this.selectedPermissionIds().has(p.id)).length;
  }

  save(): void {
    if (!this.isValid() || this.saving() || !this.permissionsReady()) return;
    this.saving.set(true);

    const permissionIds = [...this.selectedPermissionIds()];
    const id = this.roleId();

    if (!id) {
      this.rolesService.create({
        name: this.nameValue().trim().toUpperCase().replace(/\s+/g, '_'),
        displayName: this.displayNameValue().trim(),
        description: this.descriptionValue.trim() || undefined,
        permissionIds,
      }).subscribe({
        next: () => this.goBack(),
        error: (err: ApiError) => this.failSave(err),
      });
    } else {
      this.rolesService.update(id, {
        displayName: this.displayNameValue().trim(),
        description: this.descriptionValue.trim() || undefined,
        permissionIds,
      }).subscribe({
        next: () => this.goBack(),
        error: (err: ApiError) => this.failSave(err),
      });
    }
  }

  onCancel(): void {
    this.goBack();
  }

  private goBack(): void {
    this.router.navigate(['/roles']);
  }

  private failSave(err: ApiError): void {
    this.saving.set(false);
    this.notifications.error(err.error?.message || err.message);
  }

  private loadPermissions(): void {
    this.loadingPermissions.set(true);
    this.rolesService.getPermissions().subscribe({
      next: (groups) => {
        this.permissionGroups.set(groups);
        // Expand all groups by default
        this.expandedGroups.set(new Set(groups.map(g => g.module)));
        this.loadingPermissions.set(false);

        // Pre-select permissions if editing. Nested on purpose: permissionsReady
        // must only flip once BOTH the permission catalog and the role's current
        // permissions have loaded, so Save never submits against a stale/empty list.
        const id = this.roleId();
        if (id) {
          this.rolesService.getOne(id).subscribe({
            next: (detail) => {
              this.roleName.set(detail.name);
              this.displayNameValue.set(detail.displayName);
              this.descriptionValue = detail.description ?? '';
              this.isSystemAdmin.set(detail.name === 'SYSTEM_ADMIN');
              this.selectedPermissionIds.set(new Set(detail.permissions.map(p => p.id)));
              this.permissionsReady.set(true);
            },
            // Save stays disabled: without the current permissions they cannot be edited safely
            error: (err: ApiError) => this.notifications.error(err.message),
          });
        }
      },
      error: (err: ApiError) => {
        this.loadingPermissions.set(false);
        this.notifications.error(err.message);
      },
    });
  }
}
