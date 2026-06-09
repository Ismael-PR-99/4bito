import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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

  getReviews(productId: number): Observable<{ reviews: Review[]; avg_rating: number; total: number }> {
    return this.http.get<any>(`${this.baseUrl}?product_id=${productId}`).pipe(
      map(res => res.data),
      catchError(() => of({ reviews: [], avg_rating: 0, total: 0 }))
    );
  }

  createReview(productId: number, rating: number, comment: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, { productId, rating, comment }).pipe(
      map(res => res.data)
    );
  }

  getPending(): Observable<Review[]> {
    return this.http.get<any>(`${this.baseUrl}/moderate?status=pending`).pipe(
      map(res => res.data),
      catchError(() => of([]))
    );
  }

  moderate(id: number, action: 'approve' | 'delete'): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/moderate`, { id, action }).pipe(
      map(res => res.data)
    );
  }
}
