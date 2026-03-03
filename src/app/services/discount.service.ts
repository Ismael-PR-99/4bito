import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, map, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { ProductosService } from './productos.service';

export interface PiezaSemana {
  id: number;
  productId: number;
  discountPercent: number;
  finalPrice: number;
  validUntil: string;      // ISO datetime string
  isActive: boolean;
  name: string;
  originalPrice: number;
  imageUrl: string;
  team: string;
  year: number;
  league: string;
  category: string;
}

@Injectable({ providedIn: 'root' })
export class DiscountService {
  private readonly apiUrl = 'http://localhost/4bito/4bito-api/pieza-semana';
  private http      = inject(HttpClient);
  private auth      = inject(AuthService);
  private productos = inject(ProductosService);

  private readonly _pieza$ = new BehaviorSubject<PiezaSemana | null>(null);
  /** Stream público de la pieza de la semana activa */
  readonly pieza$ = this._pieza$.asObservable();

  /** Carga la pieza de la semana activa desde la API */
  cargarPieza(): Observable<PiezaSemana | null> {
    return this.http
      .get<{ pieza: PiezaSemana | null }>(`${this.apiUrl}/get.php`)
      .pipe(
        map(res => res.pieza),
        tap(pieza => {
          this._pieza$.next(pieza);
          // Propagar el descuento al store de productos
          if (pieza) {
            this.productos.applyLocalDiscount(
              pieza.productId,
              pieza.discountPercent,
              pieza.finalPrice
            );
          }
        })
      );
  }

  /** Establece una nueva pieza de la semana (solo admin) */
  establecerPieza(payload: {
    productId: number;
    discountPercent: number;
    finalPrice: number;
    validUntil: string;
  }): Observable<{ ok: boolean; piezaId: number }> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    return this.http.post<{ ok: boolean; piezaId: number }>(
      `${this.apiUrl}/set.php`,
      payload,
      { headers }
    ).pipe(
      tap(() => {
        // Actualizar store local inmediatamente
        this.productos.applyLocalDiscount(
          payload.productId,
          payload.discountPercent,
          payload.finalPrice
        );
        // Recargar pieza activa para actualizar el stream
        this.cargarPieza().subscribe();
      })
    );
  }

  /** Desactiva piezas expiradas (sin autenticación — expiración automática) */
  desactivarExpiradas(): Observable<{ ok: boolean; deactivated: number }> {
    return this.http
      .post<{ ok: boolean; deactivated: number }>(`${this.apiUrl}/deactivate.php`, {})
      .pipe(
        tap(res => {
          if (res.deactivated > 0) {
            const pieza = this._pieza$.getValue();
            if (pieza) {
              this.productos.resetLocalDiscount(pieza.productId);
              this._pieza$.next(null);
            }
          }
        })
      );
  }

  /** Precio efectivo: usa discountedPrice si hay descuento activo */
  precioEfectivo(price: number, discountedPrice: number | null | undefined): number {
    return discountedPrice != null ? discountedPrice : price;
  }

  /** % de descuento para badge */
  badgePercent(originalPrice: number, finalPrice: number): number {
    return Math.round((1 - finalPrice / originalPrice) * 100);
  }
}
