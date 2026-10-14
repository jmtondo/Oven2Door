import { Injectable } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  Unsubscribe as FirestoreUnsubscribe,
} from 'firebase/firestore';

import { auth, db } from '../../firebase.config';

@Injectable({
  providedIn: 'root',
})
export class WishlistService {
  private getWishlistCollection(uid: string) {
    return collection(db, 'users', uid, 'wishlist');
  }

  // Listen for changes to the customer's wishlist.
  listenToWishlist(
    uid: string,
    callback: (productIds: string[]) => void,
    onError?: (error: Error) => void,
  ): FirestoreUnsubscribe {
    return onSnapshot(
      this.getWishlistCollection(uid),
      (snapshot) => {
        callback(snapshot.docs.map((item) => item.id));
      },
      (error) => {
        console.error('Wishlist listener error:', error);
        onError?.(error);
      },
    );
  }

  // Save a product.
  async addToWishlist(productId: string): Promise<void> {
    const uid = auth.currentUser?.uid;

    if (!uid) {
      throw new Error('Please log in to save products.');
    }

    const wishlistRef = doc(db, 'users', uid, 'wishlist', productId);

    await setDoc(wishlistRef, {
      productId,
      addedAt: serverTimestamp(),
    });
  }

  // Remove a saved product.
  async removeFromWishlist(productId: string): Promise<void> {
    const uid = auth.currentUser?.uid;

    if (!uid) {
      throw new Error('Please log in to manage your wishlist.');
    }

    await deleteDoc(doc(db, 'users', uid, 'wishlist', productId));
  }

  // Check whether a product is saved.
  async isInWishlist(productId: string): Promise<boolean> {
    const uid = auth.currentUser?.uid;

    if (!uid) {
      return false;
    }

    const { getDoc } = await import('firebase/firestore');

    const snapshot = await getDoc(doc(db, 'users', uid, 'wishlist', productId));

    return snapshot.exists();
  }
}
