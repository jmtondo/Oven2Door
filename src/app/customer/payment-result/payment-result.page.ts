import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonButton,
  IonSpinner
} from '@ionic/angular';

import { ActivatedRoute, Router } from '@angular/router';

import { addIcons } from 'ionicons';

import {
  checkmarkCircleOutline,
  closeCircleOutline,
  timeOutline,
  homeOutline,
  bicycleOutline
} from 'ionicons/icons';

import { auth } from '../../firebase.config';
import { onAuthStateChanged, User } from 'firebase/auth';

type PaymentResultStatus =
  | 'verifying'
  | 'success'
  | 'failed'
  | 'cancelled';

@Component({
  selector: 'app-payment-result',
  templateUrl: './payment-result.page.html',
  styleUrls: ['./payment-result.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonIcon,
    IonButton,
    IonSpinner
  ]
})
export class PaymentResultPage implements OnInit {

  status: PaymentResultStatus = 'verifying';

  message = 'Checking your payment with Maya...';

  orderNumber = '';

  // Keep the verified Firestore document ID for tracking.
  verifiedOrderId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      checkmarkCircleOutline,
      closeCircleOutline,
      timeOutline,
      homeOutline,
      bicycleOutline
    });
  }

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const result = params.get('result');

    this.orderNumber =
      sessionStorage.getItem('pendingMayaOrderNumber') || '';

    if (result === 'cancel') {
      this.status = 'cancelled';
      this.message =
        'Checkout was cancelled. Please check your order status before trying again.';
      this.cdr.detectChanges();
      return;
    }

    if (result === 'failure') {
      this.status = 'failed';
      this.message =
        'Maya reported a checkout failure. Check your order status before trying again.';
      this.cdr.detectChanges();
      return;
    }

    await this.verifyPayment();
  }

  private waitForFirebaseUser(): Promise<User | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          unsubscribe();
          resolve(user);
        },
        (error) => {
          unsubscribe();
          console.error(
            'Firebase authentication check failed:',
            error
          );
          resolve(null);
        }
      );
    });
  }

  async verifyPayment(): Promise<void> {

    this.status = 'verifying';
    this.message = 'Checking your payment with Maya...';

    // Prefer the URL ID because it identifies the order
    // being displayed, even if sessionStorage contains
    // details from a different checkout.
    const orderId =
      this.route.snapshot.queryParamMap.get('orderId') ||
      sessionStorage.getItem('pendingMayaOrderId');

    if (!orderId || !/^[A-Za-z0-9_-]{1,150}$/.test(orderId)) {
      this.status = 'failed';
      this.message =
        'We could not identify your order. Please check your order history.';
      this.cdr.detectChanges();
      return;
    }

    const user = await this.waitForFirebaseUser();

    if (!user) {
      this.status = 'failed';
      this.message =
        'Please sign in with the account used to place this order.';
      this.cdr.detectChanges();
      return;
    }

    try {
      const idToken = await user.getIdToken();

      const response = await fetch(
        'https://oven2door-backend.vercel.app/api/verifyMayaPayment',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`
          },
          body: JSON.stringify({ orderId }),
          signal: AbortSignal.timeout(15000)
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
          data?.error ||
          `Payment verification failed (HTTP ${response.status}).`
        );
      }

      if (data?.status === 'paid') {

        // Preserve the order ID for the tracking button.
        this.verifiedOrderId = orderId;

        this.status = 'success';

        this.message =
          'Maya has confirmed your payment. Your order is marked as paid.';

        this.orderNumber =
          data?.orderNumber ||
          sessionStorage.getItem('pendingMayaOrderNumber') ||
          this.orderNumber;

        console.log('Maya payment verified:', {
          status: this.status,
          orderId: this.verifiedOrderId,
          orderNumber: this.orderNumber
        });

        // Clear checkout data only after server confirmation.
        sessionStorage.removeItem('pendingMayaOrderId');
        sessionStorage.removeItem('pendingMayaOrderNumber');
        sessionStorage.removeItem('pendingMayaCheckoutId');

        this.cdr.detectChanges();
        return;
      }

      this.status = 'failed';

      this.message =
        data?.message ||
        'Maya has not confirmed your payment yet. Please check your order history before trying again.';

    } catch (error) {

      console.error('Maya payment verification failed:', error);

      this.status = 'failed';

      this.message =
        error instanceof Error && error.name === 'TimeoutError'
          ? 'Payment verification timed out. Please check your order history.'
          : error instanceof Error
            ? error.message
            : 'Payment verification is temporarily unavailable.';

    } finally {
      this.cdr.detectChanges();
    }
  }

  // Navigate directly to the verified order.
  goToTracking(): void {
    if (!this.verifiedOrderId || this.status !== 'success') {
      return;
    }

    this.router.navigate(['/order-tracking'], {
      queryParams: {
        orderId: this.verifiedOrderId
      }
    });
  }

  goToCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}