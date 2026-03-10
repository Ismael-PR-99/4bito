import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductosService, ProductoApi } from '../../services/productos.service';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';
import { CompareService } from '../../services/compare.service';

@Component({
  selector: 'app-comparar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './comparar.component.html',
  styleUrl: './comparar.component.css',
})
export class CompararComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private productoSvc = inject(ProductosService);
  private cartSvc    = inject(CartService);
  private toastSvc   = inject(ToastService);
  private compareSvc = inject(CompareService);

  productos = signal<ProductoApi[]>([]);
  cargando  = signal(true);

  readonly FIELDS: { key: string; label: string }[] = [
    { key: 'price',    label: 'PRECIO' },
    { key: 'team',     label: 'EQUIPO' },
    { key: 'year',     label: 'AÑO' },
    { key: 'category', label: 'CATEGORÍA' },
    { key: 'league',   label: 'LIGA' },
    { key: 'sizes',    label: 'TALLAS DISPONIBLES' },
  ];

  ngOnInit(): void {
    // Intentar desde CompareService primero (si viene de la barra de comparación)
    const serviceItems = this.compareSvc.items();
    if (serviceItems.length >= 2) {
      this.productos.set(serviceItems);
      this.cargando.set(false);
      return;
    }

    // Cargar por IDs de query params
    this.route.queryParams.subscribe(params => {
      const ids = (params['ids'] as string ?? '').split(',').map(Number).filter(Boolean);
      if (ids.length < 2) { this.cargando.set(false); return; }
      const observables = ids.map(id => this.productoSvc.getById(id));
      let loaded: ProductoApi[] = [];
      let pending = ids.length;
      observables.forEach(obs => {
        obs.subscribe({
          next: p => { loaded.push(p); if (--pending === 0) { this.productos.set(loaded); this.cargando.set(false); } },
          error: () => { if (--pending === 0) { this.productos.set(loaded); this.cargando.set(false); } },
        });
      });
    });
  }

  valorCelda(p: ProductoApi, key: string): string {
    if (key === 'price') {
      const precio = (p.discountedPrice != null && p.discountedPrice < p.price) ? p.discountedPrice : p.price;
      return `${precio.toFixed(2)} €`;
    }
    if (key === 'sizes') {
      return (p.sizes ?? []).filter(s => s.stock > 0).map(s => s.size).join(' / ') || 'Agotado';
    }
    return String((p as any)[key] ?? '—');
  }

  /** Detecta si hay diferencia en ese campo entre todos los productos */
  hasDiff(key: string): boolean {
    const vals = this.productos().map(p => this.valorCelda(p, key));
    return new Set(vals).size > 1;
  }

  addToCart(product: ProductoApi): void {
    const firstAvailable = product.sizes?.find(s => s.stock > 0);
    if (!firstAvailable) { this.toastSvc.show('Sin stock disponible', 'error'); return; }
    this.cartSvc.addToCart({
      id: String(product.id), nombre: product.name, categoriaSlug: product.category,
      precio: product.discountedPrice ?? product.price,
      precioOriginal: product.discountedPrice ? product.price : undefined,
      imageUrl: product.imageUrl, tallas: product.sizes.map(s => s.size),
      descripcion: `${product.team} — ${product.league}`,
      anio: product.year, equipo: product.team,
    }, firstAvailable.size, 1);
    this.toastSvc.show('✓ Añadido al carrito');
  }
}
