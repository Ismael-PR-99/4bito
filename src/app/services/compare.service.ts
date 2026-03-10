import { Injectable, signal, computed } from '@angular/core';
import { ProductoApi } from './productos.service';

@Injectable({ providedIn: 'root' })
export class CompareService {
  private readonly MAX = 3;
  private _items = signal<ProductoApi[]>([]);

  readonly items = computed(() => this._items());
  readonly count = computed(() => this._items().length);
  readonly isFull = computed(() => this._items().length >= this.MAX);

  isInCompare(productId: number): boolean {
    return this._items().some(p => p.id === productId);
  }

  toggle(product: ProductoApi): void {
    if (this.isInCompare(product.id)) {
      this._items.update(list => list.filter(p => p.id !== product.id));
    } else if (!this.isFull()) {
      this._items.update(list => [...list, product]);
    }
  }

  remove(productId: number): void {
    this._items.update(list => list.filter(p => p.id !== productId));
  }

  clear(): void {
    this._items.set([]);
  }
}
