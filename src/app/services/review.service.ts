import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface Review {
  id: number;
  product_id: number;
  user_id: number;
  user_name: string;
  rating: number;
  comment: string;
  verified: boolean;
  approved: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly baseUrl = `${environment.apiUrl}/reviews`;
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  getReviews(productId: number): Observable<{ reviews: Review[]; avg_rating: number; total: number }> {
    return this.http.get<any>(`${this.baseUrl}/list.php?product_id=${productId}`).pipe(
      map(res => res.data),
      catchError(() => of({ reviews: [], avg_rating: 0, total: 0 }))
    );
  }

  createReview(productId: number, rating: number, comment: string): Observable<any> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    return this.http.post<any>(`${this.baseUrl}/create.php`, { productId, rating, comment }, { headers }).pipe(
      map(res => res.data)
    );
  }

  /** Admin: listar reseñas pendientes */
  getPending(): Observable<Review[]> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any>(`${this.baseUrl}/moderate.php?status=pending`, { headers }).pipe(
      map(res => res.data),
      catchError(() => of([]))
    );
  }

  /** Admin: aprobar o eliminar */
  moderate(id: number, action: 'approve' | 'delete'): Observable<any> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    return this.http.post<any>(`${this.baseUrl}/moderate.php`, { id, action }, { headers }).pipe(
      map(res => res.data)
    );
  }
}
