import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  IonContent,
  IonIcon,
  IonInput,
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
    IonRadioGroup,
    IonRadio
  ]
})
export class CheckoutPage implements OnInit {

  // ==========================================
  // CUSTOMER INFORMATION
  // ==========================================

  firstName = '';
  lastName = '';
  email = '';
  phone = '';

  // ==========================================
  // DELIVERY ADDRESS
  // ==========================================

  address = '';
  barangay = '';
  city = '';
  province = '';
  postalCode = '';

  // Automatically generated delivery coordinates
  deliveryLatitude: number | null = null;
  deliveryLongitude: number | null = null;

  // ==========================================
  // PAYMENT
  // ==========================================

  // 'cod' = Cash on Delivery
  // 'card' = Maya Online Payment
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

  // ==========================================
  // PAGE INITIALIZATION
  // ==========================================

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

      // Automatically fill email
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

    // ==========================================
    // GEOCODE DELIVERY ADDRESS
    // ==========================================

    private async geocodeDeliveryAddress(): Promise<void> {
  const fullAddress = [
    this.address,
    this.barangay,
    this.city,
    this.province,
    this.postalCode
  ]
    .filter(value => value?.trim())
    .join(', ');

  console.log('Geocoding address:', fullAddress);

  // Try the full address first, then simpler address formats.
  const addressQueries = [
    `${fullAddress}, Philippines`,
    fullAddress,
    [
      this.barangay,
      this.city,
      this.province,
      this.postalCode,
      'Philippines'
    ]
      .filter(value => value?.trim())
      .join(', '),
    [
      this.city,
      this.province,
      'Philippines'
    ]
      .filter(value => value?.trim())
      .join(', ')
  ];

  let coordinates: {
    latitude: number;
    longitude: number;
  } | null = null;

  for (const query of [...new Set(addressQueries)]) {
    try {
      const url =
        'https://nominatim.openstreetmap.org/search?' +
        `format=json&limit=1&countrycodes=ph&q=${encodeURIComponent(query)}`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(
          'Unable to connect to the address location service. Please try again.'
        );
      }

      const results = await response.json();

      if (!Array.isArray(results) || results.length === 0) {
        console.log('No location found for:', query);
        continue;
      }

      const latitude = Number(results[0].lat);
      const longitude = Number(results[0].lon);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        continue;
      }

      coordinates = {
        latitude,
        longitude
      };

      console.log('Address lookup matched:', query);
      break;
    } catch (error) {
      console.error('Address lookup failed:', error);
      throw new Error(
        'Unable to connect to OpenStreetMap. Please check your internet connection and try again.'
      );
    }
  }

  if (!coordinates) {
    throw new Error(
      'We could not locate this delivery address. Please check your street, barangay, city, and province.'
    );
  }

  this.deliveryLatitude = coordinates.latitude;
  this.deliveryLongitude = coordinates.longitude;

  console.log('Delivery coordinates generated:', {
    latitude: this.deliveryLatitude,
    longitude: this.deliveryLongitude
  });
}
  // ==========================================
  // CART
  // ==========================================

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

  // ==========================================
  // PLACE ORDER
  // ==========================================

  async placeOrder(): Promise<void> {

    // ------------------------------------------
    // Prevent duplicate clicks
    // ------------------------------------------

    if (this.isPlacingOrder) {
      return;
    }

    // ------------------------------------------
    // Check Firebase login
    // ------------------------------------------

    const user = auth.currentUser;

    if (!user) {

      alert(
        'You need to be logged in before placing an order.'
      );

      await this.router.navigateByUrl('/login');

      return;
    }

    // ------------------------------------------
    // Check cart
    // ------------------------------------------

    if (this.cartItems.length === 0) {

      alert(
        'Your cart is empty.'
      );

      await this.router.navigateByUrl('/cart');

      return;
    }

    // ==========================================
    // VALIDATE CUSTOMER INFORMATION
    // ==========================================

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

    // ==========================================
    // VALIDATE DELIVERY ADDRESS
    // ==========================================

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

    // ==========================================
    // START ORDER PROCESS
    // ==========================================

    try {

      this.isPlacingOrder = true;

      console.log(
        'Creating Firebase order...'
      );

      // ========================================
      // GENERATE DELIVERY COORDINATES
      // ========================================

      console.log('Generating delivery coordinates...');

      await this.geocodeDeliveryAddress();

      console.log('Delivery coordinates ready:', {
        latitude: this.deliveryLatitude,
        longitude: this.deliveryLongitude
      });

      if (
        this.deliveryLatitude === null ||
        this.deliveryLongitude === null
      ) {
        throw new Error(
          'Unable to determine the delivery location. Please check your address and try again.'
        );
      }

      // ========================================
      // CREATE FIRESTORE ORDER
      // ========================================

      const createdOrder =
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

          discount: this.discount,
          total: this.total,
          deliveryLatitude: this.deliveryLatitude,
          deliveryLongitude: this.deliveryLongitude

        });

      console.log(
        'Firebase order created:',
        createdOrder.orderId
      );

      console.log(
        'Order number:',
        createdOrder.orderNumber
      );

      // ========================================
      // MAYA ONLINE PAYMENT
      // ========================================

      if (this.paymentMethod === 'card') {

        console.log(
          'Creating Maya Sandbox Checkout...'
        );

        const mayaCheckout =
          await this.orderService.createMayaCheckout(
            createdOrder.orderId
          );

        console.log(
          'Maya Checkout created:',
          mayaCheckout
        );

        // --------------------------------------
        // Save pending order information
        // --------------------------------------
        //
        // We need these values later when we
        // handle the Maya payment result/webhook.

        sessionStorage.setItem(
          'pendingMayaOrderId',
          createdOrder.orderId
        );

        sessionStorage.setItem(
          'pendingMayaOrderNumber',
          createdOrder.orderNumber
        );

        sessionStorage.setItem(
          'pendingMayaCheckoutId',
          mayaCheckout.checkoutId
        );

        // --------------------------------------
        // IMPORTANT
        // --------------------------------------
        //
        // Do NOT clear the cart here.
        //
        // Creating a Maya Checkout does NOT mean
        // that the payment was successful.
        //
        // The cart will be cleared after we have
        // a proper payment confirmation flow.

        console.log(
          'Redirecting to Maya Sandbox...'
        );

        window.location.href =
          mayaCheckout.redirectUrl;

        return;
      }

      // ========================================
      // CASH ON DELIVERY
      // ========================================

            // ========================================
      // CASH ON DELIVERY
      // ========================================


if (this.paymentMethod === 'cod') {
  // SEND ORDER CONFIRMATION EMAIL
  try {
    console.log('Sending COD order confirmation email...');

    await this.orderService.sendOrderConfirmation(
      createdOrder.orderId
    );

    console.log(
      'COD order confirmation email sent successfully.'
    );
  } catch (emailError) {
    // Email failure should not cancel the order.
    console.error(
      'Order was created, but confirmation email failed:',
      emailError
    );
  }

  // CLEAR CART
  this.storefront.clearCart();

  alert('Your order has been placed successfully!');

  await this.router.navigate(
    ['/order-tracking'],
    { queryParams: { orderId: createdOrder.orderId } }
  );

  return;
}


    } catch (error) {

      console.error(
        'Failed to place order:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Something went wrong while placing your order. Please try again.'
      );

    } finally {

      this.isPlacingOrder = false;

    }

  }

}
