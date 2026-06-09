import { Component, inject, signal, OnInit, computed, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductosService, ProductoApi, PagedResult } from '../../services/productos.service';
import { switchMap, tap } from 'rxjs';

@Component({
  selector: 'app-decada',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './decada.component.html',
  styleUrls: ['./decada.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DecadaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private productosService = inject(ProductosService);

  decade      = signal<string>('');
  products    = signal<ProductoApi[]>([]);
  cargando    = signal<boolean>(true);
  loadingMore = signal<boolean>(false);
  error       = signal<string>('');
  total       = signal<number>(0);
  currentPage = signal<number>(1);

  readonly hasMore = computed(() => this.products().length < this.total());

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        tap(params => {
          this.decade.set(params.get('decade') ?? '');
          this.cargando.set(true);
          this.error.set('');
          this.products.set([]);
          this.currentPage.set(1);
        }),
        switchMap(params =>
          this.productosService.getByDecade(params.get('decade') ?? '')
        )
      )
      .subscribe({
        next: (result: PagedResult) => {
          this.products.set(result.products);
          this.total.set(result.total);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los productos.');
          this.cargando.set(false);
        },
      });
  }

  cargarMas(): void {
    this.loadingMore.set(true);
    this.currentPage.update(p => p + 1);
    this.productosService.getByDecade(this.decade(), 'newest', this.currentPage()).subscribe({
      next: (result: PagedResult) => {
        this.products.update(prev => [...prev, ...result.products]);
        this.total.set(result.total);
        this.loadingMore.set(false);
      },
      error: () => this.loadingMore.set(false),
    });
  }
}
