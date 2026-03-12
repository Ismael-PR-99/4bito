import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  computed,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProductosService, ProductoApi } from '../../services/productos.service';

@Component({
  selector: 'app-banda-honor',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DecimalPipe],
  templateUrl: './banda-honor.component.html',
  styleUrl: './banda-honor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandaHonorComponent implements OnInit, OnDestroy {
  private svc    = inject(ProductosService);
  private router = inject(Router);
  private sub?: Subscription;

  private readonly _products = signal<ProductoApi[]>([]);
  cargando = signal<boolean>(true);

  readonly ranked = computed(() =>
    [...this._products()]
      .sort((a, b) => {
        const pa = a.discountedPrice ?? a.price;
        const pb = b.discountedPrice ?? b.price;
        return pb - pa;
      })
      .slice(0, 10)
  );

  readonly maxPrice = computed(() =>
    this.ranked().length > 0 ? (this.ranked()[0].discountedPrice ?? this.ranked()[0].price) : 1
  );

  ngOnInit(): void {
    // Suscribirse al store compartido para recibir actualizaciones en tiempo real
    this.sub = this.svc.products$.subscribe(list => {
      if (list.length > 0) {
        this._products.set(list);
        this.cargando.set(false);
      }
    });

    // Disparar carga inicial (actualiza el store y notifica todos los suscriptores)
    this.svc.getAllProducts().subscribe({
      error: () => this.cargando.set(false),
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  barWidth(price: number, discountedPrice?: number | null): string {
    const effective = discountedPrice ?? price;
    return `${(effective / this.maxPrice()) * 100}%`;
  }

  rankColor(i: number): string {
    if (i === 0) return '#f0c040';
    if (i === 1) return '#aaaaaa';
    if (i === 2) return '#cd7f32';
    return '#444';
  }

  goTo(id: number): void {
    this.router.navigate(['/producto', id]);
  }
}
