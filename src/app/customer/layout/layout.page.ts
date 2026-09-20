import { Component, OnDestroy } from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Subscription } from 'rxjs';

import { StorefrontService } from '../../services/storefront.service';

import {
  IonHeader,
  IonIcon,
  IonRouterOutlet
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  searchOutline,
  personOutline,
  cart,
  menuOutline,
  closeOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.page.html',
  styleUrls: ['./layout.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    IonHeader,
    IonIcon,
    IonRouterOutlet
  ]
})
export class LayoutPage implements OnDestroy {

  isMobileMenuOpen = false;

  private cartSubscription?: Subscription;

  constructor(
    public storefront: StorefrontService
  ) {
    addIcons({
      searchOutline,
      personOutline,
      cart,
      menuOutline,
      closeOutline
    });

    this.cartSubscription = this.storefront.changed.subscribe(() => {
      // Keeps the layout updated whenever the cart changes.
    });
  }

  ngOnDestroy(): void {
    this.cartSubscription?.unsubscribe();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }
}