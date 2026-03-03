import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductosService, ProductoApi } from '../../services/productos.service';
import { switchMap, tap } from 'rxjs';

@Component({
  selector: 'app-decada',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './decada.component.html',
  styleUrls: ['./decada.component.css'],
})
export class DecadaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private productosService = inject(ProductosService);

  decade    = signal<string>('');
  products  = signal<ProductoApi[]>([]);
  cargando  = signal<boolean>(true);
  error     = signal<string>('');

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        tap(params => {
          this.decade.set(params.get('decade') ?? '');
          this.cargando.set(true);
          this.error.set('');
          this.products.set([]);
        }),
        switchMap(params =>
          this.productosService.getByDecade(params.get('decade') ?? '')
        )
      )
      .subscribe({
        next: list => {
          this.products.set(list);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los productos.');
          this.cargando.set(false);
        },
      });
  }
}
