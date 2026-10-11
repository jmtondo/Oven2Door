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
        path: 'about-us',
        loadComponent: () =>
          import('./customer/aboutus/aboutus.page').then(m => m.AboutUsPage)
      },

      {
        path: 'faqs',
        loadComponent: () =>
          import('./customer/faqs/faqs.page').then(m => m.FaqsPage)
      },

      {
        path: 'cart',
        loadComponent: () =>
          import('./customer/cart/cart.page').then(
            (m) => m.CartPage
          )
      },

      {
        path: 'checkout',
        loadComponent: () =>
          import('./customer/checkout/checkout.page').then(
            (m) => m.CheckoutPage
          )
      },
      
      {
        path: 'payment-result',
        loadComponent: () =>
          import('./customer/payment-result/payment-result.page').then(
            (m) => m.PaymentResultPage
          )
      },

      {
        path: 'order-tracking',
        loadComponent: () => import('./customer/order-tracking/order-tracking.page').then((m) => m.OrderTrackingPage)
      },

      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'delivery-dashboard',
    loadComponent: () => import('./delivery/dashboard/delivery-dashboard.page').then((m) => m.DeliveryDashboardPage)
  },

  // FALLBACK
  {
    path: '**',
    redirectTo: 'login'
  },
  {
    path: 'payment-result',
    loadComponent: () => import('./customer/payment-result/payment-result.page').then( m => m.PaymentResultPage)
  }
];
