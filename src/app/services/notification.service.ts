import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface AppNotification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  url: string | null;
  is_read: number;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private api = `${environment.apiUrl}/notifications`;

  notifications = signal<AppNotification[]>([]);
  unreadCount = signal(0);
  isOpen = signal(false);

  private pollTimer: any = null;

  init() {
    if (!this.auth.isLoggedIn()) return;
    this.loadNotifications();
    this.startPolling();
  }

  toggle() {
    this.isOpen.update(v => !v);
  }

  loadNotifications() {
    if (!this.auth.isLoggedIn()) return;
    this.http.get<any>(this.api).subscribe(res => {
      const data = res.data;
      this.notifications.set(data);
      this.unreadCount.set(data.filter((n: any) => !n.is_read).length);
    });
  }

  markAsRead(id: number) {
    this.http.post(`${this.api}/mark-read`, { id }).subscribe(() => {
      this.notifications.update(list => list.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      this.unreadCount.update(c => Math.max(0, c - 1));
    });
  }

  markAllAsRead() {
    this.http.post(`${this.api}/mark-read`, {}).subscribe(() => {
      this.notifications.update(list => list.map(n => ({ ...n, is_read: 1 })));
      this.unreadCount.set(0);
    });
  }

  private startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(() => this.loadNotifications(), 15000);
  }

  private stopPolling() {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  close() {
    this.isOpen.set(false);
  }

  ngOnDestroy() {
    this.stopPolling();
  }
}
