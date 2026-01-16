# Component Development Guide - INV-APP

## Style Stack

This project uses a combination of technologies for styling:

| Technology | Usage |
|------------|-------|
| **Tailwind CSS** | Layout, spacing, colors, responsive, utilities |
| **Angular Material** | Icons, Dialogs, Snackbars, Spinners, Tables |
| **Custom CSS** | Complex animations, themes, specific components |

---

## Component Structure

### Required Files

```
component-name/
├── component-name.ts       # Logic + template (inline) or separate
├── component-name.html     # Template (if extensive)
└── component-name.css      # Specific styles (optional)
```

### Base Decorator

```typescript
import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-component-name',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './component-name.html',
  styleUrl: './component-name.css'
})
export class ComponentName implements OnInit {
  // ...
}
```

**Rules:**
- Always use `standalone: true`
- Always use `ChangeDetectionStrategy.OnPush`
- Use `inject()` instead of constructor injection
- Use Angular Signals for reactive state

---

## Common Imports

### For list/page components

```typescript
imports: [
  CommonModule,
  MatIconModule,
  MatButtonModule,
  MatDialogModule,
  MatSnackBarModule,
  TranslateModule
]
```

### For forms/dialogs

```typescript
imports: [
  CommonModule,
  ReactiveFormsModule,
  MatDialogModule,
  MatButtonModule,
  MatIconModule,
  TranslateModule
]
```

---

## Angular Material - What to Use

### ✅ DO use from Angular Material

| Component | Import | Usage |
|-----------|--------|-------|
| Icons | `MatIconModule` | `<mat-icon>name</mat-icon>` |
| Dialogs | `MatDialogModule` | Modals and confirmations |
| Snackbar | `MatSnackBarModule` | Toast notifications |
| Spinner | `MatProgressSpinnerModule` | `<mat-spinner diameter="20">` |
| Tables | `MatTableModule` | Tables with sort/paginator |
| Paginator | `MatPaginatorModule` | Table pagination |
| Sort | `MatSortModule` | Table sorting |

### ❌ DO NOT use from Angular Material

| Component | Reason |
|-----------|--------|
| `mat-form-field` | Use HTML inputs + Tailwind |
| `mat-input` | Use HTML inputs + Tailwind |
| `mat-select` | Use HTML select + Tailwind |
| `mat-button` | Use HTML button + Tailwind |
| `mat-card` | Use divs + Tailwind |

---

## Design System - Theme-Aware Classes

### ⚠️ IMPORTANT: Use Theme Variables

This project supports **Light and Dark mode**. Always use theme-aware CSS classes instead of hardcoded colors.

### Theme-Aware Classes (REQUIRED)

```css
/* ✅ USE THESE - They respond to theme changes */

/* Text */
text-foreground       /* Primary text (replaces text-white, text-slate-300) */
text-slate-400        /* Secondary text/labels - OK (works in both themes) */
text-slate-500        /* Tertiary text/placeholders - OK */

/* Backgrounds */
bg-surface            /* Main page background */
bg-surface-variant    /* Cards/sections background */
bg-surface-elevated   /* Elevated elements */

/* Borders */
border-theme          /* Standard border (replaces border-[#2a2a2a]) */

/* Accent (green) - These are OK as-is */
bg-[#4d7c6f]          /* Primary button */
hover:bg-[#5d8c7f]    /* Primary hover */
text-[#4d7c6f]        /* Accent text */

/* States - These are OK as-is */
text-emerald-400      /* Success/In stock */
text-amber-400        /* Warning/Low stock */
text-rose-400         /* Error/Out of stock */
```

### ❌ DO NOT USE (Hardcoded Colors)

```css
/* These do NOT respond to theme and break in light mode */
text-white            /* ❌ Use text-foreground instead */
text-slate-300        /* ❌ Use text-foreground instead */
text-slate-200        /* ❌ Use text-foreground instead */
border-[#2a2a2a]      /* ❌ Use border-theme instead */
border-slate-800      /* ❌ Use border-theme instead */
border-slate-700      /* ❌ Use border-theme instead */
bg-[#0a0a0a]          /* ❌ Use bg-surface instead */
bg-[#1a1a1a]          /* ❌ Use bg-surface-variant instead */
```

### Exception: White Text on Colored Backgrounds

`text-white` is **OK** on colored button backgrounds:

```html
<!-- ✅ OK - White on colored background -->
<button class="bg-[#4d7c6f] text-white">Save</button>
<button class="bg-emerald-600 text-white">Confirm</button>
<button class="bg-rose-600 text-white">Delete</button>
```

### Theme Variables (defined in styles.css)

```css
:root {
  --color-foreground: #0a0a0a;        /* Light mode text */
  --color-surface: #ffffff;            /* Light mode bg */
  --color-surface-variant: #f8fafc;    /* Light mode cards */
  --color-border: #e2e8f0;             /* Light mode border */
}

.dark {
  --color-foreground: #e2e8f0;        /* Dark mode text */
  --color-surface: #0a0a0a;           /* Dark mode bg */
  --color-surface-variant: #1a1a1a;   /* Dark mode cards */
  --color-border: #2a2a2a;            /* Dark mode border */
}
```

### Standard Input

```html
<input
  type="text"
  formControlName="fieldName"
  class="w-full bg-surface border border-theme rounded-lg px-4 py-3
         text-foreground placeholder-slate-500
         focus:outline-none focus:border-[#4d7c6f] transition-colors"
  [placeholder]="'TRANSLATION.KEY' | translate"
/>
```

### Standard Select

```html
<select
  formControlName="fieldName"
  class="w-full bg-surface border border-theme rounded-lg px-4 py-3
         text-foreground focus:outline-none focus:border-[#4d7c6f] transition-colors">
  <option value="" disabled>Select...</option>
  @for (item of items(); track item.id) {
    <option [value]="item.id">{{ item.name }}</option>
  }
</select>
```

### Standard Textarea

```html
<textarea
  formControlName="fieldName"
  rows="3"
  class="w-full bg-surface border border-theme rounded-lg px-4 py-3
         text-foreground placeholder-slate-500
         focus:outline-none focus:border-[#4d7c6f] transition-colors resize-none"
  [placeholder]="'TRANSLATION.KEY' | translate"
></textarea>
```

### Primary Button

```html
<button
  type="submit"
  [disabled]="form.invalid || saving()"
  class="px-6 py-2.5 rounded-lg bg-[#4d7c6f] text-white
         hover:bg-[#5d8c7f] disabled:opacity-50 disabled:cursor-not-allowed
         transition-colors font-medium flex items-center gap-2">
  @if (saving()) {
    <mat-spinner diameter="16"></mat-spinner>
  }
  {{ 'COMMON.SAVE' | translate }}
</button>
```

### Secondary Button

```html
<button
  type="button"
  (click)="onCancel()"
  class="px-6 py-2.5 rounded-lg border border-theme text-foreground
         hover:bg-slate-800 transition-colors font-medium">
  {{ 'COMMON.CANCEL' | translate }}
</button>
```

### Card/Section

```html
<div class="bg-surface-variant rounded-xl border border-theme p-6">
  <!-- Content -->
</div>
```

---

## Dialog Structure (Modals)

### Data Interface

```typescript
export interface MyDialogData {
  mode: 'add' | 'edit';
  entity?: MyEntity;
}
```

### Dialog Component

```typescript
@Component({
  selector: 'app-my-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [/* ... */],
  template: `
    <div class="bg-surface-variant border border-theme rounded-xl overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-theme">
        <h2 class="text-xl font-semibold text-foreground">
          {{ (data.mode === 'add' ? 'ENTITY.ADD' : 'ENTITY.EDIT') | translate }}
        </h2>
        <button type="button" (click)="dialogRef.close()"
          class="p-2 rounded-lg text-slate-500 hover:text-foreground hover:bg-[#2a2a2a] transition-colors">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Form -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="p-6 space-y-6">
        <!-- Fields... -->

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-theme">
          <button type="button" (click)="dialogRef.close()" class="...">
            {{ 'COMMON.CANCEL' | translate }}
          </button>
          <button type="submit" [disabled]="form.invalid || saving()" class="...">
            {{ 'COMMON.SAVE' | translate }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class MyDialog implements OnInit {
  dialogRef = inject(MatDialogRef<MyDialog>);
  data = inject<MyDialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private service = inject(MyService);

  saving = signal(false);
  form: FormGroup = this.fb.group({
    field1: ['', [Validators.required]],
    field2: ['']
  });

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.entity) {
      this.form.patchValue(this.data.entity);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    // Call service...
  }
}
```

### Opening a Dialog

```typescript
openDialog(): void {
  this.dialog.open(MyDialog, {
    data: { mode: 'add' },
    width: '500px',
    maxWidth: '95vw',
    panelClass: 'custom-dialog'
  });
}
```

---

## List Page Structure (CRUD)

### Base Template

```html
<div class="min-h-screen bg-surface p-4 md:p-6">
  <div class="max-w-[1400px] mx-auto">

    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-foreground">
          {{ 'ENTITY.TITLE' | translate }}
        </h1>
        <p class="text-slate-400 mt-1">
          {{ 'ENTITY.SUBTITLE' | translate }}
        </p>
      </div>
      <button (click)="add()" class="...primary button...">
        <mat-icon>add</mat-icon>
        {{ 'ENTITY.ADD' | translate }}
      </button>
    </div>

    <!-- Stats Card -->
    <div class="bg-surface-variant rounded-xl border border-theme p-6 mb-6">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-[#4d7c6f]/20 flex items-center justify-center">
          <mat-icon class="!text-[#4d7c6f]">icon_name</mat-icon>
        </div>
        <div>
          <p class="text-sm text-slate-400">{{ 'ENTITY.TOTAL' | translate }}</p>
          <p class="text-2xl font-bold text-foreground">{{ items().length }}</p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    @if (loading()) {
      <div class="flex justify-center py-12">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else if (items().length === 0) {
      <!-- Empty State -->
      <div class="bg-surface-variant rounded-xl border border-theme p-12 text-center">
        <mat-icon class="!text-6xl !w-16 !h-16 text-slate-600 mb-4">icon</mat-icon>
        <h3 class="text-xl font-semibold text-foreground mb-2">
          {{ 'ENTITY.NO_ITEMS' | translate }}
        </h3>
        <p class="text-slate-500 mb-6">
          {{ 'ENTITY.NO_ITEMS_DESC' | translate }}
        </p>
        <button (click)="add()" class="...">
          {{ 'ENTITY.ADD' | translate }}
        </button>
      </div>
    } @else {
      <!-- Table (Desktop) -->
      <div class="hidden md:block bg-surface-variant rounded-xl border border-theme overflow-hidden">
        <table class="w-full">
          <thead class="bg-surface">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-semibold text-slate-400">
                {{ 'ENTITY.COLUMN' | translate }}
              </th>
              <!-- more columns -->
              <th class="px-6 py-4 text-right text-sm font-semibold text-slate-400">
                {{ 'COMMON.ACTIONS' | translate }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-theme">
            @for (item of items(); track item.id) {
              <tr class="hover:bg-surface-elevated transition-colors">
                <td class="px-6 py-4 text-foreground">{{ item.field }}</td>
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button (click)="edit(item)" class="p-2 rounded-lg...">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button (click)="delete(item)" class="p-2 rounded-lg...">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Cards (Mobile) -->
      <div class="md:hidden space-y-4">
        @for (item of items(); track item.id) {
          <div class="bg-surface-variant rounded-xl border border-theme p-4">
            <!-- Card content -->
          </div>
        }
      </div>
    }
  </div>
</div>
```

---

## Services

### Base Structure

```typescript
@Injectable({ providedIn: 'root' })
export class MyService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/entities`;

  // State signals
  items = signal<Entity[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  getAll(): Observable<Entity[]> {
    this.loading.set(true);
    return this.http.get<Entity[]>(this.apiUrl).pipe(
      tap({
        next: (items) => {
          this.items.set(items);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.message);
          this.loading.set(false);
        }
      })
    );
  }

  create(dto: CreateEntityDto): Observable<Entity> { /* ... */ }
  update(id: string, dto: UpdateEntityDto): Observable<Entity> { /* ... */ }
  delete(id: string): Observable<void> { /* ... */ }
}
```

---

## Internationalization (i18n)

### Usage in Templates

```html
{{ 'SECTION.KEY' | translate }}
[placeholder]="'SECTION.KEY' | translate"
```

### JSON Structure

```json
{
  "ENTITY": {
    "TITLE": "Title",
    "SUBTITLE": "Description",
    "ADD": "Add",
    "EDIT": "Edit",
    "NAME": "Name",
    "NO_ITEMS": "No items found",
    "NO_ITEMS_DESC": "Start by adding one"
  },
  "COMMON": {
    "SAVE": "Save",
    "CANCEL": "Cancel",
    "DELETE": "Delete",
    "ACTIONS": "Actions"
  }
}
```

---

## Responsive Design

### Breakpoints

```html
<!-- Mobile first -->
<div class="p-4 md:p-6">              <!-- Padding -->
<div class="hidden md:block">          <!-- Desktop only -->
<div class="md:hidden">                <!-- Mobile only -->
<div class="grid-cols-1 md:grid-cols-2"> <!-- Responsive grid -->
<div class="flex-col md:flex-row">     <!-- Flex direction -->
```

### Table/Cards Pattern

- **Desktop (md+)**: Use `<table>` with `hidden md:block`
- **Mobile**: Use cards with `md:hidden`

---

## New Component Checklist

- [ ] Create `.ts` file with standalone decorator
- [ ] Use `ChangeDetectionStrategy.OnPush`
- [ ] Use `inject()` for DI
- [ ] Use Signals for state
- [ ] **Use theme-aware classes** (`text-foreground`, `bg-surface`, `border-theme`)
- [ ] **NO hardcoded colors** (`text-white`, `text-slate-300`, `bg-[#1a1a1a]`)
- [ ] Add translations in `es.json` and `en.json`
- [ ] Add route in `app.routes.ts`
- [ ] Add navigation link (if applicable)
- [ ] Create backend endpoint (if CRUD)
- [ ] Responsive design (mobile + desktop)
- [ ] Test in both Light and Dark mode
