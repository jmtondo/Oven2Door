import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonButton
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  searchOutline,
  personOutline,
  cart,
  menuOutline,
  closeOutline,
  chevronForwardOutline,
  cartOutline,
  logoFacebook,
  logoInstagram,
  logoTiktok,
  locationOutline,
  callOutline,
  mailOutline
} from 'ionicons/icons';

import { CatalogService } from '../../services/firebase/catalog.service';
import { CatalogProduct } from '../../models/storefront.models';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon,
    IonButton
  ]
})
export class HomePage implements OnInit {

  isMobileMenuOpen = false;

  products: CatalogProduct[] = [];
  featuredProducts: CatalogProduct[] = [];

  isLoading = true;
  errorMessage = '';

  constructor(
    private catalogService: CatalogService
  ) {
    addIcons({
      searchOutline,
      personOutline,
      cart,
      menuOutline,
      closeOutline,
      chevronForwardOutline,
      cartOutline,
      logoFacebook,
      logoInstagram,
      logoTiktok,
      locationOutline,
      callOutline,
      mailOutline
    });
  }

async ngOnInit(): Promise<void> {
  console.log('HOME PAGE LOADED');
}

  async loadProducts(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.products = await this.catalogService.getProducts();

      this.featuredProducts = this.products
        .filter(
          product =>
            product.category.toLowerCase() === 'pizza'
        )
        .slice(0, 6);

      console.log('Firebase products loaded:', this.products.length);
      console.log('Featured pizzas:', this.featuredProducts);

    } catch (error) {
      console.error('Failed to load Firebase catalog:', error);

      this.errorMessage =
        'Unable to load products right now. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }
}