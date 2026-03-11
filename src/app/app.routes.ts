import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then(m => m.HomeComponent),
    data: { animation: 'home' },
  },
  {
    path: 'categoria/:slug',
    loadComponent: () =>
      import('./pages/categoria/categoria.component').then(m => m.CategoriaComponent),
    data: { animation: 'categoria' },
  },
  {
    path: 'producto/:id',
    loadComponent: () =>
      import('./pages/producto/producto.component').then(m => m.ProductoComponent),
    data: { animation: 'producto' },
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent),
    data: { animation: 'login' },
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./components/registro/registro.component').then(m => m.RegistroComponent),
    data: { animation: 'registro' },
  },
  {
    path: 'admin',
    redirectTo: 'admin/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'admin/dashboard',
    loadComponent: () =>
      import('./pages/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [authGuard, adminGuard],
    data: { animation: 'admin' },
  },
  {
    path: 'coleccion',
    loadComponent: () =>
      import('./pages/coleccion/coleccion.component').then(m => m.ColeccionComponent),
    data: { animation: 'coleccion' },
  },
  {
    path: 'decada/:decade',
    loadComponent: () =>
      import('./pages/decada/decada.component').then(m => m.DecadaComponent),
    data: { animation: 'decada' },
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./pages/checkout/checkout.component').then(m => m.CheckoutComponent),
    data: { animation: 'checkout' },
  },
  {
    path: 'checkout/pago',
    loadComponent: () =>
      import('./pages/checkout/pago/pago.component').then(m => m.PagoComponent),
    data: { animation: 'pago' },
  },
  {
    path: 'pedido-confirmado',
    loadComponent: () =>
      import('./pages/pedido-confirmado/pedido-confirmado.component').then(m => m.PedidoConfirmadoComponent),
    data: { animation: 'pedido-confirmado' },
  },
  {
    path: 'wishlist',
    loadComponent: () =>
      import('./pages/wishlist/wishlist.component').then(m => m.WishlistComponent),
    canActivate: [authGuard],
    data: { animation: 'wishlist' },
  },
  {
    path: 'comparar',
    loadComponent: () =>
      import('./pages/comparar/comparar.component').then(m => m.CompararComponent),
    data: { animation: 'comparar' },
  },
  {
    path: 'perfil',
    loadComponent: () =>
      import('./pages/perfil/perfil.component').then(m => m.PerfilComponent),
    canActivate: [authGuard],
    data: { animation: 'perfil' },
  },
  {
    path: '**',
    redirectTo: '',
  },
];
