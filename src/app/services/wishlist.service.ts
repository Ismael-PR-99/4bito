import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProductoApi } from './productos.service';
import { environment } from '../../environments/environment';

const LS_KEY = '4bito_wishlist';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly apiUrl = `${environment.apiUrl}/wishlist`;
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private _ids = signal<Set<number>>(this.loadFromLocalStorage());

  readonly ids = computed(() => this._ids());
  readonly count = computed(() => this._ids().size);

  private loadFromLocalStorage(): Set<number> {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return new Set();
      const arr: number[] = JSON.parse(raw);
      return new Set(arr);
    } catch {
      return new Set();
    }
  }

  private persist(): void {
    localStorage.setItem(LS_KEY, JSON.stringify([...this._ids()]));
  }

  isInWishlist(productId: number): boolean {
    return this._ids().has(productId);
  }

  toggle(product: ProductoApi): void {
    const newSet = new Set(this._ids());
    if (newSet.has(product.id)) {
      newSet.delete(product.id);
    } else {
      newSet.add(product.id);
    }
    this._ids.set(newSet);
    this.persist();

    if (this.auth.isLoggedIn()) {
      this.http.post(`${this.apiUrl}/toggle`, { productId: product.id })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
  }

  syncFromApi(): Observable<any> {
    if (!this.auth.isLoggedIn()) return of(null);
    return this.http.get<any>(this.apiUrl).pipe(
      map(res => res.data),
      tap(products => {
        const apiIds = new Set<number>((products ?? []).map((p: ProductoApi) => p.id));
        const localIds = this._ids();
        localIds.forEach(id => {
          if (!apiIds.has(id)) {
            this.http.post(`${this.apiUrl}/toggle`, { productId: id })
              .pipe(catchError(() => of(null)))
              .subscribe();
            apiIds.add(id);
          }
        });
        this._ids.set(apiIds);
        this.persist();
      }),
      catchError(() => of(null))
    );
  }

  getWishlistItems(): Observable<ProductoApi[]> {
    if (!this.auth.isLoggedIn()) return of([]);
    return this.http.get<any>(this.apiUrl).pipe(map(res => res.data));
  }
}
