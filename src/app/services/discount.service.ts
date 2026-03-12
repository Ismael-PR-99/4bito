import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, map, tap, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
import { ProductosService } from './productos.service';
import { environment } from '../../environments/environment';

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
  private readonly apiUrl = `${environment.apiUrl}/pieza-semana`;
  private http      = inject(HttpClient);
  private auth      = inject(AuthService);
  private productos = inject(ProductosService);

  private readonly _pieza$ = new BehaviorSubject<PiezaSemana | null>(null);
  /** Stream público de la pieza de la semana activa */
  readonly pieza$ = this._pieza$.asObservable();

  /** Carga la pieza de la semana activa desde la API */
  cargarPieza(): Observable<PiezaSemana | null> {
    return this.http
      .get<any>(`${this.apiUrl}/get.php`)
      .pipe(
        map(res => res.data),
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
  }): Observable<PiezaSemana | null> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    // Incluir el token en el body como fallback para entornos WAMP/CGI
    // donde Apache puede filtrar el header Authorization
    const body = { ...payload, _token: token };

    // Capturar la pieza anterior para resetear su descuento en el store
    const prevPieza = this._pieza$.getValue();

    return this.http
      .post<any>(`${this.apiUrl}/set.php`, body, { headers })
      .pipe(
        // Encadenar: tras el POST exitoso, recargar la pieza desde la BD
        switchMap(() => {
          // Resetear descuento del producto ANTERIOR en el store local
          if (prevPieza && prevPieza.productId !== payload.productId) {
            this.productos.resetLocalDiscount(prevPieza.productId);
          }
          // Recargar pieza y store de productos desde la BD
          return this.cargarPieza();
        })
      );
  }

  /** Desactiva piezas expiradas (sin autenticación — expiración automática) */
  desactivarExpiradas(): Observable<{ deactivated: number }> {
    return this.http
      .post<any>(`${this.apiUrl}/deactivate.php`, {})
      .pipe(
        map(res => res.data),
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
