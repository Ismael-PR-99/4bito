import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ProductosService, ProductoApi } from '../../services/productos.service';
import { DiscountService } from '../../services/discount.service';
import { ReviewService, Review } from '../../services/review.service';
import { StockManagementService, StockAlert, StockMovement, WaitlistItem } from '../../services/stock-management.service';
import {
  AdminService, Pedido, Metricas, VentaDia, TopProducto, ResumenMes,
} from '../../services/admin.service';
import { ReturnsService, ReturnRequest } from '../../services/returns.service';
import { ChatService, ChatConversation, ChatMessage } from '../../services/chat.service';
import { AnadirProductoComponent } from '../../components/anadir-producto/anadir-producto.component';

type Section = 'resumen' | 'pedidos' | 'inventario' | 'ventas' | 'pieza' | 'alertas' | 'historial' | 'resenas' | 'espera' | 'devoluciones' | 'chats';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AnadirProductoComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  private authSvc      = inject(AuthService);
  private toastSvc     = inject(ToastService);
  private productosSvc = inject(ProductosService);
  private discountSvc  = inject(DiscountService);
  private adminSvc     = inject(AdminService);
  private router       = inject(Router);

  usuario = this.authSvc.getUsuario();

  // ── Navegación ────────────────────────────────────────────
  seccion        = signal<Section>('resumen');
  sidebarAbierto = signal(false);

  readonly navItems: { id: Section; icon: string; label: string }[] = [
    { id: 'resumen',    icon: '📦', label: 'RESUMEN' },
    { id: 'pedidos',    icon: '🛍',  label: 'PEDIDOS' },
    { id: 'inventario', icon: '👕', label: 'INVENTARIO' },
    { id: 'ventas',     icon: '💰', label: 'VENTAS' },
    { id: 'pieza',      icon: '⭐', label: 'PIEZA SEMANA' },
    { id: 'alertas',    icon: '🚨', label: 'ALERTAS STOCK' },
    { id: 'historial',  icon: '📋', label: 'HISTORIAL' },
    { id: 'resenas',    icon: '💬', label: 'RESEÑAS' },
    { id: 'espera',     icon: '📬', label: 'LISTA ESPERA' },
    { id: 'devoluciones', icon: '🔄', label: 'DEVOLUCIONES' },
    { id: 'chats',      icon: '💭', label: 'CHAT SOPORTE' },
  ];

  // ── SECCIÓN 1: RESUMEN ────────────────────────────────────
  metricas         = signal<Metricas | null>(null);
  cargandoMetricas = signal(true);

  tendencia(hoy: number, ayer: number): 'up' | 'down' | 'equal' {
    if (hoy > ayer) return 'up';
    if (hoy < ayer) return 'down';
    return 'equal';
  }

  // ── SECCIÓN 2: PEDIDOS ────────────────────────────────────
  pedidosTodos    = signal<Pedido[]>([]);
  filtroPedidos   = signal('todos');
  detallePedido   = signal<Pedido | null>(null);
  dropdownAbierto = signal<number | null>(null);
  cargandoPedidos = signal(true);

  pedidosFiltrados = computed(() => {
    const f = this.filtroPedidos();
    const t = this.pedidosTodos();
    return f === 'todos' ? t : t.filter(p => p.estado === f);
  });

  contadores = computed(() => {
    const t = this.pedidosTodos();
    return {
      todos:      t.length,
      procesando: t.filter(p => p.estado === 'procesando').length,
      enviado:    t.filter(p => p.estado === 'enviado').length,
      entregado:  t.filter(p => p.estado === 'entregado').length,
      cancelado:  t.filter(p => p.estado === 'cancelado').length,
    };
  });

  // ── SECCIÓN 3: INVENTARIO ─────────────────────────────────
  productos         = signal<ProductoApi[]>([]);
  busquedaInv       = signal('');
  filtroCat         = signal('');
  cargandoInv       = signal(true);
  modalStock        = signal<ProductoApi | null>(null);
  stockEdicion      = signal<Record<string, number>>({});
  guardandoStock    = signal(false);
  modalEliminar     = signal<ProductoApi | null>(null);
  mostrarFormAnadir = signal(false);

  productosFiltrados = computed(() => {
    let lista = this.productos();
    const q   = this.busquedaInv().toLowerCase();
    const cat = this.filtroCat();
    if (q)   lista = lista.filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
    if (cat) lista = lista.filter(p => p.category === cat);
    return lista;
  });

  categoriasUnicas = computed(() =>
    [...new Set(this.productos().map(p => p.category))].sort()
  );

  // ── SECCIÓN 4: VENTAS ─────────────────────────────────────
  ventasDias     = signal<VentaDia[]>([]);
  topProductos   = signal<TopProducto[]>([]);
  resumenMes     = signal<ResumenMes | null>(null);
  cargandoVentas = signal(true);

  chartPath     = computed(() => this.buildLinePath(this.ventasDias()));
  chartAreaPath = computed(() => this.buildAreaPath(this.ventasDias()));
  chartMaxVal   = computed(() => Math.max(...this.ventasDias().map(d => d.ingresos), 10));
  chartLabels   = computed(() => {
    const dias = this.ventasDias();
    if (!dias.length) return [];
    const indicies = [0, Math.floor(dias.length / 4), Math.floor(dias.length / 2),
                      Math.floor(3 * dias.length / 4), dias.length - 1];
    return indicies.map(i => ({
      x: this.xPos(i, dias.length),
      label: this.fmtFecha(dias[Math.min(i, dias.length - 1)].fecha),
    }));
  });

  // ── SECCIÓN 5: PIEZA SEMANA ───────────────────────────────
  piezaActual       = signal<any>(null);
  allProductos      = signal<ProductoApi[]>([]);
  busquedaPieza     = signal('');
  piezaSeleccionada = signal<ProductoApi | null>(null);
  descuentoPieza    = signal(20);
  validHastaPieza   = signal('');
  guardandoPieza    = signal(false);
  autocomplVisible  = signal(false);

  sugerenciasPieza = computed(() => {
    const q = this.busquedaPieza().toLowerCase();
    if (q.length < 2) return [];
    return this.allProductos()
      .filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q))
      .slice(0, 8);
  });

  precioFinalPieza = computed(() => {
    const p = this.piezaSeleccionada();
    if (!p) return 0;
    return +(p.price * (1 - this.descuentoPieza() / 100)).toFixed(2);
  });

  // ── Lifecycle ─────────────────────────────────────────────
  ngOnInit(): void {
    this.cargarMetricas();
    this.cargarPedidos();
    this.cargarInventario();
    this.cargarVentas();
    this.iniciarPieza();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.validHastaPieza.set(tomorrow.toISOString().slice(0, 16));
  }

  // ── Carga de datos ────────────────────────────────────────
  private cargarMetricas(): void {
    this.cargandoMetricas.set(true);
    this.adminSvc.getMetricas().subscribe({
      next: m  => { this.metricas.set(m); this.cargandoMetricas.set(false); },
      error: () => this.cargandoMetricas.set(false),
    });
  }

  private cargarPedidos(): void {
    this.cargandoPedidos.set(true);
    this.adminSvc.getPedidos().subscribe({
      next: r  => { this.pedidosTodos.set(r.pedidos ?? []); this.cargandoPedidos.set(false); },
      error: () => { this.pedidosTodos.set([]); this.cargandoPedidos.set(false); },
    });
  }

  private cargarInventario(): void {
    this.cargandoInv.set(true);
    this.productosSvc.getAllProducts().subscribe({
      next: lista => { this.productos.set(lista); this.cargandoInv.set(false); },
      error: ()   => this.cargandoInv.set(false),
    });
  }

  onProductoCreado(producto: ProductoApi): void {
    this.productos.update(lista => [producto, ...lista]);
    this.mostrarFormAnadir.set(false);
    this.toastSvc.show('Producto añadido correctamente', 'success');
  }

  private cargarVentas(): void {
    this.cargandoVentas.set(true);
    this.adminSvc.getVentasChart().subscribe({
      next: r  => { this.ventasDias.set(r.dias ?? []); this.cargandoVentas.set(false); },
      error: () => { this.ventasDias.set(this.mockDias(30)); this.cargandoVentas.set(false); },
    });
    this.adminSvc.getTopProductos().subscribe({
      next: r => {
        this.topProductos.set(r.productos ?? []);
        this.resumenMes.set(r.resumen ?? null);
      },
    });
  }

  private iniciarPieza(): void {
    this.discountSvc.pieza$.subscribe(p => this.piezaActual.set(p));
    this.productosSvc.getAllProducts().subscribe(p => this.allProductos.set(p));
  }

  // ── Navegación ────────────────────────────────────────────
  setSeccion(s: Section): void {
    this.seccion.set(s);
    this.sidebarAbierto.set(false);
    this.dropdownAbierto.set(null);
    if (s === 'alertas'   && this.alertas().length === 0)      { this.cargarAlertas(); }
    if (s === 'historial' && this.movimientos().length === 0)  { this.cargarMovimientos(); }
    if (s === 'resenas'   && this.resenasPanel().length === 0) { this.cargarResenas(); }
    if (s === 'espera'    && this.waitlist().length === 0)     { this.cargarWaitlist(); }
    if (s === 'devoluciones' && this.adminReturns().length === 0) { this.cargarReturns(); }
    if (s === 'chats') { this.chatSvc.loadRooms(); this.chatSvc.startAdminView(); }
  }

  toggleSidebar(): void { this.sidebarAbierto.update(v => !v); }

  logout(): void {
    this.authSvc.logout();
    this.router.navigate(['/login']);
  }

  // ── Pedidos ───────────────────────────────────────────────
  toggleDropdown(id: number): void {
    this.dropdownAbierto.update(v => v === id ? null : id);
  }

  cambiarEstado(id: number, estado: string): void {
    this.dropdownAbierto.set(null);
    this.adminSvc.updateEstadoPedido(id, estado).subscribe({
      next: () => {
        this.pedidosTodos.update(lista =>
          lista.map(p => p.id === id ? { ...p, estado: estado as Pedido['estado'] } : p)
        );
        this.toastSvc.show('ESTADO ACTUALIZADO', 'success');
      },
      error: () => this.toastSvc.show('ERROR AL ACTUALIZAR ESTADO', 'error'),
    });
  }

  verDetalle(id: number): void {
    this.dropdownAbierto.set(null);
    this.adminSvc.getPedidoDetalle(id).subscribe({
      next: r  => this.detallePedido.set(r.pedido),
      error: () => {
        const p = this.pedidosTodos().find(x => x.id === id);
        if (p) this.detallePedido.set(p);
      },
    });
  }

  cerrarDetalle(): void { this.detallePedido.set(null); }

  // ── Inventario ────────────────────────────────────────────
  abrirModalStock(p: ProductoApi): void {
    this.modalStock.set(p);
    const s: Record<string, number> = {};
    (p.sizes ?? []).forEach(sz => (s[sz.size] = sz.stock));
    this.stockEdicion.set(s);
  }

  cerrarModalStock(): void { this.modalStock.set(null); }

  updateStockTalla(size: string, value: number): void {
    this.stockEdicion.update(s => ({ ...s, [size]: value }));
  }

  guardarStock(): void {
    const p = this.modalStock();
    if (!p) return;
    this.guardandoStock.set(true);
    this.adminSvc.updateStock(p.id, this.stockEdicion()).subscribe({
      next: () => {
        this.productos.update(lista =>
          lista.map(x =>
            x.id === p.id
              ? { ...x, sizes: Object.entries(this.stockEdicion()).map(([size, stock]) => ({ size, stock })) }
              : x
          )
        );
        this.guardandoStock.set(false);
        this.cerrarModalStock();
        this.toastSvc.show('STOCK ACTUALIZADO', 'success');
      },
      error: () => {
        this.guardandoStock.set(false);
        this.toastSvc.show('ERROR AL GUARDAR STOCK', 'error');
      },
    });
  }

  confirmarEliminar(p: ProductoApi): void { this.modalEliminar.set(p); }

  eliminarProducto(): void {
    const p = this.modalEliminar();
    if (!p) return;
    this.productosSvc.eliminar(String(p.id)).subscribe({
      next: () => {
        this.productos.update(lista => lista.filter(x => x.id !== p.id));
        this.modalEliminar.set(null);
        this.toastSvc.show('PRODUCTO ELIMINADO', 'success');
      },
      error: () => this.toastSvc.show('ERROR AL ELIMINAR', 'error'),
    });
  }

  stockTotal(p: ProductoApi): number {
    return (p.sizes ?? []).reduce((s, x) => s + x.stock, 0);
  }

  // ── Pieza Semana ──────────────────────────────────────────
  selectPieza(p: ProductoApi): void {
    this.piezaSeleccionada.set(p);
    this.busquedaPieza.set(p.name);
    this.autocomplVisible.set(false);
  }

  onBusquedaChange(): void {
    this.autocomplVisible.set(this.busquedaPieza().length >= 2);
  }

  cerrarAutocomplete(): void {
    setTimeout(() => this.autocomplVisible.set(false), 200);
  }

  activarPieza(): void {
    const p     = this.piezaSeleccionada();
    const fecha = this.validHastaPieza();
    if (!p || !fecha || this.descuentoPieza() <= 0) return;
    this.guardandoPieza.set(true);
    this.discountSvc.establecerPieza({
      productId:       p.id,
      discountPercent: this.descuentoPieza(),
      finalPrice:      this.precioFinalPieza(),
      validUntil:      fecha.replace('T', ' ') + ':00',
    }).subscribe({
      next: () => {
        this.guardandoPieza.set(false);
        this.toastSvc.show('PIEZA DE LA SEMANA ACTIVADA', 'success');
      },
      error: () => {
        this.guardandoPieza.set(false);
        this.toastSvc.show('ERROR AL ACTIVAR PIEZA', 'error');
      },
    });
  }

  // ── Chart Helpers ─────────────────────────────────────────
  private readonly CW = 580;
  private readonly CH = 150;
  private readonly CP = 5;

  xPos(i: number, total: number): number {
    if (total <= 1) return this.CP;
    return this.CP + (i / (total - 1)) * (this.CW - this.CP * 2);
  }

  private yPos(val: number, maxVal: number): number {
    const h = this.CH - this.CP * 2;
    return this.CH - this.CP - (val / maxVal) * h;
  }

  private buildLinePath(datos: VentaDia[]): string {
    if (datos.length < 2) return '';
    const max = Math.max(...datos.map(d => d.ingresos), 1);
    const pts = datos.map((d, i) => ({
      x: this.xPos(i, datos.length),
      y: this.yPos(d.ingresos, max),
    }));
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cpX = (pts[i - 1].x + pts[i].x) / 2;
      path += ` C ${cpX} ${pts[i - 1].y}, ${cpX} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
    }
    return path;
  }

  private buildAreaPath(datos: VentaDia[]): string {
    if (datos.length < 2) return '';
    const n      = datos.length;
    const line   = this.buildLinePath(datos);
    const lastX  = this.xPos(n - 1, n);
    const firstX = this.xPos(0, n);
    return `${line} L ${lastX} ${this.CH} L ${firstX} ${this.CH} Z`;
  }

  fmtFecha(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }

  private mockDias(n: number): VentaDia[] {
    return Array.from({ length: n }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (n - 1 - i));
      return { fecha: d.toISOString().split('T')[0], ingresos: 0, pedidos: 0 };
    });
  }

  // ───────────────────────────────────────────────────────────
  // SECCIÓN 6: ALERTAS DE STOCK
  // ───────────────────────────────────────────────────────────
  private stockMgmtSvc = inject(StockManagementService);
  private reviewSvcAdm = inject(ReviewService);

  alertas         = signal<StockAlert[]>([]);
  cargandoAlertas = signal(false);

  cargarAlertas(): void {
    this.cargandoAlertas.set(true);
    this.stockMgmtSvc.getAlerts().subscribe({
      next: r  => { this.alertas.set(r.alerts ?? []); this.cargandoAlertas.set(false); },
      error: () => this.cargandoAlertas.set(false),
    });
  }

  ignorarAlerta(id: number): void {
    this.stockMgmtSvc.ignoreAlert(id).subscribe({
      next: () => {
        this.alertas.update(list => list.filter(a => a.id !== id));
        this.toastSvc.show('Alerta ignorada', 'success');
      },
    });
  }

  // ───────────────────────────────────────────────────────────
  // SECCIÓN 7: HISTORIAL DE MOVIMIENTOS
  // ───────────────────────────────────────────────────────────
  movimientos         = signal<StockMovement[]>([]);
  cargandoMov         = signal(false);
  filtroMovTipo       = signal('');

  cargarMovimientos(): void {
    this.cargandoMov.set(true);
    const params = this.filtroMovTipo() ? { type: this.filtroMovTipo() } : {};
    this.stockMgmtSvc.getMovements(params).subscribe({
      next: r  => { this.movimientos.set(r.movements ?? []); this.cargandoMov.set(false); },
      error: () => this.cargandoMov.set(false),
    });
  }

  exportarCSV(): void {
    const cols = ['ID', 'Producto', 'Talla', 'Tipo', 'Cantidad', 'Stock Prev', 'Stock Nuevo', 'Razón', 'Fecha'];
    const rows = this.movimientos().map(m => [
      m.id, `"${m.product_name}"`, m.size, m.type, m.quantity,
      m.previous_stock, m.new_stock, `"${m.reason ?? ''}"`, m.created_at,
    ].join(','));
    const csv  = [cols.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `movimientos_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ───────────────────────────────────────────────────────────
  // SECCIÓN 8: RESEÑAS
  // ───────────────────────────────────────────────────────────
  resenasPanel     = signal<Review[]>([]);
  cargandoResenas  = signal(false);

  cargarResenas(): void {
    this.cargandoResenas.set(true);
    this.reviewSvcAdm.getPending().subscribe({
      next: r  => { this.resenasPanel.set(r.reviews ?? []); this.cargandoResenas.set(false); },
      error: () => this.cargandoResenas.set(false),
    });
  }

  moderarResena(id: number, accion: 'approve' | 'delete'): void {
    this.reviewSvcAdm.moderate(id, accion).subscribe({
      next: () => {
        this.resenasPanel.update(list => list.filter(r => r.id !== id));
        this.toastSvc.show(accion === 'approve' ? 'Reseña aprobada' : 'Reseña eliminada', 'success');
      },
    });
  }

  // ───────────────────────────────────────────────────────────
  // SECCIÓN 9: LISTA DE ESPERA
  // ───────────────────────────────────────────────────────────
  waitlist         = signal<WaitlistItem[]>([]);
  cargandoWaitlist = signal(false);
  busquedaWaitlist = signal('');

  cargarWaitlist(): void {
    this.cargandoWaitlist.set(true);
    this.stockMgmtSvc.getWaitlist().subscribe({
      next: r  => { this.waitlist.set(r.waitlist ?? []); this.cargandoWaitlist.set(false); },
      error: () => this.cargandoWaitlist.set(false),
    });
  }

  waitlistFiltrada = computed(() => {
    const q = this.busquedaWaitlist().toLowerCase();
    if (!q) return this.waitlist();
    return this.waitlist().filter(w =>
      (w.product_name ?? '').toLowerCase().includes(q)
    );
  });

  // ───────────────────────────────────────────────────────────
  // SECCIÓN 10: DEVOLUCIONES
  // ───────────────────────────────────────────────────────────
  private returnsSvc = inject(ReturnsService);

  adminReturns       = signal<ReturnRequest[]>([]);
  cargandoReturns    = signal(false);
  filtroReturnStatus = signal('');
  returnDetalle      = signal<ReturnRequest | null>(null);
  adminReturnNotes   = signal('');

  cargarReturns(): void {
    this.cargandoReturns.set(true);
    const status = this.filtroReturnStatus();
    this.returnsSvc.list(status || undefined);
    // Poll the signal
    setTimeout(() => {
      this.adminReturns.set(this.returnsSvc.returns());
      this.cargandoReturns.set(false);
    }, 1500);
  }

  verReturn(r: ReturnRequest): void {
    this.returnDetalle.set(r);
    this.adminReturnNotes.set(r.admin_notes || '');
  }

  cerrarReturnDetalle(): void { this.returnDetalle.set(null); }

  actualizarReturn(id: number, status: string): void {
    this.returnsSvc.updateStatus(id, status, this.adminReturnNotes()).subscribe({
      next: () => {
        this.toastSvc.show('Devolución actualizada', 'success');
        this.cerrarReturnDetalle();
        this.cargarReturns();
      },
      error: () => this.toastSvc.show('Error al actualizar', 'error'),
    });
  }

  // ───────────────────────────────────────────────────────────
  // SECCIÓN 11: CHAT SOPORTE
  // ───────────────────────────────────────────────────────────
  chatSvc = inject(ChatService);

  adminChatInput = signal('');

  enviarMsgAdmin(): void {
    const msg = this.adminChatInput().trim();
    if (!msg) return;
    this.chatSvc.sendMessage(msg, 'admin');
    this.adminChatInput.set('');
  }

  cerrarChat(convId: number): void {
    this.chatSvc.resolveConversation(convId);
    this.toastSvc.show('Conversación cerrada', 'success');
  }
}

