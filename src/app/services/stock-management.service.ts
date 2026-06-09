import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface StockMovement {
  id: number;
  product_id: number;
  product_name: string;
  size: string;
  type: 'entrada' | 'salida' | 'ajuste' | 'devolucion';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  order_id: string | null;
  admin_id: number | null;
  created_at: string;
}

export interface StockAlert {
  id: number;
  product_id: number;
  product_name: string;
  size: string;
  current_stock: number;
  threshold: number;
  created_at: string;
}

export interface WaitlistItem {
  product_id: number;
  product_name: string;
  imageUrl: string;
  size: string;
  waiting_count: number;
}

@Injectable({ providedIn: 'root' })
export class StockManagementService {
  private readonly baseUrl = environment.apiUrl;
  private http = inject(HttpClient);

  getAlerts(): Observable<{ alerts: StockAlert[]; total: number }> {
    return this.http.get<any>(`${this.baseUrl}/alerts`).pipe(
      map(res => res.data),
      catchError(() => of({ alerts: [], total: 0 }))
    );
  }

  checkLowStock(data: {
    productId: number; productName: string; size: string;
    currentStock: number; threshold: number;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/alerts/check`, data).pipe(
      catchError(() => of(null))
    );
  }

  ignoreAlert(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/alerts/ignore`, { id });
  }

  getMovements(params: {
    product_id?: number;
    type?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  } = {}): Observable<{ movements: StockMovement[]; total: number }> {
    const q = new URLSearchParams();
    if (params.product_id) q.set('product_id', String(params.product_id));
    if (params.type)       q.set('type',        params.type);
    if (params.date_from)  q.set('date_from',   params.date_from);
    if (params.date_to)    q.set('date_to',      params.date_to);
    if (params.limit)      q.set('limit',        String(params.limit));
    if (params.offset)     q.set('offset',       String(params.offset));

    return this.http.get<any>(`${this.baseUrl}/stock-movements?${q.toString()}`).pipe(
      map(res => res.data),
      catchError(() => of({ movements: [], total: 0 }))
    );
  }

  getWaitlist(): Observable<WaitlistItem[]> {
    return this.http.get<any>(`${this.baseUrl}/stock-notifications/waitlist`).pipe(
      map(res => res.data),
      catchError(() => of([]))
    );
  }

  notifyWaitlist(productId: number, size: string): Observable<{ notified: number }> {
    return this.http.post<any>(`${this.baseUrl}/stock-notifications/notify`, { productId, size }).pipe(
      map(res => res.data)
    );
  }
}
