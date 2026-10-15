import { Injectable } from '@angular/core';
import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';

import { auth, db } from '../../firebase.config';

export type IssueReason =
  | 'missing_item'
  | 'wrong_item'
  | 'damaged_item'
  | 'food_quality'
  | 'other';

export type RequestedResolution = 'refund' | 'replacement' | 'support';

export interface IssueRequestInput {
  orderId: string;
  reason: IssueReason;
  description: string;
  resolution: RequestedResolution;
}

export type RefundRequestStatus = 'pending' | 'approved' | 'rejected';

export type RefundFulfillmentStatus =
  | 'not_processed'
  | 'processing'
  | 'completed';

export type RefundMethod =
  | 'cash'
  | 'gcash'
  | 'maya'
  | 'bank_transfer'
  | 'other';

export interface RefundRequest {
  refundStatus?: RefundFulfillmentStatus;
  refundAmount?: number;
  refundMethod?: RefundMethod | null;
  refundReference?: string | null;
  refundProcessedBy?: string | null;
  refundCompletedAt?: Timestamp | null;

  id: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  reason: IssueReason;
  description: string;
  requestedResolution: RequestedResolution;
  paymentMethod: string;
  orderTotal: number;
  status: RefundRequestStatus;
  adminNote?: string;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

@Injectable({
  providedIn: 'root',
})
export class RefundRequestService {
  observeRequest(
    orderId: string,
    onChange: (request: RefundRequest | null) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('Please sign in to view your request.');
    }

    const requestRef = doc(db, 'refundRequests', orderId);

    return onSnapshot(
      requestRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onChange(null);
          return;
        }

        const data = snapshot.data();

        if (data['userId'] !== user.uid) {
          onChange(null);
          return;
        }

        onChange({
          id: snapshot.id,
          ...data,
        } as RefundRequest);
      },
      (error) => {
        console.error('Refund request listener error:', error);
        onError?.(error);
      },
    );
  }
  async submitIssue(input: IssueRequestInput): Promise<string> {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('Please sign in to report an issue.');
    }

    const description = input.description.trim();

    if (description.length < 10 || description.length > 2000) {
      throw new Error('Please describe the issue using 10 to 2000 characters.');
    }

    const validReasons: IssueReason[] = [
      'missing_item',
      'wrong_item',
      'damaged_item',
      'food_quality',
      'other',
    ];

    const validResolutions: RequestedResolution[] = [
      'refund',
      'replacement',
      'support',
    ];

    if (
      !validReasons.includes(input.reason) ||
      !validResolutions.includes(input.resolution)
    ) {
      throw new Error('Please select a valid issue and resolution.');
    }

    const orderRef = doc(db, 'orders', input.orderId);

    // One initial issue request per order.
    const requestRef = doc(db, 'refundRequests', input.orderId);

    await runTransaction(db, async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef);
      const requestSnapshot = await transaction.get(requestRef);

      if (!orderSnapshot.exists()) {
        throw new Error('Order not found.');
      }

      const order = orderSnapshot.data();

      if (order['userId'] !== user.uid) {
        throw new Error('You cannot report another customer’s order.');
      }

      if (order['orderStatus'] !== 'delivered') {
        throw new Error('Issue reporting is available for delivered orders.');
      }

      if (requestSnapshot.exists()) {
        throw new Error(
          'An issue request has already been submitted for this order.',
        );
      }

      transaction.set(requestRef, {
        orderId: input.orderId,
        orderNumber: String(order['orderNumber'] || input.orderId),
        userId: user.uid,
        reason: input.reason,
        description,
        requestedResolution: input.resolution,
        paymentMethod: String(order['paymentMethod'] || ''),
        orderTotal: Number(order['total'] || 0),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    return requestRef.id;
  }
}
