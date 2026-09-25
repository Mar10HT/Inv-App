import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of, throwError } from 'rxjs';

import { InventoryFormComponent } from './inventory-form.component';
import { InventoryService } from '../../../services/inventory/inventory.service';
import { WarehouseService } from '../../../services/warehouse.service';
import { SupplierService } from '../../../services/supplier.service';
import { UserService } from '../../../services/user.service';
import { CategoryService } from '../../../services/category.service';
import { LoggerService } from '../../../services/logger.service';
import { CreateInventoryItemDto, Currency, InventoryItemInterface, InventoryStatus, ItemType } from '../../../interfaces/inventory-item.interface';
import { User, UserRole } from '../../../interfaces/user.interface';
import { provideTestBedDefaults } from '../../../../testing/test-providers';
import { item, supplier, warehouse } from '../../../../testing/report-fixtures';

const user = (id: string, role: UserRole): User => ({ id, email: `${id}@x.com`, role, createdAt: new Date(0), updatedAt: new Date(0) });

describe('InventoryFormComponent', () => {
  let fixture: ComponentFixture<InventoryFormComponent>;
  let component: InventoryFormComponent;
  let inventory: jasmine.SpyObj<InventoryService>;
  let warehouses: jasmine.SpyObj<WarehouseService>;
  let suppliers: jasmine.SpyObj<SupplierService>;
  let users: jasmine.SpyObj<UserService>;
  let categories: jasmine.SpyObj<CategoryService>;
  let logger: jasmine.SpyObj<LoggerService>;
  let navigate: jasmine.Spy;

  const setup = async (options: { id?: string; loaded?: Observable<InventoryItemInterface>; listsFail?: boolean } = {}): Promise<void> => {
    inventory = jasmine.createSpyObj<InventoryService>('InventoryService', ['getItemById', 'createItem', 'updateItem']);
    inventory.getItemById.and.returnValue(options.loaded ?? of(item()));
    inventory.createItem.and.returnValue(of(item()));
    inventory.updateItem.and.returnValue(of(item()));
    const list = (name: string, values: unknown[], prop: string) => {
      const spy = jasmine.createSpyObj(name, ['getAll'], { [prop]: signal(values) } as never);
      spy.getAll.and.returnValue(options.listsFail ? throwError(() => new Error('boom')) : of(values));
      return spy;
    };
    warehouses = list('WarehouseService', [warehouse('w1', 'Main')], 'warehouses');
    suppliers = list('SupplierService', [supplier('s1', 'Acme')], 'suppliers');
    users = list(
      'UserService',
      [user('ana', UserRole.USER), user('ext', UserRole.EXTERNAL), user('view', UserRole.VIEWER), user('boss', UserRole.WAREHOUSE_MANAGER)],
      'users'
    );
    categories = list('CategoryService', [{ id: 'c1', name: 'Hardware' }], 'categories');
    logger = jasmine.createSpyObj<LoggerService>('LoggerService', ['error']);

    await TestBed.configureTestingModule({
      imports: [InventoryFormComponent],
      providers: [
        ...provideTestBedDefaults(),
        { provide: InventoryService, useValue: inventory },
        { provide: WarehouseService, useValue: warehouses },
        { provide: SupplierService, useValue: suppliers },
        { provide: UserService, useValue: users },
        { provide: CategoryService, useValue: categories },
        { provide: LoggerService, useValue: logger },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(options.id ? { id: options.id } : {}) } } }
      ]
    }).compileComponents();

    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(InventoryFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const form = () => component.inventoryForm;

  /** A valid BULK item; the tests override what they care about. */
  const fillBulk = (values: Record<string, unknown> = {}): void => {
    form().patchValue({
      name: 'Screws',
      description: 'Box of 100',
      category: 'Hardware',
      quantity: 20,
      minQuantity: 5,
      price: 10,
      currency: Currency.USD,
      warehouseId: 'w1',
      ...values
    });
  };

  /** Switches to UNIQUE the way the page does, and lets the validators react. */
  const switchTo = (type: ItemType): void => {
    form().patchValue({ itemType: type });
    component.onItemTypeChange(type);
    fixture.detectChanges();
  };

  const fillUnique = (values: Record<string, unknown> = {}): void => {
    switchTo(ItemType.UNIQUE);
    form().patchValue({
      name: 'Laptop',
      description: 'Work laptop',
      category: 'Computers',
      price: 900,
      currency: Currency.USD,
      warehouseId: 'w1',
      serviceTag: 'TAG-1',
      ...values
    });
  };

  const sent = (): CreateInventoryItemDto => inventory.createItem.calls.mostRecent().args[0];

  describe('startup', () => {
    it('asks for the warehouses, the suppliers, the users and the categories', async () => {
      await setup();

      for (const service of [warehouses, suppliers, users, categories]) {
        expect(service.getAll).toHaveBeenCalledTimes(1);
      }
    });

    it('logs each list that fails to load', async () => {
      await setup({ listsFail: true });

      expect(logger.error.calls.allArgs().map((args) => args[0])).toEqual([
        'Error loading warehouses',
        'Error loading suppliers',
        'Error loading users',
        'Error loading categories'
      ]);
    });

    it('offers only regular and external users to assign an item to', async () => {
      await setup();

      expect(component.assignableUsers().map((u) => u.id)).toEqual(['ana', 'ext']);
    });

    it('starts as a new BULK item that cannot be submitted yet', async () => {
      await setup();

      expect(component.isEditMode()).toBeFalse();
      expect(component.isUniqueItem()).toBeFalse();
      expect(form().value).toEqual(jasmine.objectContaining({ itemType: ItemType.BULK, currency: Currency.HNL, quantity: 0, minQuantity: 0 }));
      expect(form().invalid).toBeTrue();
    });
  });

  describe('the item type', () => {
    beforeEach(() => setup());

    it('UNIQUE asks for a service tag, allows a quantity of 0 or 1 and fixes the minimum at 1', () => {
      switchTo(ItemType.UNIQUE);

      expect(component.isUniqueItem()).toBeTrue();
      expect(form().get('serviceTag')?.hasError('required')).toBeTrue();
      form().patchValue({ quantity: 2 });
      expect(form().get('quantity')?.hasError('max')).toBeTrue();
      form().patchValue({ quantity: 0 });
      expect(form().get('quantity')?.valid).toBeTrue();
      expect(form().get('minQuantity')?.disabled).toBeTrue();
      expect(form().get('minQuantity')?.value).toBe(1);
    });

    it('UNIQUE starts from quantity 1 and forgets the BULK-only fields and any assignment', () => {
      form().patchValue({ sku: 'SKU-1', barcode: '123', assignedToUserId: 'ana' });

      switchTo(ItemType.UNIQUE);

      expect(form().value).toEqual(jasmine.objectContaining({ sku: '', barcode: '', quantity: 1, assignedToUserId: '' }));
    });

    it('going back to BULK drops the service tag, the serial number and the assignment, and frees the quantity', () => {
      switchTo(ItemType.UNIQUE);
      form().patchValue({ serviceTag: 'TAG-1', serialNumber: 'SN-1', assignedToUserId: 'ana' });

      switchTo(ItemType.BULK);

      expect(form().value).toEqual(jasmine.objectContaining({ serviceTag: '', serialNumber: '', assignedToUserId: '' }));
      expect(form().get('serviceTag')?.hasError('required')).toBeFalse();
      expect(form().get('minQuantity')?.enabled).toBeTrue();
      form().patchValue({ quantity: 50 });
      expect(form().get('quantity')?.valid).toBeTrue();
    });
  });

  describe('errors in the form', () => {
    beforeEach(() => setup());

    it('submitting an invalid form marks everything as touched and sends nothing', () => {
      component.onSubmit();

      expect(inventory.createItem).not.toHaveBeenCalled();
      expect(component.hasError('name')).toBeTrue();
      expect(component.loading()).toBeFalse();
    });

    it('hasError waits until the field was touched or changed', () => {
      expect(component.hasError('name')).toBeFalse();

      form().get('name')?.markAsTouched();
      expect(component.hasError('name')).toBeTrue();

      form().patchValue({ name: 'Screws' });
      expect(component.hasError('name')).toBeFalse();
    });

    it('getErrorMessage says what is wrong with a field', () => {
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('en', {
        FORM: { VALIDATION: { REQUIRED: 'Required', MIN_LENGTH: 'At least {{length}} characters', MIN_VALUE: 'At least {{value}}' } }
      });
      translate.use('en');

      expect(component.getErrorMessage('name')).toBe('Required');
      form().patchValue({ name: 'ab' });
      expect(component.getErrorMessage('name')).toBe('At least 3 characters');
      form().patchValue({ price: -1 });
      expect(component.getErrorMessage('price')).toBe('At least 0');
      form().patchValue({ name: 'Screws' });
      expect(component.getErrorMessage('name')).toBe('');
    });
  });

  describe('creating a BULK item', () => {
    beforeEach(() => setup());

    it('sends what was typed and goes back to the inventory', () => {
      fillBulk();

      component.onSubmit();

      expect(inventory.createItem).toHaveBeenCalledOnceWith({
        name: 'Screws',
        description: 'Box of 100',
        category: 'Hardware',
        model: '',
        itemType: ItemType.BULK,
        quantity: 20,
        minQuantity: 5,
        price: 10,
        currency: Currency.USD,
        warehouseId: 'w1',
        status: InventoryStatus.IN_STOCK
      });
      expect(navigate).toHaveBeenCalledOnceWith(['/inventory']);
      expect(component.loading()).toBeFalse();
    });

    it('adds the SKU, the barcode and the supplier only when they were filled in', () => {
      fillBulk({ sku: 'SKU-1', barcode: '123', supplierId: 's1' });
      component.onSubmit();
      expect(sent()).toEqual(jasmine.objectContaining({ sku: 'SKU-1', barcode: '123', supplierId: 's1' }));

      inventory.createItem.calls.reset();
      fillBulk({ sku: '', barcode: '', supplierId: '' });
      component.onSubmit();
      expect(Object.keys(sent())).not.toContain('sku');
      expect(Object.keys(sent())).not.toContain('barcode');
      expect(Object.keys(sent())).not.toContain('supplierId');
    });

    const statuses: [number, number, InventoryStatus][] = [
      [20, 5, InventoryStatus.IN_STOCK],
      [6, 5, InventoryStatus.IN_STOCK],
      [5, 5, InventoryStatus.LOW_STOCK],
      [3, 5, InventoryStatus.LOW_STOCK],
      [0, 5, InventoryStatus.OUT_OF_STOCK]
    ];

    for (const [quantity, minQuantity, status] of statuses) {
      it(`marks ${quantity} in stock with a minimum of ${minQuantity} as ${status}`, () => {
        fillBulk({ quantity, minQuantity });

        component.onSubmit();

        expect(sent().status).toBe(status);
      });
    }

    it('logs a failure, stays on the page and stops loading', () => {
      const failure = new Error('boom');
      inventory.createItem.and.returnValue(throwError(() => failure));
      fillBulk();

      component.onSubmit();

      expect(logger.error).toHaveBeenCalledWith('Error creating item', failure);
      expect(navigate).not.toHaveBeenCalled();
      expect(component.loading()).toBeFalse();
    });
  });

  describe('creating a UNIQUE item', () => {
    beforeEach(() => setup());

    it('sends the service tag and the serial number and leaves out the SKU and the barcode', () => {
      fillUnique({ serialNumber: 'SN-1' });

      component.onSubmit();

      expect(sent()).toEqual(jasmine.objectContaining({ itemType: ItemType.UNIQUE, serviceTag: 'TAG-1', serialNumber: 'SN-1', quantity: 1 }));
      expect(Object.keys(sent())).not.toContain('sku');
      expect(Object.keys(sent())).not.toContain('barcode');
      expect(Object.keys(sent())).not.toContain('assignedToUserId');
    });

    it('is IN_USE once it is assigned to somebody', () => {
      fillUnique({ assignedToUserId: 'ana' });

      component.onSubmit();

      expect(sent()).toEqual(jasmine.objectContaining({ assignedToUserId: 'ana', status: InventoryStatus.IN_USE }));
    });

    it('is IN_STOCK when it is not assigned and there is one, the same as the API decides', () => {
      fillUnique();

      component.onSubmit();

      expect(sent().status).toBe(InventoryStatus.IN_STOCK);
    });

    it('is OUT_OF_STOCK when there is none', () => {
      fillUnique({ quantity: 0 });

      component.onSubmit();

      expect(sent().status).toBe(InventoryStatus.OUT_OF_STOCK);
    });

    it('does not send without a service tag', () => {
      fillUnique({ serviceTag: '' });

      component.onSubmit();

      expect(inventory.createItem).not.toHaveBeenCalled();
    });
  });

  describe('editing an item', () => {
    const stored = item({
      id: 'i1',
      name: 'Laptop',
      description: 'Work laptop',
      category: 'Computers',
      itemType: ItemType.UNIQUE,
      serviceTag: 'TAG-1',
      quantity: 1,
      minQuantity: 1,
      price: 900,
      currency: Currency.USD,
      warehouseId: 'w1',
      assignedToUserId: 'ana'
    });

    it('loads the item into the form and shows its type sections', async () => {
      await setup({ id: 'i1', loaded: of(stored) });

      expect(component.isEditMode()).toBeTrue();
      expect(component.itemId()).toBe('i1');
      expect(inventory.getItemById).toHaveBeenCalledOnceWith('i1');
      expect(form().value).toEqual(
        jasmine.objectContaining({ name: 'Laptop', category: 'Computers', serviceTag: 'TAG-1', serialNumber: '', sku: '', model: '', supplierId: '', assignedToUserId: 'ana', warehouseId: 'w1' })
      );
      expect(component.isUniqueItem()).toBeTrue();
      expect(component.loading()).toBeFalse();
    });

    it('updates the item by its id and goes back to the inventory', async () => {
      await setup({ id: 'i1', loaded: of(stored) });
      form().patchValue({ name: 'Laptop Pro' });

      component.onSubmit();

      expect(inventory.updateItem).toHaveBeenCalledOnceWith('i1', jasmine.objectContaining({ name: 'Laptop Pro', status: InventoryStatus.IN_USE }));
      expect(inventory.createItem).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledOnceWith(['/inventory']);
    });

    it('logs a failed update and stays on the page', async () => {
      await setup({ id: 'i1', loaded: of(stored) });
      const failure = new Error('boom');
      inventory.updateItem.and.returnValue(throwError(() => failure));

      component.onSubmit();

      expect(logger.error).toHaveBeenCalledWith('Error updating item', failure);
      expect(navigate).not.toHaveBeenCalled();
      expect(component.loading()).toBeFalse();
    });

    it('goes back to the inventory, and logs it, when the item cannot be loaded', async () => {
      const failure = new Error('gone');
      await setup({ id: 'i1', loaded: throwError(() => failure) });

      expect(logger.error).toHaveBeenCalledWith('Error loading item', failure);
      expect(navigate).toHaveBeenCalledOnceWith(['/inventory']);
      expect(component.loading()).toBeFalse();
    });
  });

  it('cancel goes back to the inventory', async () => {
    await setup();

    component.onCancel();

    expect(navigate).toHaveBeenCalledOnceWith(['/inventory']);
  });
});
