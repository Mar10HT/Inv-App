# Contexto de trabajo: Obsid

Documento para retomar el trabajo en otra sesión. Se actualiza al terminar cada tarea. La lista de tareas está en [`PENDIENTES.md`](./PENDIENTES.md); este archivo explica el proyecto, lo hecho, las decisiones tomadas y cómo trabajar.

Última actualización: 2026-10-31.

## El proyecto

**Obsid** es el sistema de inventario de Olancho Net (Honduras). Dos repos. `main` ya tiene el menú Comercial, Compras, Pagos y Cuentas por Cobrar/Pagar (PR #41/#17) y los locks de conteos/préstamos (PR #42/#18), todos mergeados.

| Repo | Stack | Ramas activas |
| --- | --- | --- |
| `Mar10HT/Inv-App` | Angular 19 (standalone, signals, zoneless), Tailwind, Karma | `olanchonet` (formato de PDFs/reportes) |
| `Mar10HT/Inv-App-API` | NestJS 11 + Prisma 6 (PostgreSQL), Jest, Bun en producción | `feat/decimal-amounts-api` (listo, sin PR), `olanchonet` (en progreso) |

`feat/purchase-invoices` ya se mergeó a `main` en los dos repos (no existe más como rama activa). Este archivo y `PENDIENTES.md` viven en `docs/` de `main` desde entonces.

## Decisiones del usuario (respetarlas)

- Trabajar los pendientes en orden de prioridad (de más a menos riesgo cuando hay varios en paralelo); lo que necesite una decisión de diseño se pregunta antes de tocar código. Cada pendiente va en su propia rama con el nombre del pendiente (o del cliente, si es algo específico de una instalación, como `olanchonet`), para no mezclar trabajo que no se afecta entre sí.
- Fuera de un loop con autorización explícita, pedir confirmación antes de cada `git push` aunque ya se haya dicho "pushear por cada feature" antes.
- **Formato de reportes y PDFs**: el usuario aprobó una plantilla (ver "Formato de PDFs: olanchonet", abajo) y el trabajo está en curso en la rama `olanchonet`. Sigue sin definir el formato personalizable para otras instalaciones distintas de Olancho Net.
- **La rama `olanchonet` (en los dos repos) siempre tiene que ir a la par con `main`.** Es el build que va a quedar en producción para ese cliente específico, no una rama de feature descartable. Cada vez que algo se mergea a `main` (en cualquiera de los dos repos), hacer merge de `main` hacia `olanchonet` antes de seguir trabajando ahí, no solo al final. No dejar que diverja.
- **Montos en `Decimal`**: resuelto el 2026-10-31 en `feat/decimal-amounts-api` (API). El API sigue devolviendo números en el JSON (no strings); no hizo falta tocar el frontend.
- **Revisión de los PRs a producción (2026-10-16)**: cancelar una venta o compra con pagos activos se bloquea (primero se anulan los pagos); el límite de crédito está en la moneda del cliente (`Client.creditLimitCurrency`) y una venta a crédito en otra moneda se rechaza; producción arranca con una base nueva, así que los datos legados (numerar ventas viejas, compras seriadas, códigos borrados) no importan. El usuario hace el merge de los PRs.
- **Manual de usuario**: solo vista de administrador, trato de **usted**, sin guiones largos (—), recuadros "Importante" solo para avisos que evitan errores del usuario. Los bugs internos van a `PENDIENTES.md`, no al manual.

## Manual de Usuario

- Documento Claude Docs: https://claude.ai/artifact/V18oMooHpYnxuGH9M3ySmT
- IDs: proyecto `e2c4b05f-d198-403d-9732-9f265cdc3af6`, pestaña `62ddeaa8-9aa1`, cuerpo (prose) `8343b3ae-d9e4`.
- Estructura: Introducción, Índice, Parte 1 Primeros pasos, 2 Configuración inicial, 3 Inventario, 4 Operaciones de bodega, 5 Comercial, 6 Reportes, 7 Administración, Preguntas frecuentes, Glosario.
- Imágenes: se suben con la herramienta Artifact (`publish` con `asset: true` sobre la URL del doc), se registra un blob en el doc (`create` object `blob`) y se insertan como `![alt](blob/<id>)`.
- Las capturas nuevas usan datos de prueba (bodegas "Bodega Principal/Norte/Sur/Atlántida"); las 18 primeras salieron de la base local del usuario.

## Formato de PDFs: olanchonet

Plantilla aprobada por el usuario: `C:\Users\mherr\OneDrive\Desktop\Propuestas Plantillas Reportes\5 - Recomendada (completa y formal)\plantilla.html` (8 documentos de ejemplo: Transacciones, Valor de Inventario, Estado, Asignaciones, y recibos de Venta, Salida, Préstamo, Transferencia). Decisiones ya tomadas:

- **Sin motor nuevo**: se sigue con `pdfkit` (API) y `jspdf` (frontend), traduciendo el lenguaje visual de la plantilla a un kit de componentes reutilizables en cada librería. Nada de Puppeteer ni HTML→PDF.
- **Recibo de Compra** (no está en la plantilla): se extrapola del de Venta, cambiando rótulos a Compra/Proveedor.

Hallazgos del agente que investigó antes de planear (no asumir que ya están resueltos, son el punto de partida):
- "Reporte de Asignaciones" ya existe como feature (no es un hueco): `pdf-export.service.ts` `exportAssignmentsReportToPDF`.
- Hay un PDF de Inventario huérfano en el API (`ReportsService.generateInventoryPdf`, `GET /reports/inventory/pdf`) sin ningún caller del frontend, y con un bug propio (`$` hardcodeado ignorando la moneda del ítem). A decidir: borrarlo o migrarlo al kit nuevo.
- El logo de Olancho Net no está en ningún repo (`Inv-App/brand/` es la marca Obsid, no Olancho Net). Hay que traerlo y rasterizarlo (ni PDFKit ni jsPDF leen SVG).
- `FiscalConfig` ya tiene RTN/dirección/teléfono/email: no hace falta migración de schema para el header.
- `GET /fiscal-config` hoy da 403 a un usuario con solo `reports:export`/`reports:view`: hay que agregar esos permisos al decorador para que los reportes puedan mostrar los datos fiscales.
- El Reporte de Transacciones del frontend hoy dibuja una tarjeta por transacción con notas; la plantilla lo muestra como tabla plana de 5 columnas. Pasar a tabla pierde las notas por transacción/ítem: decisión explícita del usuario pendiente, no es consecuencia obvia de "seguir la plantilla".
- Excel/XLSX queda fuera de esta rama (ya están centralizados, la plantilla no define nada de grilla, y chocaría con el pendiente 1 de Excel "Transacciones").

## Hecho en esta sesión

| Fecha | Repo | Commit | Qué |
| --- | --- | --- | --- |
| 2026-10-31 | Inv-App-API | `671d5fd` `d4fbc2e` `d1e041d` `b09e10b` `10a26e5` `bf12a79` `1ec3196` `0202634` (rama `feat/decimal-amounts-api`) | Montos `Float` → `Decimal` en 19 campos: helper `money.ts`, interceptor global, los dos schemas + script de migración SQL, el fix del bug de saldo `NaN`, el fix del audit log, el PDF usando `lineTotal`/`totalAmount` guardados, docs de Prisma corregidos |
| 2026-10-31 | Inv-App / Inv-App-API | rama `olanchonet` (creada, sin commits de código todavía) | Plantilla de PDFs/reportes de Olancho Net aprobada; investigación y plan completo (ver "Formato de PDFs: olanchonet", arriba) |
| 2026-10-31 | Inv-App / Inv-App-API | (merge en GitHub) | [Mar10HT/Inv-App-API#18](https://github.com/Mar10HT/Inv-App-API/pull/18) y [Mar10HT/Inv-App#42](https://github.com/Mar10HT/Inv-App/pull/42) mergeados a `main` |
| 2026-10-18 | Inv-App-API / Inv-App | rama `fix/stock-take-concurrency` | Conteo físico con lock, revalidación y ajuste por diferencia; préstamos con lock; movimientos paginados y por período |
| 2026-10-16 | Inv-App-API / Inv-App | `aa80d8e` `24bdef1` / `add19cc` | Revisión de los PRs: listados limitados a las bodegas del usuario, edición de cotizaciones, crédito por moneda, CAI (fin del día en Honduras, rangos), estadísticas del servidor con impuesto, listas completas (el API corta en 100), cancelar con pagos bloqueado, guardas de doble envío |
| 2026-10-16 | Inv-App-API | `657c51a` | Concurrencia: no se vende de más ni se procesa dos veces un documento (decremento condicional y lock de la fila); test de integración con Postgres en CI |
| 2026-10-16 | Inv-App-API | `31a0588` | `migrate-document-numbers.sql` funciona en base vacía, en la de `main` y en una ya migrada |
| 2026-10-13 | Inv-App-API / Inv-App | `4376274` / `d819a2f` | Errores: `VALIDATION_FAILED` por código, texto del servidor si falta traducción, tests de cobertura y paridad |
| 2026-10-13 | Inv-App | `830c920` | Fechas siguen el idioma al cambiarlo sin recargar (pipe `appDate`) |
| 2026-10-13 | Inv-App | `f0ccafe` | Rama de docs mergeada en `feat/purchase-invoices`: los docs se editan ahí desde ahora |
| 2026-10-13 | Inv-App-API / Inv-App | `dc64b17` / `064371f` | Reportes: Transacciones y Tendencias leen todos los movimientos (`GET /reports/movements`); `Sale.confirmedAt` y `StockTake.adjustmentsApplied` nuevos |
| 2026-10-13 | Inv-App | `4edc50d` | Un solo campo Cliente con opción "Cliente ocasional" |
| 2026-10-13 | Inv-App-API / Inv-App | `ed74f6e` / `35455d1` | Numeración automática PRE-/TRA-/SAL-/COT- en lugar de Referencia; script `migrate-document-numbers.sql` |
| 2026-10-13 | Inv-App-API / Inv-App | `4c25f74` `5b73ce8` / `d47bed4` `a4e8997` | Errores del API con código y traducidos (`API_ERRORS`) |
| 2026-10-13 | Inv-App-API / Inv-App | `6ed5310` / `96fb27f` | Salidas en Reportes Programados |
| 2026-10-13 | Inv-App | `66e5a98` | Tema de Material genera `--mat-sys-*` con los colores de la app |
| 2026-10-13 | Inv-App | `3ff3d50` | App arranca en español; fechas en es-HN; paginador traducido |
| 2026-10-13 | Inv-App | `cc7357a` | Transacciones en el menú; íconos del flyout de Comercial |
| 2026-10-13 | Inv-App-API | `72f0b64` | Roles duplicados: seed corregido y limpieza en `seed:rbac` |
| 2026-10-13 | Inv-App | `7f87519` | Test de fechas de Reportes ya no falla en Chromium 141 |
| 2026-10-13 | Inv-App-API | `a17120f` | `seed:fake` crea préstamos con varios ítems y ya no falla |
| 2026-10-13 | Inv-App | `31ba7ac` | La fecha "Necesario para" de Solicitudes de Material ya no se muestra un día antes |
| 2026-10-13 | Inv-App-API | `8324e9e` | Rango CAI y fecha de vencimiento de Inventario aceptan fecha sola por API (antes daban 500) |
| 2026-10-13 | Inv-App | `098a279` | El menú flotante de Comercial (sidebar colapsado) ya no es transparente |
| 2026-10-13 | Inv-App | `9b27512` | Compras y ventas nuevas arrancan en la moneda de la Configuración Fiscal |
| 2026-10-13 | Inv-App-API / Inv-App | `89da9fe` / `5569cd1` | Borrar una transacción manual revierte su movimiento de stock; Salida mayor que el stock se rechaza |
| 2026-10-13 | Inv-App | `b10282e` | El selector de idioma del sidebar ya no pasa la app a inglés |
| 2026-10-13 | Inv-App-API | `607d8be` | Estado de stock y alertas se recalculan en cada movimiento de stock (`StockLevelService`, `computeInventoryStatus`); únicos nunca LOW_STOCK; refresh al arrancar |
| 2026-10-13 | Inv-App | `30fff85` | Panel de la campana dentro de la pantalla; "Ver todas" abre Reportes en `?tab=status` |
| 2026-10-12/13 | Manual | (doc) | Capturas Media/Baja, secciones nuevas (Compras, Transacciones, Ctrl+K, alertas, etc.), reformateo completo |
| 2026-10-11 | Inv-App / API | `fe8c1eb`, `7ec7b87` / `cf5b1a7` | (sesión anterior) cliente en ventas, fecha de préstamos, validación de conteo |

## Cómo levantar el entorno en un contenedor cloud

El contenedor se reinicia cuando queda inactivo: los archivos quedan, pero PostgreSQL y los servidores se caen. Se vuelven a levantar así:

```bash
service postgresql start
# backend (clon con permiso de push en /home/user/inv-app-api; .env apunta a postgresql://obsid:obsid@localhost:5432/obsid)
cd /home/user/inv-app-api && npm run build && (NODE_ENV=development nohup node dist/main.js > /tmp/backend.log 2>&1 &)
# frontend
cd /home/user/Inv-App && (nohup npx ng serve --port 4200 > /tmp/frontend.log 2>&1 &)
```

Si el entorno es nuevo: crear usuario y base `obsid`/`obsid` en PostgreSQL, `.env` con `DATABASE_URL`, `JWT_SECRET` y `CSRF_SECRET` (64 bytes hex), `npx prisma db push --schema=./prisma/schema.prisma`, `npm run seed:rbac`, `npm run seed:fake` y otra vez `npm run seed:rbac` para vincular roles. Ojo: `seed:fake` borra los datos de la base antes de cargar; para probarlo sin perder datos, apuntar `DATABASE_URL` a una base aparte. Login: `admin@example.com` / `password123`.

## Correr `seed:rbac` en producción (manual, a propósito)

Decisión del usuario: se corre cuando se necesite, no en cada deploy. Correrlo en cada deploy borraría los cambios de permisos que se hagan a los roles del sistema desde la pantalla de Roles. Se necesita después de agregar permisos o roles nuevos en `src/common/constants`, o para limpiar roles duplicados.

Desde la terminal, sin entrar al panel de Railway:

```bash
npm i -g @railway/cli        # una sola vez
railway login                # una sola vez
cd inv-app-api && railway link   # una sola vez: proyecto y servicio del API
railway run npm run seed:rbac    # cada vez que se necesite
```

`railway run` corre el script en la máquina local con las variables de producción (incluida `DATABASE_URL`). Alternativa sin CLI: `DATABASE_URL="<URL pública de Postgres>" npm run seed:rbac` (no guardar la URL en el repo).

## Herramientas y trucos

- **Navegador**: Playwright del repo frontend con `executablePath: '/opt/pw-browsers/chromium'`. No hay browsers-mcp en el cloud.
- **Idioma en capturas**: antes de navegar, `localStorage.setItem('language', 'es')` (por el bug del selector, ver PENDIENTES).
- **API desde el navegador logueado**: pedir `GET /api/auth/csrf-token` **una sola vez** y reutilizarlo en el header `X-CSRF-Token` (pedirlo en cada llamada da 403 por límite).
- **Cambios de esquema**: hay dos archivos (`prisma/schema.prisma` y `prisma/schema.prod.prisma`), cambiar los dos. Producción usa `prisma db push` sin `--accept-data-loss`: columnas nuevas opcionales o con default, e índices únicos creados antes por SQL. `prisma format` reformatea todo el archivo, no usarlo.
- **Errores del API**: lanzar con `apiError('CODIGO', 'texto en inglés', params)` y agregar `API_ERRORS.CODIGO` en es/en (la app tutea). Hay tests que fallan si falta el código o la traducción en un idioma.
- **Fechas en plantillas**: usar `| appDate` (mismos argumentos que `date`), no `| date`.
- **Fechas a la API**: conviene mandar ISO completo (`2027-06-30T00:00:00.000Z`). Rangos CAI y vencimiento de Inventario ya aceptan fecha sola; otros campos no se revisaron.
- **Tests del frontend**: Karma necesita una config temporal con `ChromeHeadless` + `--no-sandbox` y `CHROME_BIN=/opt/pw-browsers/chromium`. La suite completa pasa (1507).
- **Tests del backend**: `npx jest` (540 en `feat/decimal-amounts-api`, 477 en `main`), `npx eslint "src/**/*.ts"` (queda 1 aviso viejo en `inventory.service.ts`), `npm run build`. `tsc --noEmit` tiene 179 errores preexistentes (no relacionados a Decimal, confirmado comparando contra `main`); el build usa SWC y no los atrapa, así que no alcanza con que `jest`/`build` pasen para confirmar que un cambio de tipos está bien: correr `tsc --noEmit` aparte.
- **No usar** `pkill -f "node dist/main.js"` dentro de un comando que contenga ese texto: se mata a sí mismo. Usar `pkill -f "^node dist/main.js"` o el PID.

## Próximos pasos

Estado al 2026-10-31: los 4 PRs de producción ([Inv-App#41](https://github.com/Mar10HT/Inv-App/pull/41), [Inv-App-API#17](https://github.com/Mar10HT/Inv-App-API/pull/17), [Inv-App-API#18](https://github.com/Mar10HT/Inv-App-API/pull/18), [Inv-App#42](https://github.com/Mar10HT/Inv-App/pull/42)) ya están mergeados. `feat/decimal-amounts-api` (API) está lista, verificada y commiteada, sin PR abierto todavía: falta que el usuario corra el chequeo de la Fase 0 contra una copia de producción (filas con más de 2 decimales reales) antes de abrir el PR. La rama `olanchonet` tiene el plan listo pero sin código todavía.

El plan con tamaños, riesgos y KPIs de merge de cada pendiente está al principio de `PENDIENTES.md` ("Plan de lo que sigue"). En corto:

1. Abrir el PR de `feat/decimal-amounts-api` una vez verificada la Fase 0 contra producción.
2. Excel "Transacciones" lee todos los movimientos (chico, sin depender del formato).
3. Formato de reportes y PDFs (rama `olanchonet`): empezar por el Fase 0 de esa rama (logo, tipografías, correlativo de reportes, decisión sobre el Reporte de Transacciones) antes de tocar código.
4. Al llegar a producción: actualizar el manual (lista en PENDIENTES.md, sección Alertas).
5. Despliegue: verificar `railway:migrate` contra staging o una copia de producción (incluye ahora el script de Decimal); correr `railway run npm run seed:rbac` una vez.
