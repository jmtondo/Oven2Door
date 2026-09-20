import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./customer/layout/layout.page').then(
        (m) => m.LayoutPage
      ),

    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./customer/home/home.page').then(
            (m) => m.HomePage
          )
      },

      {
        path: 'menu',
        loadComponent: () =>
          import('./customer/menu/menu.page').then(
            (m) => m.MenuPage
          )
      },

      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  }
];