# INV-APP - Sistema de Gestión de Inventario

## Descripción General

INV-APP es una aplicación web moderna de gestión de inventario desarrollada con Angular 20.1.0, que utiliza las últimas características del framework como componentes standalone y Angular Signals. La aplicación ofrece una interfaz intuitiva para gestionar productos, categorías, usuarios y configuraciones.

## Stack Tecnológico

### Frontend
- **Angular 20.1.0**: Framework principal con componentes standalone
- **TypeScript 5.8.2**: Lenguaje de programación con tipado estricto
- **Angular Material 20.1.4**: Componentes de UI basados en Material Design
- **Tailwind CSS 4.1.11**: Framework CSS utility-first
- **RxJS 7.8.0**: Programación reactiva

### Backend/Server
- **Angular SSR**: Renderizado del lado del servidor (Server-Side Rendering)
- **Express 5.1.0**: Servidor web Node.js
- **Angular Universal**: Soporte completo para SSR

### Herramientas de Desarrollo
- **Angular CLI 20.1.4**: Herramienta de línea de comandos
- **Vite**: Sistema de build rápido
- **Sass 1.90.0**: Preprocesador CSS
- **PostCSS 8.5.6**: Procesador CSS para Tailwind

## Arquitectura del Proyecto

### Estructura de Carpetas

```
Inv-App/
├── src/
│   ├── app/
│   │   ├── components/           # Componentes de la aplicación
│   │   │   ├── categories/       # Gestión de categorías
│   │   │   ├── dashboard/        # Panel principal con estadísticas
│   │   │   ├── inventory/        # Módulo de inventario
│   │   │   │   ├── inventory-form/      # Formulario agregar/editar
│   │   │   │   ├── inventory-item/      # Vista detalle de item
│   │   │   │   └── inventory-list/      # Lista principal con filtros
│   │   │   ├── profile/          # Perfil de usuario
│   │   │   ├── settings/         # Configuración de la app
│   │   │   ├── shared/           # Componentes compartidos
│   │   │   │   └── navigation/   # Navegación lateral
│   │   │   └── users/            # Gestión de usuarios
│   │   ├── interfaces/           # Interfaces TypeScript
│   │   ├── services/             # Servicios de la aplicación
│   │   │   ├── inventory/        # Servicio CRUD de inventario
│   │   │   └── shared-data/      # Estado compartido
│   │   ├── app.config.ts         # Configuración de la aplicación
│   │   ├── app.routes.ts         # Definición de rutas
│   │   └── app.ts                # Componente raíz
│   ├── custom-theme.scss         # Tema personalizado Material
│   ├── styles.css                # Estilos globales con Tailwind
│   ├── main.ts                   # Bootstrap cliente
│   ├── server.ts                 # Servidor Express SSR
│   └── index.html                # Punto de entrada HTML
```

### Patrón de Arquitectura

La aplicación sigue el patrón de **componentes standalone de Angular** sin NgModules:
- Importaciones directas en los decoradores de componentes
- Inyección de dependencias vía constructor
- Gestión de estado con Angular Signals
- Diseño responsive mobile-first

## Sistema de Rutas

```
/                           → Redirige a /dashboard
/dashboard                  → Panel de control principal
/inventory                  → Lista de inventario
  /inventory/add            → Agregar nuevo item
  /inventory/edit/:id       → Editar item existente
  /inventory/:id            → Ver detalle de item
/categories                 → Gestión de categorías
/profile                    → Perfil de usuario
/settings                   → Configuración
/users                      → Gestión de usuarios
```

## Modelo de Datos

### Interface: InventoryItemInterface

```typescript
interface InventoryItemInterface {
  id: string;                    // Identificador único
  name: string;                  // Nombre del producto
  description: string;           // Descripción del producto
  quantity: number;              // Cantidad en stock
  category: string;              // Categoría del producto
  location: string;              // Ubicación en almacén
  lastUpdated: Date;             // Última actualización
  status: 'in-stock' | 'low-stock' | 'out-of-stock';  // Estado
}
```

### Categorías Disponibles

1. Fresh Produce (Productos frescos)
2. Dairy (Lácteos)
3. Bakery (Panadería)
4. Beverages (Bebidas)
5. Meat & Seafood (Carnes y mariscos)
6. Pantry & Dry Goods (Despensa)
7. Frozen Foods (Congelados)
8. Health & Beauty (Salud y belleza)
9. Household (Artículos del hogar)

## Características Implementadas

### 1. Lista de Inventario (COMPLETAMENTE FUNCIONAL)

**Ubicación**: `src/app/components/inventory/inventory-list/`

**Funcionalidades**:
- Sistema de filtros multidimensional en tiempo real
- Búsqueda por nombre/descripción
- Filtros por categoría, ubicación y estado
- Tabla con ordenamiento y paginación
- Vista responsive (tabla en desktop, cards en móvil)
- Operaciones CRUD (Ver, Editar, Eliminar)
- Exportación a CSV
- Persistencia en localStorage
- Estadísticas en tiempo real:
  - Total de items
  - Items en stock
  - Items con stock bajo
  - Items sin stock

**Tecnologías Clave**:
- Angular Signals para estado reactivo
- Material Table con MatSort y MatPaginator
- Confirmaciones con MatDialog
- Notificaciones con MatSnackBar

### 2. Dashboard

**Ubicación**: `src/app/components/dashboard/`

**Funcionalidades**:
- Mensaje de bienvenida personalizado
- 3 tarjetas de estadísticas:
  - Total de usuarios: 156
  - Total de items: 432
  - Valor total: $45,230.50
- Tabla de items recientes (6 items)
- Vista responsive
- Botones de acción rápida:
  - Agregar nuevo item
  - Exportar datos
  - Ver reportes

**Estado**: Parcialmente implementado con datos mock

### 3. Navegación

**Ubicación**: `src/app/components/shared/navigation/`

**Funcionalidades**:
- Menú lateral deslizable (drawer)
- Animaciones suaves
- Diseño con gradientes
- Resaltado de ruta activa
- Tarjeta de perfil de usuario
- Totalmente responsive

## Almacenamiento de Datos

**Actual**: LocalStorage del navegador
- Clave: `inventory-items`
- Persistencia automática en cambios
- Carga al inicializar el servicio
- Fallback a datos mock en caso de error

**Datos Mock**: 30 items de inventario precargados en 9 categorías

## Sistema de Estilos

### Tema Personalizado (custom-theme.scss)

**Paleta de Colores**:
- **Primary**: #2A2E45 (azul-gris oscuro)
- **Secondary**: #586A8A (azul-gris medio)
- **Tertiary**: #A2B848 (verde lima)
- **Error**: #A84448 (rojo)
- **Surface**: #1A1D2A (azul muy oscuro)
- **On-Surface**: #E1E1E6 (gris claro para texto)

**Modo**: Dark theme

### Integración Tailwind + Material

- Clases utility de Tailwind para layouts
- Componentes Material Design para UI
- Variables CSS personalizadas
- Funciones color-mix() para transparencias

## Características Pendientes (Placeholders)

Los siguientes componentes existen pero solo tienen estructura básica:

1. **Formulario de Inventario** (`inventory-form`): Agregar/Editar items
2. **Detalle de Item** (`inventory-item`): Vista completa de un item
3. **Gestión de Categorías** (`categories`): CRUD de categorías
4. **Gestión de Usuarios** (`users`): CRUD de usuarios
5. **Perfil** (`profile`): Edición de perfil de usuario
6. **Configuración** (`settings`): Configuración de la aplicación

## Autenticación y Autorización

**Estado Actual**: NO IMPLEMENTADO

- No hay servicio de autenticación
- No hay guards en las rutas
- No hay componentes de login/logout
- Los datos de usuario están hardcodeados
- Todas las rutas son públicas

## Build y Deployment

### Desarrollo

```bash
npm start              # Inicia servidor de desarrollo
ng serve               # Alternativa
```

### Producción

```bash
ng build               # Build de producción
```

**Salidas**:
- `dist/INV-ICN/browser/` - Archivos cliente
- `dist/INV-ICN/server/` - Archivos servidor (SSR)

### Server-Side Rendering

```bash
npm run serve:ssr:INV-ICN
# o
node dist/INV-ICN/server/server.mjs
```

**Puerto**: 4000 (por defecto)

### Configuración de Build

**Límites de Presupuesto**:
- Bundle inicial: máx 1MB (warning en 500kB)
- Estilos de componentes: máx 8kB (warning en 4kB)

## Testing

**Framework**: Jasmine + Karma
**Estado**: Configurado pero sin tests implementados

```bash
npm test               # Ejecutar tests
```

## Configuración TypeScript

- **Target**: ES2022
- **Modo estricto**: Habilitado
- **Decoradores experimentales**: Habilitado
- **Templates estrictos**: Habilitado

## Scripts NPM Disponibles

```json
{
  "ng": "ng",                              // Angular CLI
  "start": "ng serve",                     // Dev server
  "build": "ng build",                     // Build de producción
  "watch": "ng build --watch",             // Watch mode
  "test": "ng test",                       // Ejecutar tests
  "serve:ssr:INV-ICN": "node dist/INV-ICN/server/server.mjs"  // SSR
}
```

## Dependencias Principales

### Producción
- @angular/core: ^20.1.0
- @angular/material: ^20.1.4
- tailwindcss: ^4.1.11
- express: ^5.1.0
- rxjs: ~7.8.0

### Desarrollo
- @angular/cli: ^20.1.4
- typescript: ~5.8.2
- jasmine-core: ~5.8.0
- karma: ~6.4.0

## Fortalezas del Proyecto

1. **Stack Moderno**: Angular 20 con componentes standalone y Signals
2. **Arquitectura Clara**: Separación de responsabilidades bien definida
3. **Diseño Responsive**: Enfoque mobile-first
4. **Type Safety**: TypeScript completo con modo estricto
5. **SSR Ready**: Configuración completa de SSR
6. **UI/UX Profesional**: Material Design + tema personalizado
7. **Feature Principal Funcional**: Lista de inventario completamente operativa

## Referencias de Archivos Clave

- **App Principal**: `src/app/app.ts`
- **Servicio Inventario**: `src/app/services/inventory/inventory.service.ts`
- **Lista Inventario**: `src/app/components/inventory/inventory-list/inventory-list.ts`
- **Rutas**: `src/app/app.routes.ts`
- **Servidor**: `src/server.ts`
- **Configuración**: `angular.json`

## Estado del Desarrollo

**Progreso Estimado**: ~30% completado

- **Infraestructura core**: 100% ✓
- **Feature principal (Lista Inventario)**: 90% ✓
- **Features de soporte**: 10%
- **Backend/Auth**: 0%

---

**Última actualización**: 22 de Noviembre, 2025
**Versión**: 1.0.0
**Autor**: Proyecto Inv-App
