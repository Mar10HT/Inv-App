# Frontend - Issues & Improvements

## CRITICAL

### 1. `.subscribe()` sin error handler (Memory Leak Risk) ✅ COMPLETADO
**Archivos:** `categories.ts`, `warehouses.ts`, `users.ts`, `suppliers.ts`, `transfers.ts`

**Fix aplicado:** Se agregaron error handlers con `this.notifications.handleError(err)` en todos los componentes afectados.

---

### 2. Strings hardcodeados en inglés (i18n) ✅ COMPLETADO
**Archivos:** `inventory-list.ts`, `dashboard.ts`, `transactions.ts`, `users.ts`, `suppliers.ts`, `warehouses.ts`, `categories.ts`, `transfers.ts`

**Fix aplicado:** Reemplazados con `translate.instant()` y agregadas keys en `en.json` / `es.json` para DELETE_CONFIRM en cada módulo.

---

## IMPORTANT

### 3. `console.log/error/warn` en código de producción ✅ COMPLETADO
**Archivos:** `app.ts`, `websocket.service.ts`

**Fix aplicado:** Reemplazados con `LoggerService`.

---

### 4. Falta de `aria-label` en botones con solo iconos ❌ PENDIENTE
**Archivos:** Múltiples componentes (dashboard, inventory-list, users, etc.)

Botones que solo tienen un ícono no tienen `aria-label`:
```html
<button (click)="deleteCustomChart(chart)" class="...">
  <lucide-icon name="Trash"></lucide-icon>
</button>
```

**Fix:** Agregar `[attr.aria-label]` a todos los botones con solo iconos.

---

### 5. Missing error handling en dialog `afterClosed()` ✅ COMPLETADO
**Archivos:** `dashboard.ts`, `inventory-list.ts`

**Fix aplicado:** Agregados error handlers a las operaciones dentro de `afterClosed()`.

---

### 6. Performance: Missing `trackBy` en `@for` loops ✅ COMPLETADO
**Archivos:** `loans.ts`, `transfers.ts`, `audit-log.ts`, `dashboard.ts`

**Fix aplicado:** Cambiados `track item` a `track item.id` en los loops afectados.

---

### 7. Missing error handling en `InventoryService` ✅ COMPLETADO
**Archivo:** `services/inventory/inventory.service.ts`

**Fix aplicado:** Agregado `catchError` con logging en `loadWarehouses()` y `loadSuppliers()`.

---

### 8. Permission strings sin constantes ✅ COMPLETADO
**Archivo:** `permissions.service.ts`

**Fix aplicado:** Permisos centralizados en `PermissionsService`.

---

## MINOR

### 9. Colores hardcodeados en dashboard ⚠️ PARCIAL
**Archivo:** `dashboard.ts` (líneas 115-118)

Paleta de colores para charts sigue hardcodeada con hex (`#4d7c6f`, etc.) en vez de CSS variables. El color base es consistente con el design system pero no se adapta al tema.

---

### 10. Strings fallback en español hardcodeados ✅ COMPLETADO
**Archivos:** Múltiples componentes

**Fix aplicado:** Reemplazados `'Sin Bodega'`, `'Sin Proveedor'`, etc. con `translate.instant()`. Keys agregadas en `en.json` / `es.json`.

---

### 11. DateTime con locale hardcodeado ⚠️ PARCIAL
**Archivos:** `inventory-list.ts`, `dashboard.ts`

`inventory-list.ts` sigue usando `new Intl.DateTimeFormat('en-US', ...)` hardcoded. `dashboard.ts` usa `new Intl.NumberFormat('en-US', ...)` hardcoded. Otros archivos usan `toLocaleString()` (browser default).

---

## Resumen

| Severidad | Total | ✅ | ⚠️ | ❌ |
|-----------|-------|---|---|---|
| CRITICAL  | 2     | 2 | 0 | 0 |
| IMPORTANT | 6     | 4 | 0 | 1 |
| MINOR     | 3     | 1 | 2 | 0 |
| **TOTAL** | **11**| **7** | **2** | **1** |
