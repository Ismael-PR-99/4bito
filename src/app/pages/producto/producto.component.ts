import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductosService, ProductoApi } from '../../services/productos.service';
import { Producto } from '../../models/producto.model';
import { CartService } from '../../services/cart.service';
import { CartDrawerService } from '../../services/cart-drawer.service';
import { ToastService } from '../../services/toast.service';
import { LucideAngularModule, ShoppingCart, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';


function apiToProducto(p: ProductoApi): Producto {
  const hasDiscount = p.discountPercent != null && p.discountPercent > 0 && p.discountedPrice != null;
  return {
    id:             String(p.id),
    nombre:         p.name,
    categoriaSlug:  p.category,
    precio:         hasDiscount ? p.discountedPrice! : p.price,
    precioOriginal: hasDiscount ? p.price : undefined,
    discountPercent: hasDiscount ? p.discountPercent : undefined,
    imageUrl:       p.imageUrl,
    tallas:         p.sizes.map(s => s.size),
    descripcion:    `${p.team} — ${p.league}`,
    anio:           p.year,
    equipo:         p.team,
  };
}

@Component({
  selector: 'app-producto',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider({ ShoppingCart }) }
  ],
  templateUrl: './producto.component.html',
  styleUrl: './producto.component.css',
})
export class ProductoComponent implements OnInit {
  private route            = inject(ActivatedRoute);
  private router           = inject(Router);
  private productosService = inject(ProductosService);
  private cartService      = inject(CartService);
  private drawerService    = inject(CartDrawerService);
  private toastService     = inject(ToastService);

  producto:       Producto | undefined;
  cargando:       boolean = true;
  errorMsg:       string  = '';

  tallaSeleccionada: string  = '';
  errorTalla:        boolean = false;
  cantidad:          number  = 1;
  confirmado:        boolean = false;
  private confirmTimer: any;

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

  seleccionarTalla(talla: string): void {
    this.tallaSeleccionada = talla;
    this.errorTalla = false;
  }

  esCategoriaConMedidas(slug: string): boolean {
    return ['retro-cuadros', 'retro-objetos'].includes(slug);
  }

  get conMedidas(): boolean {
    return this.esCategoriaConMedidas(this.producto?.categoriaSlug ?? '');
  }

  cambiarCantidad(delta: number): void {
    const nueva = this.cantidad + delta;
    if (nueva >= 1 && nueva <= 10) {
      this.cantidad = nueva;
    }
  }

  addToCart(): void {
    if (!this.tallaSeleccionada) {
      this.errorTalla = true;
      return;
    }
    if (!this.producto) return;

    this.cartService.addToCart(this.producto, this.tallaSeleccionada, this.cantidad);
    this.toastService.show('✓ Añadido al carrito');

    this.confirmado = true;
    clearTimeout(this.confirmTimer);
    this.confirmTimer = setTimeout(() => { this.confirmado = false; }, 2000);
  }

  volver(): void {
    this.router.navigate(['/']);
  }
}

