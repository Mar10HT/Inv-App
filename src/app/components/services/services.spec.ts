import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { Services } from './services';
import { ServiceFormDialog } from './service-form-dialog';
import { ServiceCatalogService } from '../../services/service-catalog.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import { Service } from '../../interfaces/service.interface';
import { CrudDialogData } from '../shared/crud-dialog/crud-dialog-config.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';

const tools = { id: 'c1', name: 'Tools', price: 850, currency: 'HNL' } as Service;
const cables = { id: 'c2', name: 'Cables', price: null, currency: 'USD' } as Service;

describe('Services', () => {
  let component: Services;
  let fixture: ComponentFixture<Services>;
  let services: ReturnType<typeof signal<Service[]>>;
  let service: jasmine.SpyObj<ServiceCatalogService>;
  let dialog: { open: jasmine.Spy };
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  /** Closes every dialog it opens with `result`. */
  const closeWith = (result: unknown): void => {
    dialog.open.and.returnValue({ afterClosed: () => of(result) });
  };

  const openedData = (): CrudDialogData<Service> => dialog.open.calls.mostRecent().args[1].data;

  beforeEach(async () => {
    services = signal([tools, cables]);
    service = jasmine.createSpyObj<ServiceCatalogService>(
      'ServiceCatalogService',
      ['getAll', 'create', 'update', 'delete'],
      { services, loading: signal(false), error: signal(null) } as never
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
      imports: [Services],
      providers: [
        ...provideTestBedDefaults(),
        { provide: ServiceCatalogService, useValue: service },
        { provide: MatDialog, useValue: dialog },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Services);
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

      TestBed.createComponent(Services).detectChanges();

      expect(notifications.handleError).toHaveBeenCalledWith(failure as never);
    });

    it('counts the services it shows', () => {
      expect(component.stats().total).toBe(2);

      services.set([tools]);

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

  describe('addService', () => {
    it('opens the form in add mode', () => {
      component.addService();

      expect(dialog.open).toHaveBeenCalledOnceWith(
        ServiceFormDialog,
        jasmine.objectContaining({ width: '500px', data: jasmine.objectContaining({ mode: 'add' }) })
      );
    });

    it('says the service was created, with its name, when the form saved it', () => {
      closeWith({ saved: true, name: 'Tools' });

      component.addService();

      expect(notifications.created).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.SERVICE', 'Tools');
    });

    it('says nothing when the form was dismissed', () => {
      closeWith(undefined);

      component.addService();
      closeWith({ saved: false });
      component.addService();

      expect(notifications.created).not.toHaveBeenCalled();
    });

    it('gives the form the service calls that create and update', () => {
      component.addService();

      openedData().createFn({ name: 'New' });
      openedData().updateFn('c1', { name: 'Renamed' });

      expect(service.create).toHaveBeenCalledOnceWith({ name: 'New' } as never);
      expect(service.update).toHaveBeenCalledOnceWith('c1', { name: 'Renamed' } as never);
    });
  });

  describe('editService', () => {
    it('opens the form in edit mode with the service', () => {
      component.editService(tools);

      expect(openedData()).toEqual(jasmine.objectContaining({ mode: 'edit', entity: tools }));
    });

    it('says the service was updated when the form saved it', () => {
      closeWith({ saved: true, name: 'Tools' });

      component.editService(tools);

      expect(notifications.updated).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.SERVICE', 'Tools');
    });

    it('says nothing when the form was dismissed', () => {
      component.editService(tools);

      expect(notifications.updated).not.toHaveBeenCalled();
    });
  });

  describe('deleteService', () => {
    it('asks the user to confirm, naming the service', () => {
      component.deleteService(tools);

      expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'danger' }));
    });

    it('deletes the service and says so once confirmed', () => {
      component.deleteService(tools);

      expect(service.delete).toHaveBeenCalledOnceWith('c1');
      expect(notifications.deleted).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.SERVICE', 'Tools');
    });

    it('deletes nothing when the user cancels', () => {
      confirm.ask.and.returnValue(of(false));

      component.deleteService(tools);

      expect(service.delete).not.toHaveBeenCalled();
      expect(notifications.deleted).not.toHaveBeenCalled();
    });

    it('reports a failed delete and does not say it was deleted', () => {
      const failure = new Error('in use');
      service.delete.and.returnValue(throwError(() => failure));

      component.deleteService(tools);

      expect(notifications.handleError).toHaveBeenCalledOnceWith(failure as never, 'NOTIFICATIONS.ENTITIES.SERVICE');
      expect(notifications.deleted).not.toHaveBeenCalled();
    });
  });

  it('tracks the services by id', () => {
    expect(component.trackByFn(0, tools)).toBe('c1');
  });

  it('shows each service with its suggested price, or that it has none', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('HNL 850.00');
    expect(text).toContain('SERVICE.NO_PRICE');
  });
});
