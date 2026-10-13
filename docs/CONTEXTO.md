# Contexto de trabajo: Obsid

Documento para retomar el trabajo en otra sesión. Se actualiza al terminar cada tarea. La lista de tareas está en [`PENDIENTES.md`](./PENDIENTES.md); este archivo explica el proyecto, lo hecho, las decisiones tomadas y cómo trabajar.

Última actualización: 2026-10-13.

## El proyecto

**Obsid** es el sistema de inventario de Olancho Net (Honduras). Dos repos:

| Repo | Stack | Rama de trabajo |
| --- | --- | --- |
| `Mar10HT/Inv-App` | Angular 19 (standalone, signals, zoneless), Tailwind, Karma | `feat/purchase-invoices` |
| `Mar10HT/Inv-App-API` | NestJS 11 + Prisma 6 (PostgreSQL), Jest, Bun en producción | `feat/purchase-invoices` |

`feat/purchase-invoices` va 8 commits delante de `main` en el frontend: el menú Comercial, Compras, Pagos y Cuentas por Cobrar/Pagar existen solo ahí. Este archivo y `PENDIENTES.md` viven en la rama `claude/obsidian-pendings-context-pn3gf8` de `Inv-App`.

## Decisiones del usuario (respetarlas)

- **Commits directo en `feat/purchase-invoices`** en ambos repos. Dentro del loop de pendientes el usuario autorizó pushear sin preguntar, siempre con tests, lint y build en verde; fuera del loop, pedir confirmación antes de cada push.
- Trabajar los pendientes en orden de prioridad; lo que necesite una decisión de diseño se pregunta antes de tocar código.
- **Formato de reportes y PDFs**: todavía no está definido. No agregar capturas de comprobantes ni reportes exportables al manual hasta que el usuario lo defina.
- **Manual de usuario**: solo vista de administrador, trato de **usted**, sin guiones largos (—), recuadros "Importante" solo para avisos que evitan errores del usuario. Los bugs internos van a `PENDIENTES.md`, no al manual.

## Manual de Usuario

- Documento Claude Docs: https://claude.ai/artifact/V18oMooHpYnxuGH9M3ySmT
- IDs: proyecto `e2c4b05f-d198-403d-9732-9f265cdc3af6`, pestaña `62ddeaa8-9aa1`, cuerpo (prose) `8343b3ae-d9e4`.
- Estructura: Introducción, Índice, Parte 1 Primeros pasos, 2 Configuración inicial, 3 Inventario, 4 Operaciones de bodega, 5 Comercial, 6 Reportes, 7 Administración, Preguntas frecuentes, Glosario.
- Imágenes: se suben con la herramienta Artifact (`publish` con `asset: true` sobre la URL del doc), se registra un blob en el doc (`create` object `blob`) y se insertan como `![alt](blob/<id>)`.
- Las capturas nuevas usan datos de prueba (bodegas "Bodega Principal/Norte/Sur/Atlántida"); las 18 primeras salieron de la base local del usuario.

## Hecho en esta sesión

| Fecha | Repo | Commit | Qué |
| --- | --- | --- | --- |
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

Si el entorno es nuevo: crear usuario y base `obsid`/`obsid` en PostgreSQL, `.env` con `DATABASE_URL`, `JWT_SECRET` y `CSRF_SECRET` (64 bytes hex), `npx prisma db push --schema=./prisma/schema.prisma`, `npm run seed:rbac`, `npm run seed:fake` (falla en Préstamos pero carga lo anterior) y otra vez `npm run seed:rbac` para vincular roles. Login: `admin@example.com` / `password123`.

## Herramientas y trucos

- **Navegador**: Playwright del repo frontend con `executablePath: '/opt/pw-browsers/chromium'`. No hay browsers-mcp en el cloud.
- **Idioma en capturas**: antes de navegar, `localStorage.setItem('language', 'es')` (por el bug del selector, ver PENDIENTES).
- **API desde el navegador logueado**: pedir `GET /api/auth/csrf-token` **una sola vez** y reutilizarlo en el header `X-CSRF-Token` (pedirlo en cada llamada da 403 por límite).
- **Fechas a la API**: ISO completo (`2027-06-30T00:00:00.000Z`); la fecha sola da 500 en rangos CAI.
- **Tests del frontend**: Karma necesita una config temporal con `ChromeHeadless` + `--no-sandbox` y `CHROME_BIN=/opt/pw-browsers/chromium`. Un test de `reports-transactions-tab.spec.ts` falla en este entorno sin relación con los cambios (ver PENDIENTES).
- **Tests del backend**: `npx jest` (446), `npx eslint "src/**/*.ts"` (queda 1 aviso viejo en `inventory.service.ts`), `npm run build`. `tsc --noEmit` tiene ~170 errores que ya existían; el build usa SWC.
- **No usar** `pkill -f "node dist/main.js"` dentro de un comando que contenga ese texto: se mata a sí mismo. Usar `pkill -f "^node dist/main.js"` o el PID.

## Próximos pasos

Orden sugerido (detalle en `PENDIENTES.md`):

1. Flyout transparente del menú Comercial con el sidebar colapsado.
2. Rango CAI por API con fecha sola da 500 (validar o normalizar la fecha).
3. `neededByDate` de Solicitudes de Material: verificar el corrimiento de un día.
4. `seed:fake` desactualizado para Préstamos.
5. Inconsistencias (Transacciones fuera del menú, roles duplicados, Salidas no programable, Login en inglés, dos campos Cliente en cotizaciones): preguntar al usuario antes, son decisiones de producto.
6. Formato de reportes y PDFs: esperar definición del usuario.
7. Cuando las alertas lleguen a producción: actualizar el manual (sección "Alertas de stock", Transacciones manuales, el recuadro de Moneda en Compras y sus preguntas frecuentes).
