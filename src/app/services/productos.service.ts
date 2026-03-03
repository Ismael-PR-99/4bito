import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';

// ── Modelo de producto tal como llega de la API ────────────────────────────
export interface ProductoApi {
  id: number;
  name: string;
  price: number;
  team: string;
  year: number;
  league: string;
  imageUrl: string;
  category: string;
  sizes: { size: string; stock: number }[];
}

// ── Modelo de talla en el formulario ──────────────────────────────────────
export interface TallaForm {
  size: string;
  stock: number;
}

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly baseUrl    = 'http://localhost/4bito/4bito-api/products';
  private readonly decadesUrl = 'http://localhost/4bito/4bito-api/decades';
  private http    = inject(HttpClient);
  private auth    = inject(AuthService);

  /** Devuelve los productos de una categoría desde la API */
  getByCategory(category: string): Observable<ProductoApi[]> {
    return this.http
      .get<{ productos: ProductoApi[] }>(`${this.baseUrl}/list.php?category=${category}`)
      .pipe(map(res => res.productos));
  }

  /** Obtiene un producto por su ID */
  getById(id: number): Observable<ProductoApi> {
    return this.http
      .get<{ producto: ProductoApi }>(`${this.baseUrl}/get.php?id=${id}`)
      .pipe(map(res => res.producto));
  }

  /** Crea un producto (requiere rol admin). Recibe FormData con imagen. */
  crear(formData: FormData): Observable<{ mensaje: string; producto: ProductoApi }> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post<{ mensaje: string; producto: ProductoApi }>(
      `${this.baseUrl}/create.php`,
      formData,
      { headers }
    );
  }

  /** Actualiza un producto (requiere rol admin). Recibe FormData (imagen opcional). */
  actualizar(id: string, formData: FormData): Observable<{ mensaje: string; producto: ProductoApi }> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    formData.append('id', id);
    return this.http.post<{ mensaje: string; producto: ProductoApi }>(
      `${this.baseUrl}/update.php`,
      formData,
      { headers }
    );
  }

  /** Elimina un producto (requiere rol admin). */
  eliminar(id: string): Observable<{ mensaje: string; id: number }> {
    const token = this.auth.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
    return this.http.post<{ mensaje: string; id: number }>(
      `${this.baseUrl}/delete.php`,
      { id },
      { headers }
    );
  }

  /** Devuelve las décadas activas desde la BD */
  getDecades(): Observable<string[]> {
    return this.http
      .get<{ decades: string[] }>(`${this.decadesUrl}/list.php`)
      .pipe(map(res => res.decades));
  }

  /** Devuelve productos filtrados por década (ej: '90s') */
  getByDecade(decade: string): Observable<ProductoApi[]> {
    return this.http
      .get<{ productos: ProductoApi[] }>(`${this.baseUrl}/list.php?decade=${decade}`)
      .pipe(map(res => res.productos));
  }
}
