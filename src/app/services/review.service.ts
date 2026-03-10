import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

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
  private readonly baseUrl = 'http://localhost/4bito/4bito-api/reviews';
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  getReviews(productId: number): Observable<{ reviews: Review[]; avg_rating: number; total: number }> {
    return this.http.get<any>(`${this.baseUrl}/list.php?product_id=${productId}`).pipe(
      catchError(() => of({ reviews: [], avg_rating: 0, total: 0 }))
    );
  }

  createReview(productId: number, rating: number, comment: string): Observable<any> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    return this.http.post(`${this.baseUrl}/create.php`, { productId, rating, comment }, { headers });
  }

  /** Admin: listar reseñas pendientes */
  getPending(): Observable<{ reviews: Review[] }> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any>(`${this.baseUrl}/moderate.php?status=pending`, { headers }).pipe(
      catchError(() => of({ reviews: [] }))
    );
  }

  /** Admin: aprobar o eliminar */
  moderate(id: number, action: 'approve' | 'delete'): Observable<any> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    return this.http.post(`${this.baseUrl}/moderate.php`, { id, action }, { headers });
  }
}
