# Component Creation Guide - INV-APP

This guide establishes the standard process for creating new components in the project, ensuring consistency in structure, styles, and translations.

---

## 1. File Structure

Each component should have its own folder with the following files:

```
src/app/components/
└── [category]/
    └── [component-name]/
        ├── [component-name].ts          # Component logic
        ├── [component-name].html        # Template
        ├── [component-name].css         # Styles (optional)
        └── [component-name].spec.ts     # Tests (optional)
```

**Example:**
```
src/app/components/
└── inventory/
    └── inventory-detail/
        ├── inventory-detail.ts
        ├── inventory-detail.html
        ├── inventory-detail.css
        └── inventory-detail.spec.ts
```

---

## 2. Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Folder | kebab-case | `inventory-detail/` |
| TS File | kebab-case | `inventory-detail.ts` |
| Class | PascalCase | `InventoryDetail` |
| Selector | kebab-case with `app-` prefix | `app-inventory-detail` |
| Signals | camelCase | `isLoading`, `selectedItem` |
| Methods | camelCase | `loadData()`, `onSubmit()` |

---

## 3. TypeScript File Structure

```typescript
// 1. IMPORTS - Ordered by category
// Angular core
import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Angular Material (only what's needed)
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

// Translations (ALWAYS include)
import { TranslateModule } from '@ngx-translate/core';

// Local services
import { InventoryService } from '../../../services/inventory/inventory.service';

// Local interfaces
import { InventoryItemInterface } from '../../../interfaces/inventory-item.interface';

// 2. INTERFACES (if component-specific)
interface LocalInterface {
  // ...
}

// 3. @Component DECORATOR
@Component({
  selector: 'app-inventory-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush, // ALWAYS use OnPush
  imports: [
    // Common modules
    CommonModule,
    RouterModule,
    FormsModule,

    // Material
    MatButtonModule,
    MatIconModule,
    MatCardModule,

    // Translations (ALWAYS)
    TranslateModule,
  ],
  templateUrl: './inventory-detail.html',
  styleUrl: './inventory-detail.css'
})

// 4. COMPONENT CLASS
export class InventoryDetail implements OnInit {
  // 4.1 Dependency injection (use inject())
  private inventoryService = inject(InventoryService);
  private router = inject(Router);

  // 4.2 Signals for state
  isLoading = signal(false);
  error = signal<string | null>(null);
  item = signal<InventoryItemInterface | null>(null);

  // 4.3 Computed signals
  isValid = computed(() => this.item() !== null);

  // 4.4 Lifecycle hooks
  ngOnInit(): void {
    this.loadData();
  }

  // 4.5 Public methods (used in template)
  onSave(): void {
    // ...
  }

  onCancel(): void {
    this.router.navigate(['/inventory']);
  }

  // 4.6 Private methods
  private loadData(): void {
    // ...
  }
}
```

---

## 4. Using Translations (i18n)

### 4.1 In the Template (preferred method)

```html
<!-- Simple text -->
<h1>{{ 'DASHBOARD.TITLE' | translate }}</h1>

<!-- With parameters -->
<p>{{ 'INVENTORY.ITEMS_COUNT' | translate: { count: itemCount() } }}</p>

<!-- In attributes -->
<input [placeholder]="'COMMON.SEARCH' | translate">

<!-- In buttons -->
<button>{{ 'COMMON.SAVE' | translate }}</button>
```

### 4.2 In the Component (only when necessary)

```typescript
import { TranslateService } from '@ngx-translate/core';

export class MyComponent {
  private translate = inject(TranslateService);

  showMessage(): void {
    // Get translation
    const message = this.translate.instant('INVENTORY.DELETE_CONFIRM.MESSAGE', { name: 'Item' });

    // Or with observable
    this.translate.get('INVENTORY.DELETE_CONFIRM.TITLE').subscribe(title => {
      // use title
    });
  }
}
```

### 4.3 Translation Key Structure

```
SECTION.SUBSECTION.KEY

Examples:
- NAV.DASHBOARD
- DASHBOARD.TITLE
- DASHBOARD.TABLE.ITEM
- INVENTORY.FORM.BASIC_INFO.NAME
- COMMON.SAVE
- FORM.VALIDATION.REQUIRED
```

### 4.4 Adding New Translations

1. Edit `src/assets/i18n/es.json`
2. Edit `src/assets/i18n/en.json`
3. Keep the same structure in both files

```json
// es.json
{
  "MY_SECTION": {
    "TITLE": "Mi Titulo",
    "DESCRIPTION": "Mi descripcion"
  }
}

// en.json
{
  "MY_SECTION": {
    "TITLE": "My Title",
    "DESCRIPTION": "My description"
  }
}
```

---

## 5. HTML Template Structure

```html
<!-- 1. Main container with Tailwind classes -->
<div class="min-h-screen bg-[#0a0a0a] p-6">
  <div class="max-w-7xl mx-auto">

    <!-- 2. Header/Title -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-slate-300 mb-2">
        {{ 'MY_SECTION.TITLE' | translate }}
      </h1>
      <p class="text-slate-500 text-lg">
        {{ 'MY_SECTION.DESCRIPTION' | translate }}
      </p>
    </div>

    <!-- 3. Main content -->
    <div class="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">

      <!-- Loading state -->
      @if (isLoading()) {
        <div class="flex justify-center py-8">
          <span class="text-slate-400">{{ 'COMMON.LOADING' | translate }}</span>
        </div>
      }

      <!-- Error state -->
      @if (error()) {
        <div class="bg-rose-950/20 border border-rose-900 rounded-lg p-4 text-rose-400">
          {{ error() }}
        </div>
      }

      <!-- Content -->
      @if (!isLoading() && !error()) {
        <!-- Your content here -->
      }

    </div>

    <!-- 4. Actions -->
    <div class="mt-6 flex gap-4">
      <button
        (click)="onSave()"
        class="bg-[#4d7c6f] text-white px-6 py-2 rounded-lg hover:bg-[#5d8c7f] transition-all font-medium">
        {{ 'COMMON.SAVE' | translate }}
      </button>
      <button
        (click)="onCancel()"
        class="bg-slate-800 text-slate-300 px-6 py-2 rounded-lg hover:bg-slate-700 transition-all font-medium">
        {{ 'COMMON.CANCEL' | translate }}
      </button>
    </div>

  </div>
</div>
```

---

## 6. Project Color Palette

```css
/* Backgrounds */
bg-[#0a0a0a]    /* Main background (darkest) */
bg-[#1a1a1a]    /* Card background */
bg-[#242424]    /* Hover/active element background */
bg-[#2a2a2a]    /* Secondary element background */

/* Borders */
border-[#2a2a2a]    /* Default border */
border-slate-700    /* Hover border */

/* Text */
text-slate-300    /* Primary text */
text-slate-400    /* Secondary text */
text-slate-500    /* Tertiary text/labels */

/* Accent (green) */
bg-[#4d7c6f]     /* Primary buttons */
bg-[#5d8c7f]     /* Primary buttons hover */
bg-[#2d4a3f]     /* Soft accent background */
text-[#4d7c6f]   /* Accent text */

/* States */
text-emerald-400, bg-emerald-950/50, border-emerald-900  /* In Stock */
text-orange-400, bg-orange-950/50, border-orange-900     /* Low Stock */
text-rose-400, bg-rose-950/50, border-rose-900           /* Out of Stock / Error */
text-sky-400, bg-sky-950/20, border-sky-800              /* Info / Links */
```

---

## 7. Creation Checklist

Before considering a component complete, verify:

- [ ] **Structure**: Files in correct folder with kebab-case names
- [ ] **Standalone**: Component is standalone (`standalone: true`)
- [ ] **OnPush**: Uses `ChangeDetectionStrategy.OnPush`
- [ ] **Translations**:
  - [ ] Imports `TranslateModule`
  - [ ] All visible text uses `| translate`
  - [ ] Keys added to `es.json` and `en.json`
- [ ] **Inject**: Uses `inject()` instead of constructor for DI
- [ ] **Signals**: Uses signals for reactive state
- [ ] **Styles**: Uses Tailwind classes with project palette
- [ ] **Responsive**: Works on mobile and desktop
- [ ] **No console.log**: Remove debug logs before commit

---

## 8. Complete Example

### inventory-detail.ts

```typescript
import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';

import { InventoryService } from '../../../services/inventory/inventory.service';
import { InventoryItemInterface } from '../../../interfaces/inventory-item.interface';

@Component({
  selector: 'app-inventory-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    TranslateModule,
  ],
  templateUrl: './inventory-detail.html',
  styleUrl: './inventory-detail.css'
})
export class InventoryDetail implements OnInit {
  private inventoryService = inject(InventoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // State
  isLoading = signal(true);
  error = signal<string | null>(null);
  item = signal<InventoryItemInterface | null>(null);

  // Computed
  hasItem = computed(() => this.item() !== null);

  ngOnInit(): void {
    this.loadItem();
  }

  onEdit(): void {
    const itemId = this.item()?.id;
    if (itemId) {
      this.router.navigate(['/inventory/edit', itemId]);
    }
  }

  onBack(): void {
    this.router.navigate(['/inventory']);
  }

  private loadItem(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Item ID not found');
      this.isLoading.set(false);
      return;
    }

    this.inventoryService.getItemById(id).subscribe({
      next: (item) => {
        this.item.set(item);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.message);
        this.isLoading.set(false);
      }
    });
  }
}
```

### inventory-detail.html

```html
<div class="min-h-screen bg-[#0a0a0a] p-6">
  <div class="max-w-4xl mx-auto">

    <!-- Header -->
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-slate-300">
          {{ 'INVENTORY.DETAIL.TITLE' | translate }}
        </h1>
      </div>
      <button
        (click)="onBack()"
        class="text-slate-400 hover:text-slate-300 transition-colors">
        <mat-icon>arrow_back</mat-icon>
        {{ 'COMMON.BACK' | translate }}
      </button>
    </div>

    <!-- Loading -->
    @if (isLoading()) {
      <div class="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-8 text-center">
        <span class="text-slate-400">{{ 'COMMON.LOADING' | translate }}</span>
      </div>
    }

    <!-- Error -->
    @if (error()) {
      <div class="bg-rose-950/20 border border-rose-900 rounded-xl p-6 text-rose-400">
        {{ error() }}
      </div>
    }

    <!-- Content -->
    @if (hasItem() && !isLoading()) {
      <div class="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
        <h2 class="text-2xl font-semibold text-slate-300 mb-4">
          {{ item()!.name }}
        </h2>
        <p class="text-slate-400">
          {{ item()!.description }}
        </p>

        <!-- Actions -->
        <div class="mt-6 flex gap-4">
          <button
            (click)="onEdit()"
            class="bg-[#4d7c6f] text-white px-6 py-2 rounded-lg hover:bg-[#5d8c7f] transition-all font-medium">
            {{ 'COMMON.EDIT' | translate }}
          </button>
        </div>
      </div>
    }

  </div>
</div>
```

---

## 9. Useful Commands

```bash
# Create component with Angular CLI
ng generate component components/[category]/[name] --standalone

# Example
ng generate component components/inventory/inventory-detail --standalone
```

---

**Document created**: January 2026
**Last updated**: January 2026
