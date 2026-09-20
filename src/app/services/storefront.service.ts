import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
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

  constructor(private api: ApiService) {}

  get itemCount(): number {
    return this.cart.reduce((sum, line) => sum + line.quantity, 0);
  }

  get subtotal(): number {
    return this.cart.reduce((sum, line) => sum + lineSubtotal(line), 0);
  }

  get deliveryFee(): number {
    return this.subtotal === 0 ? 0 : 49;
  }

  get total(): number {
    return this.subtotal + this.deliveryFee;
  }

  async loadCatalog(): Promise<void> {
    this.loading = true;
    this.error = null;
    this.emit();
    try {
      this.products = await this.api.catalog();
    } catch {
      this.error =
        'Could not load the menu. Start the backend and check the database connection.';
    }
    this.loading = false;
    this.emit();
  }

  async loadAccount(token: string): Promise<void> {
    try {
      const [addresses, orders] = await Promise.all([
        this.api.addresses(token),
        this.api.orders(token)
      ]);
      this.addresses = addresses;
      this.orders = orders;
      this.emit();
    } catch {
      // Account extras are optional if the user just signed up.
    }
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
        line.crust?.id === options.crust?.id
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

  changeQuantity(line: CartLine, change: number): void {
    line.quantity += change;
    if (line.quantity <= 0) {
      this.cart = this.cart.filter((item) => item !== line);
    }
    this.emit();
  }

  async checkout(
    token: string,
    payload: {
      addressId: number | null;
      orderType: string;
      paymentMethod: string;
      notes: string;
      promoCode?: string | null;
    }
  ) {
    const result = await this.api.checkout(token, {
      lines: this.cart,
      ...payload
    });
    this.cart = [];
    await this.loadAccount(token);
    this.emit();
    return result;
  }

  async addAddress(token: string, address: Record<string, string>): Promise<void> {
    await this.api.saveAddress(token, address);
    this.addresses = await this.api.addresses(token);
    this.emit();
  }

  updateProfile(
    token: string,
    payload: { firstName: string; lastName: string; phone: string }
  ) {
    return this.api.saveProfile(token, payload);
  }

  private emit(): void {
    this.changed.next();
  }
}
