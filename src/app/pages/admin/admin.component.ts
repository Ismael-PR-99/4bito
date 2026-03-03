import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DiscountService } from '../../services/discount.service';
import { ProductosService, ProductoApi } from '../../services/productos.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit {
  private auth      = inject(AuthService);
  private router    = inject(Router);
  private discount  = inject(DiscountService);
  private productos = inject(ProductosService);

  usuario = this.auth.getUsuario();

  // ── Pieza de la Semana ────────────────────────────
  allProducts     = signal<ProductoApi[]>([]);
  productosLoaded = signal<boolean>(false);
  searchQuery     = signal<string>('');
  selectedProduct = signal<ProductoApi | null>(null);
  discountInput   = signal<number>(0);
  validUntil      = signal<string>('');
  guardando       = signal<boolean>(false);
  guardadoOk      = signal<boolean>(false);
  errorGuardar    = signal<string>('');

  piezaActual = this.discount.pieza$;

  readonly productosFiltrados = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.allProducts().slice(0, 30);
    return this.allProducts().filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.team.toLowerCase().includes(q)
    ).slice(0, 20);
  });

  readonly precioFinal = computed(() => {
    const p = this.selectedProduct();
    if (!p) return null;
    const desc = this.discountInput();
    if (desc < 0 || desc > 90) return null;
    return +(p.price - (p.price * desc / 100)).toFixed(2);
  });

  ngOnInit(): void {
    this.productos.getAllProducts().subscribe({
      next: list => {
        this.allProducts.set(list);
        this.productosLoaded.set(true);
      },
    });

    // Fecha mínima: mañana
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.validUntil.set(tomorrow.toISOString().slice(0, 16));
  }

  selectProduct(p: ProductoApi): void {
    this.selectedProduct.set(p);
    this.searchQuery.set('');
    this.discountInput.set(0);
    this.guardadoOk.set(false);
    this.errorGuardar.set('');
  }

  onDiscountChange(val: string): void {
    const n = parseFloat(val);
    this.discountInput.set(isNaN(n) ? 0 : Math.min(90, Math.max(0, n)));
  }

  establecerPieza(): void {
    const p     = this.selectedProduct();
    const final = this.precioFinal();
    const fecha = this.validUntil();

    if (!p || final === null || !fecha) {
      this.errorGuardar.set('Completa todos los campos.');
      return;
    }

    if (this.discountInput() <= 0) {
      this.errorGuardar.set('El descuento debe ser mayor que 0%.');
      return;
    }

    this.guardando.set(true);
    this.errorGuardar.set('');

    this.discount.establecerPieza({
      productId: p.id,
      discountPercent: this.discountInput(),
      finalPrice: final,
      validUntil: fecha.replace('T', ' ') + ':00',
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.guardadoOk.set(true);
        // Recargar lista completa de productos para reflejar descuentos actualizados
        this.productos.getAllProducts().subscribe(list => this.allProducts.set(list));
      },
      error: (err) => {
        this.guardando.set(false);
        const serverMsg = err?.error?.error ?? err?.message ?? '';
        this.errorGuardar.set(
          serverMsg
            ? `Error: ${serverMsg}`
            : 'Error al guardar. Verifica que tu sesión siga activa.'
        );
      },
    });
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

