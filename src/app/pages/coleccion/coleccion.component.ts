import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductosService, ProductoApi, SortOption } from '../../services/productos.service';
import { TiendaService } from '../../services/tienda.service';
import { WishlistService } from '../../services/wishlist.service';
import { CompareService } from '../../services/compare.service';

@Component({
  selector: 'app-coleccion',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe, DecimalPipe],
  templateUrl: './coleccion.component.html',
  styleUrls: ['./coleccion.component.css'],
})
export class ColeccionComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private svc     = inject(ProductosService);
  private tienda  = inject(TiendaService);
  wishlistSvc     = inject(WishlistService);
  compareSvc      = inject(CompareService);

  toggleWishlist(e: Event, p: ProductoApi): void {
    e.preventDefault(); e.stopPropagation();
    this.wishlistSvc.toggle(p);
  }

  toggleCompare(e: Event, p: ProductoApi): void {
    e.preventDefault(); e.stopPropagation();
    if (this.compareSvc.isInCompare(p.id)) {
      this.compareSvc.remove(p.id);
    } else {
      this.compareSvc.toggle(p);
    }
  }

  // Estado de filtros activos
  activeDecade   = signal<string>('');
  activeCategory = signal<string>('');
  isNew          = signal<boolean>(false);
  sort           = signal<SortOption>('newest');

  // Estado UI
  products  = signal<ProductoApi[]>([]);
  cargando  = signal<boolean>(true);
  error     = signal<string>('');

  // Datos estáticos para el sidebar
  readonly decades    = ['70s', '80s', '90s', '00s'];
  readonly categorias = this.tienda.getCategorias();

  readonly sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest',     label: 'Más recientes' },
    { value: 'price-asc',  label: 'Precio: menor a mayor' },
    { value: 'price-desc', label: 'Precio: mayor a menor' },
  ];

  // Título dinámico de la página
  readonly titulo = computed(() => {
    if (this.isNew())          return 'NOVEDADES';
    if (this.activeDecade())   return `COLECCIÓN ${this.activeDecade()}`;
    if (this.activeCategory()) {
      const cat = this.categorias.find(c => c.slug === this.activeCategory());
      return cat ? cat.nombre.toUpperCase() : 'COLECCIÓN';
    }
    return 'TODA LA COLECCIÓN';
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const decade   = params.get('decade')   ?? '';
      const category = params.get('category') ?? '';
      const isNew    = params.get('new') === '1';
      const sort     = (params.get('sort') as SortOption) || 'newest';

      this.activeDecade.set(decade);
      this.activeCategory.set(category);
      this.isNew.set(isNew);
      this.sort.set(sort);

      this.loadProducts({ decade, category, isNew, sort });
    });
  }

  private loadProducts(filters: {
    decade: string;
    category: string;
    isNew: boolean;
    sort: SortOption;
  }): void {
    this.cargando.set(true);
    this.error.set('');

    this.svc.getFiltered({
      decade:   filters.decade   || undefined,
      category: filters.category || undefined,
      isNew:    filters.isNew    || undefined,
      sort:     filters.sort,
    }).subscribe({
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

  // ── Acciones de filtro ─────────────────────────────────────────────────

  setDecade(decade: string): void {
    const next = this.activeDecade() === decade ? '' : decade;
    this.navigate({ decade: next || null, category: this.activeCategory() || null, new: null });
  }

  setCategory(slug: string): void {
    const next = this.activeCategory() === slug ? '' : slug;
    this.navigate({ decade: this.activeDecade() || null, category: next || null, new: null });
  }

  setSort(value: SortOption): void {
    this.navigate({
      decade:   this.activeDecade()   || null,
      category: this.activeCategory() || null,
      new:      this.isNew() ? '1'    : null,
      sort:     value !== 'newest' ? value : null,
    });
  }

  toggleNew(): void {
    const next = !this.isNew();
    this.navigate({
      decade:   this.activeDecade()   || null,
      category: this.activeCategory() || null,
      new:      next ? '1' : null,
      sort:     this.sort() !== 'newest' ? this.sort() : null,
    });
  }

  clearFilters(): void {
    this.navigate({});
  }

  hasFilters = computed(() =>
    !!this.activeDecade() || !!this.activeCategory() || this.isNew()
  );

  navigate(params: Record<string, string | null>): void {
    this.router.navigate(['/coleccion'], { queryParams: params });
  }
}
