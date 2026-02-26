import { Routes } from '@angular/router';

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
    path: '**',
    redirectTo: '',
  },
];
