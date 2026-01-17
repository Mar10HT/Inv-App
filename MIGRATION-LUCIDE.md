# Migración de Material Icons a Lucide Icons

## Estado: ✅ COMPLETADO

### Componentes Migrados ✅

- [x] **Navigation** (`src/app/components/shared/navigation/`)
- [x] **Dashboard** (`src/app/components/dashboard/`)
- [x] **Inventory List** (`src/app/components/inventory/inventory-list/`)
- [x] **Transactions** (`src/app/components/transactions/`)
- [x] **Loans** (`src/app/components/loans/`)
- [x] **Users** (`src/app/components/users/`)
- [x] **Warehouses** (`src/app/components/warehouses/`)
- [x] **Categories** (`src/app/components/categories/`)
- [x] **Suppliers** (`src/app/components/suppliers/`)
- [x] **Settings** (`src/app/components/settings/`)
- [x] **Profile** (`src/app/components/profile/`)
- [x] **Login** (`src/app/components/login/`)
- [x] **Reports** (`src/app/components/reports/`)
- [x] **Audit Log** (`src/app/components/audit/audit-log.ts`)
- [x] **Inventory Form** (`src/app/components/inventory/inventory-form/`)
- [x] **Inventory Item** (`src/app/components/inventory/inventory-item/`)
- [x] **Import Dialog** (`src/app/components/import/import-dialog.ts`)
- [x] **Custom Chart Dialog** (`src/app/components/dashboard/custom-chart-dialog/`)
- [x] **Command Palette** (`src/app/components/shared/command-palette/`)
- [x] **Confirm Dialog** (`src/app/components/shared/confirm-dialog/`)
- [x] **Custom Snackbar** (`src/app/components/shared/custom-snackbar/`)
- [x] **Empty State** (`src/app/components/shared/empty-state/`)
- [x] **Error Alert** (`src/app/components/shared/error-alert/`)
- [x] **Theme Toggle** (`src/app/components/shared/theme-toggle/`)

---

## Mapeo de Iconos (Material → Lucide)

```
Material Icon        →  Lucide Icon
─────────────────────────────────────
add                  →  Plus
add_circle           →  PlusCircle
arrow_back           →  ArrowLeft
arrow_downward       →  ArrowDown
arrow_upward         →  ArrowUp
assessment           →  BarChart3
assignment           →  ClipboardList
bar_chart            →  BarChart2
calendar_today       →  Calendar
category             →  Tag
check_circle         →  CheckCircle2
chevron_left         →  ChevronLeft
chevron_right        →  ChevronRight
close / clear        →  X
cloud_upload         →  CloudUpload
dashboard            →  LayoutDashboard
dark_mode            →  Moon
delete               →  Trash2
download             →  Download
edit                 →  Pencil
email                →  Mail
error                →  AlertCircle
expand_less          →  ChevronUp
expand_more          →  ChevronDown
filter_list          →  Filter
history              →  History
info                 →  Info
inventory_2          →  Package
keyboard_return      →  CornerDownLeft
language             →  Globe
light_mode           →  Sun
list                 →  List
local_shipping       →  Truck
lock                 →  Lock
login                →  LogIn
logout               →  LogOut
notifications        →  Bell
palette              →  Palette
pending / schedule   →  Clock
people / group       →  Users
person               →  User
phone                →  Phone
picture_as_pdf       →  FileText
place                →  MapPin
qr_code              →  QrCode
receipt_long         →  Receipt
refresh              →  RefreshCw
save                 →  Save
search               →  Search
settings             →  Settings
show_chart           →  LineChart
storage              →  HardDrive
swap_horiz           →  ArrowLeftRight
trending_up          →  TrendingUp
visibility           →  Eye
visibility_off       →  EyeOff
warehouse            →  Warehouse
warning              →  AlertTriangle
```

---

## Instrucciones para Migrar un Componente

### 1. Actualizar imports en el archivo .ts

```typescript
// Antes
import { MatIconModule } from '@angular/material/icon';

// Después
import { LucideAngularModule } from 'lucide-angular';
```

### 2. Actualizar el array de imports

```typescript
// Antes
imports: [
  MatIconModule,
  // ...
]

// Después
imports: [
  LucideAngularModule,
  // ...
]
```

### 3. Reemplazar iconos en el template

```html
<!-- Antes -->
<mat-icon>dashboard</mat-icon>
<mat-icon class="!text-lg">edit</mat-icon>
<mat-icon>{{ dynamicIcon }}</mat-icon>

<!-- Después -->
<lucide-icon name="LayoutDashboard"></lucide-icon>
<lucide-icon name="Pencil" class="!text-lg"></lucide-icon>
<lucide-icon [name]="dynamicIcon"></lucide-icon>
```

---

## Configuración ya realizada

- ✅ Paquete `lucide-angular` instalado
- ✅ Iconos configurados globalmente en `src/app/app.config.ts`
- ✅ Mapeo de iconos en `src/app/shared/icons.ts`
- ✅ Estilos CSS para Lucide en `src/styles.css`
- ✅ Fuentes configuradas (Outfit + JetBrains Mono)

---

## Comando para verificar archivos pendientes

```bash
grep -rl "mat-icon\|MatIconModule" --include="*.ts" --include="*.html" src/app
```
