import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductosService, ProductoApi } from '../../services/productos.service';

@Component({
  selector: 'app-por-decada',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './por-decada.component.html',
  styleUrl: './por-decada.component.css',
})
export class PorDecadaComponent implements OnInit {
  private productosService = inject(ProductosService);

  decades           = signal<string[]>([]);
  activeDecade      = signal<string>('');
  products          = signal<ProductoApi[]>([]);
  cargandoDecadas   = signal<boolean>(true);
  cargandoProductos = signal<boolean>(false);

  ngOnInit(): void {
    this.productosService.getDecades().subscribe({
      next: list => {
        this.decades.set(list);
        this.cargandoDecadas.set(false);
        if (list.length > 0) {
          this.setDecade(list[0]);
        }
      },
      error: () => this.cargandoDecadas.set(false),
    });
  }

  setDecade(decade: string): void {
    if (decade === this.activeDecade()) return;
    this.activeDecade.set(decade);
    this.cargandoProductos.set(true);
    this.productosService.getByDecade(decade).subscribe({
      next: list => {
        this.products.set(list);
        this.cargandoProductos.set(false);
      },
      error: () => {
        this.products.set([]);
        this.cargandoProductos.set(false);
      },
    });
  }
}

