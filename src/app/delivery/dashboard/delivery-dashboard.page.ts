import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  CommonModule,
  DatePipe
} from '@angular/common';

import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  bicycleOutline,
  locationOutline,
  logInOutline,
  personOutline
} from 'ionicons/icons';

import { Unsubscribe } from 'firebase/firestore';

import { auth } from '../../firebase.config';

import {
  ORDER_STATUSES,
  OrderService,
  OrderStatus,
  TrackedOrder,
  UserRole
} from '../../services/firebase/order.service';

@Component({
  selector: 'app-delivery-dashboard',
  standalone: true,
  templateUrl: './delivery-dashboard.page.html',
  styleUrls: ['./delivery-dashboard.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    IonContent,
    IonIcon,
    IonInput,
    IonSelect,
    IonSelectOption
  ]
})
export class DeliveryDashboardPage implements OnInit, OnDestroy {

  // ==========================================
  // ORDER DATA
  // ==========================================

  readonly statuses = ORDER_STATUSES;

  role?: UserRole;

  orders: TrackedOrder[] = [];

  loading = true;
  error = '';
  notice = '';

  // ==========================================
  // RIDER AND STAFF DATA
  // ==========================================

  riderIds: Record<string, string> = {};
  riderNames: Record<string, string> = {};

  private unsubscribe?: Unsubscribe;

  private locationWatches = new Map<string, number>();

  private savingOrders = new Set<string>();

  private destroyed = false;

  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor(
      private readonly orderService: OrderService,
      private readonly cdr: ChangeDetectorRef
  ) {
    addIcons({
      bicycleOutline,
      locationOutline,
      logInOutline,
      personOutline
    });
  }

  // ==========================================
  // INITIALIZE DASHBOARD
  // ==========================================

  async ngOnInit(): Promise<void> {

    this.loading = true;
    this.error = '';
    this.notice = '';

    console.log('[RIDER] Dashboard initialized');

    try {

      // Wait until Firebase restores the user's session.
      await auth.authStateReady();

      if (this.destroyed) {
        return;
      }

      const user = auth.currentUser;

      console.log('[RIDER] Current user:', user?.uid);

      // ======================================
      // CHECK AUTHENTICATION
      // ======================================

      if (!user) {
        this.loading = false;
        this.error =
          'Please sign in with a rider, staff, or admin account.';
        return;
      }

      // ======================================
      // VERIFY USER ROLE
      // ======================================

      this.role = await this.orderService.getCurrentUserRole(
        user.uid
      );

      if (this.destroyed) {
        return;
      }

      console.log('[RIDER] User role:', this.role);

      if (
        this.role !== 'rider' &&
        this.role !== 'staff' &&
        this.role !== 'admin'
      ) {
        this.loading = false;
        this.error =
          'This dashboard is only available to rider, staff, and admin accounts.';
        return;
      }

      // ======================================
      // START FIRESTORE LISTENER
      // ======================================

      console.log('[RIDER] Starting Firestore listener');

      if (this.role === 'rider') {

        // Riders only see their assigned orders.
        this.unsubscribe =
          this.orderService.observeAssignedOrders(
            user.uid,
            this.receiveOrders,
            this.receiveError
          );

      } else {

        // Staff and admins can view all orders.
        this.unsubscribe =
          this.orderService.observeAllOrders(
            this.receiveOrders,
            this.receiveError
          );

      }

    } catch (error) {

      if (this.destroyed) {
        return;
      }

      console.error(
        '[RIDER] Dashboard initialization failed:',
        error
      );

      this.loading = false;

      this.error =
        error instanceof Error
          ? error.message
          : 'Unable to initialize the delivery dashboard.';
    }
  }

  // ==========================================
  // CLEAN UP
  // ==========================================

  ngOnDestroy(): void {

    this.destroyed = true;

    // Stop listening to Firestore.
    this.unsubscribe?.();

    // Stop all active GPS tracking.
    this.locationWatches.forEach(watch => {
      this.orderService.stopBrowserLocationTracking(watch);
    });

    this.locationWatches.clear();
  }

  // ==========================================
  // ROLE HELPERS
  // ==========================================

  get isStaff(): boolean {
    return (
      this.role === 'staff' ||
      this.role === 'admin'
    );
  }

  // ==========================================
  // RIDER STATUS ACTIONS
  // ==========================================

  nextRiderAction(
    status: OrderStatus
  ): 'picked_up' | 'on_the_way' | 'delivered' | undefined {

    switch (status) {

      case 'rider_assigned':
        return 'picked_up';

      case 'picked_up':
        return 'on_the_way';

      case 'on_the_way':
        return 'delivered';

      default:
        return undefined;
    }
  }

  // ==========================================
  // UPDATE RIDER DELIVERY STATUS
  // ==========================================

  async performRiderAction(
    order: TrackedOrder
  ): Promise<void> {

    if (this.role !== 'rider') {
      return;
    }

    if (this.savingOrders.has(order.id)) {
      return;
    }

    const next = this.nextRiderAction(
      order.orderStatus
    );

    if (!next) {
      return;
    }

    this.savingOrders.add(order.id);

    this.error = '';
    this.notice = '';

    try {

      console.log(
        '[RIDER] Updating order:',
        order.orderNumber,
        'to',
        next
      );

      await this.orderService.updateRiderStatus(
        order.id,
        next
      );

      this.notice =
        `Order ${order.orderNumber} updated to ${next.replaceAll('_', ' ')}.`;

      // Stop GPS after delivery is completed.
      if (next === 'delivered') {

        const watch = this.locationWatches.get(
          order.id
        );

        if (watch !== undefined) {

          this.orderService.stopBrowserLocationTracking(
            watch
          );

          this.locationWatches.delete(order.id);
        }
      }

    } catch (error) {

      console.error(
        '[RIDER] Unable to update delivery:',
        error
      );

      this.error =
        error instanceof Error
          ? error.message
          : 'Unable to update the delivery.';

    } finally {

      this.savingOrders.delete(order.id);
    }
  }

  // ==========================================
  // GPS TRACKING
  // ==========================================

  toggleLocation(order: TrackedOrder): void {

    if (this.role !== 'rider') {
      return;
    }

    this.error = '';
    this.notice = '';

    // Stop tracking if already active.
    const existingWatch = this.locationWatches.get(
      order.id
    );

    if (existingWatch !== undefined) {

      this.orderService.stopBrowserLocationTracking(
        existingWatch
      );

      this.locationWatches.delete(order.id);

      this.notice = 'Live location sharing stopped.';

      return;
    }

    // Prevent tracking completed or cancelled orders.
    const allowedStatuses: OrderStatus[] = [
      'rider_assigned',
      'picked_up',
      'on_the_way'
    ];

    if (!allowedStatuses.includes(order.orderStatus)) {

      this.error =
        'GPS tracking is not available for this order status.';

      return;
    }

    // Start browser GPS tracking.
    const locationWatch =
      this.orderService.startBrowserLocationTracking(
        order.id,
        message => {

          console.error(
            '[RIDER] GPS error:',
            message
          );

          this.error = message;
        }
      );

    if (locationWatch !== null) {

      this.locationWatches.set(
        order.id,
        locationWatch
      );

      this.notice =
        'Live location sharing is on.';
    }
  }

  // ==========================================
  // CHECK GPS SHARING
  // ==========================================

  sharing(orderId: string): boolean {
    return this.locationWatches.has(orderId);
  }

  // ==========================================
  // CHECK IF ORDER IS SAVING
  // ==========================================

  isSaving(orderId: string): boolean {
    return this.savingOrders.has(orderId);
  }

  // ==========================================
  // FORMAT FIRESTORE DATE
  // ==========================================

  asDate(
    value:
      | { toDate?: () => Date }
      | Date
      | null
      | undefined
  ): Date | undefined {

    if (value instanceof Date) {
      return value;
    }

    return value?.toDate?.();
  }

  // ==========================================
  // STAFF / ADMIN ORDER UPDATE
  // ==========================================

  async saveStaffOrder(
    order: TrackedOrder,
    status: string
  ): Promise<void> {

    if (!this.isStaff) {
      return;
    }

    if (this.savingOrders.has(order.id)) {
      return;
    }

    if (!this.statuses.includes(status as OrderStatus)) {
      this.error = 'Invalid order status.';
      return;
    }

    this.savingOrders.add(order.id);

    this.error = '';
    this.notice = '';

    try {

      await this.orderService.updateStaffOrder(
        order.id,
        status as OrderStatus,
        this.riderIds[order.id],
        this.riderNames[order.id]
      );

      this.notice = 'Order updated successfully.';

    } catch (error) {

      console.error(
        '[STAFF] Unable to update order:',
        error
      );

      this.error =
        error instanceof Error
          ? error.message
          : 'Unable to update the order.';

    } finally {

      this.savingOrders.delete(order.id);
    }
  }

  // ==========================================
  // RECEIVE REAL-TIME ORDERS
  // ==========================================

  private receiveOrders = (
    orders: TrackedOrder[]
  ): void => {

    if (this.destroyed) {
      return;
    }

    console.log(
      '[RIDER] Orders received:',
      orders
    );

    this.orders = orders;

    this.loading = false;

    this.error = '';

    this.cdr.detectChanges();

    // Stop GPS if an order is no longer eligible.
    for (const [orderId, watch] of this.locationWatches) {

      const order = orders.find(
        item => item.id === orderId
      );

      if (
        !order ||
        ![
          'rider_assigned',
          'picked_up',
          'on_the_way'
        ].includes(order.orderStatus)
      ) {

        this.orderService.stopBrowserLocationTracking(
          watch
        );

        this.locationWatches.delete(orderId);
      }
    }
  };

  // ==========================================
  // HANDLE FIRESTORE ERRORS
  // ==========================================

  private receiveError = (
    error: unknown
  ): void => {

    if (this.destroyed) {
      return;
    }

    console.error(
      '[RIDER] Firestore listener error:',
      error
    );

    this.loading = false;

    this.error =
      'Unable to load deliveries. Check Firestore permissions and indexes.';

      this.cdr.detectChanges();
  };
}