import { Injectable } from '@angular/core';

import { db } from '../firebase.config';

import { doc, getDoc, Timestamp } from 'firebase/firestore';

export interface AppliedPromo {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  discount: number;
}

@Injectable({
  providedIn: 'root',
})
export class PromoService {
  async validatePromo(code: string, subtotal: number): Promise<AppliedPromo> {
    const normalizedCode = code.trim().toUpperCase();

    if (!/^[A-Z0-9_-]{3,24}$/.test(normalizedCode)) {
      throw new Error('Please enter a valid promo code.');
    }

    const promoRef = doc(db, 'promos', normalizedCode);

    console.log('[PROMO] Starting Firestore request:', normalizedCode);

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error('Firestore promo request timed out after 10 seconds.'),
        );
      }, 10000);
    });

    const snapshot = await Promise.race([getDoc(promoRef), timeout]);

    console.log('[PROMO] Firestore responded:', snapshot.exists());
    if (!snapshot.exists()) {
      throw new Error('Promo code does not exist.');
    }

    const promo = snapshot.data();
    const now = Timestamp.now().toMillis();

    if (promo['enabled'] !== true) {
      throw new Error('This promo code is disabled.');
    }

    if (
      !promo['startAt']?.toMillis ||
      !promo['endAt']?.toMillis ||
      now < promo['startAt'].toMillis() ||
      now >= promo['endAt'].toMillis()
    ) {
      throw new Error('This promo code is not currently available.');
    }

    if (subtotal < promo['minimumOrder']) {
      throw new Error(`Minimum order of ₱${promo['minimumOrder']} required.`);
    }

    if (promo['usedCount'] >= promo['usageLimit']) {
      throw new Error('This promo has reached its usage limit.');
    }

    const type = promo['type'];
    const value = Number(promo['value']);

    if (
      !['percentage', 'fixed'].includes(type) ||
      !Number.isFinite(value) ||
      value <= 0 ||
      (type === 'percentage' && value > 100)
    ) {
      throw new Error('Invalid promo configuration.');
    }

    let discount = type === 'percentage' ? (subtotal * value) / 100 : value;

    if (
      promo['maximumDiscount'] !== null &&
      promo['maximumDiscount'] !== undefined
    ) {
      discount = Math.min(discount, Number(promo['maximumDiscount']));
    }

    discount = Math.min(discount, subtotal);

    return {
      code: normalizedCode,
      type,
      value,
      discount: Math.round(discount * 100) / 100,
    };
  }
}
