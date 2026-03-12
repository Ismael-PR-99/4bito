import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface ShippingData {
  nombre:    string;
  apellidos: string;
  email:     string;
  telefono:  string;
  direccion: string;
  ciudad:    string;
  cp:        string;
  pais:      string;
}

export interface CrearPedidoData {
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  cp: string;
  pais: string;
  productos: { id: number; nombre: string; imageUrl: string; talla: string; cantidad: number; precio: number }[];
  total: number;
  paypalTransactionId?: string;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/orders`;
  private _shippingData: ShippingData | null = null;

  set shippingData(data: ShippingData) {
    this._shippingData = data;
  }

  get shippingData(): ShippingData | null {
    return this._shippingData;
  }

  hasShippingData(): boolean {
    return this._shippingData !== null;
  }

  clear(): void {
    this._shippingData = null;
  }

  crearPedido(data: CrearPedidoData): Observable<{ pedidoId: number; mensaje: string }> {
    const token = this.auth.getToken();
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
    return this.http.post<any>(
      `${this.apiUrl}/create.php`, data, { headers }
    ).pipe(map(res => res.data));
  }
}
