import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import {
  Address,
  CartLine,
  CatalogProduct,
  lineSubtotal,
  OrderSummary
} from '../models/storefront.models';

@Injectable({
  providedIn: 'root'
})
export class StorefrontService {
  products: CatalogProduct[] = [];
  cart: CartLine[] = [];
  addresses: Address[] = [];
  orders: OrderSummary[] = [];

  favoriteIds = new Set<number>();

  loading = false;
  error: string | null = null;

  readonly changed = new BehaviorSubject<void>(undefined);

  get itemCount(): number {
    return this.cart.reduce(
      (sum, line) => sum + line.quantity,
      0
    );
  }

  get subtotal(): number {
    return this.cart.reduce(
      (sum, line) => sum + lineSubtotal(line),
      0
    );
  }

  get deliveryFee(): number {
    return this.subtotal === 0 ? 0 : 49;
  }

  get total(): number {
    return this.subtotal + this.deliveryFee;
  }

  toggleFavorite(product: CatalogProduct): void {
    if (this.favoriteIds.has(product.id)) {
      this.favoriteIds.delete(product.id);
    } else {
      this.favoriteIds.add(product.id);
    }

    this.emit();
  }

  add(
    product: CatalogProduct,
    options: {
      quantity?: number;
      size?: CatalogProduct['sizes'][number];
      crust?: CatalogProduct['crusts'][number];
      toppings?: CatalogProduct['toppings'];
    } = {}
  ): void {
    const quantity = options.quantity ?? 1;

    const existing = this.cart.find(
      (line) =>
        line.product.id === product.id &&
        line.size?.id === options.size?.id &&
        line.crust?.id === options.crust?.id &&
        JSON.stringify(line.toppings) ===
          JSON.stringify(options.toppings ?? [])
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      this.cart.push({
        product,
        quantity,
        size: options.size,
        crust: options.crust,
        toppings: options.toppings ?? []
      });
    }

    this.emit();
  }

  changeQuantity(
    line: CartLine,
    change: number
  ): void {
    line.quantity += change;

    if (line.quantity <= 0) {
      this.cart = this.cart.filter(
        (item) => item !== line
      );
    }

    this.emit();
  }

  remove(line: CartLine): void {
    this.cart = this.cart.filter(
      (item) => item !== line
    );

    this.emit();
  }

  clearCart(): void {
    this.cart = [];
    this.emit();
  }

  isFavorite(product: CatalogProduct): boolean {
    return this.favoriteIds.has(product.id);
  }

  private emit(): void {
    this.changed.next();
  }
}