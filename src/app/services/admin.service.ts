import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { environment } from '../../environments/environment';

export interface PedidoProducto {
  id: number;
  nombre: string;
  imageUrl: string;
  talla: string;
  cantidad: number;
  precio: number;
}

export interface HistorialEstado {
  estado: string;
  fecha: string;
}

export interface Pedido {
  id: number;
  clienteNombre: string;
  clienteEmail: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  cp: string;
  pais: string;
  productos: PedidoProducto[];
  total: number;
  estado: 'procesando' | 'enviado' | 'entregado' | 'cancelado';
  fechaCreacion: string;
  paypalTransactionId?: string;
  historialEstados: HistorialEstado[];
}

export interface Metricas {
  totalProductos: number;
  vendidosHoy: number;
  vendidosAyer: number;
  ingresosHoy: number;
  ingresosAyer: number;
  pedidosPendientes: number;
  pedidosPendientesAyer: number;
}

export interface VentaDia {
  fecha: string;
  ingresos: number;
  pedidos: number;
}

export interface TopProducto {
  id: number;
  nombre: string;
  imageUrl: string;
  unidadesVendidas: number;
  ingresos: number;
}

export interface ResumenMes {
  ingresos: number;
  pedidosCompletados: number;
  ticketMedio: number;
  productoEstrella: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly apiBase = environment.apiUrl;

  private http   = inject(HttpClient);
  private auth   = inject(AuthService);
  private router = inject(Router);
  private toast  = inject(ToastService);

  private handleAuthError(err: any): Observable<never> {
    if (err.status === 401 || err.status === 403) {
      this.auth.logout();
      this.toast.show('SESIÓN EXPIRADA', 'error');
      this.router.navigate(['/']);
    }
    return throwError(() => err);
  }

  getMetricas(): Observable<Metricas> {
    return this.http.get<any>(`${this.apiBase}/admin/metrics`).pipe(
      map(res => res.data),
      catchError(e => this.handleAuthError(e))
    ) as Observable<Metricas>;
  }

  getPedidos(estado?: string): Observable<Pedido[]> {
    const q = estado && estado !== 'todos' ? `?estado=${estado}` : '';
    return this.http.get<any>(`${this.apiBase}/orders${q}`).pipe(
      map(res => res.data),
      catchError(e => this.handleAuthError(e))
    ) as Observable<Pedido[]>;
  }

  getPedidoDetalle(id: number): Observable<Pedido> {
    return this.http.get<any>(`${this.apiBase}/orders/${id}`).pipe(
      map(res => res.data),
      catchError(e => this.handleAuthError(e))
    ) as Observable<Pedido>;
  }

  updateEstadoPedido(id: number, estado: string): Observable<any> {
    return this.http.put<any>(`${this.apiBase}/orders/${id}/status`, { estado }).pipe(
      map(res => res.data),
      catchError(e => this.handleAuthError(e))
    );
  }

  getVentasChart(): Observable<VentaDia[]> {
    return this.http.get<any>(`${this.apiBase}/orders/stats?tipo=chart`).pipe(
      map(res => res.data),
      catchError(e => this.handleAuthError(e))
    ) as Observable<VentaDia[]>;
  }

  getTopProductos(): Observable<{ productos: TopProducto[]; resumen: ResumenMes }> {
    return this.http.get<any>(`${this.apiBase}/orders/stats?tipo=top`).pipe(
      map(res => res.data),
      catchError(e => this.handleAuthError(e))
    ) as Observable<{ productos: TopProducto[]; resumen: ResumenMes }>;
  }

  updateStock(productoId: number, stock: Record<string, number>): Observable<any> {
    return this.http.put<any>(`${this.apiBase}/products/${productoId}/stock`, { stock }).pipe(
      map(res => res.data),
      catchError(e => this.handleAuthError(e))
    );
  }
}
