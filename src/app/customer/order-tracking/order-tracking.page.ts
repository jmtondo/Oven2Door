import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { IonContent, IonIcon } from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  bicycleOutline,
  checkmarkCircle,
  locationOutline,
  timeOutline
} from 'ionicons/icons';

import * as L from 'leaflet';

import { Unsubscribe } from 'firebase/firestore';

import { auth } from '../../firebase.config';

import {
  OrderStatus,
  OrderService,
  TrackedOrder
} from '../../services/firebase/order.service';

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  templateUrl: './order-tracking.page.html',
  styleUrls: ['./order-tracking.page.scss'],
  imports: [
    CommonModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    IonContent,
    IonIcon
  ]
})
export class OrderTrackingPage
  implements OnInit, AfterViewChecked, OnDestroy {

  readonly steps: {
    status: OrderStatus;
    title: string;
    description: string;
  }[] = [
    {
      status: 'placed',
      title: 'Order placed',
      description: 'We received your order.'
    },
    {
      status: 'preparing',
      title: 'Preparing',
      description: 'Your food is being prepared.'
    },
    {
      status: 'ready_for_pickup',
      title: 'Ready for pickup',
      description: 'Your order is ready for a rider.'
    },
    {
      status: 'rider_assigned',
      title: 'Rider assigned',
      description: 'A rider has been assigned to your order.'
    },
    {
      status: 'picked_up',
      title: 'Picked up',
      description: 'Your rider has collected your order.'
    },
    {
      status: 'on_the_way',
      title: 'On the way',
      description: 'Your order is on its way to you.'
    },
    {
      status: 'delivered',
      title: 'Delivered',
      description: 'Your order has been delivered.'
    }
  ];

  orders: TrackedOrder[] = [];

  selectedOrder?: TrackedOrder;

  loading = true;

  error = '';

  private unsubscribe?: Unsubscribe;

  private authUnsubscribe?: Unsubscribe;

  private map?: L.Map;

  private riderMarker?: L.Marker;

  private routeLine?: L.Polyline;
  private destinationMarker?: L.Marker;

  private mapOrderId?: string;

  constructor(
    private readonly ordersService: OrderService,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef
  ) {
    addIcons({
      alertCircleOutline,
      bicycleOutline,
      checkmarkCircle,
      locationOutline,
      timeOutline
    });
  }

  ngOnInit(): void {
  console.log('[TRACKING] Page initialized');

  const requestedOrderId =
    this.route.snapshot.queryParamMap.get('orderId');

  this.loading = true;
  this.error = '';

  this.authUnsubscribe = auth.onAuthStateChanged(user => {
    this.unsubscribe?.();
    this.unsubscribe = undefined;

    if (!user) {
      this.orders = [];
      this.selectedOrder = undefined;
      this.loading = false;
      this.error = 'Please sign in to view your orders.';
      this.cdr.detectChanges();
      return;
    }

    console.log('[TRACKING] Customer UID:', user.uid);

    this.loading = true;
    this.error = '';

    this.unsubscribe = this.ordersService.observeCustomerOrders(
      user.uid,

      (orders: TrackedOrder[]) => {
        console.log('[TRACKING] Customer orders:', orders);

        this.orders = orders;
        this.loading = false;
        this.error = '';

        if (orders.length === 0) {
          this.selectedOrder = undefined;
          this.clearMap();
          this.cdr.detectChanges();
          return;
        }

        const previouslySelectedId = this.selectedOrder?.id;

        this.selectedOrder =
          orders.find(order => order.id === requestedOrderId) ??
          orders.find(order => order.id === previouslySelectedId) ??
          orders[0];

        if (this.mapOrderId !== this.selectedOrder.id) {
          this.clearMap();
        }

        this.cdr.detectChanges();

        setTimeout(() => {
          this.updateMap();
        }, 100);
      },

      (error: unknown) => {
        console.error('[TRACKING] Firestore error:', error);

        this.loading = false;
        this.error =
          'Unable to load your orders. Check Firestore permissions or indexes.';

        this.cdr.detectChanges();
      }
    );
  });
}

  ngAfterViewChecked(): void {
    if (this.selectedOrder?.riderLocation) {
      this.updateMap();
    }
  }

  ngOnDestroy(): void {
    console.log('[TRACKING] Cleaning up');

    this.unsubscribe?.();
    this.authUnsubscribe?.();

    this.clearMap();
  }

  selectOrder(order: TrackedOrder): void {
  if (this.selectedOrder?.id === order.id) {
    return;
  }

  this.clearMap();

  this.selectedOrder = order;

  this.cdr.detectChanges();

  setTimeout(() => {
    this.updateMap();
  }, 100);
}

  statusLabel(status: OrderStatus): string {
    return status
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  }

  completed(step: OrderStatus): boolean {
    if (!this.selectedOrder) {
      return false;
    }

    if (this.selectedOrder.orderStatus === 'cancelled') {
      return false;
    }

    const currentIndex =
      this.steps.findIndex(
        item =>
          item.status === this.selectedOrder?.orderStatus
      );

    const stepIndex =
      this.steps.findIndex(
        item => item.status === step
      );

    if (currentIndex === -1 || stepIndex === -1) {
      return false;
    }

    return stepIndex <= currentIndex;
  }

  active(step: OrderStatus): boolean {
    return this.selectedOrder?.orderStatus === step;
  }

  asDate(
    value:
      { toDate?: () => Date }
      | Date
      | null
      | undefined
  ): Date | undefined {
    if (!value) {
      return undefined;
    }

    if (value instanceof Date) {
      return value;
    }

    return value.toDate?.();
  }

  private async updateRoute(order: TrackedOrder): Promise<void> {
    if (
      !this.map ||
      !order.riderLocation ||
      !order.deliveryLocation
    ) {
      return;
    }

    const riderLat = Number(order.riderLocation.lat);
    const riderLng = Number(order.riderLocation.lng);

    const destinationLat = Number(order.deliveryLocation.lat);
    const destinationLng = Number(order.deliveryLocation.lng);

    if (
      !Number.isFinite(riderLat) ||
      !Number.isFinite(riderLng) ||
      !Number.isFinite(destinationLat) ||
      !Number.isFinite(destinationLng)
    ) {
      console.error('Invalid route coordinates:', {
        riderLocation: order.riderLocation,
        deliveryLocation: order.deliveryLocation
      });

      return;
    }

    try {
      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${riderLng},${riderLat};` +
        `${destinationLng},${destinationLat}` +
        `?overview=full&geometries=geojson`;

      console.log('Requesting road route:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Routing request failed: ${response.status}`
        );
      }

      const data = await response.json();

      if (
        data.code !== 'Ok' ||
        !data.routes ||
        data.routes.length === 0
      ) {
        console.error('No road route found:', data);
        return;
      }

      const coordinates =
        data.routes[0].geometry.coordinates.map(
          (coordinate: [number, number]) =>
            [
              coordinate[1],
              coordinate[0]
            ] as L.LatLngExpression
        );

      if (this.routeLine) {
        this.routeLine.setLatLngs(coordinates);
      } else {
        this.routeLine = L.polyline(
          coordinates,
          {
            weight: 5,
            opacity: 0.85
          }
        ).addTo(this.map);
      }

      // Customer destination marker
      if (!this.destinationMarker) {
        this.destinationMarker = L.marker(
          [destinationLat, destinationLng],
          {
            icon: L.divIcon({
              className: 'destination-map-marker',
              html: '📍',
              iconSize: [32, 32],
              iconAnchor: [16, 32]
            })
          }
        ).addTo(this.map);
      } else {
        this.destinationMarker.setLatLng([
          destinationLat,
          destinationLng
        ]);
      }

      // Show the complete route on the map
      const bounds = L.latLngBounds(coordinates);

      this.map.fitBounds(bounds, {
        padding: [40, 40]
      });

      console.log('Road route successfully displayed.');
    } catch (error) {
      console.error(
        'Unable to calculate road route:',
        error
      );
    }
  }

  private clearMap(): void {
    if (this.map) {
      this.map.remove();
    }

    this.map = undefined;
    this.riderMarker = undefined;
    this.destinationMarker = undefined;
    this.routeLine = undefined;
    this.mapOrderId = undefined;
  }

  private updateMap(): void {
    const order = this.selectedOrder;

    const target =
      document.getElementById('rider-map');

    if (
      !order?.riderLocation ||
      !target
    ) {
      return;
    }

    // Firestore structure:
    // riderLocation
    //   lat: 14.5995
    //   lng: 120.9842

    const latitude =
      Number(order.riderLocation.lat);

    const longitude =
      Number(order.riderLocation.lng);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      console.error(
        'Invalid rider coordinates:',
        order.riderLocation
      );
      return;
    }

    const point: L.LatLngExpression = [
      latitude,
      longitude
    ];

    // Create the Leaflet map once.
    if (!this.map) {
      this.map = L.map(target, {
        zoomControl: true
      }).setView(point, 15);

      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution:
            '&copy; OpenStreetMap contributors'
        }
      ).addTo(this.map);
    }

    // Create rider marker.
    if (!this.riderMarker) {
      this.riderMarker = L.marker(point, {
        icon: L.divIcon({
          className: 'rider-map-marker',
          html: '🛵',
          iconSize: [
            66,
            66
          ],
          iconAnchor: [
            44,
            44
          ]
        })
      }).addTo(this.map);
    } else {
      // Update rider position in real time.
      this.riderMarker.setLatLng(point);
    }

    // Center map on the rider when viewing a different order.
    if (this.mapOrderId !== order.id) {
      this.map.setView(
        point,
        this.map.getZoom() || 15
      );

      this.mapOrderId = order.id;
    }

    // Fix Leaflet rendering after Angular updates the DOM.
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 100);
      void this.updateRoute(order); 
  }
}