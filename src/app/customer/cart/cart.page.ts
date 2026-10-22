import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PromoService, AppliedPromo } from '../../services/promo.service';

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
  mailOutline,
} from 'ionicons/icons';

import { StorefrontService } from '../../services/storefront.service';

import {
  CartLine,
  money,
  lineSubtotal,
  unitPrice,
} from '../../models/storefront.models';

@Component({
  selector: 'app-cart',
  templateUrl: 'cart.page.html',
  styleUrls: ['cart.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonContent, IonIcon],
})
export class CartPage implements OnInit, OnDestroy {
  isMobileMenuOpen = false;
  isSearchOpen = false;

  couponCode = '';
  discount = 0;

  appliedPromo: AppliedPromo | null = null;
  couponMessage = '';
  couponError = '';
  applyingCoupon = false;

  private cartSubscription?: Subscription;

  constructor(
    public storefront: StorefrontService,
    private promoService: PromoService,
    private cdr: ChangeDetectorRef,
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
      mailOutline,
    });
  }

  itemUnitPrice(item: CartLine): number {
    return unitPrice(item);
  }

  ngOnInit(): void {
    console.log('CART PAGE LOADED');
    console.log('Cart contents:', this.storefront.cart);
    console.log('Cart item count:', this.storefront.itemCount);

    this.cartSubscription = this.storefront.changed.subscribe(() => {
      console.log('Cart changed:', this.storefront.cart);
      this.clearCoupon();
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
    return Math.max(this.subtotal + this.deliveryFee - this.discount, 0);
  }

  async applyCoupon(): Promise<void> {
    if (this.applyingCoupon) return;

    this.clearCoupon();

    const code = this.couponCode.trim().toUpperCase();

    if (!code) {
      this.couponError = 'Please enter a promo code.';
      return;
    }

    if (this.cartItems.length === 0) {
      this.couponError = 'Add products to your cart first.';
      return;
    }

    this.applyingCoupon = true;

    const subtotalAtStart = this.subtotal;

    try {
      const promo = await this.promoService.validatePromo(
        code,
        subtotalAtStart,
      );
      console.log('[CART] Validated promo:', promo);
      console.log('[CART] Subtotal before:', subtotalAtStart);
      console.log('[CART] Subtotal now:', this.subtotal);

      if (this.subtotal !== subtotalAtStart) {
        throw new Error('Your cart changed. Please apply the promo again.');
      }

      this.appliedPromo = promo;
      this.discount = promo.discount;
      this.couponCode = promo.code;

      sessionStorage.setItem('oven2doorPromoCode', promo.code);

      this.couponMessage = `${promo.code} applied! You saved ₱${promo.discount.toFixed(2)}.`;
    } catch (error) {
      console.error('[CART] Promo application failed:', error);
      this.clearCoupon();

      this.couponError =
        error instanceof Error ? error.message : 'Unable to apply promo code.';
    } finally {
      this.applyingCoupon = false;
      this.cdr.detectChanges();
    }
  }
  clearCoupon(): void {
    this.appliedPromo = null;
    this.discount = 0;
    this.couponMessage = '';
    this.couponError = '';

    sessionStorage.removeItem('oven2doorPromoCode');
  }

  onCouponCodeChanged(): void {
    this.clearCoupon();
  }

  updateCart(): void {
    this.storefront.changed.next();
  }

  toppingNames(item: CartLine): string {
    return item.toppings.map((topping) => topping.name).join(', ');
  }

  money(amount: number): string {
    return money(amount);
  }
}
