import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProductoApi } from './productos.service';

const LS_KEY = '4bito_wishlist';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly apiUrl = 'http://localhost/4bito/4bito-api/wishlist';
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

    // Sincronizar con API si logado
    if (this.auth.isLoggedIn()) {
      const token = this.auth.getToken();
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
      this.http.post(`${this.apiUrl}/toggle.php`, { productId: product.id }, { headers })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
  }

  /** Carga wishlist desde API y fusiona con localStorage */
  syncFromApi(): Observable<any> {
    if (!this.auth.isLoggedIn()) return of(null);
    const token = this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<{ productos: ProductoApi[] }>(`${this.apiUrl}/list.php`, { headers }).pipe(
      tap(res => {
        const apiIds = new Set<number>((res.productos ?? []).map((p: ProductoApi) => p.id));
        const localIds = this._ids();
        // Subir a la API los IDs que están en local pero no en la BD
        localIds.forEach(id => {
          if (!apiIds.has(id)) {
            this.http.post(`${this.apiUrl}/toggle.php`, { productId: id }, { headers })
              .pipe(catchError(() => of(null)))
              .subscribe();
            apiIds.add(id);
          }
        });
        // Unión de ambas fuentes
        this._ids.set(apiIds);
        this.persist();
      }),
      catchError(() => of(null))
    );
  }

  getWishlistItems(): Observable<{ productos: ProductoApi[] }> {
    if (!this.auth.isLoggedIn()) return of({ productos: [] });
    const token = this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<{ productos: ProductoApi[] }>(`${this.apiUrl}/list.php`, { headers });
  }
}
