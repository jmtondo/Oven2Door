import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { IonContent, IonIcon, IonRange, IonButton } from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  gridOutline,
  pizzaOutline,
  fastFoodOutline,
  restaurantOutline,
  searchOutline,
  closeOutline,
  cartOutline,
  heartOutline,
  heart,
} from 'ionicons/icons';

import {
  onAuthStateChanged,
  Unsubscribe as AuthUnsubscribe,
} from 'firebase/auth';

import { Unsubscribe as FirestoreUnsubscribe } from 'firebase/firestore';

import { auth } from '../../firebase.config';

import { CatalogService } from '../../services/firebase/catalog.service';
import { WishlistService } from '../../services/firebase/wishlist.service';
import { StorefrontService } from '../../services/storefront.service';

import { CatalogProduct } from '../../models/storefront.models';

interface MenuCategory {
  label: string;
  icon: string;
}

@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent, IonIcon, IonRange, IonButton],
})
export class MenuPage implements OnInit, OnDestroy {
  // ==========================================
  // WISHLIST STATE
  // ==========================================

  wishlistIds = new Set<string>();
  wishlistBusyIds = new Set<string>();
  wishlistError = '';

  private authUnsubscribe?: AuthUnsubscribe;
  private wishlistUnsubscribe?: FirestoreUnsubscribe;
  private currentWishlistUid: string | null = null;

  // ==========================================
  // MENU CATEGORIES
  // ==========================================

  readonly menuCategories: MenuCategory[] = [
    { label: 'All', icon: 'grid-outline' },
    { label: 'Pizza', icon: 'pizza-outline' },
    { label: 'Drinks', icon: 'restaurant-outline' },
    { label: 'Sides', icon: 'fast-food-outline' },
    { label: 'Chicken', icon: 'restaurant-outline' },
    { label: 'Pasta', icon: 'restaurant-outline' },
  ];

  // ==========================================
  // MENU STATE
  // ==========================================

  products: CatalogProduct[] = [];
  filteredProducts: CatalogProduct[] = [];

  selectedCategory = 'All';
  searchQuery = '';
  sortOption = 'Recommended';

  minPrice = 0;
  maxPrice = 500;

  isLoading = true;
  errorMessage = '';

  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor(
    private catalogService: CatalogService,
    private storefront: StorefrontService,
    private wishlistService: WishlistService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    addIcons({
      gridOutline,
      pizzaOutline,
      fastFoodOutline,
      restaurantOutline,
      searchOutline,
      closeOutline,
      cartOutline,
      heartOutline,
      heart,
    });
  }

  // ==========================================
  // LIFECYCLE
  // ==========================================

  async ngOnInit(): Promise<void> {
    this.listenToCustomerWishlist();
    await this.loadCatalog();
  }

  ngOnDestroy(): void {
    this.authUnsubscribe?.();
    this.wishlistUnsubscribe?.();
  }

  // ==========================================
  // LOAD FIREBASE CATALOG
  // ==========================================

  async loadCatalog(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.products = await this.catalogService.getProducts();

      console.log('Firebase menu products:', this.products.length);

      console.log('First Firebase product:', this.products[0]);

      this.applyFilters();

      console.log('Filtered menu products:', this.filteredProducts.length);
    } catch (error) {
      console.error('Failed to load Firebase catalog:', error);

      this.errorMessage =
        'Unable to load the menu right now. Please try again.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  // ADD TO CART
  // ==========================================

  addToCart(product: CatalogProduct): void {
    const size = product.sizes?.[0];
    const crust = product.crusts?.[0];

    if (product.sizes?.length && !size) {
      console.error('No valid pizza size available.');
      return;
    }

    this.storefront.add(product, {
      quantity: 1,
      size,
      crust,
      toppings: [],
    });

    console.log('Added to cart:', {
      product: product.name,
      size: size?.name,
      crust: crust?.name,
      cart: this.storefront.cart,
    });
  }

  // ==========================================
  // PRODUCT CATEGORIES
  // ==========================================

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

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.applyFilters();
  }

  // ==========================================
  // SEARCH
  // ==========================================

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  // ==========================================
  // PRICE FILTER
  // ==========================================

  onPriceChange(event: CustomEvent): void {
    const value = event.detail.value;

    if (
      typeof value === 'object' &&
      value !== null &&
      'lower' in value &&
      'upper' in value
    ) {
      this.minPrice = Number(value.lower);
      this.maxPrice = Number(value.upper);
      this.applyFilters();
    }
  }

  // ==========================================
  // SORTING
  // ==========================================

  setSort(option: string): void {
    this.sortOption = option;
    this.applyFilters();
  }

  // ==========================================
  // CLEAR FILTERS
  // ==========================================

  clearFilters(): void {
    this.selectedCategory = 'All';
    this.searchQuery = '';
    this.sortOption = 'Recommended';
    this.minPrice = 0;
    this.maxPrice = 500;

    this.applyFilters();
  }

  // ==========================================
  // APPLY FILTERS
  // ==========================================

  applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();

    const list = this.products.filter((product) => {
      const productCategory = this.normalizeCategory(product.category);

      const matchesCategory =
        this.selectedCategory === 'All' ||
        productCategory === this.selectedCategory;

      const searchableText =
        `${product.name} ${product.description}`.toLowerCase();

      const matchesSearch = query === '' || searchableText.includes(query);

      const matchesPrice =
        product.price >= this.minPrice && product.price <= this.maxPrice;

      return matchesCategory && matchesSearch && matchesPrice;
    });

    if (this.sortOption === 'Price: low to high') {
      list.sort((a, b) => a.price - b.price);
    } else if (this.sortOption === 'Price: high to low') {
      list.sort((a, b) => b.price - a.price);
    }

    this.filteredProducts = list;
  }

  trackByProductId(index: number, product: CatalogProduct): number {
    return product.id;
  }

  // ==========================================
  // FIREBASE WISHLIST LISTENER
  // ==========================================

  private listenToCustomerWishlist(): void {
    this.authUnsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        this.wishlistUnsubscribe?.();
        this.wishlistUnsubscribe = undefined;

        this.currentWishlistUid = user?.uid ?? null;
        this.wishlistIds = new Set<string>();
        this.wishlistBusyIds = new Set<string>();
        this.wishlistError = '';

        if (!user) {
          this.cdr.detectChanges();
          return;
        }

        this.wishlistUnsubscribe = this.wishlistService.listenToWishlist(
          user.uid,
          (ids) => {
            if (this.currentWishlistUid !== user.uid) {
              return;
            }

            this.wishlistIds = new Set(ids);
            this.cdr.detectChanges();
          },
          (error) => {
            console.error('Wishlist synchronization failed:', error);

            this.wishlistError = 'Unable to synchronize your wishlist.';

            this.cdr.detectChanges();
          },
        );
      },
      (error) => {
        console.error('Wishlist authentication listener failed:', error);

        this.wishlistError = 'Unable to load your wishlist.';

        this.cdr.detectChanges();
      },
    );
  }

  // ==========================================
  // CHECK WISHLIST STATUS
  // ==========================================

  isWishlisted(product: CatalogProduct): boolean {
    return this.wishlistIds.has(String(product.id));
  }

  isWishlistBusy(product: CatalogProduct): boolean {
    return this.wishlistBusyIds.has(String(product.id));
  }

  // ==========================================
  // ADD OR REMOVE WISHLIST PRODUCT
  // ==========================================

  async toggleWishlist(product: CatalogProduct): Promise<void> {
    if (!auth.currentUser) {
      await this.router.navigateByUrl('/login');
      return;
    }

    const productId = String(product.id);

    if (this.wishlistBusyIds.has(productId)) {
      return;
    }

    const wasSaved = this.wishlistIds.has(productId);

    this.wishlistBusyIds.add(productId);
    this.wishlistError = '';

    try {
      if (wasSaved) {
        await this.wishlistService.removeFromWishlist(productId);
      } else {
        await this.wishlistService.addToWishlist(productId);
      }
    } catch (error) {
      console.error('Wishlist update failed:', error);

      this.wishlistError = 'Unable to update your wishlist. Please try again.';
    } finally {
      this.wishlistBusyIds.delete(productId);
      this.cdr.detectChanges();
    }
  }
}
