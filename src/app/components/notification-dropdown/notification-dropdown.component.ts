import { Component, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { LucideAngularModule, Bell, Check, CheckCheck } from 'lucide-angular';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './notification-dropdown.component.html',
  styleUrl: './notification-dropdown.component.css',
})
export class NotificationDropdownComponent {
  notifSvc = inject(NotificationService);
  private elRef = inject(ElementRef);

  icons = { Bell, Check, CheckCheck };

  toggle() {
    this.notifSvc.toggle();
  }

  markRead(n: AppNotification) {
    if (!n.is_read) this.notifSvc.markAsRead(n.id);
  }

  markAllRead() {
    this.notifSvc.markAllAsRead();
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `hace ${days}d`;
  }

  typeIcon(type: string): string {
    const map: Record<string, string> = {
      return: '📦',
      order: '🛒',
      chat: '💬',
      stock: '📊',
      promo: '🎉',
    };
    return map[type] || '🔔';
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (this.notifSvc.isOpen() && !this.elRef.nativeElement.contains(e.target)) {
      this.notifSvc.close();
    }
  }
}
