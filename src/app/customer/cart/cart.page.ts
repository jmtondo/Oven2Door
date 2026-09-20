import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { IonContent, IonIcon } from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  flameOutline,
  searchOutline,
  personOutline,
  cart,
  menuOutline,
  closeOutline,
  arrowBackOutline,
  arrowForwardOutline,
  trashOutline,
  syncOutline,
  pizzaOutline,
  shieldCheckmarkOutline,
  logoFacebook,
  logoInstagram,
  logoTiktok,
  locationOutline,
  callOutline,
  mailOutline
} from 'ionicons/icons';

import { StorefrontService } from '../../services/storefront.service';

import {
  CartLine,
  money,
  lineSubtotal
} from '../../models/storefront.models';

@Component({
  selector: 'app-cart',
  templateUrl: 'cart.page.html',
  styleUrls: ['cart.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonIcon
  ]
})
export class CartPage implements OnInit, OnDestroy {

  isMobileMenuOpen = false;
  isSearchOpen = false;

  couponCode = '';
  discount = 0;

  private cartSubscription?: Subscription;

  constructor(
    public storefront: StorefrontService
  ) {
    addIcons({
      flameOutline,
      searchOutline,
      personOutline,
      cart,
      menuOutline,
      closeOutline,
      arrowBackOutline,
      arrowForwardOutline,
      trashOutline,
      syncOutline,
      pizzaOutline,
      shieldCheckmarkOutline,
      logoFacebook,
      logoInstagram,
      logoTiktok,
      locationOutline,
      callOutline,
      mailOutline
    });
  }

  ngOnInit(): void {
    console.log('CART PAGE LOADED');
    console.log('Cart contents:', this.storefront.cart);
    console.log('Cart item count:', this.storefront.itemCount);

    this.cartSubscription = this.storefront.changed.subscribe(() => {
      console.log('Cart changed:', this.storefront.cart);
    });
  }

  ngOnDestroy(): void {
    this.cartSubscription?.unsubscribe();
  }

  get cartItems(): CartLine[] {
    return this.storefront.cart;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  toggleSearch(): void {
    this.isSearchOpen = !this.isSearchOpen;
  }

  incrementQty(item: CartLine): void {
    this.storefront.changeQuantity(item, 1);
  }

  decrementQty(item: CartLine): void {
    this.storefront.changeQuantity(item, -1);
  }

  onQuantityInput(item: CartLine): void {
    if (!item.quantity || item.quantity < 1) {
      item.quantity = 1;
    }

    this.storefront.changed.next();
  }

  removeItem(item: CartLine): void {
    this.storefront.remove(item);
  }

  itemTotal(item: CartLine): number {
    return lineSubtotal(item);
  }

  get subtotal(): number {
    return this.storefront.subtotal;
  }

  get deliveryFee(): number {
    return this.storefront.deliveryFee;
  }

  get total(): number {
    return Math.max(
      this.subtotal +
      this.deliveryFee -
      this.discount,
      0
    );
  }

  applyCoupon(): void {
    // Coupon logic will be connected later.
  }

  updateCart(): void {
    this.storefront.changed.next();
  }

  toppingNames(item: CartLine): string {
    return item.toppings
      .map(topping => topping.name)
      .join(', ');
  }

  money(amount: number): string {
    return money(amount);
  }
}