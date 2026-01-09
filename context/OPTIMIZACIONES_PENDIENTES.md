# OPTIMIZACIONES PENDIENTES - INV-APP

## Resumen Ejecutivo

Este documento detalla todas las optimizaciones, mejoras y características pendientes para llevar el proyecto INV-APP de su estado actual (45% completado) a un sistema de gestión de inventario completo y listo para producción.

El documento se divide en **DOS PARTES**:

### PARTE 1: Optimizaciones de Código y Rendimiento (22-35 horas)
Analiza 12 problemas específicos en el código actual que afectan el rendimiento, desde el crítico polling innecesario que consume 90% de CPU, hasta optimizaciones de bundle y change detection. **Impacto esperado: 40-60% de mejora en rendimiento**.

### PARTE 2: Características y Features Faltantes (289-369 horas)
Cubre las funcionalidades necesarias para completar la aplicación: backend, autenticación, formularios, testing, y mejoras de UX/seguridad.

**TOTAL GENERAL**: 311-404 horas (2-3 meses de desarrollo full-time)

---

## PARTE 1: OPTIMIZACIONES DE CÓDIGO Y RENDIMIENTO

Esta sección analiza problemas específicos en el código actual que afectan el rendimiento, mantenibilidad y calidad de la aplicación.

---

### PROBLEMA CRÍTICO #1: Polling Innecesario en Filtros

**Ubicación**: `src/app/components/inventory/inventory-list/inventory-list.ts:118-121`

**Código Actual**:
```typescript
private setupFilters(): void {
  const updateFilters = () => {
    this.applyFilters();
  };

  // Set up reactive filters
  setInterval(() => {
    updateFilters();
  }, 100); // ❌ CRÍTICO: Polling cada 100ms
}
```

**Problemas**:
- ❌ **Ejecución constante**: Se ejecuta 10 veces por segundo, incluso cuando no hay cambios
- ❌ **Desperdicio de CPU**: Procesamiento innecesario de filtros
- ❌ **Consumo de batería**: En dispositivos móviles esto drena la batería
- ❌ **Escalabilidad**: Con listas grandes (1000+ items) causa lag visible
- ❌ **Anti-patrón**: Angular Signals ya son reactivos, no necesitan polling

**Impacto en Rendimiento**: **ALTO** - 90% de CPU desperdiciada

**Solución**:
```typescript
// ❌ ELIMINAR setupFilters() completamente
// ❌ ELIMINAR applyFilters() manual

// ✅ Usar computed signals (reactivo automático)
export class InventoryList implements OnInit {
  // Filters como signals
  searchQuery = signal('');
  selectedCategory = signal('all');
  selectedLocation = signal('all');
  selectedStatus = signal('all');

  // ✅ Computed se recalcula SOLO cuando cambian dependencias
  filteredItems = computed(() => {
    const search = this.searchQuery().toLowerCase();
    const category = this.selectedCategory();
    const location = this.selectedLocation();
    const status = this.selectedStatus();

    return this.inventoryService.items().filter(item => {
      const matchesSearch = !search ||
        item.name.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search);

      const matchesCategory = category === 'all' || item.category === category;
      const matchesLocation = location === 'all' || item.location === location;
      const matchesStatus = status === 'all' || item.status === status;

      return matchesSearch && matchesCategory && matchesLocation && matchesStatus;
    });
  });

  // ✅ Actualizar dataSource cuando cambian items filtrados
  constructor() {
    effect(() => {
      this.dataSource.data = this.filteredItems();
    });
  }
}
```

**Beneficios**:
- ✅ **Cálculo on-demand**: Solo cuando cambian los filtros
- ✅ **90% menos CPU**: De 10 ejecuciones/segundo a solo cuando es necesario
- ✅ **Mejor UX**: Respuesta instantánea, sin lag
- ✅ **Código más limpio**: De 50 líneas a 20

**Esfuerzo**: 2-3 horas
**Prioridad**: CRÍTICA

---

### PROBLEMA CRÍTICO #2: Llamadas Redundantes al Servicio

**Ubicación**: `src/app/components/inventory/inventory-list/inventory-list.ts:73-76`

**Código Actual**:
```typescript
totalItems = computed(() => this.inventoryService.getTotalItems());
lowStockItems = computed(() => this.inventoryService.getLowStockItems().length);
outOfStockItems = computed(() => this.inventoryService.getItemsByStatus('out-of-stock').length);
inStockItems = computed(() => this.inventoryService.getItemsByStatus('in-stock').length);
```

**Problemas**:
- ❌ **4 llamadas separadas** al servicio para las estadísticas
- ❌ Cada método filtra **toda la lista** independientemente
- ❌ Con 1000 items = **4000 iteraciones innecesarias**
- ❌ Se recalcula en cada cambio, incluso si no se muestran stats

**Impacto en Rendimiento**: **MEDIO-ALTO** - O(4n) en lugar de O(n)

**Solución**:
```typescript
// ✅ Un solo computed que calcula todo en una pasada
stats = computed(() => {
  const items = this.filteredItems(); // Ya filtrados

  return items.reduce((acc, item) => {
    acc.total++;
    if (item.status === 'in-stock') acc.inStock++;
    else if (item.status === 'low-stock') acc.lowStock++;
    else if (item.status === 'out-of-stock') acc.outOfStock++;
    return acc;
  }, { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 });
});

// Uso en template:
// {{ stats().total }}
// {{ stats().inStock }}
```

**Beneficios**:
- ✅ **75% menos iteraciones**: Una pasada en lugar de 4
- ✅ **Más eficiente**: O(n) en lugar de O(4n)
- ✅ **Cache automático**: Computed solo recalcula cuando cambian filtros

**Esfuerzo**: 1 hora
**Prioridad**: ALTA

---

### PROBLEMA #3: MatTableDataSource Mal Utilizado

**Ubicación**: `src/app/components/inventory/inventory-list/inventory-list.ts:57`

**Código Actual**:
```typescript
dataSource = new MatTableDataSource<InventoryItemInterface>([]);

// Luego en cada filtro:
applyFilters(): void {
  const filteredItems = this.inventoryService.getFilteredItems(filters);
  this.dataSource.data = filteredItems; // ❌ Re-asignación manual
}
```

**Problemas**:
- ❌ **Doble filtrado**: Una vez en computed, otra en MatTableDataSource
- ❌ **Asignaciones manuales**: Hay que actualizar manualmente
- ❌ **Paginación se resetea**: En cada cambio de filtro vuelve a página 1

**Impacto en Rendimiento**: **MEDIO** - Filtrado duplicado

**Solución**:
```typescript
// ✅ Opción 1: Usar MatTableDataSource correctamente
dataSource = new MatTableDataSource<InventoryItemInterface>();

constructor() {
  effect(() => {
    this.dataSource.data = this.filteredItems();
    // Preservar página actual si es posible
    if (this.paginator && this.dataSource.data.length > 0) {
      const maxPage = Math.ceil(this.dataSource.data.length / this.paginator.pageSize);
      if (this.paginator.pageIndex >= maxPage) {
        this.paginator.firstPage();
      }
    }
  });
}

// ✅ Opción 2: Usar signal directamente (más moderno)
// Eliminar MatTableDataSource, usar signal
@for (item of paginatedItems(); track item.id) {
  // Render row
}

paginatedItems = computed(() => {
  const filtered = this.filteredItems();
  const start = this.currentPage() * this.pageSize();
  const end = start + this.pageSize();
  return filtered.slice(start, end);
});
```

**Beneficios**:
- ✅ **Un solo flujo de datos**: Sin duplicación
- ✅ **Más control**: Sobre paginación y sorting
- ✅ **Mejor UX**: Puede mantener página actual

**Esfuerzo**: 3-4 horas
**Prioridad**: MEDIA

---

### PROBLEMA #4: Falta de Memoización en Métodos de Utilidad

**Ubicación**: `src/app/components/inventory/inventory-list/inventory-list.ts:189-205`

**Código Actual**:
```typescript
getStatusColor(status: string): string {
  switch (status) {
    case 'in-stock': return 'primary';
    case 'low-stock': return 'accent';
    case 'out-of-stock': return 'warn';
    default: return 'primary';
  }
}

formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  }).format(date);
}
```

**Problemas**:
- ❌ **Llamado en template**: Se ejecuta en cada detección de cambios
- ❌ **Intl.DateTimeFormat se recrea**: En cada llamada a formatDate
- ❌ **Con 50 items**: 50 formatters creados y destruidos

**Impacto en Rendimiento**: **BAJO-MEDIO** - Objetos temporales innecesarios

**Solución**:
```typescript
// ✅ Crear formatter UNA vez
private readonly dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

formatDate(date: Date): string {
  return this.dateFormatter.format(date);
}

// ✅ Mejor aún: Usar pipe en template
// date-format.pipe.ts
@Pipe({ name: 'dateFormat', standalone: true })
export class DateFormatPipe implements PipeTransform {
  private formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  transform(value: Date): string {
    return this.formatter.format(value);
  }
}

// Template:
// {{ item.lastUpdated | dateFormat }}
```

**Beneficios**:
- ✅ **Un solo formatter**: Reutilizado para todos los items
- ✅ **Pipes memoizados**: Angular cachea resultados
- ✅ **Mejor separación**: Lógica de formato separada

**Esfuerzo**: 1-2 horas
**Prioridad**: BAJA

---

### PROBLEMA #5: TrackBy Function Definida pero No Usada

**Ubicación**: `src/app/components/inventory/inventory-list/inventory-list.ts:256-258`

**Código Actual**:
```typescript
trackByFn(index: number, item: InventoryItemInterface): any {
  return item.id;
}
```

**Problema**:
- ❌ **Función existe pero no se usa en el template**
- ❌ Sin trackBy, Angular re-renderiza toda la lista en cada cambio
- ❌ **Muy costoso** con listas grandes

**Impacto en Rendimiento**: **ALTO** - Re-renderizado innecesario

**Solución**:
```html
<!-- ❌ Sin trackBy (actual) -->
<tr *ngFor="let item of dataSource.data">

<!-- ✅ Con trackBy -->
<tr *ngFor="let item of dataSource.data; trackBy: trackByFn">

<!-- ✅ Con @for (Angular 17+) - mejor -->
@for (item of filteredItems(); track item.id) {
  <tr>...</tr>
}
```

**Beneficios**:
- ✅ **Solo renderiza cambios**: No toda la lista
- ✅ **Mucho más rápido**: Especialmente con listas grandes
- ✅ **Animaciones suaves**: Al agregar/eliminar items

**Esfuerzo**: 15 minutos
**Prioridad**: ALTA

---

### PROBLEMA #6: Servicio Calcula Categorías/Ubicaciones en Cada Acceso

**Ubicación**: `src/app/services/inventory/inventory.service.ts:13-21`

**Código Actual**:
```typescript
categories = computed(() => {
  const uniqueCategories = [...new Set(this.items().map(item => item.category))];
  return uniqueCategories.sort();
});

locations = computed(() => {
  const uniqueLocations = [...new Set(this.items().map(item => item.location))];
  return uniqueLocations.sort();
});
```

**Problemas**:
- ❌ **Re-calcula en cada cambio de items**: Incluso si categorías no cambiaron
- ❌ **Ineficiente**: map() + Set + spread + sort() en cada computed
- ❌ Con 1000 items cambiando 1 item recalcula todo

**Impacto en Rendimiento**: **MEDIO** - Procesamiento innecesario

**Solución**:
```typescript
// ✅ Opción 1: Mantener categorías como datos separados
private categoriesSignal = signal<string[]>([
  'Fresh Produce', 'Dairy', 'Bakery', 'Beverages',
  'Meat & Seafood', 'Pantry & Dry Goods', 'Frozen Foods',
  'Health & Beauty', 'Household'
]);

categories = this.categoriesSignal.asReadonly();

// Solo recalcular cuando se agrega un item con nueva categoría
addItem(item: InventoryItemInterface): void {
  // ... add item code ...

  if (!this.categoriesSignal().includes(item.category)) {
    this.categoriesSignal.update(cats => [...cats, item.category].sort());
  }
}

// ✅ Opción 2: Tabla separada de categorías (cuando haya backend)
// GET /api/categories
```

**Beneficios**:
- ✅ **No recalcula**: A menos que realmente cambie
- ✅ **Más rápido**: Especialmente con muchos items
- ✅ **Preparado para backend**: Cuando categorías vengan de DB

**Esfuerzo**: 2-3 horas
**Prioridad**: MEDIA

---

### PROBLEMA #7: Console.log en Producción

**Ubicación**: `src/app/components/dashboard/dashboard.ts:42`

**Código Actual**:
```typescript
constructor(private sharedData: SharedData) {
  console.log("Dashboard component created!");
}
```

**Problemas**:
- ❌ **Console.logs en producción**: Contamina la consola
- ❌ **No hay environment check**: Se ejecuta siempre
- ❌ **Múltiples console.log**: En varios archivos (lines 165, 173, 217, etc.)

**Impacto en Rendimiento**: **BAJO** - Pero mala práctica

**Solución**:
```typescript
// ✅ Opción 1: Eliminar o comentar
// constructor(private sharedData: SharedData) {}

// ✅ Opción 2: Usar servicio de logging
export class LoggerService {
  log(message: string, ...args: any[]) {
    if (!environment.production) {
      console.log(message, ...args);
    }
  }
}

// Uso:
constructor(private logger: LoggerService) {
  this.logger.log('Dashboard created');
}
```

**Beneficios**:
- ✅ **Consola limpia en producción**
- ✅ **Centralizado**: Control en un solo lugar
- ✅ **Configurable**: Puede enviar a servicio de logging externo

**Esfuerzo**: 1 hora
**Prioridad**: BAJA

---

### PROBLEMA #8: Confirmación con alert/confirm Nativo

**Ubicación**: `src/app/components/inventory/inventory-list/inventory-list.ts:177`

**Código Actual**:
```typescript
deleteItem(item: InventoryItemInterface): void {
  const confirmed = confirm(`Are you sure...?`); // ❌ alert nativo
  if (confirmed) {
    // delete
  }
}
```

**Problemas**:
- ❌ **UI bloqueante**: Detiene toda la aplicación
- ❌ **No se puede estilizar**: Apariencia del sistema operativo
- ❌ **Mala UX**: No sigue diseño Material

**Impacto en Rendimiento**: **NINGUNO** - Pero mala UX

**Solución**:
```typescript
// ✅ Usar MatDialog
deleteItem(item: InventoryItemInterface): void {
  const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    data: {
      title: 'Confirmar Eliminación',
      message: `¿Estás seguro de eliminar "${item.name}"?`
    }
  });

  dialogRef.afterClosed().subscribe(confirmed => {
    if (confirmed) {
      this.inventoryService.deleteItem(item.id);
      this.snackBar.open(`"${item.name}" eliminado`, 'OK', { duration: 3000 });
    }
  });
}
```

**Beneficios**:
- ✅ **No bloqueante**: App sigue responsive
- ✅ **Estilizado**: Sigue diseño Material
- ✅ **Mejor UX**: Consistente con el resto de la app

**Esfuerzo**: 3-4 horas
**Prioridad**: MEDIA

---

### PROBLEMA #9: Sin Debouncing en Búsqueda

**Ubicación**: Template de `inventory-list`

**Código Actual**:
```typescript
onSearchChange(value: string): void {
  this.searchQuery.set(value);
  this.applyFilters(); // ❌ Se ejecuta en CADA tecla
}
```

**Problemas**:
- ❌ **Filtra en cada tecla**: Al escribir "laptop" = 6 filtrados
- ❌ **Costoso con listas grandes**: 1000 items x 6 = 6000 iteraciones
- ❌ **Experiencia subóptima**: Resultados cambiando constantemente

**Impacto en Rendimiento**: **MEDIO** - Procesamiento excesivo

**Solución**:
```typescript
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export class InventoryList implements OnInit {
  private searchSubject = new Subject<string>();

  ngOnInit() {
    // ✅ Espera 300ms después de última tecla
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(value => {
      this.searchQuery.set(value);
    });
  }

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }
}
```

**Beneficios**:
- ✅ **83% menos filtrados**: 1 en lugar de 6
- ✅ **Mejor UX**: Espera a que termine de escribir
- ✅ **Menos CPU**: Especialmente notable en listas grandes

**Esfuerzo**: 1-2 horas
**Prioridad**: MEDIA

---

### PROBLEMA #10: Bundle Size No Optimizado

**Ubicación**: `angular.json:24-27`

**Configuración Actual**:
```json
"styles": [
  "src/custom-theme.scss",
  "src/styles.css"
]
```

**Problemas**:
- ❌ **Importa TODO Material**: Incluso componentes no usados
- ❌ **Sin tree-shaking de estilos**
- ❌ **Bundle más grande**: De lo necesario
- ❌ **No hay lazy loading**: De rutas

**Impacto en Rendimiento**: **ALTO** - Tiempo de carga inicial

**Solución**:
```typescript
// ✅ 1. Lazy loading de rutas
export const routes: Routes = [
  {
    path: 'inventory',
    loadComponent: () => import('./components/inventory/inventory-list')
      .then(m => m.InventoryList)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard')
      .then(m => m.Dashboard)
  }
];

// ✅ 2. Importar solo componentes Material usados
// (ya lo hace bien - ✓)

// ✅ 3. Configurar Tailwind para purge
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  // Solo incluye clases usadas
}

// ✅ 4. Analizar bundle
// package.json
"scripts": {
  "analyze": "ng build --stats-json && webpack-bundle-analyzer dist/stats.json"
}
```

**Beneficios**:
- ✅ **30-50% menos bundle**: Solo código usado
- ✅ **Carga más rápida**: Especialmente first paint
- ✅ **Mejor Core Web Vitals**: Mejora LCP y FCP

**Esfuerzo**: 4-6 horas
**Prioridad**: MEDIA-ALTA

---

### PROBLEMA #11: Sin Manejo de Errores en localStorage

**Ubicación**: `src/app/services/inventory/inventory.service.ts:27-43`

**Código Actual**:
```typescript
private loadFromStorage(): void {
  const stored = localStorage.getItem(this.STORAGE_KEY);
  if (stored) {
    try {
      const parsedItems = JSON.parse(stored).map(...);
      this.itemsSignal.set(parsedItems);
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      this.initializeWithMockData();
    }
  }
}
```

**Problemas**:
- ❌ **localStorage puede fallar**: Modo incógnito, cuota excedida, etc.
- ❌ **No hay retry logic**: Si falla, solo carga mock
- ❌ **Usuario pierde datos**: Sin aviso

**Impacto**: **MEDIO** - Pérdida potencial de datos

**Solución**:
```typescript
private loadFromStorage(): void {
  try {
    if (!this.isLocalStorageAvailable()) {
      this.showWarning('Storage no disponible. Datos solo en sesión.');
      this.initializeWithMockData();
      return;
    }

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      const parsedItems = JSON.parse(stored).map(item => ({
        ...item,
        lastUpdated: new Date(item.lastUpdated)
      }));
      this.itemsSignal.set(parsedItems);
    } else {
      this.initializeWithMockData();
    }
  } catch (error) {
    this.logError('Error cargando datos', error);
    this.showError('Error al cargar datos. Usando datos por defecto.');
    this.initializeWithMockData();
  }
}

private isLocalStorageAvailable(): boolean {
  try {
    const test = '__test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

private saveToStorage(): void {
  try {
    const data = JSON.stringify(this.itemsSignal());
    localStorage.setItem(this.STORAGE_KEY, data);
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      this.showError('Almacenamiento lleno. No se pueden guardar cambios.');
    } else {
      this.logError('Error guardando datos', error);
    }
  }
}
```

**Beneficios**:
- ✅ **Mejor UX**: Usuario sabe qué pasó
- ✅ **Datos protegidos**: Avisos antes de perder datos
- ✅ **Más robusto**: Maneja casos edge

**Esfuerzo**: 2-3 horas
**Prioridad**: MEDIA

---

### PROBLEMA #12: Change Detection No Optimizada

**Ubicación**: Todos los componentes

**Código Actual**:
```typescript
@Component({
  selector: 'app-inventory-list',
  // ❌ Sin configuración de changeDetection
})
```

**Problemas**:
- ❌ **Default change detection**: Verifica TODO el árbol en cada evento
- ❌ **Innecesario con Signals**: Signals ya son reactivos
- ❌ **Desperdicio de CPU**: En apps grandes

**Impacto en Rendimiento**: **MEDIO** - Verificaciones innecesarias

**Solución**:
```typescript
import { ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-inventory-list',
  changeDetection: ChangeDetectionStrategy.OnPush, // ✅
  // ...
})
export class InventoryList {
  // Con signals, OnPush es perfecto
  // Solo verifica cuando:
  // 1. Input cambia
  // 2. Evento del componente
  // 3. Signal cambia
}
```

**Beneficios**:
- ✅ **50-70% menos verificaciones**: Solo cuando es necesario
- ✅ **Mejor rendimiento**: Especialmente con muchos componentes
- ✅ **Compatible con Signals**: Funcionan perfectamente juntos

**Esfuerzo**: 1 hora (aplicar a todos los componentes)
**Prioridad**: MEDIA-ALTA

---

## RESUMEN DE OPTIMIZACIONES DE CÓDIGO

| Problema | Ubicación | Impacto | Prioridad | Esfuerzo |
|----------|-----------|---------|-----------|----------|
| 1. Polling en filtros | inventory-list.ts:118 | CRÍTICO | CRÍTICA | 2-3h |
| 2. Llamadas redundantes stats | inventory-list.ts:73 | ALTO | ALTA | 1h |
| 3. MatTableDataSource mal usado | inventory-list.ts:57 | MEDIO | MEDIA | 3-4h |
| 4. Falta memoización | inventory-list.ts:207 | BAJO | BAJA | 1-2h |
| 5. TrackBy no usado | inventory-list.html | ALTO | ALTA | 15min |
| 6. Categorías recalculadas | service.ts:13 | MEDIO | MEDIA | 2-3h |
| 7. Console.log en producción | Varios | BAJO | BAJA | 1h |
| 8. Confirm nativo | inventory-list.ts:177 | UX | MEDIA | 3-4h |
| 9. Sin debouncing | inventory-list.ts:135 | MEDIO | MEDIA | 1-2h |
| 10. Bundle no optimizado | angular.json | ALTO | MEDIA-ALTA | 4-6h |
| 11. Errores localStorage | service.ts:27 | MEDIO | MEDIA | 2-3h |
| 12. Change Detection | Todos | MEDIO | MEDIA-ALTA | 1h |

**TOTAL ESFUERZO**: 22-35 horas
**IMPACTO COMBINADO**: Mejora de rendimiento de **40-60%**

---

## PARTE 2: CARACTERÍSTICAS Y FEATURES FALTANTES

---

## PRIORIDAD ALTA (CRÍTICAS)

### 1. Implementar Backend API y Base de Datos Real

**Problema Actual**:
- La aplicación solo funciona en el cliente
- Datos guardados en localStorage (se pierden al limpiar caché)
- No hay sincronización entre dispositivos
- No hay validación del lado del servidor
- Límite de almacenamiento (~5-10MB)

**Solución Propuesta**:

#### Opción A: Backend con NestJS (Recomendado)
```typescript
// Estructura sugerida
backend/
├── src/
│   ├── modules/
│   │   ├── auth/           # Autenticación
│   │   ├── users/          # Usuarios
│   │   ├── inventory/      # Inventario
│   │   └── categories/     # Categorías
│   ├── common/             # Guards, interceptors, pipes
│   ├── database/           # Configuración DB
│   └── main.ts
```

#### Opción B: Backend con Express + TypeORM
```typescript
// Más ligero pero menos estructura
backend/
├── src/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   ├── middleware/
│   └── server.ts
```

**Base de Datos Recomendada**: PostgreSQL

**Esquema Propuesto**:
```sql
-- Usuarios
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Categorías
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ubicaciones
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Items de Inventario
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  category_id UUID REFERENCES categories(id),
  location_id UUID REFERENCES locations(id),
  status VARCHAR(50) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Historial de Movimientos
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES inventory_items(id),
  user_id UUID REFERENCES users(id),
  movement_type VARCHAR(50) NOT NULL, -- 'add', 'remove', 'adjust'
  quantity_change INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Endpoints REST API**:
```
# Autenticación
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me

# Inventario
GET    /api/inventory              # Listar (con filtros)
GET    /api/inventory/:id          # Obtener uno
POST   /api/inventory              # Crear
PUT    /api/inventory/:id          # Actualizar
DELETE /api/inventory/:id          # Eliminar
GET    /api/inventory/stats        # Estadísticas
POST   /api/inventory/:id/adjust   # Ajustar cantidad

# Categorías
GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id

# Ubicaciones
GET    /api/locations
POST   /api/locations
PUT    /api/locations/:id
DELETE /api/locations/:id

# Usuarios (admin)
GET    /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id

# Reportes
GET    /api/reports/movements      # Historial de movimientos
GET    /api/reports/low-stock      # Items con stock bajo
GET    /api/reports/export         # Exportar datos
```

**Esfuerzo Estimado**: 40-60 horas

---

### 2. Implementar Sistema de Autenticación Completo

**Problema Actual**:
- No hay login/registro
- No hay protección de rutas
- No hay roles de usuario
- Datos de usuario hardcodeados

**Solución Propuesta**:

**Frontend**:
```typescript
// auth.service.ts
export class AuthService {
  private currentUser = signal<User | null>(null);

  login(email: string, password: string): Observable<AuthResponse>
  register(userData: RegisterDto): Observable<AuthResponse>
  logout(): void
  refreshToken(): Observable<AuthResponse>
  getCurrentUser(): Signal<User | null>
  isAuthenticated(): Signal<boolean>
  hasRole(role: string): boolean
}

// auth.guard.ts
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()()) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};

// role.guard.ts
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    return allowedRoles.some(role => authService.hasRole(role));
  };
};
```

**Componentes Necesarios**:
- `LoginComponent`: Formulario de inicio de sesión
- `RegisterComponent`: Formulario de registro
- `ForgotPasswordComponent`: Recuperación de contraseña
- `ResetPasswordComponent`: Restablecer contraseña

**Backend**:
- JWT (JSON Web Tokens) para autenticación
- Refresh tokens para sesiones largas
- Hash de contraseñas con bcrypt
- Rate limiting para prevenir ataques de fuerza bruta
- Validación de email

**Actualizar Rutas**:
```typescript
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'inventory',
    component: InventoryListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'users',
    component: UsersComponent,
    canActivate: [authGuard, roleGuard(['admin'])]
  },
  // ...
];
```

**HTTP Interceptor**:
```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.logout();
        inject(Router).navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
```

**Esfuerzo Estimado**: 30-40 horas

---

### 3. Completar Formulario de Inventario (Add/Edit) - ACTUALIZADO CON BACKEND v2.0

**Problema Actual**:
- Componente `inventory-form` es solo un placeholder
- No se pueden agregar nuevos items desde la UI
- No se pueden editar items existentes
- **NUEVO**: Falta integración con warehouses, suppliers y sistema UNIQUE/BULK del backend

**Solución Propuesta**:

**Archivo**: `src/app/components/inventory/inventory-form/inventory-form.ts`

```typescript
export class InventoryFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventoryService = inject(InventoryService);
  private warehouseService = inject(WarehouseService);      // NUEVO
  private supplierService = inject(SupplierService);        // NUEVO
  private userService = inject(UserService);                // NUEVO

  isEditMode = signal(false);
  itemId = signal<string | null>(null);

  // NUEVO: Tipo de item seleccionado
  selectedItemType = signal<'UNIQUE' | 'BULK'>('BULK');

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required]],

    // NUEVO: Tipo de item
    itemType: ['BULK', [Validators.required]],

    quantity: [0, [Validators.required, Validators.min(0)]],
    category: ['', [Validators.required]],

    // NUEVO: Bodega (requerido)
    warehouseId: ['', [Validators.required]],

    // NUEVO: Proveedor (opcional)
    supplierId: [''],

    // NUEVO: Service Tag (solo para UNIQUE)
    serviceTag: [''],

    // NUEVO: Serial Number (solo para UNIQUE)
    serialNumber: [''],

    // Campos existentes
    sku: [''],
    price: [0, [Validators.min(0)]],
    currency: ['USD', [Validators.required]],  // NUEVO
    minQuantity: [10, [Validators.min(0)]],
    barcode: [''],

    // NUEVO: Asignación (solo para UNIQUE)
    assignedToUserId: [''],
  });

  categories = signal<string[]>([]);
  warehouses = signal<Warehouse[]>([
  ]);          // NUEVO
  suppliers = signal<Supplier[]>([]);            // NUEVO
  externalUsers = signal<User[]>([]);            // NUEVO

  // NUEVO: Computed para saber si es UNIQUE
  isUniqueItem = computed(() => this.selectedItemType() === 'UNIQUE');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.itemId.set(id);
      this.loadItem(id);
    }

    this.loadCategories();
    this.loadWarehouses();    // NUEVO
    this.loadSuppliers();     // NUEVO
    this.loadExternalUsers(); // NUEVO

    // NUEVO: Escuchar cambios en itemType
    this.setupItemTypeValidations();
  }

  // NUEVO: Configurar validaciones dinámicas según tipo
  setupItemTypeValidations() {
    this.form.get('itemType')?.valueChanges.subscribe(type => {
      this.selectedItemType.set(type as 'UNIQUE' | 'BULK');

      const serviceTagControl = this.form.get('serviceTag');
      const serialNumberControl = this.form.get('serialNumber');
      const quantityControl = this.form.get('quantity');
      const assignedToControl = this.form.get('assignedToUserId');

      if (type === 'UNIQUE') {
        // Items UNIQUE: quantity = 1, requiere serviceTag O serialNumber
        quantityControl?.setValue(1);
        quantityControl?.disable();

        // Al menos uno de los dos es requerido
        serviceTagControl?.setValidators([this.requireServiceTagOrSerial.bind(this)]);
        serialNumberControl?.setValidators([this.requireServiceTagOrSerial.bind(this)]);

      } else {
        // Items BULK: no pueden tener serviceTag ni serialNumber
        quantityControl?.enable();
        quantityControl?.setValidators([Validators.required, Validators.min(0)]);

        serviceTagControl?.clearValidators();
        serviceTagControl?.setValue('');
        serviceTagControl?.disable();

        serialNumberControl?.clearValidators();
        serialNumberControl?.setValue('');
        serialNumberControl?.disable();

        // No se puede asignar
        assignedToControl?.setValue('');
        assignedToControl?.disable();
      }

      serviceTagControl?.updateValueAndValidity();
      serialNumberControl?.updateValueAndValidity();
      quantityControl?.updateValueAndValidity();
    });
  }

  // NUEVO: Validador personalizado
  requireServiceTagOrSerial(control: AbstractControl): ValidationErrors | null {
    if (!this.form) return null;

    const serviceTag = this.form.get('serviceTag')?.value;
    const serialNumber = this.form.get('serialNumber')?.value;

    if (!serviceTag && !serialNumber) {
      return { requireEither: 'Se requiere Service Tag o Serial Number' };
    }
    return null;
  }

  // NUEVO: Cargar datos del backend
  async loadWarehouses() {
    this.warehouses.set(await this.warehouseService.getAll());
  }

  async loadSuppliers() {
    this.suppliers.set(await this.supplierService.getAll());
  }

  async loadExternalUsers() {
    const users = await this.userService.getAll();
    this.externalUsers.set(users.filter(u => u.role === 'EXTERNAL'));
  }

  onSubmit() {
    if (this.form.valid) {
      const formData = {
        ...this.form.getRawValue(), // getRawValue incluye campos disabled
      };

      // NUEVO: Limpiar campos según tipo
      if (formData.itemType === 'BULK') {
        delete formData.serviceTag;
        delete formData.serialNumber;
        delete formData.assignedToUserId;
      }

      if (this.isEditMode()) {
        this.inventoryService.updateItem(this.itemId()!, formData);
      } else {
        this.inventoryService.addItem(formData);
      }
      this.router.navigate(['/inventory']);
    }
  }
}
```

**Template Actualizado**:
```html
<div class="max-w-4xl mx-auto p-6">
  <h2 class="text-2xl mb-6">
    {{ isEditMode() ? 'inventory.form.editTitle' : 'inventory.form.addTitle' | translate }}
  </h2>

  <form [formGroup]="form" (ngSubmit)="onSubmit()">
    <mat-card>
      <mat-card-content>

        <!-- NUEVO: Tipo de Item -->
        <h3>{{ 'inventory.form.sections.itemType' | translate }}</h3>
        <mat-radio-group formControlName="itemType" class="flex gap-4 mb-6">
          <mat-radio-button value="BULK">
            <div class="flex items-center gap-2">
              <mat-icon>inventory_2</mat-icon>
              <div>
                <div class="font-semibold">{{ 'inventory.itemType.bulk' | translate }}</div>
                <div class="text-sm text-slate-400">
                  {{ 'inventory.itemType.bulkDesc' | translate }}
                </div>
              </div>
            </div>
          </mat-radio-button>

          <mat-radio-button value="UNIQUE">
            <div class="flex items-center gap-2">
              <mat-icon>laptop</mat-icon>
              <div>
                <div class="font-semibold">{{ 'inventory.itemType.unique' | translate }}</div>
                <div class="text-sm text-slate-400">
                  {{ 'inventory.itemType.uniqueDesc' | translate }}
                </div>
              </div>
            </div>
          </mat-radio-button>
        </mat-radio-group>

        <!-- Información Básica -->
        <h3>{{ 'inventory.form.sections.basic' | translate }}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <mat-form-field>
            <mat-label>{{ 'inventory.form.fields.name' | translate }}</mat-label>
            <input matInput formControlName="name">
            <mat-error>{{ 'validation.required' | translate }}</mat-error>
          </mat-form-field>

          <mat-form-field>
            <mat-label>{{ 'inventory.form.fields.sku' | translate }}</mat-label>
            <input matInput formControlName="sku">
          </mat-form-field>
        </div>

        <mat-form-field class="w-full">
          <mat-label>{{ 'inventory.form.fields.description' | translate }}</mat-label>
          <textarea matInput rows="3" formControlName="description"></textarea>
        </mat-form-field>

        <!-- NUEVO: Identificadores Únicos (solo para UNIQUE) -->
        @if (isUniqueItem()) {
          <h3 class="mt-6">{{ 'inventory.form.sections.identifiers' | translate }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <mat-form-field>
              <mat-label>{{ 'inventory.form.fields.serviceTag' | translate }}</mat-label>
              <input matInput formControlName="serviceTag">
              <mat-hint>{{ 'inventory.form.hints.serviceTag' | translate }}</mat-hint>
              <mat-error>{{ 'validation.requireEither' | translate }}</mat-error>
            </mat-form-field>

            <mat-form-field>
              <mat-label>{{ 'inventory.form.fields.serialNumber' | translate }}</mat-label>
              <input matInput formControlName="serialNumber">
              <mat-hint>{{ 'inventory.form.hints.serialNumber' | translate }}</mat-hint>
            </mat-form-field>
          </div>

          <mat-hint class="text-yellow-600 flex items-center gap-2 mb-4">
            <mat-icon>info</mat-icon>
            {{ 'inventory.form.hints.uniqueIdentifier' | translate }}
          </mat-hint>
        }

        <!-- Inventario -->
        <h3 class="mt-6">{{ 'inventory.form.sections.inventory' | translate }}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <mat-form-field>
            <mat-label>{{ 'inventory.form.fields.quantity' | translate }}</mat-label>
            <input matInput type="number" formControlName="quantity">
            @if (isUniqueItem()) {
              <mat-hint>{{ 'inventory.form.hints.uniqueQuantity' | translate }}</mat-hint>
            }
          </mat-form-field>

          <mat-form-field>
            <mat-label>{{ 'inventory.form.fields.minQuantity' | translate }}</mat-label>
            <input matInput type="number" formControlName="minQuantity">
          </mat-form-field>
        </div>

        <!-- NUEVO: Ubicación y Clasificación -->
        <h3 class="mt-6">{{ 'inventory.form.sections.location' | translate }}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <mat-form-field>
            <mat-label>{{ 'inventory.form.fields.warehouse' | translate }}</mat-label>
            <mat-select formControlName="warehouseId">
              @for (warehouse of warehouses(); track warehouse.id) {
                <mat-option [value]="warehouse.id">
                  {{ warehouse.name }} - {{ warehouse.location }}
                </mat-option>
              }
            </mat-select>
            <mat-error>{{ 'validation.required' | translate }}</mat-error>
          </mat-form-field>

          <mat-form-field>
            <mat-label>{{ 'inventory.form.fields.category' | translate }}</mat-label>
            <mat-select formControlName="category">
              @for (cat of categories(); track cat) {
                <mat-option [value]="cat">{{ cat }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <!-- NUEVO: Información Comercial -->
        <h3 class="mt-6">{{ 'inventory.form.sections.commercial' | translate }}</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <mat-form-field>
            <mat-label>{{ 'inventory.form.fields.price' | translate }}</mat-label>
            <input matInput type="number" formControlName="price">
            <span matPrefix>$&nbsp;</span>
          </mat-form-field>

          <mat-form-field>
            <mat-label>{{ 'inventory.form.fields.currency' | translate }}</mat-label>
            <mat-select formControlName="currency">
              <mat-option value="USD">USD - Dólar</mat-option>
              <mat-option value="HNL">HNL - Lempira</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field>
            <mat-label>{{ 'inventory.form.fields.supplier' | translate }}</mat-label>
            <mat-select formControlName="supplierId">
              <mat-option [value]="null">{{ 'common.none' | translate }}</mat-option>
              @for (supplier of suppliers(); track supplier.id) {
                <mat-option [value]="supplier.id">
                  {{ supplier.name }}
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <!-- NUEVO: Asignación (solo para UNIQUE) -->
        @if (isUniqueItem()) {
          <h3 class="mt-6">{{ 'inventory.form.sections.assignment' | translate }}</h3>
          <mat-form-field class="w-full md:w-1/2">
            <mat-label>{{ 'inventory.form.fields.assignedTo' | translate }}</mat-label>
            <mat-select formControlName="assignedToUserId">
              <mat-option [value]="null">{{ 'common.unassigned' | translate }}</mat-option>
              @for (user of externalUsers(); track user.id) {
                <mat-option [value]="user.id">
                  {{ user.name }} ({{ user.email }})
                </mat-option>
              }
            </mat-select>
            <mat-hint>{{ 'inventory.form.hints.assignment' | translate }}</mat-hint>
          </mat-form-field>
        }

      </mat-card-content>

      <mat-card-actions class="flex justify-end gap-2 p-4">
        <button mat-button type="button" (click)="onCancel()">
          {{ 'common.cancel' | translate }}
        </button>
        <button mat-raised-button color="primary" type="submit"
                [disabled]="form.invalid">
          {{ isEditMode() ? 'common.update' : 'common.create' | translate }}
        </button>
      </mat-card-actions>
    </mat-card>
  </form>
</div>
```

**Funcionalidades Implementadas**:
- ✅ Tipo de item (UNIQUE vs BULK) con radio buttons
- ✅ Service Tag / Serial Number (solo UNIQUE, al menos uno requerido)
- ✅ Selector de bodega (warehouse) - requerido
- ✅ Selector de proveedor (supplier) - opcional, con búsqueda
- ✅ Selector de moneda (USD / HNL)
- ✅ Asignación a usuario externo (solo UNIQUE)
- ✅ Validaciones dinámicas según tipo de item
- ✅ Quantity = 1 automático para items UNIQUE
- ✅ Internacionalización (i18n) en todo el template
- ✅ Hints contextuales para cada campo

**Servicios Adicionales Necesarios**:
```typescript
// warehouse.service.ts
export class WarehouseService {
  getAll(): Observable<Warehouse[]>
  getById(id: string): Observable<Warehouse>
}

// supplier.service.ts
export class SupplierService {
  getAll(): Observable<Supplier[]>
  getById(id: string): Observable<Supplier>
}

// user.service.ts (actualizado)
export class UserService {
  getAll(): Observable<User[]>
  getByRole(role: UserRole): Observable<User[]>
}
```

**Esfuerzo Estimado**: 20-25 horas (aumentó por integración con backend)

---

### 4. Setup de Internacionalización (i18n) - MOVIDO A PRIORIDAD ALTA

**RECOMENDACIÓN: HACER AHORA ANTES DE CONTINUAR DESARROLLO** ⚠️

**Problema Actual**:
- Todos los textos están hardcodeados en los templates
- No hay soporte para múltiples idiomas
- Refactorizar después será MUY costoso (2-3 semanas)

**Por qué hacerlo AHORA en lugar de al final:**

#### ✅ Ventajas de implementar i18n desde el inicio:

1. **Evita refactorización masiva**
   - Cambiar 1000+ textos después es extremadamente tedioso
   - Alto riesgo de olvidar textos en componentes
   - Requiere 2-3 semanas de trabajo aburrido al final

2. **Overhead mínimo durante desarrollo**
   - Solo 30 segundos extra por texto nuevo
   - Se convierte en hábito automático en 2 días
   - Costo: +5% de tiempo al escribir templates

3. **Arquitectura correcta desde inicio**
   - Fechas, números, monedas formateados correctamente
   - No hay "textos escondidos"
   - Testing más fácil

#### ❌ Consecuencias de dejarlo para el final:

1. **Refactorización MASIVA**
   - 2-3 semanas buscando TODOS los textos
   - Alto riesgo de bugs
   - Breaking changes en tests

2. **Motivación baja**
   - Nadie quiere "buscar y reemplazar" después de terminar
   - Se ve como trabajo tedioso e innecesario

3. **Mayor costo total**
   - Hacer ahora: 3-4 horas setup + 5% overhead
   - Hacer después: 2-3 semanas refactorización completa

---

**Solución Propuesta: Enfoque Híbrido Pragmático**

### FASE 1: Setup Inicial (2-3 horas) - HACER AHORA ✅

```bash
# Instalar dependencias
npm install @ngx-translate/core @ngx-translate/http-loader
```

**1. Configurar en `app.config.ts`:**
```typescript
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'es',
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        }
      })
    ),
    // ... otros providers
  ]
};
```

**2. Crear estructura de archivos de traducción:**

```
src/assets/i18n/
├── es.json   (Español - idioma por defecto)
└── en.json   (Inglés)
```

**3. Archivo base `src/assets/i18n/es.json`:**
```json
{
  "nav": {
    "dashboard": "Dashboard",
    "inventory": "Inventario",
    "warehouses": "Bodegas",
    "suppliers": "Proveedores",
    "users": "Usuarios",
    "settings": "Configuración",
    "profile": "Perfil",
    "logout": "Cerrar Sesión"
  },
  "common": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "add": "Agregar",
    "search": "Buscar",
    "filter": "Filtrar",
    "export": "Exportar",
    "import": "Importar",
    "loading": "Cargando...",
    "noData": "No hay datos",
    "confirm": "Confirmar",
    "yes": "Sí",
    "no": "No",
    "create": "Crear",
    "update": "Actualizar",
    "none": "Ninguno",
    "unassigned": "Sin asignar",
    "all": "Todos"
  },
  "validation": {
    "required": "Este campo es requerido",
    "minLength": "Mínimo {{min}} caracteres",
    "maxLength": "Máximo {{max}} caracteres",
    "email": "Email inválido",
    "min": "Valor mínimo: {{min}}",
    "max": "Valor máximo: {{max}}",
    "requireEither": "Se requiere al menos uno de estos campos"
  },
  "inventory": {
    "title": "Inventario",
    "addItem": "Agregar Item",
    "editItem": "Editar Item",
    "deleteItem": "Eliminar Item",
    "itemType": {
      "bulk": "Item por Cantidad",
      "bulkDesc": "Items contados por unidades (ej: tornillos, papel)",
      "unique": "Item Único",
      "uniqueDesc": "Items individuales con identificador (ej: laptops, equipos)"
    },
    "form": {
      "title": "Formulario de Inventario",
      "addTitle": "Agregar Nuevo Item",
      "editTitle": "Editar Item",
      "sections": {
        "basic": "Información Básica",
        "itemType": "Tipo de Item",
        "identifiers": "Identificadores Únicos",
        "inventory": "Inventario",
        "location": "Ubicación y Clasificación",
        "commercial": "Información Comercial",
        "assignment": "Asignación"
      },
      "fields": {
        "name": "Nombre",
        "description": "Descripción",
        "sku": "SKU",
        "quantity": "Cantidad",
        "minQuantity": "Cantidad Mínima",
        "category": "Categoría",
        "warehouse": "Bodega",
        "supplier": "Proveedor",
        "price": "Precio",
        "currency": "Moneda",
        "serviceTag": "Service Tag",
        "serialNumber": "Número de Serie",
        "assignedTo": "Asignado a",
        "barcode": "Código de Barras"
      },
      "hints": {
        "serviceTag": "Ej: DEL123456AB",
        "serialNumber": "Ej: 1234-5678-9012",
        "uniqueIdentifier": "Se requiere Service Tag O Número de Serie",
        "uniqueQuantity": "Items únicos siempre tienen cantidad = 1",
        "assignment": "Asignar este item a un usuario externo"
      }
    },
    "status": {
      "inStock": "En Stock",
      "lowStock": "Stock Bajo",
      "outOfStock": "Agotado"
    }
  },
  "warehouse": {
    "title": "Bodegas",
    "add": "Agregar Bodega",
    "edit": "Editar Bodega",
    "name": "Nombre",
    "location": "Ubicación",
    "description": "Descripción"
  },
  "supplier": {
    "title": "Proveedores",
    "add": "Agregar Proveedor",
    "edit": "Editar Proveedor",
    "name": "Nombre",
    "location": "Ubicación",
    "phone": "Teléfono",
    "email": "Email"
  },
  "dashboard": {
    "title": "Dashboard",
    "stats": {
      "totalValue": "Valor Total",
      "totalItems": "Items Totales",
      "totalUsers": "Usuarios"
    },
    "recentItems": "Items Recientes"
  }
}
```

**4. Archivo `src/assets/i18n/en.json`:**
```json
{
  "nav": {
    "dashboard": "Dashboard",
    "inventory": "Inventory",
    "warehouses": "Warehouses",
    "suppliers": "Suppliers",
    "users": "Users",
    "settings": "Settings",
    "profile": "Profile",
    "logout": "Logout"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "add": "Add",
    "search": "Search",
    "filter": "Filter",
    "export": "Export",
    "import": "Import",
    "loading": "Loading...",
    "noData": "No data",
    "confirm": "Confirm",
    "yes": "Yes",
    "no": "No",
    "create": "Create",
    "update": "Update",
    "none": "None",
    "unassigned": "Unassigned",
    "all": "All"
  },
  "validation": {
    "required": "This field is required",
    "minLength": "Minimum {{min}} characters",
    "maxLength": "Maximum {{max}} characters",
    "email": "Invalid email",
    "min": "Minimum value: {{min}}",
    "max": "Maximum value: {{max}}",
    "requireEither": "At least one of these fields is required"
  },
  "inventory": {
    "title": "Inventory",
    "addItem": "Add Item",
    "editItem": "Edit Item",
    "deleteItem": "Delete Item",
    "itemType": {
      "bulk": "Bulk Item",
      "bulkDesc": "Items counted by units (e.g., screws, paper)",
      "unique": "Unique Item",
      "uniqueDesc": "Individual items with identifier (e.g., laptops, equipment)"
    },
    "form": {
      "title": "Inventory Form",
      "addTitle": "Add New Item",
      "editTitle": "Edit Item",
      "sections": {
        "basic": "Basic Information",
        "itemType": "Item Type",
        "identifiers": "Unique Identifiers",
        "inventory": "Inventory",
        "location": "Location and Classification",
        "commercial": "Commercial Information",
        "assignment": "Assignment"
      },
      "fields": {
        "name": "Name",
        "description": "Description",
        "sku": "SKU",
        "quantity": "Quantity",
        "minQuantity": "Minimum Quantity",
        "category": "Category",
        "warehouse": "Warehouse",
        "supplier": "Supplier",
        "price": "Price",
        "currency": "Currency",
        "serviceTag": "Service Tag",
        "serialNumber": "Serial Number",
        "assignedTo": "Assigned to",
        "barcode": "Barcode"
      },
      "hints": {
        "serviceTag": "E.g., DEL123456AB",
        "serialNumber": "E.g., 1234-5678-9012",
        "uniqueIdentifier": "Service Tag OR Serial Number required",
        "uniqueQuantity": "Unique items always have quantity = 1",
        "assignment": "Assign this item to an external user"
      }
    },
    "status": {
      "inStock": "In Stock",
      "lowStock": "Low Stock",
      "outOfStock": "Out of Stock"
    }
  },
  "warehouse": {
    "title": "Warehouses",
    "add": "Add Warehouse",
    "edit": "Edit Warehouse",
    "name": "Name",
    "location": "Location",
    "description": "Description"
  },
  "supplier": {
    "title": "Suppliers",
    "add": "Add Supplier",
    "edit": "Edit Supplier",
    "name": "Name",
    "location": "Location",
    "phone": "Phone",
    "email": "Email"
  },
  "dashboard": {
    "title": "Dashboard",
    "stats": {
      "totalValue": "Total Value",
      "totalItems": "Total Items",
      "totalUsers": "Users"
    },
    "recentItems": "Recent Items"
  }
}
```

**5. Crear componente selector de idioma:**

`src/app/components/shared/language-selector/language-selector.component.ts`:
```typescript
import { Component, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [MatSelectModule, MatFormFieldModule],
  template: `
    <mat-form-field appearance="outline" class="w-32">
      <mat-select [value]="currentLang" (selectionChange)="changeLang($event.value)">
        <mat-option value="es">🇭🇳 Español</mat-option>
        <mat-option value="en">🇺🇸 English</mat-option>
      </mat-select>
    </mat-form-field>
  `
})
export class LanguageSelectorComponent {
  private translate = inject(TranslateService);

  currentLang = this.translate.currentLang || 'es';

  changeLang(lang: string) {
    this.translate.use(lang);
    localStorage.setItem('language', lang);
  }
}
```

**6. Agregar selector en navigation:**
```html
<!-- navigation.html - agregar en el header -->
<div class="flex items-center gap-4">
  <app-language-selector />
  <!-- ... otros elementos del header -->
</div>
```

**7. Inicializar idioma en `app.component.ts`:**
```typescript
import { Component, inject, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export class AppComponent implements OnInit {
  private translate = inject(TranslateService);

  ngOnInit() {
    // Idiomas disponibles
    this.translate.addLangs(['es', 'en']);

    // Idioma por defecto
    this.translate.setDefaultLang('es');

    // Usar idioma guardado o detectar del navegador
    const savedLang = localStorage.getItem('language');
    const browserLang = this.translate.getBrowserLang();
    const langToUse = savedLang || (browserLang?.match(/es|en/) ? browserLang : 'es');

    this.translate.use(langToUse);
  }
}
```

---

### FASE 2: Durante Desarrollo (overhead mínimo) - HACER INCREMENTAL ✅

**Regla simple:** Cualquier texto visible → archivo de traducción

```html
<!-- ❌ ANTES (texto hardcodeado) -->
<h1>Inventory List</h1>
<button>Save</button>
<mat-label>Name</mat-label>

<!-- ✅ DESPUÉS (con i18n) -->
<h1>{{ 'inventory.title' | translate }}</h1>
<button>{{ 'common.save' | translate }}</button>
<mat-label>{{ 'inventory.form.fields.name' | translate }}</mat-label>
```

**Convención de nombres:**
```
categoria.subcategoria.clave
```

Ejemplos:
- `common.save` → Textos comunes reutilizables
- `inventory.title` → Títulos de secciones
- `inventory.form.fields.name` → Campos de formularios
- `validation.required` → Mensajes de validación

**Overhead:** Solo 30 segundos extra por texto (MÍNIMO)

---

### FASE 3: Traducción Completa (al 80% del proyecto) - HACER AL FINAL ✅

Una vez que tengas el 80% de las features:
- 1 semana para traducir todos los archivos `.json`
- Contratar traductor nativo si necesitas calidad profesional
- Testing en ambos idiomas
- Verificar que no haya textos hardcodeados

---

**Pipes Adicionales para Internacionalización:**

```typescript
// En templates, usar pipes de Angular:
{{ item.price | currency:item.currency }}           // $1,234.56 o L 30,864.00
{{ item.lastUpdated | date:'short' }}               // Formato según idioma
{{ item.quantity | number }}                         // 1,234 o 1.234 según locale
```

**Configurar locales en `app.config.ts`:**
```typescript
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es-HN';
import localeEn from '@angular/common/locales/en';

registerLocaleData(localeEs, 'es');
registerLocaleData(localeEn, 'en');
```

---

**Esfuerzo Estimado**:
- **Setup inicial (AHORA)**: 2-3 horas
- **Overhead durante desarrollo**: +5% tiempo (prácticamente nada)
- **Traducción completa (al 80%)**: 1 semana

**Total**: 3-4 horas ahora + 1 semana al final vs **2-3 semanas al final si no se hace ahora**

**ROI**: Ahorro de 2-3 semanas de refactorización tediosa 🎯

**Prioridad**: CRÍTICA - HACER ANTES DE CONTINUAR DESARROLLO

---

### 5. Optimizar Sistema de Filtrado (Eliminar Polling)

**Problema Actual**:
```typescript
// inventory-list.ts línea aproximada
effect(() => {
  setInterval(() => {
    this.filteredItems.set(this.getFilteredItems());
  }, 100); // ❌ POLLING cada 100ms - MUY INEFICIENTE
});
```

**Problemas**:
- CPU constantemente procesando filtros (cada 100ms)
- Consumo innecesario de batería en móviles
- Desperdicio de recursos
- Potencial lag en aplicación

**Solución Propuesta**:

```typescript
export class InventoryListComponent implements OnInit {
  private inventoryService = inject(InventoryService);

  // Signals de filtros
  searchTerm = signal('');
  selectedCategory = signal('');
  selectedLocation = signal('');
  selectedStatus = signal('');

  // Items base
  items = this.inventoryService.items;

  // Computed signal - se recalcula SOLO cuando cambian las dependencias
  filteredItems = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const category = this.selectedCategory();
    const location = this.selectedLocation();
    const status = this.selectedStatus();

    return this.items().filter(item => {
      const matchesSearch = !search ||
        item.name.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search);

      const matchesCategory = !category || item.category === category;
      const matchesLocation = !location || item.location === location;
      const matchesStatus = !status || item.status === status;

      return matchesSearch && matchesCategory &&
             matchesLocation && matchesStatus;
    });
  });

  // Estadísticas también con computed
  stats = computed(() => {
    const items = this.filteredItems();
    return {
      total: items.length,
      inStock: items.filter(i => i.status === 'in-stock').length,
      lowStock: items.filter(i => i.status === 'low-stock').length,
      outOfStock: items.filter(i => i.status === 'out-of-stock').length
    };
  });

  // Métodos para actualizar filtros
  onSearchChange(term: string) {
    this.searchTerm.set(term);
  }

  onCategoryChange(category: string) {
    this.selectedCategory.set(category);
  }

  clearFilters() {
    this.searchTerm.set('');
    this.selectedCategory.set('');
    this.selectedLocation.set('');
    this.selectedStatus.set('');
  }
}
```

**Beneficios**:
- ✅ Cálculo solo cuando cambian datos (no cada 100ms)
- ✅ Mejor rendimiento (hasta 90% menos CPU)
- ✅ Código más limpio y mantenible
- ✅ Mejor experiencia de usuario

**Esfuerzo Estimado**: 2-3 horas

---

## PRIORIDAD MEDIA (IMPORTANTES)

### 5. Conectar Dashboard con Datos Reales

**Problema Actual**:
- Dashboard usa datos mock separados
- No refleja el inventario real
- Estadísticas hardcodeadas

**Solución**:

```typescript
export class DashboardComponent {
  private inventoryService = inject(InventoryService);
  private userService = inject(UserService);

  // Datos reales del servicio
  inventoryItems = this.inventoryService.items;
  users = this.userService.users;

  // Estadísticas calculadas
  stats = computed(() => {
    const items = this.inventoryItems();
    const totalValue = items.reduce((sum, item) =>
      sum + (item.price * item.quantity), 0
    );

    return {
      totalUsers: this.users().length,
      totalItems: items.length,
      totalValue: totalValue,
      trends: {
        users: this.calculateTrend('users'),
        items: this.calculateTrend('items'),
        value: this.calculateTrend('value')
      }
    };
  });

  // Items recientes (últimos 6 modificados)
  recentItems = computed(() => {
    return [...this.inventoryItems()]
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
      .slice(0, 6);
  });
}
```

**Esfuerzo Estimado**: 4-6 horas

---

### 6. Implementar Vista Detallada de Item

**Ubicación**: `src/app/components/inventory/inventory-item/`

**Funcionalidades Sugeridas**:
- Vista completa de toda la información del item
- Historial de cambios de cantidad
- Gráfico de evolución de stock
- Edición rápida de cantidad
- Galería de imágenes
- Información del proveedor
- Botones de acción (Editar, Eliminar, Duplicar)

**Template Ejemplo**:
```html
<div class="max-w-6xl mx-auto p-6">
  <mat-card>
    <mat-card-header>
      <div class="flex justify-between items-center w-full">
        <div>
          <mat-card-title>{{ item().name }}</mat-card-title>
          <mat-card-subtitle>SKU: {{ item().sku }}</mat-card-subtitle>
        </div>
        <div class="flex gap-2">
          <button mat-button (click)="onEdit()">
            <mat-icon>edit</mat-icon> Editar
          </button>
          <button mat-button color="warn" (click)="onDelete()">
            <mat-icon>delete</mat-icon> Eliminar
          </button>
        </div>
      </div>
    </mat-card-header>

    <mat-card-content>
      <!-- Grid de información -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <!-- Imagen -->
        <div class="col-span-1">
          <img [src]="item().imageUrl" class="w-full rounded-lg">
        </div>

        <!-- Detalles -->
        <div class="col-span-2">
          <h3>Información General</h3>
          <dl class="grid grid-cols-2 gap-4">
            <dt>Categoría:</dt>
            <dd>{{ item().category }}</dd>

            <dt>Ubicación:</dt>
            <dd>{{ item().location }}</dd>

            <dt>Cantidad Actual:</dt>
            <dd>{{ item().quantity }}</dd>

            <dt>Estado:</dt>
            <dd>
              <mat-chip [class]="getStatusClass()">
                {{ item().status }}
              </mat-chip>
            </dd>
          </dl>

          <!-- Ajuste rápido de cantidad -->
          <div class="mt-6">
            <h3>Ajuste Rápido</h3>
            <div class="flex gap-2 items-center">
              <button mat-icon-button (click)="adjustQuantity(-10)">
                <mat-icon>remove</mat-icon>
              </button>
              <span class="text-2xl">{{ item().quantity }}</span>
              <button mat-icon-button (click)="adjustQuantity(10)">
                <mat-icon>add</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Historial -->
      <div class="mt-6">
        <h3>Historial de Movimientos</h3>
        <mat-table [dataSource]="movements()">
          <!-- Columnas -->
        </mat-table>
      </div>

      <!-- Gráfico de evolución -->
      <div class="mt-6">
        <h3>Evolución de Stock</h3>
        <!-- Chart.js o ngx-charts -->
      </div>
    </mat-card-content>
  </mat-card>
</div>
```

**Esfuerzo Estimado**: 12-15 horas

---

### 7. Implementar Gestión de Categorías

**Ubicación**: `src/app/components/categories/`

**Funcionalidades**:
- Lista de categorías con contador de items
- Crear nueva categoría
- Editar categoría existente
- Eliminar categoría (con validación si tiene items)
- Búsqueda y filtrado
- Ordenamiento
- Asignación de colores/iconos a categorías

**Estructura de Datos Mejorada**:
```typescript
interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;        // Material icon name
  color: string;       // Hex color
  itemCount: number;   // Computed
  createdAt: Date;
  updatedAt: Date;
}
```

**Esfuerzo Estimado**: 10-12 horas

---

### 8. Implementar Gestión de Usuarios (Admin)

**Ubicación**: `src/app/components/users/`

**Funcionalidades**:
- Lista de usuarios con roles
- Crear usuario (solo admin)
- Editar usuario
- Desactivar/Activar usuario
- Cambiar roles
- Ver actividad del usuario
- Filtros por rol y estado

**Roles Sugeridos**:
- `admin`: Acceso completo
- `manager`: Gestión de inventario completa
- `employee`: Solo lectura y edición básica
- `viewer`: Solo lectura

**Esfuerzo Estimado**: 15-20 horas

---

### 9. Agregar Sistema de Notificaciones

**Características**:
- Notificaciones en tiempo real
- Alertas de stock bajo
- Notificaciones de cambios importantes
- Centro de notificaciones en navigation
- Marcado como leído/no leído
- Filtros por tipo

**Implementación Sugerida**:
```typescript
export class NotificationService {
  private notifications = signal<Notification[]>([]);

  unreadCount = computed(() =>
    this.notifications().filter(n => !n.read).length
  );

  addNotification(notification: Notification) {
    this.notifications.update(n => [notification, ...n]);
  }

  markAsRead(id: string) {
    this.notifications.update(notifications =>
      notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      )
    );
  }

  checkLowStock() {
    const lowStockItems = this.inventoryService.items()
      .filter(item => item.quantity <= item.minStockLevel);

    lowStockItems.forEach(item => {
      this.addNotification({
        id: generateId(),
        type: 'warning',
        title: 'Stock Bajo',
        message: `${item.name} tiene solo ${item.quantity} unidades`,
        read: false,
        createdAt: new Date()
      });
    });
  }
}
```

**Esfuerzo Estimado**: 8-10 horas

---

### 10. Implementar Configuración de Perfil

**Ubicación**: `src/app/components/profile/`

**Funcionalidades**:
- Editar información personal
- Cambiar contraseña
- Upload de foto de perfil
- Preferencias de notificaciones
- Configuración de tema (dark/light)
- Idioma (preparar para i18n)

**Esfuerzo Estimado**: 8-10 horas

---

## PRIORIDAD BAJA (MEJORAS)

### 11. Agregar Testing Completo

**Estado Actual**: Archivos de test vacíos

**Cobertura Objetivo**: >80%

**Tipos de Tests**:

#### Unit Tests
```typescript
// inventory.service.spec.ts
describe('InventoryService', () => {
  it('should add item', () => {
    const service = new InventoryService();
    const item = createMockItem();
    service.addItem(item);
    expect(service.items().length).toBe(1);
  });

  it('should filter by category', () => {
    // ...
  });
});
```

#### Component Tests
```typescript
// inventory-list.component.spec.ts
describe('InventoryListComponent', () => {
  it('should display items', () => {
    // ...
  });

  it('should filter items on search', () => {
    // ...
  });
});
```

#### E2E Tests
```typescript
// inventory.e2e-spec.ts
describe('Inventory Flow', () => {
  it('should create, edit and delete item', () => {
    // ...
  });
});
```

**Esfuerzo Estimado**: 40-50 horas

---

### 12. Optimizar Rendimiento

#### Lazy Loading de Rutas
```typescript
export const routes: Routes = [
  {
    path: 'inventory',
    loadComponent: () => import('./components/inventory/inventory-list')
      .then(m => m.InventoryListComponent)
  },
  {
    path: 'users',
    loadComponent: () => import('./components/users/users')
      .then(m => m.UsersComponent),
    canActivate: [authGuard, roleGuard(['admin'])]
  }
];
```

#### Virtual Scrolling para Listas Grandes
```typescript
import { ScrollingModule } from '@angular/cdk/scrolling';

// Template
<cdk-virtual-scroll-viewport itemSize="50" class="h-96">
  <div *cdkVirtualFor="let item of items()" class="item">
    {{ item.name }}
  </div>
</cdk-virtual-scroll-viewport>
```

#### Optimización de Imágenes
- Implementar lazy loading de imágenes
- Usar CDN para assets
- Comprimir imágenes automáticamente
- Servir en formato WebP

**Esfuerzo Estimado**: 15-20 horas

---

### 13. Mejorar Accesibilidad (a11y)

**Problemas Actuales**:
- Falta de ARIA labels
- Navegación por teclado incompleta
- Contraste de colores no verificado
- Sin soporte para screen readers

**Soluciones**:
```html
<!-- Antes -->
<button (click)="delete()">
  <mat-icon>delete</mat-icon>
</button>

<!-- Después -->
<button
  (click)="delete()"
  aria-label="Eliminar item"
  [attr.aria-describedby]="'delete-' + item.id">
  <mat-icon aria-hidden="true">delete</mat-icon>
</button>
```

**Herramientas**:
- `@angular/cdk/a11y`
- Lighthouse audits
- axe DevTools

**Esfuerzo Estimado**: 12-15 horas

---

### 14. Implementar Sistema de Reportes

**Funcionalidades**:
- Reporte de inventario actual
- Reporte de movimientos por período
- Reporte de items de bajo stock
- Reporte de valor total por categoría
- Exportar a PDF y Excel
- Gráficos y visualizaciones

**Librerías Sugeridas**:
- `jspdf` para PDFs
- `xlsx` para Excel
- `chart.js` o `ngx-charts` para gráficos

**Esfuerzo Estimado**: 20-25 horas

---

### 15. Agregar Operaciones en Lote (Bulk Operations)

**Funcionalidades**:
- Selección múltiple de items
- Eliminar múltiples items
- Cambiar categoría en lote
- Cambiar ubicación en lote
- Ajustar precios en lote
- Exportar selección

**Implementación**:
```typescript
export class InventoryListComponent {
  selectedItems = signal<Set<string>>(new Set());

  toggleSelection(itemId: string) {
    this.selectedItems.update(selected => {
      const newSet = new Set(selected);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }

  deleteSelected() {
    const ids = Array.from(this.selectedItems());
    this.inventoryService.deleteMultiple(ids);
    this.selectedItems.set(new Set());
  }
}
```

**Esfuerzo Estimado**: 10-12 horas

---

### 16. Implementar Búsqueda Avanzada

**Funcionalidades**:
- Búsqueda por múltiples campos
- Operadores booleanos (AND, OR, NOT)
- Búsqueda por rangos (cantidad, precio, fecha)
- Guardar búsquedas favoritas
- Autocompletado inteligente

**Esfuerzo Estimado**: 15-18 horas

---

### 17. Agregar Internacionalización (i18n)

**Idiomas Sugeridos**:
- Español (ES)
- Inglés (EN)
- Portugués (PT) - opcional

**Implementación con @angular/localize**:
```typescript
// app.config.ts
import { provideI18n } from '@angular/localize';

export const appConfig: ApplicationConfig = {
  providers: [
    provideI18n({
      locales: ['en', 'es', 'pt'],
      defaultLocale: 'es'
    })
  ]
};
```

**Esfuerzo Estimado**: 20-25 horas

---

### 18. Implementar PWA (Progressive Web App)

**Características**:
- Instalable en dispositivos
- Funciona offline
- Notificaciones push
- Sincronización en background

**Comandos**:
```bash
ng add @angular/pwa
```

**Service Worker para Caché**:
```json
// ngsw-config.json
{
  "dataGroups": [
    {
      "name": "api-cache",
      "urls": ["/api/**"],
      "cacheConfig": {
        "strategy": "freshness",
        "maxAge": "1h",
        "timeout": "10s"
      }
    }
  ]
}
```

**Esfuerzo Estimado**: 12-15 horas

---

### 19. Mejorar Seguridad

**Implementaciones Necesarias**:

1. **Sanitización de Inputs**
```typescript
import { DomSanitizer } from '@angular/platform-browser';

sanitizeInput(input: string): string {
  return this.sanitizer.sanitize(SecurityContext.HTML, input) || '';
}
```

2. **Content Security Policy (CSP)**
```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'unsafe-inline';">
```

3. **Rate Limiting** en Backend
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de requests
});

app.use('/api/', limiter);
```

4. **Validación de Datos**
```typescript
// class-validator en DTOs
export class CreateInventoryDto {
  @IsNotEmpty()
  @Length(3, 255)
  name: string;

  @IsNumber()
  @Min(0)
  quantity: number;
}
```

5. **CORS Configuración**
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

**Esfuerzo Estimado**: 15-18 horas

---

### 20. Configurar CI/CD

**Pipeline Sugerido** (GitHub Actions):

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - uses: vercel/deploy@v1
        with:
          token: ${{ secrets.VERCEL_TOKEN }}
```

**Esfuerzo Estimado**: 8-10 horas

---

## RESUMEN DE ESFUERZO TOTAL

### Prioridad Alta (Críticas)
| Tarea | Horas |
|-------|-------|
| 1. Backend API y Base de Datos | ✅ COMPLETADO (v2.0) |
| 2. Sistema de Autenticación | 30-40 |
| 3. Formulario de Inventario (con backend v2.0) | 20-25 |
| 4. Setup i18n (HACER AHORA) | 2-3 |
| 5. Optimizar Filtrado | 2-3 |
| **SUBTOTAL** | **54-71** |

### Prioridad Media (Importantes)
| Tarea | Horas |
|-------|-------|
| 6. Conectar Dashboard | 4-6 |
| 7. Vista Detallada de Item | 12-15 |
| 8. Gestión de Categorías | 10-12 |
| 9. Gestión de Usuarios | 15-20 |
| 10. Sistema de Notificaciones | 8-10 |
| 11. Configuración de Perfil | 8-10 |
| **SUBTOTAL** | **57-73** |

### Prioridad Baja (Mejoras)
| Tarea | Horas |
|-------|-------|
| 12. Testing Completo | 40-50 |
| 13. Optimizar Rendimiento | 15-20 |
| 14. Mejorar Accesibilidad | 12-15 |
| 15. Sistema de Reportes | 20-25 |
| 16. Operaciones en Lote | 10-12 |
| 17. Búsqueda Avanzada | 15-18 |
| 18. PWA | 12-15 |
| 19. Mejorar Seguridad | 15-18 |
| 20. CI/CD | 8-10 |
| **SUBTOTAL** | **147-183** |

### TOTAL GENERAL
**258-327 horas** (aproximadamente 1.5-2 meses de desarrollo full-time)

### ✅ PROGRESO ACTUAL
- Backend API v2.0: **COMPLETADO** (warehouses, suppliers, UNIQUE/BULK, assignments)
- i18n Setup: **PENDIENTE - HACER AHORA** (2-3 horas)
- Formulario Inventario: **PENDIENTE** (20-25 horas con integración backend)
- Estado General: **~40% COMPLETADO**

---

## ROADMAP SUGERIDO

### Fase 1: Foundation (Semanas 1-4)
- ✅ Implementar Backend API
- ✅ Base de datos PostgreSQL
- ✅ Sistema de Autenticación
- ✅ Optimizar filtrado

### Fase 2: Core Features (Semanas 5-8)
- ✅ Formulario de Inventario
- ✅ Vista Detallada
- ✅ Gestión de Categorías
- ✅ Conectar Dashboard

### Fase 3: Admin & Management (Semanas 9-10)
- ✅ Gestión de Usuarios
- ✅ Sistema de Notificaciones
- ✅ Configuración de Perfil

### Fase 4: Quality & Performance (Semanas 11-12)
- ✅ Testing Completo
- ✅ Optimizar Rendimiento
- ✅ Mejorar Seguridad
- ✅ CI/CD

### Fase 5: Polish & Launch (Semanas 13-14)
- ✅ Accesibilidad
- ✅ PWA
- ✅ Reportes
- ✅ Documentación

---

## TECNOLOGÍAS ADICIONALES RECOMENDADAS

### Backend
- **NestJS**: Framework backend
- **TypeORM**: ORM para base de datos
- **PostgreSQL**: Base de datos relacional
- **Redis**: Caché y sesiones
- **JWT**: Autenticación
- **bcrypt**: Hash de contraseñas

### Frontend (Adicionales)
- **ngx-charts**: Visualización de datos
- **date-fns**: Manejo de fechas
- **file-saver**: Descarga de archivos
- **ngx-mask**: Máscaras de input

### DevOps
- **Docker**: Containerización
- **GitHub Actions**: CI/CD
- **Vercel/Railway**: Hosting
- **AWS S3**: Almacenamiento de imágenes

### Monitoreo
- **Sentry**: Error tracking
- **Google Analytics**: Analytics
- **LogRocket**: Session replay

---

## RESUMEN VISUAL DE IMPACTOS

### Optimizaciones de Código (PARTE 1)

```
IMPACTO EN RENDIMIENTO:
┌──────────────────────────────────────────────────────────┐
│ Problema #1: Polling en Filtros                         │
│ Impacto: ████████████████████ CRÍTICO (90% CPU)         │
│ Prioridad: CRÍTICA | Esfuerzo: 2-3h                      │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Problema #2: Llamadas Redundantes                       │
│ Impacto: ██████████████ ALTO (4x iteraciones)           │
│ Prioridad: ALTA | Esfuerzo: 1h                           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Problema #5: TrackBy No Usado                           │
│ Impacto: ██████████████ ALTO (re-render completo)       │
│ Prioridad: ALTA | Esfuerzo: 15min ⚡                     │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Problema #10: Bundle No Optimizado                      │
│ Impacto: ██████████████ ALTO (tiempo de carga)          │
│ Prioridad: MEDIA-ALTA | Esfuerzo: 4-6h                   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Problema #12: Change Detection                          │
│ Impacto: ██████████ MEDIO (50-70% verificaciones)       │
│ Prioridad: MEDIA-ALTA | Esfuerzo: 1h                     │
└──────────────────────────────────────────────────────────┘

Mejora Total Esperada: 40-60% 🚀
Tiempo Total: 22-35 horas
```

### Features Faltantes (PARTE 2)

```
COMPLETITUD DE LA APLICACIÓN:
┌──────────────────────────────────────────────────────────┐
│ Backend & Base de Datos                                 │
│ Estado: ░░░░░░░░░░░░░░░░░░░░ 0%                         │
│ Importancia: CRÍTICA | Esfuerzo: 40-60h                  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Autenticación & Seguridad                               │
│ Estado: ░░░░░░░░░░░░░░░░░░░░ 0%                         │
│ Importancia: CRÍTICA | Esfuerzo: 30-40h                  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Formularios & CRUD Completo                             │
│ Estado: ████████████████░░░░ 80%                        │
│ Importancia: CRÍTICA | Esfuerzo: 15-20h (CASI COMPLETO) │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Testing & Quality                                       │
│ Estado: ░░░░░░░░░░░░░░░░░░░░ 0%                         │
│ Importancia: ALTA | Esfuerzo: 40-50h                     │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Features Adicionales (Reportes, PWA, etc)               │
│ Estado: ░░░░░░░░░░░░░░░░░░░░ 0%                         │
│ Importancia: MEDIA-BAJA | Esfuerzo: 120-150h             │
└──────────────────────────────────────────────────────────┘

Estado General del Proyecto: █████████░░░░░░░░░░░ 45%
```

---

## RECOMENDACIÓN DE INICIO RÁPIDO

### Top 5 Optimizaciones de MAYOR Impacto con MENOR Esfuerzo

| # | Optimización | Impacto | Esfuerzo | ROI |
|---|-------------|---------|----------|-----|
| 🥇 | **TrackBy en ngFor** | ALTO | 15min | ⭐⭐⭐⭐⭐ |
| 🥈 | **Eliminar Polling** | CRÍTICO | 2-3h | ⭐⭐⭐⭐⭐ |
| 🥉 | **Unificar Stats** | ALTO | 1h | ⭐⭐⭐⭐⭐ |
| 4️⃣ | **Change Detection OnPush** | MEDIO | 1h | ⭐⭐⭐⭐ |
| 5️⃣ | **Debouncing en Búsqueda** | MEDIO | 1-2h | ⭐⭐⭐⭐ |

**Total**: 5-7 horas para **50%+ de mejora en rendimiento** 🎯

### Plan de Acción Sugerido (Primera Semana)

**Día 1 (2 horas)**: Quick Wins de Rendimiento
- ✅ Agregar trackBy (15min)
- ✅ OnPush en componentes (1h)
- ✅ Eliminar console.logs (45min)

**Día 2 (3 horas)**: Fix Crítico
- ✅ Eliminar polling, usar computed (2-3h)

**Día 3 (2 horas)**: Optimizaciones Medias
- ✅ Unificar cálculo de stats (1h)
- ✅ Debouncing en búsqueda (1h)

**Resultado**: App **40-50% más rápida** en solo **3 días** ⚡

---

## ACTUALIZACIONES RECIENTES (Enero 2026)

### Completado

| Feature | Estado | Descripción |
|---------|--------|-------------|
| ✅ CRUD Completo | **DONE** | Crear, editar, eliminar items funcionando |
| ✅ Formulario de Inventario | **DONE** | Formulario con validaciones dinámicas (BULK vs UNIQUE) |
| ✅ Sistema de Traducciones | **DONE** | ngx-translate con loader estático (evita problemas SSR) |
| ✅ Traducciones NAV | **DONE** | Side menu traducido (EN/ES) |
| ✅ Traducciones Dashboard | **DONE** | Títulos, estadísticas, filtros, tabla traducidos |
| ✅ Inputs Tailwind | **DONE** | Reemplazo de mat-form-field por inputs nativos con Tailwind |
| ✅ SKU/Barcode Opcionales | **DONE** | Para items BULK, SKU y código de barras son opcionales |

---

## NUEVAS FEATURES PENDIENTES

### Feature #1: Manejo de Alarmas de Stock para Items UNIQUE

**Prioridad**: ALTA
**Esfuerzo Estimado**: 8-12 horas

**Contexto**:
Los items de tipo UNIQUE (laptops, servidores, equipos individuales) siempre tienen cantidad = 1. El sistema actual de alarmas de stock (LOW_STOCK cuando quantity <= minQuantity) no tiene sentido para estos items ya que:
- quantity siempre es 1
- minQuantity siempre es 1
- El item está "en stock" o "no está" (asignado/no asignado)

**Propuesta de Solución**:

#### 1. Nuevo Estado para Items UNIQUE
```typescript
// Agregar nuevos estados específicos para UNIQUE
enum UniqueItemStatus {
  AVAILABLE = 'AVAILABLE',      // Disponible en inventario
  ASSIGNED = 'ASSIGNED',        // Asignado a un usuario
  IN_REPAIR = 'IN_REPAIR',      // En reparación
  RETIRED = 'RETIRED',          // Dado de baja
  LOST = 'LOST'                 // Perdido/Extraviado
}
```

#### 2. Alarmas Basadas en Asignación
```typescript
// En lugar de alarmas por cantidad, alarmas por asignación
interface UniqueItemAlert {
  type: 'UNASSIGNED_TOO_LONG' | 'WARRANTY_EXPIRING' | 'MAINTENANCE_DUE';
  itemId: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  createdAt: Date;
}
```

#### 3. Dashboard de Items UNIQUE
- **Widgets específicos**:
  - Items sin asignar por más de X días
  - Items con garantía próxima a vencer
  - Items que necesitan mantenimiento
  - Historial de asignaciones

#### 4. Campos Adicionales para UNIQUE
```typescript
interface UniqueItemExtension {
  purchaseDate?: Date;          // Fecha de compra
  warrantyExpiration?: Date;    // Vencimiento de garantía
  lastMaintenanceDate?: Date;   // Último mantenimiento
  nextMaintenanceDate?: Date;   // Próximo mantenimiento
  assignmentHistory: AssignmentRecord[];
}

interface AssignmentRecord {
  userId: string;
  assignedAt: Date;
  returnedAt?: Date;
  notes?: string;
}
```

#### 5. Notificaciones Automáticas
- Email/notificación cuando garantía está por vencer (30, 15, 7 días)
- Alerta cuando un item lleva más de X días sin asignar
- Recordatorio de mantenimiento programado

**Implementación Sugerida**:

| Fase | Tarea | Esfuerzo |
|------|-------|----------|
| 1 | Agregar campos al modelo (backend + frontend) | 2h |
| 2 | Crear servicio de alertas para UNIQUE items | 2h |
| 3 | Actualizar formulario con campos de garantía/mantenimiento | 2h |
| 4 | Crear widgets de dashboard para UNIQUE items | 3h |
| 5 | Implementar sistema de notificaciones | 3h |

---

### Feature #2: Reportes y Estadísticas Avanzadas

**Prioridad**: MEDIA
**Esfuerzo Estimado**: 15-20 horas

- Gráficos de movimiento de inventario
- Reportes de items por categoría/ubicación
- Historial de cambios de stock
- Exportación a PDF/Excel

---

### Feature #3: Gestión de Proveedores Completa

**Prioridad**: MEDIA
**Esfuerzo Estimado**: 10-15 horas

- CRUD de proveedores
- Historial de compras por proveedor
- Evaluación de proveedores

---

### Feature #4: Sistema de Usuarios y Permisos

**Prioridad**: ALTA
**Esfuerzo Estimado**: 20-30 horas

- Autenticación JWT
- Roles (Admin, Manager, User, External)
- Permisos granulares por módulo
- Auditoría de acciones

---

**Documento generado**: 22 de Noviembre, 2025
**Última actualización**: 8 de Enero, 2026
**Versión**: 2.1.0 (Actualizado con features completadas y nuevas pendientes)
**Estado del Proyecto**: 45% Completado
**Próximo Paso Recomendado**: Implementar quick wins de rendimiento (Día 1-3)
