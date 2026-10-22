import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PromoService } from '../../services/promo.service';

import {
  IonContent,
  IonIcon,
  IonInput,
  IonRadioGroup,
  IonRadio,
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
  shieldCheckmarkOutline,
} from 'ionicons/icons';

import { StorefrontService } from '../../services/storefront.service';

import { CartLine, lineSubtotal } from '../../models/storefront.models';

import { OrderService } from '../../services/firebase/order.service';

import { auth, db } from '../../firebase.config';
import {
  collection,
  getDocs,
  getDocsFromCache,
  doc,
  getDoc,
} from 'firebase/firestore';
interface CheckoutAddress {
  id: string;
  label: string;
  address: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
}

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
    IonRadio,
  ],
})
export class CheckoutPage implements OnInit {
  async loadAppliedPromo(): Promise<void> {
    this.promoLoading = true;
    this.promoError = '';
    this.discount = 0;

    try {
      if (!this.promoCode) return;

      const promo = await this.promoService.validatePromo(
        this.promoCode,
        this.subtotal,
      );

      this.discount = promo.discount;

      console.log('[CHECKOUT] Promo validated:', {
        code: promo.code,
        discount: promo.discount,
        total: this.total,
      });
    } catch (error) {
      console.error('[CHECKOUT] Promo validation failed:', error);

      this.promoError =
        error instanceof Error
          ? error.message
          : 'Unable to validate your promo code.';

      // Keep the promo code so the customer can retry.
      this.discount = 0;
    } finally {
      this.promoLoading = false;
      this.cdr.detectChanges();
    }
  }
  savedAddresses: CheckoutAddress[] = [];
  selectedAddressId = 'manual';
  addressesLoading = false;
  addressLoadError = '';
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

  // PROMO CODE
  discount = 0;
  promoCode: string | null = null;

  // PROMO VALIDATION STATUS
  promoLoading = false;
  promoError = '';

  // ORDER PROCESSING
  isPlacingOrder = false;

  constructor(
    private promoService: PromoService,
    public storefront: StorefrontService,
    private router: Router,
    private orderService: OrderService,
    private cdr: ChangeDetectorRef,
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
      shieldCheckmarkOutline,
    });
  }

  // ==========================================
  // PAGE INITIALIZATION
  // ==========================================

  ngOnInit(): void {
    console.log('CHECKOUT PAGE LOADED');

    console.log('Checkout cart:', this.storefront.cart);

    // Prevent checkout with an empty cart
    if (this.storefront.cart.length === 0) {
      this.router.navigateByUrl('/cart');

      return;
    }

    this.promoCode = sessionStorage.getItem('oven2doorPromoCode');
    void this.loadAppliedPromo();

    console.log('Applied promo code:', this.promoCode);
    // Get currently logged-in Firebase user
    const user = auth.currentUser;

    if (user) {
      console.log('Current Firebase user:', user.uid);

      // Automatically fill email
      this.email = user.email ?? '';

      // Use Firebase display name if available
      if (user.displayName) {
        const nameParts = user.displayName.trim().split(' ');

        this.firstName = nameParts.shift() ?? '';
        this.lastName = nameParts.join(' ');
      }

      // Load customer information from Firestore
      void this.loadCustomerProfile(user.uid);

      // Load saved shipping addresses from Firestore
      // Automatically selects the default address
      void this.loadSavedAddresses(user.uid);
    } else {
      console.warn('No Firebase user is currently logged in.');
    }
  }

  // ==========================================
  // LOAD CUSTOMER PROFILE FROM FIRESTORE
  // ==========================================

  async loadCustomerProfile(uid: string): Promise<void> {
    try {
      const snapshot = await getDoc(doc(db, 'users', uid));

      if (!snapshot.exists() || auth.currentUser?.uid !== uid) {
        return;
      }

      const data = snapshot.data();

      this.firstName = data['firstName'] || this.firstName;
      this.lastName = data['lastName'] || this.lastName;
      this.phone = data['phone'] || this.phone;
    } catch (error) {
      console.error('Unable to load checkout customer:', error);
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
      this.postalCode,
    ]
      .filter((value) => value?.trim())
      .join(', ');

    console.log('Geocoding address:', fullAddress);

    // Try the full address first, then simpler address formats.
    const addressQueries = [
      `${fullAddress}, Philippines`,
      fullAddress,
      [this.barangay, this.city, this.province, this.postalCode, 'Philippines']
        .filter((value) => value?.trim())
        .join(', '),
      [this.city, this.province, 'Philippines']
        .filter((value) => value?.trim())
        .join(', '),
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
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(
            'Unable to connect to the address location service. Please try again.',
          );
        }

        const results = await response.json();

        if (!Array.isArray(results) || results.length === 0) {
          console.log('No location found for:', query);
          continue;
        }

        const latitude = Number(results[0].lat);
        const longitude = Number(results[0].lon);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          continue;
        }

        coordinates = {
          latitude,
          longitude,
        };

        console.log('Address lookup matched:', query);
        break;
      } catch (error) {
        console.error('Address lookup failed:', error);
        throw new Error(
          'Unable to connect to OpenStreetMap. Please check your internet connection and try again.',
        );
      }
    }

    if (!coordinates) {
      throw new Error(
        'We could not locate this delivery address. Please check your street, barangay, city, and province.',
      );
    }

    this.deliveryLatitude = coordinates.latitude;
    this.deliveryLongitude = coordinates.longitude;

    console.log('Delivery coordinates generated:', {
      latitude: this.deliveryLatitude,
      longitude: this.deliveryLongitude,
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
    return Math.max(this.subtotal + this.deliveryFee - this.discount, 0);
  }

  async loadSavedAddresses(uid: string): Promise<void> {
    this.addressesLoading = true;
    this.addressLoadError = '';
    this.cdr.detectChanges();

    const addressCollection = collection(db, 'users', uid, 'addresses');

    const applyAddresses = (
      snapshot: Awaited<ReturnType<typeof getDocs>>,
      fromCache: boolean,
    ): void => {
      if (auth.currentUser?.uid !== uid) return;

      const previousSelection = this.selectedAddressId;
      const hadSelectedAddress = previousSelection !== 'manual';

      this.savedAddresses = snapshot.docs.map((item) => {
        const data = item.data() as Record<string, unknown>;

        return {
          id: item.id,

          label: typeof data['label'] === 'string' ? data['label'] : 'Home',

          address: typeof data['address'] === 'string' ? data['address'] : '',

          barangay:
            typeof data['barangay'] === 'string' ? data['barangay'] : '',

          city: typeof data['city'] === 'string' ? data['city'] : '',

          province:
            typeof data['province'] === 'string' ? data['province'] : '',

          postalCode:
            typeof data['postalCode'] === 'string' ? data['postalCode'] : '',

          isDefault: data['isDefault'] === true,
        };
      });

      this.savedAddresses.sort(
        (a, b) => Number(b.isDefault) - Number(a.isDefault),
      );

      const preferredAddress =
        this.savedAddresses.find((a) => a.isDefault) || this.savedAddresses[0];

      const previouslySelectedAddress = this.savedAddresses.find(
        (a) => a.id === previousSelection,
      );

      if (hadSelectedAddress && previouslySelectedAddress) {
        this.selectSavedAddress(previouslySelectedAddress.id);
      } else if (
        preferredAddress &&
        !this.address.trim() &&
        !this.barangay.trim() &&
        !this.city.trim() &&
        !this.province.trim() &&
        !this.postalCode.trim()
      ) {
        this.selectSavedAddress(preferredAddress.id);
      }

      console.log(
        fromCache
          ? 'Checkout addresses loaded from cache'
          : 'Checkout addresses refreshed from server',
        this.savedAddresses,
      );

      this.addressesLoading = false;
      this.cdr.detectChanges();
    };

    // 1. Try cached addresses first.
    try {
      const cachedSnapshot = await getDocsFromCache(addressCollection);

      if (!cachedSnapshot.empty) {
        applyAddresses(cachedSnapshot, true);
      }
    } catch (error) {
      console.log('No cached addresses available yet.');
    }

    // 2. Fetch current addresses from Firestore.
    try {
      const serverSnapshot = await getDocs(addressCollection);
      applyAddresses(serverSnapshot, false);
    } catch (error) {
      console.error('Address refresh failed:', error);

      if (this.savedAddresses.length === 0) {
        this.addressLoadError =
          'Unable to load saved addresses. You can enter an address manually.';
      }
    } finally {
      this.addressesLoading = false;
      this.cdr.detectChanges();
    }
  }

  selectSavedAddress(addressId: string): void {
    if (addressId === 'manual') {
      this.useManualAddress();
      return;
    }

    const selected = this.savedAddresses.find((item) => item.id === addressId);

    if (!selected) return;

    this.selectedAddressId = selected.id;

    this.address = selected.address;
    this.barangay = selected.barangay;
    this.city = selected.city;
    this.province = selected.province;
    this.postalCode = selected.postalCode;

    this.deliveryLatitude = null;
    this.deliveryLongitude = null;
  }

  useManualAddress(): void {
    this.selectedAddressId = 'manual';

    this.address = '';
    this.barangay = '';
    this.city = '';
    this.province = '';
    this.postalCode = '';

    this.deliveryLatitude = null;
    this.deliveryLongitude = null;
  }

  onDeliveryAddressEdited(): void {
    // Allow editing a saved address for this order
    // without changing the saved Firestore document.
    this.selectedAddressId = 'manual';
    this.deliveryLatitude = null;
    this.deliveryLongitude = null;
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
    // Validate promo before creating the order
    if (this.promoCode) {
      await this.loadAppliedPromo();

      if (this.promoError) {
        alert(
          'Your promo could not be validated: ' +
            this.promoError +
            '\nPlease try again before placing your order.',
        );
        return;
      }
    }

    // ------------------------------------------
    // Check Firebase login
    // ------------------------------------------

    const user = auth.currentUser;

    if (!user) {
      alert('You need to be logged in before placing an order.');

      await this.router.navigateByUrl('/login');

      return;
    }

    // ------------------------------------------
    // Check cart
    // ------------------------------------------

    if (this.cartItems.length === 0) {
      alert('Your cart is empty.');

      await this.router.navigateByUrl('/cart');

      return;
    }

    // ==========================================
    // VALIDATE CUSTOMER INFORMATION
    // ==========================================

    if (!this.firstName.trim()) {
      alert('Please enter your first name.');

      return;
    }

    if (!this.lastName.trim()) {
      alert('Please enter your last name.');

      return;
    }

    if (!this.email.trim()) {
      alert('Please enter your email.');

      return;
    }

    if (!this.phone.trim()) {
      alert('Please enter your mobile number.');

      return;
    }

    // ==========================================
    // VALIDATE DELIVERY ADDRESS
    // ==========================================

    if (!this.address.trim()) {
      alert('Please enter your delivery address.');

      return;
    }

    if (!this.barangay.trim()) {
      alert('Please enter your barangay.');

      return;
    }

    if (!this.city.trim()) {
      alert('Please enter your city.');

      return;
    }

    if (!this.province.trim()) {
      alert('Please enter your province.');

      return;
    }

    if (!this.postalCode.trim()) {
      alert('Please enter your postal code.');

      return;
    }

    // ==========================================
    // START ORDER PROCESS
    // ==========================================

    try {
      this.isPlacingOrder = true;

      console.log('Creating Firebase order...');

      // ========================================
      // GENERATE DELIVERY COORDINATES
      // ========================================

      console.log('Generating delivery coordinates...');

      await this.geocodeDeliveryAddress();

      console.log('Delivery coordinates ready:', {
        latitude: this.deliveryLatitude,
        longitude: this.deliveryLongitude,
      });

      if (this.deliveryLatitude === null || this.deliveryLongitude === null) {
        throw new Error(
          'Unable to determine the delivery location. Please check your address and try again.',
        );
      }

      // ========================================
      // CREATE FIRESTORE ORDER
      // ========================================
      console.log('[CHECKOUT DEBUG] Promo:', this.promoCode);
      console.log('[CHECKOUT DEBUG] Discount:', this.discount);
      console.log('[CHECKOUT DEBUG] Total:', this.total);
      const createdOrder = await this.orderService.createOrder({
        promoCode: this.promoCode,
        userId: user.uid,

        firstName: this.firstName,

        lastName: this.lastName,

        email: this.email,

        phone: this.phone,

        address: this.address,

        barangay: this.barangay,

        city: this.city,

        province: this.province,

        postalCode: this.postalCode,

        paymentMethod: this.paymentMethod,

        cartItems: this.cartItems,

        subtotal: this.subtotal,

        deliveryFee: this.deliveryFee,

        discount: this.discount,
        total: this.total,
        deliveryLatitude: this.deliveryLatitude,
        deliveryLongitude: this.deliveryLongitude,
      });

      console.log('Firebase order created:', createdOrder.orderId);

      console.log('Order number:', createdOrder.orderNumber);

      // ========================================
      // MAYA ONLINE PAYMENT
      // ========================================

      if (this.paymentMethod === 'card') {
        console.log('Creating Maya Sandbox Checkout...');

        const mayaCheckout = await this.orderService.createMayaCheckout(
          createdOrder.orderId,
        );

        console.log('Maya Checkout created:', mayaCheckout);

        // --------------------------------------
        // Save pending order information
        // --------------------------------------
        //
        // We need these values later when we
        // handle the Maya payment result/webhook.

        sessionStorage.setItem('pendingMayaOrderId', createdOrder.orderId);

        sessionStorage.setItem(
          'pendingMayaOrderNumber',
          createdOrder.orderNumber,
        );

        sessionStorage.setItem(
          'pendingMayaCheckoutId',
          mayaCheckout.checkoutId,
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

        console.log('Redirecting to Maya Sandbox...');

        window.location.href = mayaCheckout.redirectUrl;

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

          await this.orderService.sendOrderConfirmation(createdOrder.orderId);

          console.log('COD order confirmation email sent successfully.');
        } catch (emailError) {
          // Email failure should not cancel the order.
          console.error(
            'Order was created, but confirmation email failed:',
            emailError,
          );
        }

        // CLEAR CART
        this.storefront.clearCart();
        sessionStorage.removeItem('oven2doorPromoCode');
        this.promoCode = null;
        this.discount = 0;

        alert('Your order has been placed successfully!');

        await this.router.navigate(['/order-tracking'], {
          queryParams: { orderId: createdOrder.orderId },
        });

        return;
      }
    } catch (error) {
      console.error('Failed to place order:', error);

      alert(
        error instanceof Error
          ? error.message
          : 'Something went wrong while placing your order. Please try again.',
      );
    } finally {
      this.isPlacingOrder = false;
    }
  }
}
