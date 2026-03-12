import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
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
  private readonly sizesUrl = `${environment.apiUrl}/user/sizes.php`;
  private readonly ordersUrl = `${environment.apiUrl}/orders/user.php`;
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private get headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  getSizes(): Observable<UserSizes> {
    return this.http.get<any>(this.sizesUrl, { headers: this.headers }).pipe(
      map(res => res.data),
      catchError(() => of({ camisetas: null, chaquetas: null, pantalones: null }))
    );
  }

  saveSizes(sizes: UserSizes): Observable<any> {
    return this.http.post(this.sizesUrl, sizes, {
      headers: this.headers.set('Content-Type', 'application/json'),
    });
  }

  getOrders(): Observable<PedidoUsuario[]> {
    return this.http.get<any>(this.ordersUrl, { headers: this.headers }).pipe(
      map(res => res.data),
      catchError(() => of([]))
    );
  }
}
