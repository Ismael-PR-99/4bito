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
  private readonly baseUrl = 'http://localhost/4bito/4bito-api/products';
  private http    = inject(HttpClient);
  private auth    = inject(AuthService);

  /** Devuelve los productos de una categoría desde la API */
  getByCategory(category: string): Observable<ProductoApi[]> {
    return this.http
      .get<{ productos: ProductoApi[] }>(`${this.baseUrl}/list.php?category=${category}`)
      .pipe(map(res => res.productos));
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
}
