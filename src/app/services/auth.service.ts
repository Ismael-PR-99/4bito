import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, catchError, throwError } from 'rxjs';
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
  private _token: string | null = null;

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password }, { withCredentials: true }).pipe(
      map(res => res.data),
      tap((res) => {
        this._token = res.token;
        localStorage.setItem('usuario', JSON.stringify(res.usuario));
      })
    );
  }

  registro(nombre: string, email: string, password: string): Observable<RegistroResponse> {
    return this.http.post<any>(`${this.apiUrl}/register`, { nombre, email, password }).pipe(
      map(res => res.data)
    );
  }

  logout(): void {
    this._token = null;
    localStorage.removeItem('usuario');
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe();
  }

  refresh(): Observable<string> {
    return this.http.post<any>(`${this.apiUrl}/refresh`, {}, { withCredentials: true }).pipe(
      map(res => res.data.token),
      tap(token => { this._token = token; }),
      catchError(err => {
        this._token = null;
        localStorage.removeItem('usuario');
        return throwError(() => err);
      }),
    );
  }

  getToken(): string | null {
    return this._token;
  }

  isLoggedIn(): boolean {
    return !!this._token || !!localStorage.getItem('usuario');
  }

  isAdmin(): boolean {
    return this.getUsuario()?.rol === 'admin';
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
