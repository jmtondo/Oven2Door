import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { refreshOutline } from 'ionicons/icons';
import { CommonModule } from '@angular/common';

import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonButton,
  IonSpinner,
} from '@ionic/angular';

import { ActivatedRoute, Router } from '@angular/router';

import { addIcons } from 'ionicons';

import {
  checkmarkCircleOutline,
  closeCircleOutline,
  timeOutline,
  homeOutline,
  bicycleOutline,
} from 'ionicons/icons';

import { auth } from '../../firebase.config';
import { onAuthStateChanged, User } from 'firebase/auth';

type PaymentResultStatus =
  | 'verifying'
  | 'success'
  | 'pending'
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
    IonSpinner,
  ],
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
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({
      checkmarkCircleOutline,
      closeCircleOutline,
      timeOutline,
      homeOutline,
      bicycleOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;

    this.orderNumber = sessionStorage.getItem('pendingMayaOrderNumber') || '';

    // Always verify the actual payment status with
    // the backend, regardless of the redirect result.
    this.status = 'verifying';
    this.message = 'Checking your payment status with Maya...';

    this.cdr.detectChanges();

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
          console.error('Firebase authentication check failed:', error);
          resolve(null);
        },
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
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ orderId }),
          signal: AbortSignal.timeout(15000),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Payment verification failed (HTTP ${response.status}).`,
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
          orderNumber: this.orderNumber,
        });

        // Clear checkout data only after server confirmation.
        sessionStorage.removeItem('pendingMayaOrderId');
        sessionStorage.removeItem('pendingMayaOrderNumber');
        sessionStorage.removeItem('pendingMayaCheckoutId');

        this.cdr.detectChanges();
        return;
      }

      // Payment was confirmed as failed by the backend
      if (data?.status === 'failed') {
        this.status = 'failed';

        this.message =
          data?.message ||
          'Your Maya payment was unsuccessful. ' +
            'Your order has not been paid.';

        return;
      }

      // Payment was confirmed as cancelled by the backend
      if (data?.status === 'cancelled') {
        this.status = 'cancelled';

        this.message = data?.message || 'Your Maya payment was cancelled.';

        return;
      }

      // Payment is still pending or its outcome is unknown
      this.status = 'pending';

      this.message =
        data?.message ||
        'Your payment has not been confirmed yet. ' +
          'Please check again before attempting another payment.';
    } catch (error) {
      console.error('Maya payment verification failed:', error);

      this.status = 'pending';

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
        orderId: this.verifiedOrderId,
      },
    });
  }

  goToCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
