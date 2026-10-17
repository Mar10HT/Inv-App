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
    - Ventas, Préstamos, Transferencias y Salidas: ya no hay campo Referencia; cada documento se numera solo (PRE-, TRA-, SAL-, COT-). "Notas" ahora es "Comentarios". Actualizar capturas de formularios y listas.
    - Ventas: un solo campo Cliente con la opción "Cliente ocasional".
    - Transacciones aparece en el menú lateral; Reportes > Transacciones y Tendencias muestran todos los movimientos, con la columna Documento.
    - Reportes Programados: se puede programar Salidas.
    - El login y las fechas salen en español.

## Revisión de los PRs a producción: resuelto el 2026-10-16

Revisiones técnicas del usuario en [Mar10HT/Inv-App#41](https://github.com/Mar10HT/Inv-App/pull/41) y [Mar10HT/Inv-App-API#17](https://github.com/Mar10HT/Inv-App-API/pull/17), más dos revisiones de agentes.

- [x] **Venta de más con pedidos simultáneos.** El stock se descuenta solo si alcanza, en una sola operación, y cada confirmación, cancelación o aprobación bloquea su documento antes de leer el estado. Lo cubre un test de integración contra Postgres que corre en CI.
- [x] **Cancelar con pagos registrados.** Ventas y compras se rechazan mientras tengan pagos activos; la app lo avisa antes de preguntar, con el monto a anular.
- [x] **Límite de crédito en una moneda.** Nuevo campo Moneda del Límite en Clientes (HNL por defecto); solo cuentan las ventas a crédito en esa moneda.
- [x] **Filtro por bodega que saltaba el acceso.** Elegir una bodega en un listado ahora restringe dentro de las bodegas del usuario (ventas, compras, salidas, bajas, PDF de inventario); ver, editar o borrar una transacción también respeta las bodegas.
- [x] **Editar una cotización perdía el cliente y la condición de pago**, y no validaba la bodega nueva. Resuelto; los campos vaciados se borran.
- [x] **Vencimiento del CAI un día antes.** Una fecha sola vence al final de ese día en Honduras. Editar el rango valida el número final contra el inicial y lo ya emitido.
- [x] **Listas cortadas en 100.** Ventas, compras, préstamos, salidas y pagos traen todas las páginas; Cuentas por cobrar/pagar piden solo lo que tiene saldo.
- [x] **Estadísticas de la página cargada.** Vienen del servidor, con impuesto incluido, igual que la columna Monto.
- [x] **Doble envío** en Préstamos y Transferencias; **Configuración Fiscal** daba 403 a quien vende o compra sin acceso a Configuración; el **ISV por defecto** se perdía si la configuración llegaba tarde.
- [x] **Movimientos**: las bajas salían dos veces (la baja y su salida) y las cotizaciones canceladas aparecían como movimiento.
- [x] **Roles duplicados**: la limpieza solo toca los nombres que creaba el seed viejo.
- [x] **Migración de numeración** funciona en base vacía, en la de `main` y en una ya migrada.

### Quedó para después

Los dos PRs se aprobaron el 2026-10-16 con estas condiciones y seguimientos (comentarios del usuario en los PRs). Cada seguimiento va en su propio PR.

**Condiciones del merge**
- [ ] **API**: verificar las migraciones (`railway:migrate`) contra una base de staging o una copia de la de producción antes de desplegar. En local se probó en una base vacía, en una con el schema de `main` y datos, y en una ya migrada.
- [x] **Frontend**: CI en verde y los flujos principales funcionando contra el API actualizado (verificado en local con Playwright).

**Seguimientos**
- [ ] **Conteo físico: lock y concurrencia.** Al completar un conteo, bloquear la fila y volver a validar el estado (igual que ventas, compras y transferencias), con tests de concurrencia contra Postgres.
- [ ] **`GET /reports/movements`: paginación y filtros por fecha.** Hoy no tiene límite de cantidad.
- [ ] **Montos en `Decimal`/`NUMERIC`** en lugar de `Float`: migración de los datos y validación de los cálculos.
- [ ] (sin prioridad) `navigation.css` pasa el presupuesto de 4 kB por 780 bytes (aviso del build, no error).

## Formato de reportes y documentos exportables

Pospuesto por el usuario: hay que definir cómo dejar un formato fijo para instalaciones cerradas en servidores de un cliente y uno personalizable en producción.

Falta cambiar el formato de los documentos que genera la app. Hasta que eso esté hecho, el manual no lleva capturas de ellos (los menciona sin imagen).

- [ ] **Comprobantes PDF** de Ventas, Compras, Transferencias, Préstamos y Salidas: definir el formato final. Lo que se vio al probarlos:
    - El **Estado** sale en inglés (`ACTIVE`, `APPROVED`).
    - El comprobante de venta **no trae los datos fiscales de la empresa** (RTN, dirección, teléfono de la Configuración Fiscal).
    - ~~El comprobante de transferencia muestra el ID interno~~: ahora muestra su número (TRA-0001), igual que préstamos y salidas.
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

- [x] **Test de fechas que fallaba en Chromium 141.** Resuelto en `7f87519` (Inv-App): era el espacio angosto antes de "a. m."; el test ahora normaliza los espacios en ambos lados. La suite completa del frontend pasa (1479).

## Inconsistencias y mejoras: resuelto el 2026-10-13

Decisiones del usuario: borrar los roles duplicados; numeración automática en lugar de Referencia; un solo campo Cliente con "Cliente ocasional"; Reportes lee todos los movimientos. Commits locales en `feat/purchase-invoices` de los dos repos (ver CONTEXTO.md).

- [x] **Roles del sistema duplicados.** `scripts/seed-data.ts` creaba copias en minúscula. Ahora usa las constantes RBAC, y `seed:rbac` / `POST /seed` borran las copias que ya existan (pasando sus usuarios al rol oficial). En producción se limpian la próxima vez que se corra `seed:rbac` (manual: `railway run npm run seed:rbac`, ver CONTEXTO.md).
- [x] **Transacciones no estaba en el menú lateral.** Ahora está debajo de Conteo Físico.
- [x] **Íconos muy chicos en el menú flotante de Comercial.** Lucide copiaba `mr-2` al svg interno; ahora miden 18 px.
- [x] **El tema de Material no generaba las variables `--mat-sys-*`.** Ahora se generan y siguen los colores de la app en modo oscuro y claro (diálogos, paginador y menú comparados antes y después).
- [x] **Login en inglés.** La app arranca en español si el usuario no eligió otro idioma (antes seguía el idioma del navegador).
- [x] **Fechas en formato inglés.** Fechas y números en `es-HN` (o `en-US` si el usuario eligió inglés). El paginador ("Elementos por página", "1 – 10 de 44") también se traduce.
- [x] **"Salidas" no se podía programar.** Agregado a Reportes Programados.
- [x] **Mensajes de error del backend en inglés.** Cada error lleva un código (95 en total) y el frontend lo traduce; los de validación de formularios sin código muestran "Error de validación".
- [x] **Dos campos "Cliente" en ventas y cotizaciones.** Un solo selector; la opción "Cliente ocasional" abre un campo para escribir el nombre.
- [x] **Transacciones y Tendencias de Reportes desconectadas.** Ahora muestran ventas, compras, salidas, transferencias completadas, conteos aplicados y bajas, con la columna Documento. Antes además solo cargaban las primeras 50 transacciones.
- [x] **Referencia escrita a mano en ventas, préstamos, transferencias y salidas.** Reemplazada por numeración automática: Préstamos `PRE-0001`, Transferencias `TRA-0001`, Salidas `SAL-0001`, Cotizaciones `COT-0001` (Ventas y Compras ya tenían `V-`/CAI y `COM-`). Lo que se había escrito como referencia pasa a Comentarios como "Referencia: ...". "Notas" ahora se llama "Comentarios".

### Quedó pendiente de esto

- [ ] **Después de desplegar el API**: correr `railway run npm run seed:rbac` una vez para borrar los roles duplicados de producción.
- [ ] **Al desplegar el API**: `railway:migrate` corre `prisma/migrate-document-numbers.sql` antes del `db push` (numera lo existente, mueve las referencias y crea los índices únicos). Probado sobre una copia de la base local con los mismos pasos.
- [ ] **Excel "Transacciones" (Descargas y Reportes Programados)** sigue saliendo solo con las transacciones manuales; la pestaña ya muestra todo. Unificarlo cuando se defina el formato de reportes.
- [ ] (sin prioridad) **Conteos físicos anteriores a este cambio** no aparecen en Transacciones/Tendencias: no se guardaba si se aplicaron los ajustes.
- [x] **Cambiar de idioma**: resuelto. Las fechas siguen el idioma al instante (pipe `appDate` en lugar de `date`; Inventario y Reportes también). Quedan fuera las exportaciones de Transferencias y Auditoría, que entran en el trabajo de formato.
- [x] **Errores sin código**: resuelto. La validación de formularios llega con el código `VALIDATION_FAILED` y muestra un mensaje genérico traducido. Un error sin código o sin traducción muestra el texto del servidor y deja un aviso en consola. Un test del API falla si se lanza una excepción 400/409/422 sin `apiError(...)`, y otro del frontend falla si es/en no traducen los mismos códigos.
