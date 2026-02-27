import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TiendaService } from '../../services/tienda.service';
import { AuthService } from '../../services/auth.service';
import { ProductosService, ProductoApi } from '../../services/productos.service';
import { AnadirProductoComponent } from '../../components/anadir-producto/anadir-producto.component';
import { EditarProductoComponent } from '../../components/editar-producto/editar-producto.component';
import { Categoria } from '../../models/categoria.model';
import { Producto } from '../../models/producto.model';

/** Convierte la respuesta de la API al modelo interno Producto */
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
  selector: 'app-categoria',
  standalone: true,
  imports: [CommonModule, AnadirProductoComponent, EditarProductoComponent],
  templateUrl: './categoria.component.html',
  styleUrl: './categoria.component.css',
})
export class CategoriaComponent implements OnInit {
  private route            = inject(ActivatedRoute);
  private router           = inject(Router);
  private tiendaService    = inject(TiendaService);
  private authService      = inject(AuthService);
  private productosService = inject(ProductosService);

  categoria:       Categoria | undefined;
  productos:       Producto[] = [];
  cargando:        boolean = false;
  mostrarModal:    boolean = false;
  productoEditando: Producto | null = null;
  slugActual:      string  = '';
  esAdmin:         boolean = false;

  ngOnInit(): void {
    this.esAdmin = this.authService.isAdmin();
    this.route.paramMap.subscribe(params => {
      this.slugActual = params.get('slug') ?? '';
      this.categoria  = this.tiendaService.getCategoriaBySlug(this.slugActual);
      this.cargarProductos();
    });
  }

  cargarProductos(): void {
    this.cargando = true;
    this.productosService.getByCategory(this.slugActual).subscribe({
      next: lista => {
        this.productos = lista.map(apiToProducto);
        this.cargando  = false;
      },
      error: () => {
        this.productos = [];
        this.cargando  = false;
      },
    });
  }



  abrirModal(): void  { this.mostrarModal = true; }
  cerrarModal(): void { this.mostrarModal = false; }

  onProductoCreado(nuevo: ProductoApi): void {
    this.productos = [apiToProducto(nuevo), ...this.productos];
  }

  editarProducto(producto: Producto): void {
    this.productoEditando = producto;
  }

  cerrarModalEditar(): void {
    this.productoEditando = null;
  }

  onProductoActualizado(actualizado: ProductoApi): void {
    const p = apiToProducto(actualizado);
    this.productos = this.productos.map(x => x.id === p.id ? p : x);
  }

  eliminarProducto(id: string): void {
    if (!confirm('¿Seguro que quieres eliminar este producto? Esta acción no se puede deshacer.')) return;
    this.productosService.eliminar(id).subscribe({
      next: () => {
        this.productos = this.productos.filter(p => p.id !== id);
      },
      error: () => alert('Error al eliminar el producto'),
    });
  }

  volver(): void {
    this.router.navigate(['/']);
  }

  irAProducto(id: string): void {
    this.router.navigate(['/producto', id]);
  }
}
