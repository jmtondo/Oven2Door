import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  IonContent,
  IonIcon,
  IonInput,
  IonButton,
  IonRadioGroup,
  IonRadio
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  arrowBackOutline,
  arrowForwardOutline,
  locationOutline,
  callOutline,
  mailOutline,
  cartOutline,
  cardOutline,
  cashOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';

import { StorefrontService } from '../../services/storefront.service';

import {
  CartLine,
  lineSubtotal
} from '../../models/storefront.models';

import { OrderService } from '../../services/firebase/order.service';

import { auth } from '../../firebase.config';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.page.html',
  styleUrls: ['./checkout.page.scss'],
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonIcon,
    IonInput,
    IonButton,
    IonRadioGroup,
    IonRadio
  ]
})
export class CheckoutPage implements OnInit {

  firstName = '';
  lastName = '';
  email = '';
  phone = '';

  address = '';
  barangay = '';
  city = '';
  province = '';
  postalCode = '';

  paymentMethod = 'cod';

  discount = 0;

  isPlacingOrder = false;

  constructor(
    public storefront: StorefrontService,
    private router: Router,
    private orderService: OrderService
  ) {

    addIcons({
      arrowBackOutline,
      arrowForwardOutline,
      locationOutline,
      callOutline,
      mailOutline,
      cartOutline,
      cardOutline,
      cashOutline,
      shieldCheckmarkOutline
    });

  }

  ngOnInit(): void {

    console.log('CHECKOUT PAGE LOADED');

    console.log(
      'Checkout cart:',
      this.storefront.cart
    );

    // Prevent checkout with an empty cart
    if (this.storefront.cart.length === 0) {

      this.router.navigateByUrl('/cart');

      return;
    }

    // Get currently logged-in Firebase user
    const user = auth.currentUser;

    if (user) {

      console.log(
        'Current Firebase user:',
        user.uid
      );

      // Automatically fill the email
      this.email = user.email ?? '';

      // Use Firebase display name if available
      if (user.displayName) {

        const nameParts =
          user.displayName.trim().split(' ');

        this.firstName =
          nameParts.shift() ?? '';

        this.lastName =
          nameParts.join(' ');
      }

    } else {

      console.warn(
        'No Firebase user is currently logged in.'
      );

    }

  }

  get cartItems(): CartLine[] {
    return this.storefront.cart;
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

  async placeOrder(): Promise<void> {

    // Prevent duplicate clicks
    if (this.isPlacingOrder) {
      return;
    }

    // Check Firebase login
    const user = auth.currentUser;

    if (!user) {

      alert(
        'You need to be logged in before placing an order.'
      );

      await this.router.navigateByUrl('/login');

      return;
    }

    // Validate customer information
    if (!this.firstName.trim()) {

      alert(
        'Please enter your first name.'
      );

      return;
    }

    if (!this.lastName.trim()) {

      alert(
        'Please enter your last name.'
      );

      return;
    }

    if (!this.email.trim()) {

      alert(
        'Please enter your email.'
      );

      return;
    }

    if (!this.phone.trim()) {

      alert(
        'Please enter your mobile number.'
      );

      return;
    }

    // Validate delivery address
    if (!this.address.trim()) {

      alert(
        'Please enter your delivery address.'
      );

      return;
    }

    if (!this.barangay.trim()) {

      alert(
        'Please enter your barangay.'
      );

      return;
    }

    if (!this.city.trim()) {

      alert(
        'Please enter your city.'
      );

      return;
    }

    if (!this.province.trim()) {

      alert(
        'Please enter your province.'
      );

      return;
    }

    if (!this.postalCode.trim()) {

      alert(
        'Please enter your postal code.'
      );

      return;
    }

    try {

      this.isPlacingOrder = true;

      console.log(
        'Creating Firebase order...'
      );

      const orderId =
        await this.orderService.createOrder({

          userId: user.uid,

          firstName:
            this.firstName,

          lastName:
            this.lastName,

          email:
            this.email,

          phone:
            this.phone,

          address:
            this.address,

          barangay:
            this.barangay,

          city:
            this.city,

          province:
            this.province,

          postalCode:
            this.postalCode,

          paymentMethod:
            this.paymentMethod,

          cartItems:
            this.cartItems,

          subtotal:
            this.subtotal,

          deliveryFee:
            this.deliveryFee,

          discount:
            this.discount,

          total:
            this.total

        });

      console.log(
        'Firebase order created:',
        orderId
      );

      // Clear cart after successful order
      this.storefront.clearCart();

      alert(
        'Your order has been placed successfully!'
      );

      // Temporary destination.
      // We can build the real order confirmation page next.
      await this.router.navigateByUrl('/home');

    } catch (error) {

      console.error(
        'Failed to create Firebase order:',
        error
      );

      alert(
        'Something went wrong while placing your order. Please try again.'
      );

    } finally {

      this.isPlacingOrder = false;

    }

  }

}