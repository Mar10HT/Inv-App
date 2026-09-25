import { TestBed } from '@angular/core/testing';
import { Socket } from 'socket.io-client';

import { SOCKET_IO, WebSocketService } from './websocket.service';
import { provideTestBedDefaults } from '../../testing/test-providers';

describe('WebSocketService', () => {
  let service: WebSocketService;
  let sockets: { connected: boolean; on: jasmine.Spy; disconnect: jasmine.Spy }[];
  let io: jasmine.Spy;

  beforeEach(() => {
    sockets = [];
    io = jasmine.createSpy('io').and.callFake(() => {
      const socket = { connected: false, on: jasmine.createSpy('on'), disconnect: jasmine.createSpy('disconnect') };
      sockets.push(socket);
      return socket as unknown as Socket;
    });

    TestBed.configureTestingModule({
      providers: [...provideTestBedDefaults(), { provide: SOCKET_IO, useValue: io }]
    });
    service = TestBed.inject(WebSocketService);
  });

  describe('connect', () => {
    it('opens a socket', () => {
      service.connect();

      expect(io).toHaveBeenCalledTimes(1);
    });

    it('does not open a second socket while the first one is still connecting', () => {
      service.connect();
      // The handshake has not finished, so the first socket reports connected = false.
      service.connect();

      expect(io).toHaveBeenCalledTimes(1);
    });

    it('does not open a second socket once connected either', () => {
      service.connect();
      sockets[0].connected = true;

      service.connect();

      expect(io).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('closes the socket', () => {
      service.connect();

      service.disconnect();

      expect(sockets[0].disconnect).toHaveBeenCalledTimes(1);
    });

    it('lets connect open a fresh socket afterwards, for the next user', () => {
      service.connect();
      service.disconnect();

      service.connect();

      expect(io).toHaveBeenCalledTimes(2);
    });

    it('does nothing when there is no socket', () => {
      expect(() => service.disconnect()).not.toThrow();
    });
  });
});
