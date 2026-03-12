import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  private sub!: Subscription;

  toast: Toast | null = null;
  visible = false;
  private hideTimer: any;
  private removeTimer: any;

  ngOnInit(): void {
    this.sub = this.toastService.getToast().subscribe(t => {
      if (t) {
        this.toast = t;
        this.visible = true;
        clearTimeout(this.hideTimer);
        clearTimeout(this.removeTimer);
        this.zone.runOutsideAngular(() => {
          this.hideTimer = setTimeout(() => {
            this.zone.run(() => {
              this.visible = false;
              this.cdr.detectChanges();
              this.removeTimer = setTimeout(() => {
                this.zone.run(() => {
                  this.toast = null;
                  this.cdr.detectChanges();
                });
              }, 300);
            });
          }, 3000);
        });
      } else {
        this.visible = false;
        this.toast = null;
      }
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    clearTimeout(this.hideTimer);
    clearTimeout(this.removeTimer);
  }
}
