import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map, tap, switchMap } from 'rxjs';
import { ProductosService } from './productos.service';
import { environment } from '../../environments/environment';

export interface PiezaSemana {
  id: number;
  productId: number;
  discountPercent: number;
  finalPrice: number;
  validUntil: string;
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
  private productos = inject(ProductosService);

  private readonly _pieza$ = new BehaviorSubject<PiezaSemana | null>(null);
  readonly pieza$ = this._pieza$.asObservable();

  cargarPieza(): Observable<PiezaSemana | null> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(res => res.data),
      tap(pieza => {
        this._pieza$.next(pieza);
        if (pieza) {
          this.productos.applyLocalDiscount(pieza.productId, pieza.discountPercent, pieza.finalPrice);
        }
      })
    );
  }

  establecerPieza(payload: {
    productId: number;
    discountPercent: number;
    finalPrice: number;
    validUntil: string;
  }): Observable<PiezaSemana | null> {
    const prevPieza = this._pieza$.getValue();
    return this.http.post<any>(this.apiUrl, payload).pipe(
      switchMap(() => {
        if (prevPieza && prevPieza.productId !== payload.productId) {
          this.productos.resetLocalDiscount(prevPieza.productId);
        }
        return this.cargarPieza();
      })
    );
  }

  desactivarExpiradas(): Observable<{ deactivated: number }> {
    return this.http.post<any>(`${this.apiUrl}/deactivate`, {}).pipe(
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

  precioEfectivo(price: number, discountedPrice: number | null | undefined): number {
    return discountedPrice != null ? discountedPrice : price;
  }

  badgePercent(originalPrice: number, finalPrice: number): number {
    return Math.round((1 - finalPrice / originalPrice) * 100);
  }
}
