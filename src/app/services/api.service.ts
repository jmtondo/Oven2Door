import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Address,
  addressFromJson,
  CartLine,
  CatalogProduct,
  OrderSummary,
  orderFromJson,
  productFromJson
} from '../models/storefront.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  async signUp(payload: {
    idToken: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }): Promise<void> {
    await this.post('/signup', payload);
  }

  async catalog(): Promise<CatalogProduct[]> {
    const rows = await this.get<Record<string, unknown>[]>('/catalog');
    return rows.map(productFromJson);
  }

  async addresses(token: string): Promise<Address[]> {
    const rows = await this.get<Record<string, unknown>[]>('/addresses', token);
    return rows.map(addressFromJson);
  }

  async orders(token: string): Promise<OrderSummary[]> {
    const rows = await this.get<Record<string, unknown>[]>('/orders', token);
    return rows.map(orderFromJson);
  }

  saveCart(token: string, lines: CartLine[]): Promise<unknown> {
    return this.post('/cart', { items: lines.map((line) => this.lineJson(line)) }, token);
  }

  checkout(
    token: string,
    body: {
      lines: CartLine[];
      addressId: number | null;
      orderType: string;
      paymentMethod: string;
      notes: string;
      promoCode?: string | null;
    }
  ): Promise<{ orderNumber: string; total: number }> {
    return this.post('/checkout', {
      items: body.lines.map((line) => this.lineJson(line)),
      addressId: body.addressId,
      orderType: body.orderType,
      paymentMethod: body.paymentMethod,
      notes: body.notes,
      promoCode: body.promoCode
    }, token) as Promise<{ orderNumber: string; total: number }>;
  }

  saveProfile(
    token: string,
    payload: { firstName: string; lastName: string; phone: string }
  ): Promise<unknown> {
    return this.post('/profile', payload, token);
  }

  saveAddress(token: string, address: Record<string, string>): Promise<unknown> {
    return this.post('/addresses', address, token);
  }

  private lineJson(line: CartLine) {
    return {
      productId: line.product.id,
      sizeId: line.size?.id,
      crustId: line.crust?.id,
      toppingIds: line.toppings.map((item) => item.id),
      quantity: line.quantity
    };
  }

  private headers(token?: string): HttpHeaders {
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private async get<T>(path: string, token?: string): Promise<T> {
    try {
      return await firstValueFrom(
        this.http.get<T>(`${this.baseUrl}${path}`, { headers: this.headers(token) })
      );
    } catch (error) {
      this.throwHttp(error);
    }
  }

  private async post(path: string, body: unknown, token?: string): Promise<unknown> {
    try {
      return await firstValueFrom(
        this.http.post(`${this.baseUrl}${path}`, body, { headers: this.headers(token) })
      );
    } catch (error) {
      this.throwHttp(error);
    }
  }

  private throwHttp(error: unknown): never {
    const err = error as HttpErrorResponse;
    if (err.status === 0) {
      throw new Error(
        'Cannot reach the Oven2Door server. Keep the backend running (`npm run server`) and use the PC LAN IP on a physical phone.'
      );
    }

    const message =
      (err.error && (err.error.message || err.error.error)) ||
      err.message ||
      'Request failed';
    throw new Error(message);
  }
}
