import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TiendaService } from '../../services/tienda.service';
import { Categoria } from '../../models/categoria.model';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-categoria',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './categoria.component.html',
  styleUrl: './categoria.component.css',
})
export class CategoriaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tiendaService = inject(TiendaService);

  categoria: Categoria | undefined;
  productos: Producto[] = [];

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug') ?? '';
      this.categoria = this.tiendaService.getCategoriaBySlug(slug);
      this.productos = this.tiendaService.getProductosByCategoria(slug);
    });
  }

  volver(): void {
    this.router.navigate(['/']);
  }

  irAProducto(id: string): void {
    this.router.navigate(['/producto', id]);
  }
}
