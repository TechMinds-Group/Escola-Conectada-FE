import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notifications = signal<Notification[]>([]);
  public readonly activeNotifications = this.notifications.asReadonly();
  private nextId = 0;

  show(message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 5000) {
    const id = this.nextId++;
    const notification: Notification = { id, type, message, duration };

    this.notifications.update((n) => [...n, notification]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  success(message: string, duration: number = 5000) {
    this.show(message, 'success', duration);
  }

  error(message: string, duration: number = 8000) {
    this.show(message, 'error', duration);
  }

  info(message: string, duration: number = 5000) {
    this.show(message, 'info', duration);
  }

  remove(id: number) {
    this.notifications.update((n) => n.filter((x) => x.id !== id));
  }
}
