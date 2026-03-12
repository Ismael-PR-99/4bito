import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  token: string;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
  };
}

export interface RegistroResponse {
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<any>(`${this.apiUrl}/login.php`, { email, password }).pipe(
      map(res => res.data),
      tap((res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('usuario', JSON.stringify(res.usuario));
      })
    );
  }

  registro(nombre: string, email: string, password: string): Observable<RegistroResponse> {
    return this.http.post<any>(`${this.apiUrl}/registro.php`, {
      nombre,
      email,
      password,
    }).pipe(map(res => res.data));
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    const usuario = this.getUsuario();
    return usuario?.rol === 'admin';
  }

  getUsuario(): { id: number; nombre: string; email: string; rol: string } | null {
    const raw = localStorage.getItem('usuario');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
