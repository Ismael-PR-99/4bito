import {
  Component,
  OnInit,
  inject,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductosService, ProductoApi } from '../../services/productos.service';

@Component({
  selector: 'app-banda-honor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banda-honor.component.html',
  styleUrl: './banda-honor.component.css',
})
export class BandaHonorComponent implements OnInit {
  private svc    = inject(ProductosService);
  private router = inject(Router);

  private readonly _products = signal<ProductoApi[]>([]);
  cargando = signal<boolean>(true);

  readonly ranked = computed(() =>
    [...this._products()]
      .sort((a, b) => b.price - a.price)
      .slice(0, 10)
  );

  readonly maxPrice = computed(() =>
    this.ranked().length > 0 ? this.ranked()[0].price : 1
  );

  ngOnInit(): void {
    this.svc.getAllProducts().subscribe({
      next: list => {
        this._products.set(list);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  barWidth(price: number): string {
    return `${(price / this.maxPrice()) * 100}%`;
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
