import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DiscountService, PiezaSemana } from '../../services/discount.service';

@Component({
  selector: 'app-pieza-semana',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pieza-semana.component.html',
  styleUrl: './pieza-semana.component.css',
})
export class PiezaSemanaComponent implements OnInit {
  private discount = inject(DiscountService);
  private router   = inject(Router);

  pieza   = signal<PiezaSemana | null>(null);
  cargando = signal<boolean>(true);

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
    this.discount.pieza$.subscribe(p => {
      this.pieza.set(p);
      this.cargando.set(false);
    });

    // Disparar carga si el stream aún está en null
    if (this.pieza() === null && this.cargando()) {
      this.discount.cargarPieza().subscribe({
        error: () => this.cargando.set(false),
      });
    }
  }

  verProducto(): void {
    const p = this.pieza();
    if (p) this.router.navigate(['/producto', p.productId]);
  }
}
