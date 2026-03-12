import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  trigger, transition, style, animate, keyframes, state
} from '@angular/animations';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  animations: [
    trigger('cardEntrada', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(60px) scale(0.95)' }),
        animate('600ms cubic-bezier(0.23, 1, 0.32, 1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ])
    ]),
    trigger('shake', [
      state('ok',    style({ transform: 'translateX(0)' })),
      state('error', style({ transform: 'translateX(0)' })),
      transition('ok => error', [
        animate('500ms', keyframes([
          style({ transform: 'translateX(0)',    offset: 0 }),
          style({ transform: 'translateX(-12px)', offset: 0.15 }),
          style({ transform: 'translateX(12px)',  offset: 0.30 }),
          style({ transform: 'translateX(-10px)', offset: 0.45 }),
          style({ transform: 'translateX(10px)',  offset: 0.60 }),
          style({ transform: 'translateX(-6px)',  offset: 0.75 }),
          style({ transform: 'translateX(6px)',   offset: 0.88 }),
          style({ transform: 'translateX(0)',    offset: 1 }),
        ]))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-8px)' }),
        animate('300ms ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('exito', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('400ms cubic-bezier(0.23, 1, 0.32, 1)',
          style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  error = '';
  cargando = false;
  loginExitoso = false;
  shakeState: 'ok' | 'error' = 'ok';
  particulas: { x: number; y: number; delay: number; dur: number }[] = [];

  private cdr = inject(ChangeDetectorRef);

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.particulas = Array.from({ length: 20 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 4,
      dur: 3 + Math.random() * 4,
    }));
  }

  onSubmit(): void {
    this.error = '';
    if (!this.email || !this.password) {
      this.error = 'Por favor, rellena todos los campos.';
      this.triggerShake();
      return;
    }
    this.cargando = true;
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.cargando = false;
        this.loginExitoso = true;
        this.cdr.markForCheck();
        setTimeout(() => {
          if (res.usuario.rol === 'admin') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/']);
          }
        }, 1200);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err?.error?.mensaje || err?.error?.error || 'Credenciales incorrectas.';
        this.triggerShake();
        this.cdr.markForCheck();
      },
    });
  }

  private triggerShake(): void {
    this.shakeState = 'ok';
    setTimeout(() => { this.shakeState = 'error'; this.cdr.markForCheck(); }, 10);
  }
}
