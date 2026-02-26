import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="admin-page">
      <div class="admin-card">
        <div class="admin-header">
          <span class="logo-text">4BITO</span>
          <span class="logo-sub">PANEL DE ADMINISTRACIÓN</span>
        </div>
        <p>Bienvenido, <strong>{{ usuario?.nombre }}</strong>.</p>
        <p class="rol-badge">ROL: {{ usuario?.rol?.toUpperCase() }}</p>
        <button class="btn-logout" (click)="cerrarSesion()">CERRAR SESIÓN</button>
        <a [routerLink]="['/']" class="btn-home">← Volver a la tienda</a>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { min-height: 100vh; background: #000; display: flex; align-items: center; justify-content: center; }
    .admin-card { background: #0d0d0d; border: 1px solid #1a1a1a; border-radius: 4px; padding: 2.5rem 2rem; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 0 40px rgba(0,255,135,.06); }
    .admin-header { display: flex; flex-direction: column; margin-bottom: 2rem; gap: 2px; }
    .logo-text { font-family: 'Impact','Arial Black',sans-serif; font-size: 2rem; color: #00ff87; letter-spacing: 4px; }
    .logo-sub { font-size: .65rem; letter-spacing: 3px; color: #555; text-transform: uppercase; }
    p { color: #ccc; margin-bottom: .7rem; font-size: .95rem; }
    p strong { color: #00ff87; }
    .rol-badge { display: inline-block; background: rgba(0,255,135,.1); border: 1px solid rgba(0,255,135,.3); color: #00ff87; padding: .3rem .8rem; border-radius: 2px; font-size: .75rem; letter-spacing: 2px; }
    .btn-logout { display: block; width: 100%; margin-top: 1.5rem; background: #00ff87; color: #000; border: none; border-radius: 3px; padding: .8rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; font-size: .85rem; cursor: pointer; transition: background .2s; }
    .btn-logout:hover { background: #00e87a; }
    .btn-home { display: block; margin-top: .8rem; color: #555; font-size: .8rem; text-decoration: none; letter-spacing: 1px; }
    .btn-home:hover { color: #00ff87; }
  `]
})
export class AdminComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  usuario = this.auth.getUsuario();

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
