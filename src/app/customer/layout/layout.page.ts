import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

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
    RouterLink,
    RouterLinkActive,
    IonHeader,
    IonIcon,
    IonRouterOutlet
  ]
})
export class LayoutPage {

  isMobileMenuOpen = false;

  constructor() {
    addIcons({
      searchOutline,
      personOutline,
      cart,
      menuOutline,
      closeOutline
    });
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }
}