import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { WishlistService } from '../../services/wishlist.service';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';
import { ProductoApi } from '../../services/productos.service';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.css',
})
export class WishlistComponent implements OnInit {
  private wishlistSvc = inject(WishlistService);
  private cartSvc     = inject(CartService);
  private toastSvc    = inject(ToastService);

  items    = signal<ProductoApi[]>([]);
  cargando = signal(true);

  ngOnInit(): void {
    // Primero sincronizar localStorage → BD, luego cargar la lista
    this.wishlistSvc.syncFromApi().pipe(
      switchMap(() => this.wishlistSvc.getWishlistItems())
    ).subscribe({
      next: res => {
        this.items.set(res.productos ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
      },
    });
  }

  remove(product: ProductoApi): void {
    this.wishlistSvc.toggle(product);
    this.items.update(list => list.filter(p => p.id !== product.id));
    this.toastSvc.show('Eliminado de la wishlist');
  }

  addToCart(product: ProductoApi): void {
    const firstSize = product.sizes?.[0]?.size;
    if (!firstSize) { this.toastSvc.show('Sin tallas disponibles', 'error'); return; }
    const producto = {
      id:            String(product.id),
      nombre:        product.name,
      categoriaSlug: product.category,
      precio:        product.discountedPrice ?? product.price,
      precioOriginal: product.discountedPrice ? product.price : undefined,
      imageUrl:       product.imageUrl,
      tallas:         product.sizes.map(s => s.size),
      descripcion:    `${product.team} — ${product.league}`,
      anio:           product.year,
      equipo:         product.team,
    };
    this.cartSvc.addToCart(producto, firstSize, 1);
    this.toastSvc.show('✓ Añadido al carrito');
  }

  precioMostrar(p: ProductoApi): number {
    return (p.discountedPrice != null && p.discountedPrice < p.price) ? p.discountedPrice : p.price;
  }
}
