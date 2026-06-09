import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <h1 class="auth-title">NUEVA CONTRASEÑA</h1>

        <ng-container *ngIf="!done(); else doneTpl">
          <div class="auth-error" *ngIf="!token()">Enlace inválido o expirado.</div>

          <form *ngIf="token()" (ngSubmit)="submit()" #f="ngForm">
            <div class="field">
              <label>NUEVA CONTRASEÑA</label>
              <input type="password" [(ngModel)]="password" name="password"
                     required minlength="8" autocomplete="new-password" />
            </div>
            <div class="field">
              <label>CONFIRMAR CONTRASEÑA</label>
              <input type="password" [(ngModel)]="confirm" name="confirm"
                     required autocomplete="new-password" />
            </div>
            <p class="auth-error" *ngIf="mismatch()">Las contraseñas no coinciden.</p>
            <button type="submit" class="btn-primary"
                    [disabled]="loading() || password.length < 8 || password !== confirm">
              {{ loading() ? 'GUARDANDO...' : 'GUARDAR CONTRASEÑA' }}
            </button>
          </form>
          <p class="auth-error" *ngIf="error()">{{ error() }}</p>
        </ng-container>

        <ng-template #doneTpl>
          <p class="auth-ok">Contraseña actualizada correctamente.</p>
          <a class="btn-primary" style="display:block;text-align:center;text-decoration:none;margin-top:16px" routerLink="/login">IR AL LOGIN</a>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a0a; }
    .auth-card { background: #111; padding: 40px; width: 100%; max-width: 420px; }
    .auth-title { color: #fff; font-size: 1.1rem; letter-spacing: .15em; margin: 0 0 24px; }
    .field { margin-bottom: 16px; }
    .field label { display: block; color: #888; font-size: .75rem; letter-spacing: .1em; margin-bottom: 6px; }
    .field input { width: 100%; background: #1a1a1a; border: 1px solid #333; color: #fff; padding: 10px 12px; font-family: inherit; font-size: .9rem; box-sizing: border-box; }
    .field input:focus { outline: none; border-color: #fff; }
    .btn-primary { width: 100%; background: #fff; color: #000; border: none; padding: 12px; font-family: inherit; font-size: .85rem; letter-spacing: .1em; cursor: pointer; }
    .btn-primary:disabled { opacity: .4; cursor: not-allowed; }
    .auth-error { color: #e55; font-size: .8rem; margin-bottom: 12px; }
    .auth-ok    { color: #5c5; font-size: .85rem; }
  `],
})
export class ResetPasswordComponent implements OnInit {
  private route  = inject(ActivatedRoute);
  private http   = inject(HttpClient);
  private router = inject(Router);
  private api    = `${environment.apiUrl}/auth`;

  token    = signal('');
  password = '';
  confirm  = '';
  loading  = signal(false);
  done     = signal(false);
  error    = signal('');

  get mismatch(): () => boolean {
    return () => !!this.confirm && this.password !== this.confirm;
  }

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get('token') ?? '');
  }

  submit(): void {
    if (this.password !== this.confirm || this.password.length < 8) return;
    this.loading.set(true);
    this.error.set('');
    this.http.post(`${this.api}/reset-password`, { token: this.token(), password: this.password }).subscribe({
      next: () => { this.done.set(true); this.loading.set(false); },
      error: (e) => {
        this.error.set(e.error?.error ?? 'Error al restablecer. El enlace puede haber expirado.');
        this.loading.set(false);
      },
    });
  }
}
