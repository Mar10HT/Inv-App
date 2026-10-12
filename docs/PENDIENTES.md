# Pendientes de Obsid

Lista de problemas encontrados al probar la app y escribir el Manual de Usuario. Todo se verificó en la app corriendo (frontend `Inv-App` y backend `Inv-App-API`, rama `feat/purchase-invoices`).

Última actualización: 2026-10-12.

## Prioridad: arreglar las alertas

La campana del sidebar tiene varios problemas a la vez:

- [ ] **El panel se abre fuera de la pantalla.** Con el sidebar expandido, el panel de la campana se despliega hacia la izquierda y queda cortado: los nombres de los ítems no se leen completos. Componente: `src/app/components/shared/notification-bell/notification-bell.ts`.
- [ ] **Las alertas solo se generan cada 6 horas.** `checkLowStock()` corre con `@Cron(EVERY_6_HOURS)` en `Inv-App-API/src/alerts/alerts.service.ts` y no se dispara cuando cambia el stock (ventas, salidas, compras, conteos). Después de reiniciar el servidor la campana dice "Sin alertas activas" aunque el Dashboard muestre 39 ítems con stock bajo. Existe `POST /alerts/trigger-check`, pero nadie lo llama desde la app.
- [ ] **"Ver todas" lleva al Historial de Cambios** (`routerLink="/audit"`) en vez de a una lista de alertas.
- [ ] **Ítem único con stock 1/1 marcado como stock bajo.** Una laptop (ítem Único, 1 unidad, mínimo 1) aparece en la campana como "Stock bajo · 1/1". La alerta toma el `status` del ítem, así que hay que revisar cómo se calcula `LOW_STOCK` para ítems únicos.

## Bugs

- [ ] **El sidebar expandido cambia la app a inglés.** `language-selector.ts` lee `localStorage.getItem('language') || 'en'` al iniciarse: un usuario sin idioma guardado que expande el sidebar ve toda la app pasar a inglés.
- [ ] **Borrar una Transacción manual no devuelve el stock.** `create()` ajusta cantidades, pero `remove()` en `transactions.service.ts` solo borra el registro. El inventario queda descuadrado.
- [ ] **Flyout del menú Comercial sin fondo.** Con el sidebar colapsado, el menú flotante de Comercial se abre transparente y el texto queda encima de los íconos.
- [ ] **Moneda por defecto en Compras.** El formulario Nueva compra arranca en USD aunque la Configuración Fiscal tenga HNL. Revisar también Nueva venta.
- [ ] **Crear un rango CAI por API con fecha sola da 500.** El DTO acepta `expiresAt: "2027-06-30"` (`@IsDateString`), pero Prisma lo rechaza. Desde la pantalla de Ajustes funciona porque manda la fecha completa.
- [ ] **`neededByDate` de Solicitudes de Material** probablemente tiene el mismo corrimiento de un día que tenía `dueDate` en Préstamos. No verificado.
- [ ] **`seed:fake` falla en Préstamos.** El script no está actualizado al modelo de varios ítems por préstamo (`Unknown argument inventoryItemId`).

## Inconsistencias y mejoras

- [ ] **Transacciones no está en el menú lateral.** Solo se llega por URL o con Ctrl+K.
- [ ] **Transacciones y Tendencias de Reportes desconectadas.** Ninguna operación (ventas, compras, salidas, transferencias, préstamos, conteos) escribe en Transacciones, así que esas pestañas solo muestran lo cargado a mano.
- [ ] **Roles del sistema duplicados** (versiones en mayúscula y minúscula del mismo rol).
- [ ] **"Salidas" no se puede programar** en Reportes Programados, aunque tiene Excel en Descargas.
- [ ] **Login en inglés** mientras el resto de la app está en español.
- [ ] **Dos campos "Cliente" en Editar cotización** (texto libre y selector), confusos para el usuario.
