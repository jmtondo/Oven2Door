import { Injectable } from '@angular/core';

import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where
} from 'firebase/firestore';

import { auth, db } from '../../firebase.config';

import {
  CartLine,
  lineSubtotal
} from '../../models/storefront.models';

export interface CreateOrderData {
  userId: string;

  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  address: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;

  deliveryLatitude: number;
  deliveryLongitude: number;

  paymentMethod: string;

  cartItems: CartLine[];

  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;

  
}

export interface MayaCheckoutResponse {
  success: boolean;
  checkoutId: string;
  redirectUrl: string;
  requestReferenceNumber: string;
}

export const ORDER_STATUSES = [
  'placed',
  'preparing',
  'ready_for_pickup',
  'rider_assigned',
  'picked_up',
  'on_the_way',
  'delivered',
  'cancelled'
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type UserRole = 'customer' | 'rider' | 'staff' | 'admin';

export interface RiderLocation {
  lat: number;
  lng: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  updatedAt?: Timestamp | Date | null;
}

export interface TrackedOrder {
  id: string;
  orderNumber: string;
  userId: string;
  orderStatus: OrderStatus;

  paymentStatus: string;
  paymentMethod: string;

  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };

  deliveryAddress: {
    address: string;
    barangay: string;
    city: string;
    province: string;
    postalCode: string;
  };

  items: Array<{
    productName: string;
    quantity: number;
    subtotal: number;
  }>;

  total: number;

  assignedRiderId?: string;
  assignedRiderName?: string;

  deliveryLocation?: {
    lat: number;
    lng: number;
  };

  riderLocation?: RiderLocation;

  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  // ==========================================
  // CREATE FIRESTORE ORDER
  // ==========================================

  async createOrder(
    data: CreateOrderData
  ): Promise<{
    orderId: string;
    orderNumber: string;
  }> {

    const orderNumber = this.generateOrderNumber();

    const items = data.cartItems.map((item) => ({
      productId: item.product.id,

      productName: item.product.name,

      quantity: item.quantity,

      unitPrice:
        item.product.price +
        (item.size?.price ?? 0) +
        (item.crust?.price ?? 0) +
        item.toppings.reduce(
          (sum, topping) => sum + topping.price,
          0
        ),

      subtotal: lineSubtotal(item),

      size: item.size
        ? {
            id: item.size.id,
            name: item.size.name,
            price: item.size.price
          }
        : null,

      crust: item.crust
        ? {
            id: item.crust.id,
            name: item.crust.name,
            price: item.crust.price
          }
        : null,

      toppings: item.toppings.map((topping) => ({
        id: topping.id,
        name: topping.name,
        price: topping.price
      }))
    }));

    const order = {
      userId: data.userId,

      orderNumber,

      customer: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim()
      },

      deliveryAddress: {
        address: data.address.trim(),
        barangay: data.barangay.trim(),
        city: data.city.trim(),
        province: data.province.trim(),
        postalCode: data.postalCode.trim()
      },

      deliveryLocation: {
        lat: data.deliveryLatitude,
        lng: data.deliveryLongitude
      },

      paymentMethod: data.paymentMethod,

      paymentStatus: 'pending',

      orderStatus: 'placed',

      statusHistory: [
        {
          status: 'placed',
          at: Timestamp.now()
        }
      ],

      items,

      subtotal: data.subtotal,
      deliveryFee: data.deliveryFee,
      discount: data.discount,
      total: data.total,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const ordersRef = collection(db, 'orders');

    const orderRef = await addDoc(
      ordersRef,
      order
    );

    return {
      orderId: orderRef.id,
      orderNumber
    };
  }

  // ==========================================
  // OBSERVE ONE CUSTOMER ORDER DIRECTLY
  // ==========================================

  observeOrder(
    orderId: string,
    next: (order: TrackedOrder | undefined) => void,
    error: (reason: Error) => void
  ): Unsubscribe {

    if (!orderId.trim()) {
      error(new Error('Invalid order ID.'));
      return () => {};
    }

    return onSnapshot(
      doc(db, 'orders', orderId.trim()),

      (snapshot) => {
        if (!snapshot.exists()) {
          next(undefined);
          return;
        }

        next(
          this.toTrackedOrder(
            snapshot.id,
            snapshot.data()
          )
        );
      },

      (firebaseError) => {
        console.error(
          'Failed to observe order:',
          firebaseError
        );

        error(firebaseError);
      }
    );
  }

  // ==========================================
  // OBSERVE CUSTOMER ORDERS
  // ==========================================

  observeCustomerOrders(
    userId: string,
    next: (orders: TrackedOrder[]) => void,
    error: (reason: Error) => void
  ): Unsubscribe {

    return onSnapshot(
      query(
        collection(db, 'orders'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      ),

      (snapshot) => {
        next(
          snapshot.docs.map((item) =>
            this.toTrackedOrder(
              item.id,
              item.data()
            )
          )
        );
      },

      (firebaseError) => {
        console.error(
          'Failed to observe customer orders:',
          firebaseError
        );

        error(firebaseError);
      }
    );
  }

  // ==========================================
  // OBSERVE RIDER ORDERS
  // ==========================================

  observeAssignedOrders(
    riderId: string,
    next: (orders: TrackedOrder[]) => void,
    error: (reason: Error) => void
  ): Unsubscribe {

    return onSnapshot(
      query(
        collection(db, 'orders'),
        where(
          'assignedRiderId',
          '==',
          riderId
        ),
        orderBy(
          'updatedAt',
          'desc'
        )
      ),

      (snapshot) => {
        next(
          snapshot.docs.map((item) =>
            this.toTrackedOrder(
              item.id,
              item.data()
            )
          )
        );
      },

      (firebaseError) => {
        console.error(
          'Failed to observe rider orders:',
          firebaseError
        );

        error(firebaseError);
      }
    );
  }

  // ==========================================
  // OBSERVE ALL ORDERS
  // ==========================================

  observeAllOrders(
    next: (orders: TrackedOrder[]) => void,
    error: (reason: Error) => void
  ): Unsubscribe {

    return onSnapshot(
      query(
        collection(db, 'orders'),
        orderBy(
          'updatedAt',
          'desc'
        )
      ),

      (snapshot) => {
        next(
          snapshot.docs.map((item) =>
            this.toTrackedOrder(
              item.id,
              item.data()
            )
          )
        );
      },

      (firebaseError) => {
        console.error(
          'Failed to observe all orders:',
          firebaseError
        );

        error(firebaseError);
      }
    );
  }

  // ==========================================
  // GET CURRENT USER ROLE
  // ==========================================

  async getCurrentUserRole(
    userId: string
  ): Promise<UserRole> {

    const profile = await getDoc(
      doc(db, 'users', userId)
    );

    const role = profile.data()?.['role'];

    return (
      role === 'rider' ||
      role === 'staff' ||
      role === 'admin'
    )
      ? role
      : 'customer';
  }

  // ==========================================
  // RIDER STATUS UPDATE
  // ==========================================

  async updateRiderStatus(
    orderId: string,
    status: Extract<
      OrderStatus,
      'picked_up' |
      'on_the_way' |
      'delivered'
    >
  ): Promise<void> {

    await this.updateOrder(
      orderId,
      status
    );
  }

  // ==========================================
  // STAFF ORDER UPDATE
  // ==========================================

  async updateStaffOrder(
    orderId: string,
    status: OrderStatus,
    riderId?: string,
    riderName?: string
  ): Promise<void> {

    const changes: Record<string, unknown> = {};

    if (riderId?.trim()) {

      changes['assignedRiderId'] =
        riderId.trim();

      changes['assignedRiderName'] =
        riderName?.trim() ||
        'Assigned rider';

      if (status === 'ready_for_pickup') {
        status = 'rider_assigned';
      }
    }

    await this.updateOrder(
      orderId,
      status,
      changes
    );
  }

  // ==========================================
  // START RIDER GPS TRACKING
  // ==========================================

  startBrowserLocationTracking(
    orderId: string,
    onError: (message: string) => void
  ): number | null {

    if (!navigator.geolocation) {
      onError(
        'This browser does not support location sharing.'
      );

      return null;
    }

    return navigator.geolocation.watchPosition(

      async (position) => {

        try {

          await updateDoc(
            doc(db, 'orders', orderId),
            {
              riderLocation: {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                heading: position.coords.heading,
                speed: position.coords.speed,
                updatedAt: Timestamp.now()
              },

              updatedAt: serverTimestamp()
            }
          );

        } catch (error) {

          console.error(
            'Unable to update rider location:',
            error
          );

          onError(
            error instanceof Error
              ? error.message
              : 'Unable to update your location.'
          );
        }
      },

      (positionError) => {

        console.error(
          'Geolocation error:',
          positionError
        );

        onError(
          positionError.message ||
          'Location permission was not granted.'
        );
      },

      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000
      }
    );
  }

  // ==========================================
  // STOP RIDER GPS TRACKING
  // ==========================================

  stopBrowserLocationTracking(
    watchId: number | null
  ): void {

    if (
      watchId !== null &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(
        watchId
      );
    }
  }

  // ==========================================
  // UPDATE ORDER STATUS
  // ==========================================

  private async updateOrder(
    orderId: string,
    status: OrderStatus,
    extra: Record<string, unknown> = {}
  ): Promise<void> {

    await updateDoc(
      doc(db, 'orders', orderId),
      {
        ...extra,

        orderStatus: status,

        statusHistory: arrayUnion({
          status,
          at: Timestamp.now()
        }),

        updatedAt:
          serverTimestamp()
      }
    );
  }

  // ==========================================
  // CONVERT FIRESTORE ORDER
  // ==========================================

  private toTrackedOrder(
    id: string,
    data: Record<string, unknown>
  ): TrackedOrder {

    const rawStatus =
      data['orderStatus'];

    const orderStatus: OrderStatus =
      ORDER_STATUSES.includes(
        rawStatus as OrderStatus
      )
        ? (rawStatus as OrderStatus)
        : 'placed';

    const customerData =
      data['customer'];

    const addressData =
      data['deliveryAddress'];

    const customer: TrackedOrder['customer'] = {
      firstName: String(
        (customerData as Record<string, unknown>)
          ?.['firstName'] ?? ''
      ),

      lastName: String(
        (customerData as Record<string, unknown>)
          ?.['lastName'] ?? ''
      ),

      email: String(
        (customerData as Record<string, unknown>)
          ?.['email'] ?? ''
      ),

      phone: String(
        (customerData as Record<string, unknown>)
          ?.['phone'] ?? ''
      )
    };

    const deliveryAddress:
      TrackedOrder['deliveryAddress'] = {

      address: String(
        (addressData as Record<string, unknown>)
          ?.['address'] ?? ''
      ),

      barangay: String(
        (addressData as Record<string, unknown>)
          ?.['barangay'] ?? ''
      ),

      city: String(
        (addressData as Record<string, unknown>)
          ?.['city'] ?? ''
      ),

      province: String(
        (addressData as Record<string, unknown>)
          ?.['province'] ?? ''
      ),

      postalCode: String(
        (addressData as Record<string, unknown>)
          ?.['postalCode'] ?? ''
      )
    };

    const items =
      Array.isArray(data['items'])
        ? data['items'].map((item) => {

            const itemData =
              item as Record<string, unknown>;

            return {
              productName: String(
                itemData['productName'] ?? ''
              ),

              quantity: Number(
                itemData['quantity'] ?? 0
              ),

              subtotal: Number(
                itemData['subtotal'] ?? 0
              )
            };
          })
        : [];
    
    const deliveryLocationData =
      data['deliveryLocation'] as
        | {
            lat?: unknown;
            lng?: unknown;
          }
        | undefined;

    const deliveryLocation =
      deliveryLocationData &&
      Number.isFinite(Number(deliveryLocationData.lat)) &&
      Number.isFinite(Number(deliveryLocationData.lng))
        ? {
            lat: Number(deliveryLocationData.lat),
            lng: Number(deliveryLocationData.lng)
          }
        : undefined;

    const riderLocationData =
      data['riderLocation'];

    let riderLocation:
      RiderLocation | undefined;

    if (
      riderLocationData &&
      typeof riderLocationData === 'object'
    ) {

      const location =
        riderLocationData as Record<string, unknown>;

      const lat =
        Number(location['lat']);

      const lng =
        Number(location['lng']);

      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {

        riderLocation = {
          lat,
          lng,

          accuracy:
            location['accuracy'] != null
              ? Number(location['accuracy'])
              : null,

          heading:
            location['heading'] != null
              ? Number(location['heading'])
              : null,

          speed:
            location['speed'] != null
              ? Number(location['speed'])
              : null,

          updatedAt:
            location['updatedAt'] as
              | Timestamp
              | Date
              | null
              | undefined
        };
      }
    }

    return {

      id,

      orderNumber:
        String(
          data['orderNumber'] ??
          id
        ),

      userId:
        String(
          data['userId'] ?? ''
        ),

      orderStatus,

      paymentStatus:
        String(
          data['paymentStatus'] ??
          'pending'
        ),

      paymentMethod:
        String(
          data['paymentMethod'] ??
          ''
        ),

      customer,

      deliveryAddress,

      items,

      total:
        Number(
          data['total'] ?? 0
        ),

      assignedRiderId:
        data['assignedRiderId'] != null
          ? String(
              data['assignedRiderId']
            )
          : undefined,

      assignedRiderName:
        data['assignedRiderName'] != null
          ? String(
              data['assignedRiderName']
            )
          : undefined,

          deliveryLocation,
          riderLocation,

      createdAt:
        data['createdAt'] as
          | Timestamp
          | null
          | undefined,

      updatedAt:
        data['updatedAt'] as
          | Timestamp
          | null
          | undefined
    };
  }

  // ==========================================
  // CREATE MAYA SANDBOX CHECKOUT
  // ==========================================


  async createMayaCheckout(
    orderId: string
  ): Promise<MayaCheckoutResponse> {
    const user = auth.currentUser;

    if (!user) {
      throw new Error(
        'Please sign in before starting Maya Checkout.'
      );
    }

    const idToken = await user.getIdToken();

    const apiUrl = 'https://oven2door-backend.vercel.app/api/createMayaCheckout';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ orderId })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Maya Checkout error:', data);

      throw new Error(
        data?.error ||
        'Maya Checkout request failed.'
      );
    }

    return data as MayaCheckoutResponse;
  }


  // ==========================================
  // SEND ORDER CONFIRMATION EMAIL
  // ==========================================

  
  async sendOrderConfirmation(
    orderId: string
  ): Promise<{
    success: boolean;
    emailId?: string;
    orderNumber?: string;
  }> {
    const user = auth.currentUser;

    if (!user) {
      throw new Error(
        'Please sign in before sending an order confirmation.'
      );
    }

    const idToken = await user.getIdToken();

    const response = await fetch(
      'https://oven2door-backend.vercel.app/api/sendOrderConfirmation',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ orderId })
      }
    );

    const result = await response.json();

    console.log(
      'Order confirmation email response:',
      result
    );

    if (!response.ok) {
      console.error(
        'Order confirmation email error:',
        result
      );

      throw new Error(
        result?.error ||
        'Failed to send order confirmation email.'
      );
    }

    return result;
  }


  // ==========================================
  // GENERATE ORDER NUMBER
  // ==========================================

  private generateOrderNumber(): string {

    const now = new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        '0'
      );

    const day =
      String(
        now.getDate()
      ).padStart(
        2,
        '0'
      );

    const random =
      Math.floor(
        1000 +
        Math.random() * 9000
      );

    return `OD-${year}${month}${day}-${random}`;
  }
}