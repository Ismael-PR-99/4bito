import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'categoria/:slug',
    loadComponent: () =>
      import('./pages/categoria/categoria.component').then(m => m.CategoriaComponent),
  },
  {
    path: 'producto/:id',
    loadComponent: () =>
      import('./pages/producto/producto.component').then(m => m.ProductoComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./components/registro/registro.component').then(m => m.RegistroComponent),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'coleccion',
    loadComponent: () =>
      import('./pages/coleccion/coleccion.component').then(m => m.ColeccionComponent),
  },
  {
    path: 'decada/:decade',
    loadComponent: () =>
      import('./pages/decada/decada.component').then(m => m.DecadaComponent),
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./pages/checkout/checkout.component').then(m => m.CheckoutComponent),
  },
  {
    path: 'checkout/pago',
    loadComponent: () =>
      import('./pages/checkout/pago/pago.component').then(m => m.PagoComponent),
  },
  {
    path: 'pedido-confirmado',
    loadComponent: () =>
      import('./pages/pedido-confirmado/pedido-confirmado.component').then(m => m.PedidoConfirmadoComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
