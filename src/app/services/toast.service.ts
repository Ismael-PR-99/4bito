import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'warning' | 'error';

export interface Toast {
  message: string;
  id: number;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  private toast$  = new BehaviorSubject<Toast | null>(null);

  getToast() {
    return this.toast$.asObservable();
  }

  show(message: string, type: ToastType = 'success'): void {
    const id = ++this.counter;
    this.toast$.next({ message, id, type });
    setTimeout(() => {
      if (this.toast$.value?.id === id) {
        this.toast$.next(null);
      }
    }, 3500);
  }
}
