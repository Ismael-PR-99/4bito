import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, combineLatest } from 'rxjs';
import { CartItem, DiscountCode, AppliedDiscount } from '../models/cart-item.model';
import { Producto } from '../models/producto.model';

const CART_KEY     = '4bito_cart';
const DISCOUNT_KEY = '4bito_discount';

const VALID_CODES: DiscountCode[] = [
  { code: 'RETRO10', discount: 10 },
  { code: 'VIP20',   discount: 20 },
];

@Injectable({ providedIn: 'root' })
export class CartService {

  private items$    = new BehaviorSubject<CartItem[]>(this.loadCart());
  private discount$ = new BehaviorSubject<AppliedDiscount | null>(this.loadDiscount());

  // ── Observables públicos ─────────────────────────────────────────────────

  getItems(): Observable<CartItem[]> {
    return this.items$.asObservable();
  }

  getDiscount(): Observable<AppliedDiscount | null> {
    return this.discount$.asObservable();
  }

  getItemCount(): Observable<number> {
    return this.items$.pipe(
      map(items => items.reduce((acc, i) => acc + i.cantidad, 0))
    );
  }

  getSubtotal(): Observable<number> {
    return this.items$.pipe(
      map(items => items.reduce((acc, i) => acc + i.precio * i.cantidad, 0))
    );
  }

  getTotal(): Observable<number> {
    return combineLatest([this.getSubtotal(), this.discount$]).pipe(
      map(([sub, disc]) => {
        const shipping = sub >= 50 ? 0 : 4.99;
        const discAmt  = disc ? (sub * disc.discount) / 100 : 0;
        return Math.max(0, sub - discAmt + shipping);
      })
    );
  }

  // ── Mutaciones ──────────────────────────────────────────────────────────

  addToCart(producto: Producto, talla: string, cantidad: number): void {
    const items = [...this.items$.value];
    const idx   = items.findIndex(i => i.id === producto.id && i.talla === talla);

    if (idx > -1) {
      items[idx] = {
        ...items[idx],
        cantidad: Math.min(items[idx].cantidad + cantidad, 10),
      };
    } else {
      items.push({
        id:             producto.id,
        nombre:         producto.nombre,
        imagen:         producto.imageUrl,
        precio:         producto.precio,
        precioOriginal: producto.precioOriginal,
        talla,
        cantidad,
      });
    }

    this.setItems(items);
  }

  removeItem(id: string, talla: string): void {
    this.setItems(this.items$.value.filter(i => !(i.id === id && i.talla === talla)));
  }

  updateQuantity(id: string, talla: string, delta: number): void {
    const items = this.items$.value.map(i => {
      if (i.id === id && i.talla === talla) {
        const nueva = i.cantidad + delta;
        return nueva < 1 ? null : { ...i, cantidad: Math.min(nueva, 10) };
      }
      return i;
    }).filter(Boolean) as CartItem[];
    this.setItems(items);
  }

  clearCart(): void {
    this.setItems([]);
    this.setDiscount(null);
  }

  // ── Códigos de descuento ─────────────────────────────────────────────────

  applyCode(code: string): 'valid' | 'invalid' {
    const found = VALID_CODES.find(c => c.code === code.toUpperCase().trim());
    if (found) {
      this.setDiscount({ code: found.code, discount: found.discount });
      return 'valid';
    }
    return 'invalid';
  }

  removeDiscount(): void {
    this.setDiscount(null);
  }

  // ── Persistencia ─────────────────────────────────────────────────────────

  private setItems(items: CartItem[]): void {
    this.items$.next(items);
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }

  private setDiscount(d: AppliedDiscount | null): void {
    this.discount$.next(d);
    if (d) {
      localStorage.setItem(DISCOUNT_KEY, JSON.stringify(d));
    } else {
      localStorage.removeItem(DISCOUNT_KEY);
    }
  }

  private loadCart(): CartItem[] {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]');
    } catch {
      return [];
    }
  }

  private loadDiscount(): AppliedDiscount | null {
    try {
      const raw = localStorage.getItem(DISCOUNT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
