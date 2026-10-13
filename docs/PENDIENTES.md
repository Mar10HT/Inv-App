# Pendientes de Obsid

Lista de problemas encontrados al probar la app y escribir el Manual de Usuario. Todo se verificó en la app corriendo (frontend `Inv-App` y backend `Inv-App-API`, rama `feat/purchase-invoices`).

Última actualización: 2026-10-13.

## Alertas: resuelto el 2026-10-13

Pusheado en `feat/purchase-invoices`: backend `607d8be`, frontend `30fff85`.

- [x] **El panel se abría fuera de la pantalla.** Ahora queda fijo sobre el pie del menú lateral, dentro de la pantalla en computadora y en celular.
- [x] **Las alertas solo se generaban cada 6 horas.** Causa de fondo: ventas, compras, salidas, transferencias, solicitudes, conteos y transacciones cambiaban la cantidad sin recalcular el estado del ítem, así que tampoco se actualizaban el Dashboard ni Reportes. Ahora cada operación recalcula estados y alertas al terminar, y también al arrancar el servidor.
- [x] **"Ver todas" llevaba al Historial de Cambios.** Ahora abre Reportes en la pestaña Estado.
- [x] **Ítems Únicos marcados como stock bajo (1/1).** Eran 13 en la base de prueba; el Dashboard bajó de 39 a 26 ítems con stock bajo.
- [x] Las alertas de ítems eliminados ahora se resuelven solas.
- [ ] **Actualizar el Manual de Usuario cuando estos arreglos lleguen a producción**:
    - "Alertas de stock" y la pregunta frecuente de la campana: ya no esperan 6 horas, se generan al mover stock.
    - Transacciones manuales: el recuadro "Importante" y la pregunta "Registré una transacción por error" dicen que borrar no devuelve el stock; ahora sí lo devuelve.
    - Compras: quitar el recuadro "Importante" que pide revisar la Moneda (ya arranca en la de la Configuración Fiscal).

## Formato de reportes y documentos exportables

Falta cambiar el formato de los documentos que genera la app. Hasta que eso esté hecho, el manual no lleva capturas de ellos (los menciona sin imagen).

- [ ] **Comprobantes PDF** de Ventas, Compras, Transferencias, Préstamos y Salidas: definir el formato final. Lo que se vio al probarlos:
    - El **Estado** sale en inglés (`ACTIVE`, `APPROVED`).
    - El comprobante de venta **no trae los datos fiscales de la empresa** (RTN, dirección, teléfono de la Configuración Fiscal).
    - El comprobante de transferencia muestra el **ID interno** (`cmv5u…`) en vez de un número legible.
- [ ] **Exportaciones** (Exportar en Inventario, Transferencias y Préstamos; CSV del Historial) y **Descargas de Reportes** (Excel por módulo, CSV/PDF por pestaña): revisar el formato junto con los comprobantes.
- [ ] Cuando el formato esté listo, agregar al manual las capturas de los comprobantes y reportes.

## Bugs

- [x] **El sidebar expandido cambiaba la app a inglés.** Resuelto en `b10282e` (Inv-App): el selector ya no llama `translate.use()` al iniciar, solo refleja el idioma activo.
- [x] **Borrar una Transacción manual no devolvía el stock.** Resuelto en `89da9fe` (API) y `5569cd1` (texto de confirmación): el borrado revierte el movimiento, rechaza borrar una Entrada cuyo stock ya se usó, y una Salida mayor que el stock se rechaza en vez de recortarse a 0.
- [x] **Flyout del menú Comercial sin fondo.** Resuelto en `098a279` (Inv-App): el tema de Material no genera `--mat-sys-surface-container`; el panel del menú ahora usa los colores de la app, en modo oscuro y claro.
- [x] **Moneda por defecto en Compras y Ventas.** Resuelto en `9b27512` (Inv-App): las compras y ventas nuevas arrancan en la moneda de la Configuración Fiscal.
- [x] **Crear un rango CAI por API con fecha sola da 500.** Resuelto en `8324e9e` (API): `expiresAt` se normaliza a fecha y hora completas antes de guardar. La fecha de vencimiento de Inventario (`expirationDate`) tenía el mismo bug y quedó resuelta en el mismo commit.
- [x] **`neededByDate` de Solicitudes de Material se mostraba un día antes.** Confirmado y resuelto en `31ba7ac` (Inv-App): el detalle formatea la fecha en UTC, igual que el vencimiento de Préstamos. Verificado en la app con hora de Honduras: una solicitud para el 1 de marzo se ve el 1 de marzo.
- [x] **`seed:fake` fallaba en Préstamos.** Resuelto en `a17120f` (API): cada préstamo de prueba lleva de 1 a 3 ítems de su bodega de origen. Probado en una base aparte, corriendo el seed dos veces seguidas.

- [ ] **Test de fechas que falla en Chromium 141.** `reports-transactions-tab.spec.ts` ("shows one row per transaction...") compara `'15 ene 2026, 06:00 a. m.'` con una cadena que se ve igual: probablemente difieren en un espacio angosto que depende de la versión de ICU del navegador. Falla también sin cambios en el código.

## Inconsistencias y mejoras

- [ ] **Íconos muy chicos en el menú flotante de Comercial** (sidebar colapsado): se ven de unos 8 px. Revisar el tamaño de `lucide-icon` dentro de `mat-menu-item`.
- [ ] **El tema de Material no genera las variables `--mat-sys-*`** (`custom-theme.scss` usa mapas propios en `mat.theme`). Hoy solo afecta al menú, que ya tiene colores propios; otros componentes de Material que dependan de esas variables pueden verse sin fondo.

- [ ] **Mensajes de error del backend en inglés.** Para errores 400 el frontend muestra el texto que manda la API ("Insufficient quantity for item...", "Cannot delete this entry..."). Traducirlos o mapearlos a claves i18n.

- [ ] **Transacciones no está en el menú lateral.** Solo se llega por URL o con Ctrl+K.
- [ ] **Transacciones y Tendencias de Reportes desconectadas.** Ninguna operación (ventas, compras, salidas, transferencias, préstamos, conteos) escribe en Transacciones, así que esas pestañas solo muestran lo cargado a mano.
- [ ] **Roles del sistema duplicados** (versiones en mayúscula y minúscula del mismo rol).
- [ ] **"Salidas" no se puede programar** en Reportes Programados, aunque tiene Excel en Descargas.
- [ ] **Fechas en formato inglés con la app en español.** Varias pantallas (por ejemplo el detalle de Solicitudes de Material) muestran "Mar 1, 2027" en vez de "1 mar 2027": la app no configura `LOCALE_ID` ni registra el locale `es`, y el `DatePipe` usa inglés salvo donde se le pasa el idioma a mano.
- [ ] **Login en inglés** mientras el resto de la app está en español.
- [ ] **Dos campos "Cliente" en Editar cotización** (texto libre y selector), confusos para el usuario.
