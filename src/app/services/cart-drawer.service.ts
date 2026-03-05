import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CartDrawerService {
  private open$ = new BehaviorSubject<boolean>(false);

  isOpen() {
    return this.open$.asObservable();
  }

  open(): void  { this.open$.next(true); }
  close(): void { this.open$.next(false); }
  toggle(): void { this.open$.next(!this.open$.value); }
}
