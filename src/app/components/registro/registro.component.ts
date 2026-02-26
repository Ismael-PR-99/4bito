import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  trigger, transition, style, animate, keyframes, state
} from '@angular/animations';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css',
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
          style({ transform: 'translateX(0)',     offset: 0    }),
          style({ transform: 'translateX(-12px)', offset: 0.15 }),
          style({ transform: 'translateX(12px)',  offset: 0.30 }),
          style({ transform: 'translateX(-10px)', offset: 0.45 }),
          style({ transform: 'translateX(10px)',  offset: 0.60 }),
          style({ transform: 'translateX(-6px)',  offset: 0.75 }),
          style({ transform: 'translateX(6px)',   offset: 0.88 }),
          style({ transform: 'translateX(0)',     offset: 1    }),
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
  ]
})
export class RegistroComponent implements OnInit {
  nombre = '';
  email = '';
  password = '';
  confirmarPassword = '';
  error = '';
  registroExitoso = false;
  cargando = false;
  shakeState: 'ok' | 'error' = 'ok';
  particulas: { x: number; y: number; delay: number; dur: number }[] = [];

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

    if (!this.nombre || !this.email || !this.password || !this.confirmarPassword) {
      this.error = 'Por favor, rellena todos los campos.';
      this.triggerShake();
      return;
    }

    if (this.password !== this.confirmarPassword) {
      this.error = 'Las contraseñas no coinciden.';
      this.triggerShake();
      return;
    }

    if (this.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres.';
      this.triggerShake();
      return;
    }

    this.cargando = true;
    this.auth.registro(this.nombre, this.email, this.password).subscribe({
      next: () => {
        this.cargando = false;
        this.registroExitoso = true;
        setTimeout(() => this.router.navigate(['/login']), 1800);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err?.error?.mensaje || 'Error al crear la cuenta. Inténtalo de nuevo.';
        this.triggerShake();
      },
    });
  }

  private triggerShake(): void {
    this.shakeState = 'ok';
    setTimeout(() => (this.shakeState = 'error'), 10);
  }
}
