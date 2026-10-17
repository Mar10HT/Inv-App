import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { Clients } from './clients';
import { ClientFormDialog } from './client-form-dialog';
import { ClientService } from '../../services/client.service';
import { ConfirmService } from '../../services/confirm.service';
import { NotificationService } from '../../services/notification.service';
import { Client } from '../../interfaces/client.interface';
import { CrudDialogData } from '../shared/crud-dialog/crud-dialog-config.interface';
import { provideTestBedDefaults } from '../../../testing/test-providers';
import { client } from '../../../testing/report-fixtures';

const acme = client('c1', 'Acme');
const globex = client('c2', 'Globex');

describe('Clients', () => {
  let component: Clients;
  let fixture: ComponentFixture<Clients>;
  let clients: ReturnType<typeof signal<Client[]>>;
  let service: jasmine.SpyObj<ClientService>;
  let dialog: { open: jasmine.Spy };
  let confirm: jasmine.SpyObj<ConfirmService>;
  let notifications: jasmine.SpyObj<NotificationService>;

  /** Closes every dialog it opens with `result`. */
  const closeWith = (result: unknown): void => {
    dialog.open.and.returnValue({ afterClosed: () => of(result) });
  };

  const openedData = (): CrudDialogData<Client> => dialog.open.calls.mostRecent().args[1].data;

  beforeEach(async () => {
    clients = signal([acme, globex]);
    service = jasmine.createSpyObj<ClientService>(
      'ClientService',
      ['getAll', 'create', 'update', 'delete'],
      { clients, loading: signal(false), error: signal(null) } as never
    );
    service.getAll.and.returnValue(of([acme, globex]));
    service.create.and.returnValue(of(acme));
    service.update.and.returnValue(of(acme));
    service.delete.and.returnValue(of(undefined));
    dialog = { open: jasmine.createSpy('open') };
    closeWith(undefined);
    confirm = jasmine.createSpyObj<ConfirmService>('ConfirmService', ['ask']);
    confirm.ask.and.returnValue(of(true));
    notifications = jasmine.createSpyObj<NotificationService>('NotificationService', ['created', 'updated', 'deleted', 'handleError']);

    await TestBed.configureTestingModule({
      imports: [Clients],
      providers: [
        ...provideTestBedDefaults(),
        { provide: ClientService, useValue: service },
        { provide: MatDialog, useValue: dialog },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Clients);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('loading', () => {
    it('asks the service for the list when it opens', () => {
      expect(service.getAll).toHaveBeenCalledTimes(1);
    });

    it('tells the user when the list fails to load', () => {
      const failure = new Error('boom');
      service.getAll.and.returnValue(throwError(() => failure));

      TestBed.createComponent(Clients).detectChanges();

      expect(notifications.handleError).toHaveBeenCalledWith(failure as never);
    });

    it('counts the clients it shows', () => {
      expect(component.stats().total).toBe(2);

      clients.set([acme]);

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

  describe('addClient', () => {
    it('opens the form in add mode', () => {
      component.addClient();

      expect(dialog.open).toHaveBeenCalledOnceWith(
        ClientFormDialog,
        jasmine.objectContaining({ width: '500px', data: jasmine.objectContaining({ mode: 'add' }) })
      );
    });

    it('says the client was created, with its name, when the form saved it', () => {
      closeWith({ saved: true, name: 'Acme' });

      component.addClient();

      expect(notifications.created).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.CLIENT', 'Acme');
    });

    it('says nothing when the form was dismissed', () => {
      component.addClient();
      closeWith({ saved: false });
      component.addClient();

      expect(notifications.created).not.toHaveBeenCalled();
    });

    it('gives the form the service calls that create and update', () => {
      component.addClient();

      openedData().createFn({ name: 'New' });
      openedData().updateFn('c1', { name: 'Renamed' });

      expect(service.create).toHaveBeenCalledOnceWith({ name: 'New' } as never);
      expect(service.update).toHaveBeenCalledOnceWith('c1', { name: 'Renamed' } as never);
    });
  });

  describe('editClient', () => {
    it('opens the form in edit mode with the client', () => {
      component.editClient(acme);

      expect(openedData()).toEqual(jasmine.objectContaining({ mode: 'edit', entity: acme }));
    });

    it('says the client was updated when the form saved it', () => {
      closeWith({ saved: true, name: 'Acme' });

      component.editClient(acme);

      expect(notifications.updated).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.CLIENT', 'Acme');
    });

    it('says nothing when the form was dismissed', () => {
      component.editClient(acme);

      expect(notifications.updated).not.toHaveBeenCalled();
    });
  });

  describe('deleteClient', () => {
    it('asks the user to confirm before deleting', () => {
      component.deleteClient(acme);

      expect(confirm.ask).toHaveBeenCalledOnceWith(jasmine.objectContaining({ type: 'danger' }));
    });

    it('deletes the client and says so once confirmed', () => {
      component.deleteClient(acme);

      expect(service.delete).toHaveBeenCalledOnceWith('c1');
      expect(notifications.deleted).toHaveBeenCalledOnceWith('NOTIFICATIONS.ENTITIES.CLIENT', 'Acme');
    });

    it('deletes nothing when the user cancels', () => {
      confirm.ask.and.returnValue(of(false));

      component.deleteClient(acme);

      expect(service.delete).not.toHaveBeenCalled();
      expect(notifications.deleted).not.toHaveBeenCalled();
    });

    it('reports a failed delete and does not say it was deleted', () => {
      const failure = new Error('in use');
      service.delete.and.returnValue(throwError(() => failure));

      component.deleteClient(acme);

      expect(notifications.handleError).toHaveBeenCalledOnceWith(failure as never, 'NOTIFICATIONS.ENTITIES.CLIENT');
      expect(notifications.deleted).not.toHaveBeenCalled();
    });
  });

  it('tracks the clients by id', () => {
    expect(component.trackByFn(0, acme)).toBe('c1');
  });
});
