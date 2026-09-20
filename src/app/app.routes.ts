import { Routes } from '@angular/router';

export const routes: Routes = [
  // LOGIN
  {
    path: 'login',
    loadComponent: () =>
      import('./authentication/login/login.page').then(
        (m) => m.LoginPage
      )
  },

  //SIGNUP 
  {
    path: 'signup',
    loadComponent: () =>
      import('./authentication/signup/signup.page').then(
        (m) => m.SignupPage
      )
  },

  // CUSTOMER LAYOUT
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
        path: 'cart',
        loadComponent: () =>
          import('./customer/cart/cart.page').then(
            (m) => m.CartPage
          )
      },

      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  },

  // FALLBACK
  {
    path: '**',
    redirectTo: 'login'
  }
];