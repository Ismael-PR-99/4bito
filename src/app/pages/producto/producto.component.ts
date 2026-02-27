import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductosService, ProductoApi } from '../../services/productos.service';
import { Producto } from '../../models/producto.model';

function apiToProducto(p: ProductoApi): Producto {
  return {
    id:            String(p.id),
    nombre:        p.name,
    categoriaSlug: p.category,
    precio:        p.price,
    imageUrl:      p.imageUrl,
    tallas:        p.sizes.map(s => s.size),
    descripcion:   `${p.team} — ${p.league}`,
    anio:          p.year,
    equipo:        p.team,
  };
}

@Component({
  selector: 'app-producto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './producto.component.html',
  styleUrl: './producto.component.css',
})
export class ProductoComponent implements OnInit {
  private route            = inject(ActivatedRoute);
  private router           = inject(Router);
  private productosService = inject(ProductosService);

  producto:  Producto | undefined;
  cargando:  boolean = true;
  errorMsg:  string  = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!id) {
        this.errorMsg = 'Producto no encontrado';
        this.cargando = false;
        return;
      }
      this.productosService.getById(id).subscribe({
        next: p => {
          this.producto = apiToProducto(p);
          this.cargando = false;
        },
        error: () => {
          this.errorMsg = 'Producto no encontrado';
          this.cargando = false;
        },
      });
    });
  }

  volver(): void {
    this.router.navigate(['/']);
  }
}
