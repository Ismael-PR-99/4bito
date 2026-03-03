import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, skip } from 'rxjs';
import { DiscountService, PiezaSemana } from '../../services/discount.service';

@Component({
  selector: 'app-pieza-semana',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pieza-semana.component.html',
  styleUrl: './pieza-semana.component.css',
})
export class PiezaSemanaComponent implements OnInit, OnDestroy {
  private discount = inject(DiscountService);
  private router   = inject(Router);
  private sub?: Subscription;

  pieza    = signal<PiezaSemana | null>(null);
  cargando = signal<boolean>(true);
  /** true mientras espera la primera respuesta real de la API */
  private loaded = false;

  /** Días restantes hasta expiración */
  readonly diasRestantes = computed(() => {
    const p = this.pieza();
    if (!p) return 0;
    const diff = new Date(p.validUntil).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  });

  readonly badgePercent = computed(() => {
    const p = this.pieza();
    if (!p) return 0;
    return Math.round((1 - p.finalPrice / p.originalPrice) * 100);
  });

  ngOnInit(): void {
    // skip(1) para ignorar el null inicial del BehaviorSubject y esperar el valor real de la API
    this.sub = this.discount.pieza$.pipe(skip(1)).subscribe(p => {
      this.pieza.set(p);
      this.cargando.set(false);
      this.loaded = true;
    });

    // Siempre disparar la carga desde este componente como fallback
    this.discount.cargarPieza().subscribe({
      next: p => {
        if (!this.loaded) {
          this.pieza.set(p);
          this.cargando.set(false);
          this.loaded = true;
        }
      },
      error: () => {
        if (!this.loaded) this.cargando.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  verProducto(): void {
    const p = this.pieza();
    if (p) this.router.navigate(['/producto', p.productId]);
  }
}
