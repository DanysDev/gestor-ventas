import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shell/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./product-list/product-list').then((m) => m.ProductList),
      },
      {
        path: 'productos/nuevo',
        loadComponent: () =>
          import('./product-form/product-form').then((m) => m.ProductForm),
      },
      {
        path: 'productos/:id',
        loadComponent: () =>
          import('./product-detail/product-detail').then((m) => m.ProductDetail),
      },
      {
        path: 'productos/:id/editar',
        loadComponent: () =>
          import('./product-form/product-form').then((m) => m.ProductForm),
      },
      {
        path: 'ventas',
        loadComponent: () => import('./sale-list/sale-list').then((m) => m.SaleList),
      },
      {
        path: 'proveedores',
        loadComponent: () =>
          import('./supplier-list/supplier-list').then((m) => m.SupplierList),
      },
      {
        path: 'estafas',
        loadComponent: () =>
          import('./scam-list/scam-list').then((m) => m.ScamList),
      },
      {
        path: 'seguimiento',
        loadComponent: () =>
          import('./followup-list/followup-list').then((m) => m.FollowupList),
      },
      {
        path: 'config',
        loadComponent: () =>
          import('./settings-page/settings-page').then((m) => m.SettingsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];