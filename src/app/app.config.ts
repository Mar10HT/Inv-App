import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

// Traducciones en línea
const TRANSLATIONS: { [key: string]: any } = {
  en: {
    COMMON: {
      SAVE: 'Save',
      CANCEL: 'Cancel',
      EXPORT: 'Export',
      SEARCH: 'Search',
      ACTIONS: 'Actions'
    },
    NAV: {
      DASHBOARD: 'Dashboard',
      INVENTORY: 'Inventory',
      WAREHOUSES: 'Warehouses',
      USERS: 'Users',
      SETTINGS: 'Settings',
      PROFILE: 'Profile'
    },
    DASHBOARD: {
      TITLE: 'Inventory Management',
      SUBTITLE: "Here's what's happening with your inventory today!",
      TOTAL_ITEMS: 'Total Items',
      IN_STOCK: 'In Stock',
      LOW_STOCK: 'Low Stock',
      OUT_OF_STOCK: 'Out of Stock',
      FROM_LAST_MONTH: 'from last month',
      RECENT_ITEMS: 'Recent Items',
      ITEMS_COUNT: '{{count}} items',
      SEARCH_PLACEHOLDER: 'Search by name, category or description...',
      ALL_CATEGORIES: 'All Categories',
      ALL_LOCATIONS: 'All Locations',
      ALL_STATUS: 'All Status',
      ADD_NEW_ITEM: 'Add New Item',
      TABLE: {
        ITEM: 'Item',
        CATEGORY: 'Category',
        QUANTITY: 'Quantity',
        LOCATION: 'Location',
        LAST_UPDATED: 'Last Updated',
        STATUS: 'Status'
      }
    },
    FORM: {
      VALIDATION: {
        REQUIRED: 'This field is required',
        MIN_LENGTH: 'Minimum {{length}} characters required',
        MIN_VALUE: 'Value must be at least {{value}}'
      }
    },
    INVENTORY: {
      FORM: {
        ADD_TITLE: 'Add New Item',
        EDIT_TITLE: 'Edit Item',
        ADD_SUBTITLE: 'Fill in the details to add a new item',
        EDIT_SUBTITLE: 'Update the item details below',
        ITEM_TYPE: {
          TITLE: 'Item Type',
          BULK: 'Bulk Item',
          BULK_HINT: 'Items counted by quantity (e.g., screws, paper)',
          UNIQUE: 'Unique Item',
          UNIQUE_HINT: 'Individual items with unique identifier (e.g., laptops, servers)'
        },
        BASIC_INFO: {
          TITLE: 'Basic Information',
          NAME: 'Item Name',
          NAME_PLACEHOLDER: 'E.g., Dell Latitude 5420 Laptop',
          CATEGORY: 'Category',
          CATEGORY_PLACEHOLDER: 'E.g., Electronics, Office',
          DESCRIPTION: 'Description',
          DESCRIPTION_PLACEHOLDER: 'Describe the item...'
        },
        WAREHOUSE: {
          LABEL: 'Warehouse',
          HINT: 'Select the warehouse'
        },
        IDENTIFIERS: {
          TITLE: 'Identifiers',
          SERVICE_TAG: 'Service Tag',
          SERVICE_TAG_PLACEHOLDER: 'E.g., DEL123456AB',
          SERVICE_TAG_HINT: 'Required for UNIQUE items',
          SERIAL_NUMBER: 'Serial Number',
          SERIAL_NUMBER_PLACEHOLDER: 'E.g., SN123456789',
          SERIAL_NUMBER_HINT: 'Optional',
          SKU: 'SKU',
          SKU_PLACEHOLDER: 'E.g., LAP-DELL-5420',
          BARCODE: 'Barcode',
          BARCODE_PLACEHOLDER: 'E.g., 1234567890123'
        },
        QUANTITY: {
          TITLE: 'Quantity',
          CURRENT: 'Current Quantity',
          MINIMUM: 'Minimum Quantity',
          UNIQUE_HINT: 'UNIQUE items always have quantity = 1'
        },
        PRICE: {
          TITLE: 'Price & Supplier',
          AMOUNT: 'Price',
          CURRENCY: 'Currency'
        },
        SUPPLIER: {
          LABEL: 'Supplier',
          NONE: 'No supplier',
          HINT: 'Optional'
        },
        ASSIGNMENT: {
          TITLE: 'Assignment',
          USER: 'Assign to User',
          UNASSIGNED: 'Unassigned',
          HINT: 'UNIQUE items only'
        }
      }
    }
  },
  es: {
    COMMON: {
      SAVE: 'Guardar',
      CANCEL: 'Cancelar',
      EXPORT: 'Exportar',
      SEARCH: 'Buscar',
      ACTIONS: 'Acciones'
    },
    NAV: {
      DASHBOARD: 'Panel',
      INVENTORY: 'Inventario',
      WAREHOUSES: 'Bodegas',
      USERS: 'Usuarios',
      SETTINGS: 'Configuración',
      PROFILE: 'Perfil'
    },
    DASHBOARD: {
      TITLE: 'Gestión de Inventario',
      SUBTITLE: '¡Esto es lo que está pasando con tu inventario hoy!',
      TOTAL_ITEMS: 'Total de Items',
      IN_STOCK: 'En Stock',
      LOW_STOCK: 'Stock Bajo',
      OUT_OF_STOCK: 'Sin Stock',
      FROM_LAST_MONTH: 'desde el mes pasado',
      RECENT_ITEMS: 'Items Recientes',
      ITEMS_COUNT: '{{count}} items',
      SEARCH_PLACEHOLDER: 'Buscar por nombre, categoría o descripción...',
      ALL_CATEGORIES: 'Todas las Categorías',
      ALL_LOCATIONS: 'Todas las Ubicaciones',
      ALL_STATUS: 'Todos los Estados',
      ADD_NEW_ITEM: 'Agregar Nuevo Item',
      TABLE: {
        ITEM: 'Item',
        CATEGORY: 'Categoría',
        QUANTITY: 'Cantidad',
        LOCATION: 'Ubicación',
        LAST_UPDATED: 'Última Actualización',
        STATUS: 'Estado'
      }
    },
    FORM: {
      VALIDATION: {
        REQUIRED: 'Este campo es requerido',
        MIN_LENGTH: 'Mínimo {{length}} caracteres requeridos',
        MIN_VALUE: 'El valor debe ser al menos {{value}}'
      }
    },
    INVENTORY: {
      FORM: {
        ADD_TITLE: 'Agregar Nuevo Item',
        EDIT_TITLE: 'Editar Item',
        ADD_SUBTITLE: 'Complete los detalles para agregar un nuevo item',
        EDIT_SUBTITLE: 'Actualice los detalles del item',
        ITEM_TYPE: {
          TITLE: 'Tipo de Item',
          BULK: 'Item por Cantidad',
          BULK_HINT: 'Items contados por cantidad (ej: tornillos, papel)',
          UNIQUE: 'Item Único',
          UNIQUE_HINT: 'Items individuales con identificador único (ej: laptops, servidores)'
        },
        BASIC_INFO: {
          TITLE: 'Información Básica',
          NAME: 'Nombre del Item',
          NAME_PLACEHOLDER: 'Ej: Laptop Dell Latitude 5420',
          CATEGORY: 'Categoría',
          CATEGORY_PLACEHOLDER: 'Ej: Electrónica, Oficina',
          DESCRIPTION: 'Descripción',
          DESCRIPTION_PLACEHOLDER: 'Describa el item...'
        },
        WAREHOUSE: {
          LABEL: 'Bodega',
          HINT: 'Seleccione la bodega'
        },
        IDENTIFIERS: {
          TITLE: 'Identificadores',
          SERVICE_TAG: 'Service Tag',
          SERVICE_TAG_PLACEHOLDER: 'Ej: DEL123456AB',
          SERVICE_TAG_HINT: 'Requerido para items UNIQUE',
          SERIAL_NUMBER: 'Número de Serie',
          SERIAL_NUMBER_PLACEHOLDER: 'Ej: SN123456789',
          SERIAL_NUMBER_HINT: 'Opcional',
          SKU: 'SKU',
          SKU_PLACEHOLDER: 'Ej: LAP-DELL-5420',
          BARCODE: 'Código de Barras',
          BARCODE_PLACEHOLDER: 'Ej: 1234567890123'
        },
        QUANTITY: {
          TITLE: 'Cantidad',
          CURRENT: 'Cantidad Actual',
          MINIMUM: 'Cantidad Mínima',
          UNIQUE_HINT: 'Items UNIQUE siempre tienen cantidad = 1'
        },
        PRICE: {
          TITLE: 'Precio y Proveedor',
          AMOUNT: 'Precio',
          CURRENCY: 'Moneda'
        },
        SUPPLIER: {
          LABEL: 'Proveedor',
          NONE: 'Sin proveedor',
          HINT: 'Opcional'
        },
        ASSIGNMENT: {
          TITLE: 'Asignación',
          USER: 'Asignar a Usuario',
          UNASSIGNED: 'Sin asignar',
          HINT: 'Solo para items UNIQUE'
        }
      }
    }
  }
};

// Static loader
class StaticTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of(TRANSLATIONS[lang] || TRANSLATIONS['en']);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'en',
        loader: {
          provide: TranslateLoader,
          useClass: StaticTranslateLoader
        }
      })
    )
  ]
};
