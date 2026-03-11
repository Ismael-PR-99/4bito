import { Component, ViewEncapsulation, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { LucideAngularModule, ShoppingCart, User, Heart, LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { AuthService } from './services/auth.service';
import { DiscountService } from './services/discount.service';
import { CartService } from './services/cart.service';
import { CartDrawerService } from './services/cart-drawer.service';
import { ThemeService } from './services/theme.service';
import { WishlistService } from './services/wishlist.service';
import { NotificationService } from './services/notification.service';
import { CartDrawerComponent } from './components/cart-drawer/cart-drawer.component';
import { ToastComponent } from './components/toast/toast.component';
import { CompareBarComponent } from './components/compare-bar/compare-bar.component';
import { ChatWidgetComponent } from './components/chat-widget/chat-widget.component';
import { NotificationDropdownComponent } from './components/notification-dropdown/notification-dropdown.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [CommonModule, AsyncPipe, RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, CartDrawerComponent, ToastComponent, CompareBarComponent, ChatWidgetComponent, NotificationDropdownComponent],
  providers: [
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider({ ShoppingCart, User, Heart }) }
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements OnInit {
  title = '4BITO RETRO SPORTS';
  menuAbierto = false;

  carritoCount$!: Observable<number>;

  public  themeService   = inject(ThemeService);
  private auth           = inject(AuthService);
  private router         = inject(Router);
  private discount       = inject(DiscountService);
  private cartService    = inject(CartService);
  private drawerService  = inject(CartDrawerService);
  public  wishlistSvc    = inject(WishlistService);
  public  notifSvc       = inject(NotificationService);

  get loggedIn(): boolean { return this.auth.isLoggedIn(); }
  get esAdmin(): boolean { return this.auth.isAdmin(); }
  get usuario() { return this.auth.getUsuario(); }
  get nombreCorto(): string {
    return this.usuario?.nombre?.split(' ')[0] ?? 'MI CUENTA';
  }

  ngOnInit(): void {
    this.carritoCount$ = this.cartService.getItemCount();
    // 1. Verificar y desactivar piezas expiradas automáticamente
    this.discount.desactivarExpiradas().subscribe();
    // 2. Cargar la pieza activa en el BehaviorSubject global
    this.discount.cargarPieza().subscribe();
    // 3. Iniciar notificaciones si logueado
    this.notifSvc.init();
  }

  abrirCarrito(): void {
    this.drawerService.toggle();
  }

  toggleMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  cerrarMenu(): void {
    this.menuAbierto = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.cuenta-menu')) {
      this.menuAbierto = false;
    }
  }

  logout(): void {
    this.menuAbierto = false;
    this.auth.logout();
    this.router.navigate(['/']);
  }
}

