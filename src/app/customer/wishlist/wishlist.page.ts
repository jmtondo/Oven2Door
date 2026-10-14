import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { IonContent, IonIcon } from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  heartOutline,
  heart,
  arrowForwardOutline,
  cartOutline,
  trashOutline,
} from 'ionicons/icons';

import {
  onAuthStateChanged,
  Unsubscribe as AuthUnsubscribe,
} from 'firebase/auth';

import { Unsubscribe as FirestoreUnsubscribe } from 'firebase/firestore';

import { auth } from '../../firebase.config';

import { WishlistService } from '../../services/firebase/wishlist.service';
import { CatalogService } from '../../services/firebase/catalog.service';
import { StorefrontService } from '../../services/storefront.service';

import { CatalogProduct } from '../../models/storefront.models';

@Component({
  selector: 'app-wishlist',
  templateUrl: './wishlist.page.html',
  styleUrls: ['./wishlist.page.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent, IonIcon],
})
export class WishlistPage implements OnInit, OnDestroy {
  products: CatalogProduct[] = [];
  wishlistProducts: CatalogProduct[] = [];
  wishlistIds: string[] = [];

  loading = true;
  errorMessage = '';
  actionMessage = '';

  removingIds = new Set<string>();

  private authUnsubscribe?: AuthUnsubscribe;
  private wishlistUnsubscribe?: FirestoreUnsubscribe;

  private currentUid: string | null = null;
  private catalogLoaded = false;
  private wishlistLoaded = false;

  constructor(
    private wishlistService: WishlistService,
    private catalogService: CatalogService,
    private storefront: StorefrontService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({
      heartOutline,
      heart,
      arrowForwardOutline,
      cartOutline,
      trashOutline,
    });
  }

  ngOnInit(): void {
    this.listenToAuthentication();
  }

  private listenToAuthentication(): void {
    this.authUnsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        this.wishlistUnsubscribe?.();
        this.wishlistUnsubscribe = undefined;

        this.currentUid = user?.uid ?? null;
        this.wishlistIds = [];
        this.wishlistProducts = [];
        this.catalogLoaded = false;
        this.wishlistLoaded = false;
        this.loading = true;
        this.errorMessage = '';
        this.actionMessage = '';

        if (!user) {
          this.loading = false;
          void this.router.navigateByUrl('/login');
          return;
        }

        void this.loadCatalog(user.uid);

        this.wishlistUnsubscribe = this.wishlistService.listenToWishlist(
          user.uid,
          (ids) => {
            if (this.currentUid !== user.uid) {
              return;
            }

            this.wishlistIds = ids;
            this.wishlistLoaded = true;
            this.updateWishlistProducts();
          },
          (error) => {
            if (this.currentUid !== user.uid) {
              return;
            }

            console.error('Wishlist listener failed:', error);

            this.errorMessage = 'Unable to load your saved products.';

            this.loading = false;
            this.cdr.detectChanges();
          },
        );
      },
      (error) => {
        console.error('Authentication error:', error);

        this.errorMessage = 'Unable to verify your account.';

        this.loading = false;
        this.cdr.detectChanges();
      },
    );
  }

  private async loadCatalog(uid: string): Promise<void> {
    try {
      const products = await this.catalogService.getProducts();

      if (this.currentUid !== uid) {
        return;
      }

      this.products = products;
      this.catalogLoaded = true;

      this.updateWishlistProducts();
    } catch (error) {
      if (this.currentUid !== uid) {
        return;
      }

      console.error('Failed to load wishlist catalog:', error);

      this.errorMessage =
        'Unable to load product information. Please try again.';

      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private updateWishlistProducts(): void {
    if (!this.catalogLoaded || !this.wishlistLoaded) {
      return;
    }

    const savedIds = new Set(this.wishlistIds);

    this.wishlistProducts = this.products.filter((product) =>
      savedIds.has(String(product.id)),
    );

    this.loading = false;
    this.cdr.detectChanges();
  }

  normalizeCategory(category: string): string {
    const value = category.trim().toLowerCase();

    if (value.includes('drink')) {
      return 'Drinks';
    }

    if (value.includes('side')) {
      return 'Sides';
    }

    if (value.includes('chicken')) {
      return 'Chicken';
    }

    if (value.includes('pasta')) {
      return 'Pasta';
    }

    return 'Pizza';
  }

  isRemoving(product: CatalogProduct): boolean {
    return this.removingIds.has(String(product.id));
  }

  async removeProduct(product: CatalogProduct): Promise<void> {
    const productId = String(product.id);

    if (this.removingIds.has(productId)) {
      return;
    }

    this.removingIds.add(productId);
    this.errorMessage = '';
    this.actionMessage = '';

    try {
      await this.wishlistService.removeFromWishlist(productId);

      this.actionMessage = `${product.name} was removed from your wishlist.`;
    } catch (error) {
      console.error('Remove wishlist product failed:', error);

      this.errorMessage = 'Unable to remove this product. Please try again.';
    } finally {
      this.removingIds.delete(productId);
      this.cdr.detectChanges();
    }
  }

  addToCart(product: CatalogProduct): void {
    const size = product.sizes?.[0];
    const crust = product.crusts?.[0];

    if (product.sizes?.length && !size) {
      this.errorMessage = 'This product does not have an available size.';
      return;
    }

    this.storefront.add(product, {
      quantity: 1,
      size,
      crust,
      toppings: [],
    });

    this.errorMessage = '';
    this.actionMessage = `${product.name} was added to your cart.`;
  }

  trackByProductId(index: number, product: CatalogProduct): number {
    return product.id;
  }

  ngOnDestroy(): void {
    this.authUnsubscribe?.();
    this.wishlistUnsubscribe?.();
  }
}
