import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductosService, ProductoApi } from '../../services/productos.service';
import { Producto } from '../../models/producto.model';
import { CartService } from '../../services/cart.service';
import { CartDrawerService } from '../../services/cart-drawer.service';
import { ToastService } from '../../services/toast.service';
import { WishlistService } from '../../services/wishlist.service';
import { CompareService } from '../../services/compare.service';
import { ReviewService, Review } from '../../services/review.service';
import { UserProfileService } from '../../services/user-profile.service';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule, ShoppingCart, Heart, GitCompare, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';


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
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider({ ShoppingCart, Heart, GitCompare }) }
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
  private wishlistSvc      = inject(WishlistService);
  private compareSvc       = inject(CompareService);
  private reviewSvc        = inject(ReviewService);
  private profileSvc       = inject(UserProfileService);
  private authSvc          = inject(AuthService);
  private http             = inject(HttpClient);

  private readonly apiUrl  = 'http://localhost/4bito/4bito-api';

  producto:       Producto | undefined;
  rawProducto:    ProductoApi | undefined;
  cargando:       boolean = true;
  errorMsg:       string  = '';

  tallaSeleccionada: string  = '';
  errorTalla:        boolean = false;
  cantidad:          number  = 1;
  confirmado:        boolean = false;
  private confirmTimer: ReturnType<typeof setTimeout> | undefined;

  // Reviews
  reviews        = signal<Review[]>([]);
  avgRating      = signal<number>(0);
  ratingCount    = signal<number>(0);
  miResena       = { rating: 0, comment: '' };
  resenaHover    = signal<number>(0);
  enviandoResena = signal(false);

  // Relacionados / Juntos
  relacionados    = signal<ProductoApi[]>([]);
  frecuenteJuntos = signal<ProductoApi[]>([]);

  // Tallas guardadas del perfil
  tallasGuardadas: any = null;

  // Notificacion de agotado
  suscribirEmail = signal('');
  suscribiendo   = signal(false);
  suscrito       = signal<string | null>(null);

  get enWishlist(): boolean {
    return this.rawProducto ? this.wishlistSvc.isInWishlist(this.rawProducto.id) : false;
  }
  get enCompare(): boolean {
    return this.rawProducto ? this.compareSvc.isInCompare(this.rawProducto.id) : false;
  }
  get loggedIn(): boolean { return this.authSvc.isLoggedIn(); }

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
          this.rawProducto = p;
          this.producto = apiToProducto(p);
          this.cargando = false;
          this.cargarReviews(id);
          this.cargarRelacionados(id);
          this.cargarFrecuentes(id);
          if (this.loggedIn) { this.cargarTallasGuardadas(); }
        },
        error: () => {
          this.errorMsg = 'Producto no encontrado';
          this.cargando = false;
        },
      });
    });

    this.route.fragment.subscribe(frag => {
      if (frag === 'resenas') {
        setTimeout(() => {
          document.getElementById('resenas')?.scrollIntoView({ behavior: 'smooth' });
        }, 600);
      }
    });
  }

  private cargarReviews(productId: number): void {
    this.reviewSvc.getReviews(productId).subscribe({
      next: res => {
        this.reviews.set(res.reviews ?? []);
        this.avgRating.set(res.avg_rating ?? 0);
        this.ratingCount.set(res.total ?? 0);
      },
      error: () => {},
    });
  }

  private cargarRelacionados(productId: number): void {
    this.http.get<{ productos: ProductoApi[] }>(`${this.apiUrl}/products/list.php`).subscribe({
      next: res => {
        const todos = res.productos ?? [];
        const cat = this.rawProducto?.category;
        const rel = todos.filter(p => p.category === cat && p.id !== productId).slice(0, 6);
        this.relacionados.set(rel);
      },
      error: () => {},
    });
  }

  private cargarFrecuentes(productId: number): void {
    this.http.get<{ productos: ProductoApi[] }>(
      `${this.apiUrl}/products/frequently-bought.php?product_id=${productId}`
    ).subscribe({
      next: res => this.frecuenteJuntos.set(res.productos ?? []),
      error: () => {},
    });
  }

  private cargarTallasGuardadas(): void {
    this.profileSvc.getSizes().subscribe({
      next: res => { this.tallasGuardadas = res.sizes; },
      error: () => {},
    });
  }

  get tallaGuardada(): string | null {
    if (!this.tallasGuardadas || !this.producto) return null;
    const cat = this.producto.categoriaSlug;
    if (cat.includes('selecciones') || cat.includes('ftbol')) return this.tallasGuardadas.camisetas;
    if (cat.includes('chaquetas')) return this.tallasGuardadas.chaquetas;
    if (cat.includes('pantalones')) return this.tallasGuardadas.pantalones;
    return this.tallasGuardadas.camisetas;
  }

  tallaAgotada(talla: string): boolean {
    if (!this.rawProducto) return false;
    const sizeObj = this.rawProducto.sizes.find(s => s.size === talla);
    return sizeObj ? sizeObj.stock === 0 : false;
  }

  toggleWishlist(): void {
    if (!this.rawProducto) return;
    this.wishlistSvc.toggle(this.rawProducto);
  }

  toggleCompare(): void {
    if (!this.rawProducto) return;
    if (this.compareSvc.isInCompare(this.rawProducto.id)) {
      this.compareSvc.remove(this.rawProducto.id);
    } else if (this.compareSvc.isFull()) {
      this.toastService.show('Maximo 3 productos para comparar', 'error');
    } else {
      this.compareSvc.toggle(this.rawProducto);
    }
  }

  submitReview(): void {
    if (!this.loggedIn) { this.router.navigate(['/login']); return; }
    if (!this.rawProducto || this.miResena.rating === 0) return;
    this.enviandoResena.set(true);
    this.reviewSvc.createReview(this.rawProducto.id, this.miResena.rating, this.miResena.comment).subscribe({
      next: () => {
        this.enviandoResena.set(false);
        this.miResena = { rating: 0, comment: '' };
        this.toastService.show('Resena enviada. Pendiente de moderacion.', 'success');
        this.cargarReviews(this.rawProducto!.id);
      },
      error: () => {
        this.enviandoResena.set(false);
        this.toastService.show('Error al enviar la resena', 'error');
      },
    });
  }

  suscribirStock(): void {
    if (!this.rawProducto || !this.tallaSeleccionada || !this.suscribirEmail()) return;
    this.suscribiendo.set(true);
    this.http.post(`${this.apiUrl}/stock-notifications/subscribe.php`, {
      productId: this.rawProducto.id,
      size:      this.tallaSeleccionada,
      email:     this.suscribirEmail(),
    }).subscribe({
      next: () => {
        this.suscribiendo.set(false);
        this.suscrito.set(this.tallaSeleccionada);
        this.toastService.show('Te avisaremos cuando haya stock', 'success');
      },
      error: () => {
        this.suscribiendo.set(false);
        this.toastService.show('Error al suscribirte', 'error');
      },
    });
  }

  starArray(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i + 1);
  }

  seleccionarTalla(talla: string): void {
    if (this.tallaAgotada(talla)) return;
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
    this.toastService.show('Anadido al carrito');
    this.confirmado = true;
    clearTimeout(this.confirmTimer);
    this.confirmTimer = setTimeout(() => { this.confirmado = false; }, 2000);
  }

  private location = inject(Location);

  volver(): void {
    this.location.back();
  }
}