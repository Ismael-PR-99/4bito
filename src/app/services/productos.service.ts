import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProductoApi {
  id: number;
  name: string;
  price: number;
  discountPercent?: number;
  discountedPrice?: number | null;
  team: string;
  year: number;
  league: string;
  imageUrl: string;
  category: string;
  sizes: { size: string; stock: number }[];
  isNew?: boolean;
}

export type SortOption = 'newest' | 'price-asc' | 'price-desc';

export interface PagedResult {
  products: ProductoApi[];
  total:    number;
  page:     number;
  limit:    number;
}

export interface TallaForm {
  size: string;
  stock: number;
}

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly baseUrl    = `${environment.apiUrl}/products`;
  private readonly decadesUrl = `${environment.apiUrl}/decades`;
  private http = inject(HttpClient);

  private readonly _store$ = new BehaviorSubject<ProductoApi[]>([]);
  readonly products$ = this._store$.asObservable();

  applyLocalDiscount(productId: number, discountPercent: number, discountedPrice: number | null): void {
    const updated = this._store$.getValue().map(p => {
      if (p.id !== productId) return p;
      return { ...p, discountPercent, discountedPrice };
    });
    this._store$.next(updated);
  }

  resetLocalDiscount(productId: number): void {
    this.applyLocalDiscount(productId, 0, null);
  }

  getByCategory(category: string, page = 1): Observable<PagedResult> {
    return this.http.get<any>(`${this.baseUrl}?category=${category}&page=${page}`).pipe(map(res => res.data));
  }

  getById(id: number): Observable<ProductoApi> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(map(res => res.data));
  }

  crear(formData: FormData): Observable<{ mensaje: string; producto: ProductoApi }> {
    return this.http.post<any>(this.baseUrl, formData).pipe(map(res => res.data));
  }

  actualizar(id: string, formData: FormData): Observable<{ mensaje: string; producto: ProductoApi }> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, formData).pipe(map(res => res.data));
  }

  eliminar(id: string): Observable<{ mensaje: string; id: number }> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`).pipe(map(res => res.data));
  }

  getDecades(): Observable<string[]> {
    return this.http.get<any>(this.decadesUrl).pipe(map(res => res.data));
  }

  getByDecade(decade: string, sort: SortOption = 'newest', page = 1): Observable<PagedResult> {
    return this.http.get<any>(`${this.baseUrl}?decade=${decade}&sort=${sort}&page=${page}`).pipe(map(res => res.data));
  }

  getAllProducts(sort: SortOption = 'newest', page = 1): Observable<PagedResult> {
    return this.http.get<any>(`${this.baseUrl}?sort=${sort}&page=${page}`).pipe(
      map(res => res.data),
      tap(result => this._store$.next(result.products))
    );
  }

  getNewProducts(sort: SortOption = 'newest', page = 1): Observable<PagedResult> {
    return this.http.get<any>(`${this.baseUrl}?new=1&sort=${sort}&page=${page}`).pipe(map(res => res.data));
  }

  getFiltered(params: {
    decade?: string;
    category?: string;
    isNew?: boolean;
    sort?: SortOption;
    page?: number;
    search?: string;
  }): Observable<PagedResult> {
    const q = new URLSearchParams();
    if (params.decade)   q.set('decade',   params.decade);
    if (params.category) q.set('category', params.category);
    if (params.isNew)    q.set('new', '1');
    if (params.sort)     q.set('sort',     params.sort);
    if (params.page)     q.set('page',     String(params.page));
    if (params.search?.trim()) q.set('search', params.search.trim());
    return this.http.get<any>(`${this.baseUrl}?${q.toString()}`).pipe(map(res => res.data));
  }
}
