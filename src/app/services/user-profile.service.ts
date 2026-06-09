import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface UserSizes {
  camisetas:  string | null;
  chaquetas:  string | null;
  pantalones: string | null;
}

export interface PedidoUsuario {
  id: number;
  nombre_cliente: string;
  email: string;
  total: number;
  estado: 'procesando' | 'enviado' | 'entregado' | 'cancelado';
  fecha_creacion: string;
  paypal_transaction_id: string | null;
  productos_json: any[];
  direccion: string;
  ciudad: string;
  cp: string;
  pais: string;
  telefono: string;
}

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly sizesUrl = `${environment.apiUrl}/user/sizes`;
  private readonly ordersUrl = `${environment.apiUrl}/orders/user`;
  private http = inject(HttpClient);

  getSizes(): Observable<UserSizes> {
    return this.http.get<any>(this.sizesUrl).pipe(
      map(res => res.data),
      catchError(() => of({ camisetas: null, chaquetas: null, pantalones: null }))
    );
  }

  saveSizes(sizes: UserSizes): Observable<any> {
    return this.http.post(this.sizesUrl, sizes);
  }

  getOrders(): Observable<PedidoUsuario[]> {
    return this.http.get<any>(this.ordersUrl).pipe(
      map(res => res.data),
      catchError(() => of([]))
    );
  }
}
