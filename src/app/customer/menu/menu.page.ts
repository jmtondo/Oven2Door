import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  IonContent,
  IonIcon,
  IonRange,
  IonButton
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  gridOutline,
  pizzaOutline,
  fastFoodOutline,
  restaurantOutline,
  searchOutline,
  closeOutline,
  cartOutline
} from 'ionicons/icons';

import { CatalogService } from '../../services/firebase/catalog.service';
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
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonIcon,
    IonRange,
    IonButton
  ]
})
export class MenuPage implements OnInit {

  readonly menuCategories: MenuCategory[] = [
    {
      label: 'All',
      icon: 'grid-outline'
    },
    {
      label: 'Pizza',
      icon: 'pizza-outline'
    },
    {
      label: 'Drinks',
      icon: 'restaurant-outline'
    },
    {
      label: 'Sides',
      icon: 'fast-food-outline'
    },
    {
      label: 'Chicken',
      icon: 'restaurant-outline'
    },
    {
      label: 'Pasta',
      icon: 'restaurant-outline'
    }
  ];

  products: CatalogProduct[] = [];

  filteredProducts: CatalogProduct[] = [];

  selectedCategory = 'All';

  searchQuery = '';

  sortOption = 'Recommended';

  minPrice = 0;

  maxPrice = 500;

  isLoading = true;

  errorMessage = '';

  constructor(
    private catalogService: CatalogService,
    private storefront: StorefrontService
  ) {
    addIcons({
      gridOutline,
      pizzaOutline,
      fastFoodOutline,
      restaurantOutline,
      searchOutline,
      closeOutline,
      cartOutline
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadCatalog();
  }

  async loadCatalog(): Promise<void> {

    this.isLoading = true;
    this.errorMessage = '';

    try {

      this.products =
        await this.catalogService.getProducts();

      console.log(
        'Firebase menu products:',
        this.products.length
      );

      console.log(
        'First Firebase product:',
        this.products[0]
      );

      this.applyFilters();

      console.log(
        'Filtered menu products:',
        this.filteredProducts.length
      );

    } catch (error) {

      console.error(
        'Failed to load Firebase catalog:',
        error
      );

      this.errorMessage =
        'Unable to load the menu right now. Please try again.';

    } finally {

      this.isLoading = false;

    }
  }

  /**
   * Add a product directly to the shared cart.
   *
   * For now this adds the base product with
   * quantity 1. Product customization can be
   * connected later.
   */
  addToCart(product: CatalogProduct): void {

    this.storefront.add(product, {
      quantity: 1
    });

    console.log(
      'Added to cart:',
      product.name
    );

    console.log(
      'Cart:',
      this.storefront.cart
    );
  }

  normalizeCategory(category: string): string {

    const value =
      category
        .trim()
        .toLowerCase();

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

  onSearch(event: Event): void {

    const input =
      event.target as HTMLInputElement;

    this.searchQuery = input.value;

    this.applyFilters();
  }

  clearSearch(): void {

    this.searchQuery = '';

    this.applyFilters();
  }

  onPriceChange(event: CustomEvent): void {

    const value = event.detail.value;

    if (
      typeof value === 'object' &&
      value !== null &&
      'lower' in value &&
      'upper' in value
    ) {

      this.minPrice =
        Number(value.lower);

      this.maxPrice =
        Number(value.upper);

      this.applyFilters();
    }
  }

  setSort(option: string): void {

    this.sortOption = option;

    this.applyFilters();
  }

  clearFilters(): void {

    this.selectedCategory = 'All';

    this.searchQuery = '';

    this.sortOption = 'Recommended';

    this.minPrice = 0;

    this.maxPrice = 500;

    this.applyFilters();
  }

  applyFilters(): void {

    const query =
      this.searchQuery
        .trim()
        .toLowerCase();

    let list =
      this.products.filter(product => {

        const productCategory =
          this.normalizeCategory(
            product.category
          );

        const matchesCategory =
          this.selectedCategory === 'All' ||
          productCategory === this.selectedCategory;

        const searchableText =
          `${product.name} ${product.description}`
            .toLowerCase();

        const matchesSearch =
          query === '' ||
          searchableText.includes(query);

        const matchesPrice =
          product.price >= this.minPrice &&
          product.price <= this.maxPrice;

        return (
          matchesCategory &&
          matchesSearch &&
          matchesPrice
        );
      });

    if (
      this.sortOption ===
      'Price: low to high'
    ) {

      list.sort(
        (a, b) =>
          a.price - b.price
      );

    } else if (
      this.sortOption ===
      'Price: high to low'
    ) {

      list.sort(
        (a, b) =>
          b.price - a.price
      );
    }

    this.filteredProducts = list;
  }

  trackByProductId(
    index: number,
    product: CatalogProduct
  ): number {

    return product.id;
  }
}