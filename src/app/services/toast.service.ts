import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  message: string;
  id: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  private toast$  = new BehaviorSubject<Toast | null>(null);

  getToast() {
    return this.toast$.asObservable();
  }

  show(message: string): void {
    const id = ++this.counter;
    this.toast$.next({ message, id });
    setTimeout(() => {
      if (this.toast$.value?.id === id) {
        this.toast$.next(null);
      }
    }, 3000);
  }
}
