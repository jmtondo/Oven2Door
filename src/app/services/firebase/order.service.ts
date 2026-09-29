import { Injectable } from '@angular/core';

import {
  addDoc,
  collection,
  serverTimestamp
} from 'firebase/firestore';

import { db } from '../../firebase.config';

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

  paymentMethod: string;

  cartItems: CartLine[];

  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  async createOrder(
    data: CreateOrderData
  ): Promise<string> {

    const orderNumber =
      this.generateOrderNumber();

    const items = data.cartItems.map(
      (item) => ({
        productId: item.product.id,
        productName: item.product.name,

        quantity: item.quantity,

        unitPrice:
          item.product.price +
          (item.crust?.price ?? 0) +
          item.toppings.reduce(
            (sum, topping) =>
              sum + topping.price,
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

        toppings: item.toppings.map(
          (topping) => ({
            id: topping.id,
            name: topping.name,
            price: topping.price
          })
        )
      })
    );

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

      paymentMethod:
        data.paymentMethod,

      paymentStatus:
        data.paymentMethod === 'cod'
          ? 'pending'
          : 'pending',

      orderStatus: 'pending',

      items,

      subtotal: data.subtotal,
      deliveryFee: data.deliveryFee,
      discount: data.discount,
      total: data.total,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const ordersRef =
      collection(db, 'orders');

    const orderRef =
      await addDoc(
        ordersRef,
        order
      );

    return orderRef.id;
  }

  private generateOrderNumber(): string {

    const now = new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        now.getDate()
      ).padStart(2, '0');

    const random =
      Math.floor(
        1000 +
        Math.random() * 9000
      );

    return `OD-${year}${month}${day}-${random}`;
  }
}