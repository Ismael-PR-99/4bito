import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, map, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

// ── Modelo de producto tal como llega de la API ────────────────────────────
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

// ── Modelo de talla en el formulario ──────────────────────────────────────
export interface TallaForm {
  size: string;
  stock: number;
}

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly baseUrl    = `${environment.apiUrl}/products`;
  private readonly decadesUrl = `${environment.apiUrl}/decades`;
  private http    = inject(HttpClient);
  private auth    = inject(AuthService);

  /** BehaviorSubject como fuente única de verdad para todos los productos cargados */
  private readonly _store$ = new BehaviorSubject<ProductoApi[]>([]);

  /** Stream público al que se suscriben los componentes */
  readonly products$ = this._store$.asObservable();

  /** Actualiza el precio de descuento de un producto en el store local sin recargar */
  applyLocalDiscount(productId: number, discountPercent: number, discountedPrice: number | null): void {
    const updated = this._store$.getValue().map(p => {
      if (p.id !== productId) return p;
      return { ...p, discountPercent, discountedPrice };
    });
    this._store$.next(updated);
  }

  /** Resetea el descuento de un producto en el store local */
  resetLocalDiscount(productId: number): void {
    this.applyLocalDiscount(productId, 0, null);
  }

  /** Devuelve los productos de una categoría desde la API */
  getByCategory(category: string): Observable<ProductoApi[]> {
    return this.http
      .get<any>(`${this.baseUrl}/list.php?category=${category}`)
      .pipe(map(res => res.data));
  }

  /** Obtiene un producto por su ID */
  getById(id: number): Observable<ProductoApi> {
    return this.http
      .get<any>(`${this.baseUrl}/get.php?id=${id}`)
      .pipe(map(res => res.data));
  }

  /** Crea un producto (requiere rol admin). Recibe FormData con imagen. */
  crear(formData: FormData): Observable<{ mensaje: string; producto: ProductoApi }> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post<any>(
      `${this.baseUrl}/create.php`,
      formData,
      { headers }
    ).pipe(map(res => res.data));
  }

  /** Actualiza un producto (requiere rol admin). Recibe FormData (imagen opcional). */
  actualizar(id: string, formData: FormData): Observable<{ mensaje: string; producto: ProductoApi }> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    formData.append('id', id);
    return this.http.post<any>(
      `${this.baseUrl}/update.php`,
      formData,
      { headers }
    ).pipe(map(res => res.data));
  }

  /** Elimina un producto (requiere rol admin). */
  eliminar(id: string): Observable<{ mensaje: string; id: number }> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    return this.http.post<any>(
      `${this.baseUrl}/delete.php`,
      { id },
      { headers }
    ).pipe(map(res => res.data));
  }

  /** Devuelve las décadas activas desde la BD */
  getDecades(): Observable<string[]> {
    return this.http
      .get<any>(`${this.decadesUrl}/list.php`)
      .pipe(map(res => res.data));
  }

  /** Devuelve productos filtrados por década (ej: '90s') */
  getByDecade(decade: string, sort: SortOption = 'newest'): Observable<ProductoApi[]> {
    return this.http
      .get<any>(`${this.baseUrl}/list.php?decade=${decade}&sort=${sort}`)
      .pipe(map(res => res.data));
  }

  /** Devuelve todos los productos sin filtro y actualiza el store */
  getAllProducts(sort: SortOption = 'newest'): Observable<ProductoApi[]> {
    return this.http
      .get<any>(`${this.baseUrl}/list.php?sort=${sort}`)
      .pipe(
        map(res => res.data),
        tap(list => this._store$.next(list))
      );
  }

  /** Devuelve novedades (is_new=1 o últimos 30 días) */
  getNewProducts(sort: SortOption = 'newest'): Observable<ProductoApi[]> {
    return this.http
      .get<any>(`${this.baseUrl}/list.php?new=1&sort=${sort}`)
      .pipe(map(res => res.data));
  }

  /** Devuelve productos con múltiples filtros combinables */
  getFiltered(params: {
    decade?: string;
    category?: string;
    isNew?: boolean;
    sort?: SortOption;
  }): Observable<ProductoApi[]> {
    const q = new URLSearchParams();
    if (params.decade)   q.set('decade',   params.decade);
    if (params.category) q.set('category', params.category);
    if (params.isNew)    q.set('new', '1');
    if (params.sort)     q.set('sort',     params.sort);
    return this.http
      .get<any>(`${this.baseUrl}/list.php?${q.toString()}`)
      .pipe(map(res => res.data));
  }
}

