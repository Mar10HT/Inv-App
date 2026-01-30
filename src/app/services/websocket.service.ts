import { Injectable, inject, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';

export interface WsEvent {
  entity: string;
  action: string;
  entityId?: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private socket: Socket | null = null;
  private events$ = new Subject<{ event: string; payload: WsEvent }>();
  private connected$ = new Subject<boolean>();

  connect(token?: string): void {
    if (this.socket?.connected) return;

    const baseUrl = environment.apiUrl.replace('/api', '');

    this.socket = io(`${baseUrl}/ws`, {
      withCredentials: true,
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[WS] Connected');
      this.connected$.next(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      this.connected$.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.warn('[WS] Connection error:', error.message);
    });

    // Listen for all known events
    const eventNames = [
      'inventory:change',
      'loan:change',
      'transaction:change',
    ];

    for (const eventName of eventNames) {
      this.socket.on(eventName, (payload: WsEvent) => {
        this.events$.next({ event: eventName, payload });
      });
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(eventName: string): Observable<WsEvent> {
    return this.events$.pipe(
      filter((e) => e.event === eventName),
      map((e) => e.payload),
    );
  }

  onInventoryChange(): Observable<WsEvent> {
    return this.on('inventory:change');
  }

  onLoanChange(): Observable<WsEvent> {
    return this.on('loan:change');
  }

  onTransactionChange(): Observable<WsEvent> {
    return this.on('transaction:change');
  }

  isConnected(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.events$.complete();
    this.connected$.complete();
  }
}
