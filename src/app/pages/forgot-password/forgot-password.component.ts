import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <h1 class="auth-title">RECUPERAR CONTRASEÑA</h1>

        <ng-container *ngIf="!sent(); else doneTpl">
          <p class="auth-sub">Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.</p>
          <form (ngSubmit)="submit()" #f="ngForm">
            <div class="field">
              <label>EMAIL</label>
              <input type="email" [(ngModel)]="email" name="email" required autocomplete="email" />
            </div>
            <button type="submit" class="btn-primary" [disabled]="loading() || !email">
              {{ loading() ? 'ENVIANDO...' : 'ENVIAR ENLACE' }}
            </button>
          </form>
          <p class="auth-error" *ngIf="error()">{{ error() }}</p>
        </ng-container>

        <ng-template #doneTpl>
          <p class="auth-ok">Si el email está registrado recibirás el enlace en breve. Revisa tu bandeja de entrada.</p>
        </ng-template>

        <a class="auth-link" routerLink="/login">← Volver al login</a>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a0a; }
    .auth-card { background: #111; padding: 40px; width: 100%; max-width: 420px; }
    .auth-title { color: #fff; font-size: 1.1rem; letter-spacing: .15em; margin: 0 0 8px; }
    .auth-sub   { color: #888; font-size: .85rem; margin: 0 0 24px; line-height: 1.5; }
    .field { margin-bottom: 16px; }
    .field label { display: block; color: #888; font-size: .75rem; letter-spacing: .1em; margin-bottom: 6px; }
    .field input { width: 100%; background: #1a1a1a; border: 1px solid #333; color: #fff; padding: 10px 12px; font-family: inherit; font-size: .9rem; box-sizing: border-box; }
    .field input:focus { outline: none; border-color: #fff; }
    .btn-primary { width: 100%; background: #fff; color: #000; border: none; padding: 12px; font-family: inherit; font-size: .85rem; letter-spacing: .1em; cursor: pointer; margin-top: 8px; }
    .btn-primary:disabled { opacity: .4; cursor: not-allowed; }
    .auth-error { color: #e55; font-size: .8rem; margin-top: 12px; }
    .auth-ok    { color: #5c5; font-size: .85rem; line-height: 1.5; }
    .auth-link  { display: block; color: #666; font-size: .8rem; margin-top: 24px; text-decoration: none; }
    .auth-link:hover { color: #fff; }
  `],
})
export class ForgotPasswordComponent {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/auth`;

  email   = '';
  loading = signal(false);
  sent    = signal(false);
  error   = signal('');

  submit(): void {
    if (!this.email) return;
    this.loading.set(true);
    this.error.set('');
    this.http.post(`${this.api}/forgot-password`, { email: this.email }).subscribe({
      next: () => { this.sent.set(true); this.loading.set(false); },
      error: () => { this.error.set('Error al enviar. Inténtalo de nuevo.'); this.loading.set(false); },
    });
  }
}
