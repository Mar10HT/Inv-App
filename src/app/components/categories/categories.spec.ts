import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { Categories } from './categories';
import { CategoryFormDialog } from './category-form-dialog';
import { CategoryService } from '../../services/category.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import { Category } from '../../interfaces/category.interface';
import { CrudDialogData } from '../shared/crud-dialog/crud-dialog-config.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

const tools = { id: 'c1', name: 'Tools' } as Category;
const cables = { id: 'c2', name: 'Cables' } as Category;

describe('Categories', () => {
  let component: Categories;
  let fixture: ComponentFixture<Categories>;
  let categories: ReturnType<typeof signal<Category[]>>;
  let service: jasmine.SpyObj<CategoryService>;
  let dialog: { open: jasmine.Spy };
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  /** Closes every dialog it opens with `result`. */
  const closeWith = (result: unknown): void => {
    dialog.open.and.returnValue({ afterClosed: () => of(result) });
  };

  const openedData = (): CrudDialogData<Category> => dialog.open.calls.mostRecent().args[1].data;

  beforeEach(async () => {
    categories = signal([tools, cables]);
    service = jasmine.createSpyObj<CategoryService>(
      'CategoryService',
      ['getAll', 'create', 'update', 'delete'],
      { categories, loading: signal(false), error: signal(null) } as never
    );
    service.getAll.and.returnValue(of([tools, cables]));
    service.create.and.returnValue(of(tools));
    service.update.and.returnValue(of(tools));
    service.delete.and.returnValue(of(undefined));
    dialog = { open: jasmine.createSpy('open') };
    closeWith(undefined);
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['created', 'updated', 'deleted', 'handleError']);

    await TestBed.configureTestingModule({
      imports: [Categories],
      providers: [
        ...provideTestBedDefaults(),
        { provide: CategoryService, useValue: service },
        { provide: MatDialog, useValue: dialog },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Categories);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('loading', () => {
    it('asks the service for the list when it opens', () => {
      expect(service.getAll).toHaveBeenCalledTimes(1);
    });

    it('tells the user when the list fails to load', () => {
      const failure = new Error('boom');
      service.getAll.and.returnValue(throwError(() => failure));

      TestBed.createComponent(Categories).detectChanges();

      expect(notifications.handleError).toHaveBeenCalledWith(failure as never);
    });

    it('counts the categories it shows', () => {
      expect(component.stats().total).toBe(2);

      categories.set([tools]);

      expect(component.stats().total).toBe(1);
    });

    it('follows the loading and error state of the service', () => {
      const state = service as unknown as { loading: WritableSignal<boolean>; error: WritableSignal<string | null> };
      expect(component.loading()).toBeFalse();
      expect(component.error()).toBeNull();

      state.loading.set(true);
      state.error.set('boom');

      expect(component.loading()).toBeTrue();
      expect(component.error()).toBe('boom');
    });
  });

  describe('addCategory', () => {
    it('opens the form in add mode', () => {
      component.addCategory();

      expect(dialog.open).toHaveBeenCalledOnceWith(
        CategoryFormDialog,
        jasmine.objectContaining({ width: '500px', data: jasmine.objectContaining({ mode: 'add' }) })
      );
    });

    it('says the category was created, with its name, when the form saved it', () => {
      closeWith({ saved: true, name: 'Tools' });

      component.addCategory();

      expect(notifications.created).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.CATEGORY', 'Tools');
    });

    it('says nothing when the form was dismissed', () => {
      closeWith(undefined);

      component.addCategory();
      closeWith({ saved: false });
      component.addCategory();

      expect(notifications.created).not.toHaveBeenCalled();
    });

    it('gives the form the service calls that create and update', () => {
      component.addCategory();

      openedData().createFn({ name: 'New' });
      openedData().updateFn('c1', { name: 'Renamed' });

      expect(service.create).toHaveBeenCalledOnceWith({ name: 'New' } as never);
      expect(service.update).toHaveBeenCalledOnceWith('c1', { name: 'Renamed' } as never);
    });
  });

  describe('editCategory', () => {
    it('opens the form in edit mode with the category', () => {
      component.editCategory(tools);

      expect(openedData()).toEqual(jasmine.objectContaining({ mode: 'edit', entity: tools }));
    });

    it('says the category was updated when the form saved it', () => {
      closeWith({ saved: true, name: 'Tools' });

      component.editCategory(tools);

      expect(notifications.updated).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.CATEGORY', 'Tools');
    });

    it('says nothing when the form was dismissed', () => {
      component.editCategory(tools);

      expect(notifications.updated).not.toHaveBeenCalled();
    });
  });

  describe('deleteCategory', () => {
    it('asks the user to confirm, naming the category', () => {
      component.deleteCategory(tools);

      expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'danger' }));
    });

    it('deletes the category and says so once confirmed', () => {
      component.deleteCategory(tools);

      expect(service.delete).toHaveBeenCalledOnceWith('c1');
      expect(notifications.deleted).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.CATEGORY', 'Tools');
    });

    it('deletes nothing when the user cancels', () => {
      confirm.ask.and.returnValue(of(false));

      component.deleteCategory(tools);

      expect(service.delete).not.toHaveBeenCalled();
      expect(notifications.deleted).not.toHaveBeenCalled();
    });

    it('reports a failed delete and does not say it was deleted', () => {
      const failure = new Error('in use');
      service.delete.and.returnValue(throwError(() => failure));

      component.deleteCategory(tools);

      expect(notifications.handleError).toHaveBeenCalledOnceWith(failure as never, 'NOTIFICATIONS.ENTITIES.CATEGORY');
      expect(notifications.deleted).not.toHaveBeenCalled();
    });
  });

  it('tracks the categories by id', () => {
    expect(component.trackByFn(0, tools)).toBe('c1');
  });
});
