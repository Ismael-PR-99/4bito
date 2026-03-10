import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserProfileService, UserSizes, PedidoUsuario } from '../../services/user-profile.service';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';
import { ReturnsService, ReturnRequest } from '../../services/returns.service';

type PerfilTab = 'info' | 'tallas' | 'pedidos';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css',
})
export class PerfilComponent implements OnInit {
  private auth       = inject(AuthService);
  private profileSvc = inject(UserProfileService);
  private cartSvc    = inject(CartService);
  private toastSvc   = inject(ToastService);
  private returnsSvc = inject(ReturnsService);

  usuario = this.auth.getUsuario();

  tab        = signal<PerfilTab>('info');
  guardando  = signal(false);
  cargando   = signal(false);

  // ── Tallas ─────────────────────────────────────────────────
  tallas: UserSizes = { camisetas: null, chaquetas: null, pantalones: null };
  SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  tallasGuardadas = signal(false);

  // ── Pedidos ────────────────────────────────────────────────
  pedidos    = signal<PedidoUsuario[]>([]);
  expanded   = signal<number | null>(null);

  // ── Devoluciones ──────────────────────────────────────────
  modalDevolucion  = signal(false);
  pedidoDevolucion = signal<PedidoUsuario | null>(null);
  devMotivo        = signal('Producto defectuoso');
  devDescripcion   = signal('');
  devResolucion    = signal<'refund' | 'exchange'>('refund');
  enviandoDev      = signal(false);
  misDevs          = signal<ReturnRequest[]>([]);

  ngOnInit(): void {
    this.cargarTallas();
  }

  private cargarTallas(): void {
    this.profileSvc.getSizes().subscribe(res => {
      this.tallas = { ...res.sizes };
    });
  }

  setTab(t: PerfilTab): void {
    this.tab.set(t);
    if (t === 'pedidos' && this.pedidos().length === 0) {
      this.cargarPedidos();
    }
  }

  guardarTallas(): void {
    this.guardando.set(true);
    this.profileSvc.saveSizes(this.tallas).subscribe({
      next: () => {
        this.guardando.set(false);
        this.tallasGuardadas.set(true);
        this.toastSvc.show('TALLAS GUARDADAS', 'success');
        setTimeout(() => this.tallasGuardadas.set(false), 2000);
      },
      error: () => {
        this.guardando.set(false);
        this.toastSvc.show('ERROR AL GUARDAR', 'error');
      },
    });
  }

  private cargarPedidos(): void {
    this.cargando.set(true);
    this.profileSvc.getOrders().subscribe({
      next: res => { this.pedidos.set(res.pedidos ?? []); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
  }

  toggleExpanded(id: number): void {
    this.expanded.update(v => v === id ? null : id);
  }

  /** Devuelve pasos del tracker según estado del pedido */
  getPasoActual(estado: string): number {
    const map: Record<string, number> = { procesando: 1, enviado: 2, entregado: 3 };
    return map[estado] ?? 0;
  }

  /** Volver a comprar todos los items del pedido */
  recomprar(pedido: PedidoUsuario): void {
    const items = pedido.productos_json ?? [];
    if (!items.length) return;
    items.forEach((item: any) => {
      try {
        this.cartSvc.addToCart({
          id:            String(item.id),
          nombre:        item.nombre,
          categoriaSlug: item.categoriaSlug ?? '',
          precio:        item.precio,
          imageUrl:      item.imagen,
          tallas:        [item.talla],
          descripcion:   item.descripcion ?? '',
          anio:          item.anio ?? 0,
          equipo:        item.equipo ?? '',
        }, item.talla, 1);
      } catch { /* ignore sin stock */ }
    });
    this.toastSvc.show('Productos añadidos al carrito', 'success');
  }

  // ── Devoluciones ──────────────────────────────────────────
  abrirDevolucion(pedido: PedidoUsuario): void {
    this.pedidoDevolucion.set(pedido);
    this.devMotivo.set('Producto defectuoso');
    this.devDescripcion.set('');
    this.devResolucion.set('refund');
    this.modalDevolucion.set(true);
  }

  cerrarDevolucion(): void {
    this.modalDevolucion.set(false);
    this.pedidoDevolucion.set(null);
  }

  enviarDevolucion(): void {
    const pedido = this.pedidoDevolucion();
    if (!pedido) return;
    this.enviandoDev.set(true);
    this.returnsSvc.create({
      orderId: pedido.id,
      products: pedido.productos_json,
      reason: this.devMotivo(),
      description: this.devDescripcion(),
      photos: [],
      resolution: this.devResolucion(),
    }).subscribe({
      next: res => {
        this.enviandoDev.set(false);
        this.cerrarDevolucion();
        this.toastSvc.show(`Devolución ${res.caseNumber} creada`, 'success');
        this.cargarDevoluciones();
      },
      error: (err) => {
        this.enviandoDev.set(false);
        this.toastSvc.show(err.error?.error || 'Error al crear devolución', 'error');
      },
    });
  }

  cargarDevoluciones(): void {
    this.returnsSvc.list();
  }

  puedeDevolver(pedido: PedidoUsuario): boolean {
    if (pedido.estado !== 'entregado') return false;
    const dias = Math.floor((Date.now() - new Date(pedido.fecha_creacion).getTime()) / 86400000);
    return dias <= 30;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
