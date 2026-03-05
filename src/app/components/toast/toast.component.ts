import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastComponent implements OnInit, OnDestroy {
  private toastService = inject(ToastService);
  private sub!: Subscription;

  toast: Toast | null = null;
  visible = false;
  private hideTimer: any;

  ngOnInit(): void {
    this.sub = this.toastService.getToast().subscribe(t => {
      if (t) {
        this.toast   = t;
        this.visible = true;
        clearTimeout(this.hideTimer);
        this.hideTimer = setTimeout(() => { this.visible = false; }, 3000);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
