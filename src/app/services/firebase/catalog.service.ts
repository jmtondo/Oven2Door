import { Injectable } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  getDocs
} from 'firebase/firestore';

import { db } from '../../firebase.config';

import {
  CatalogProduct,
  ProductOption
} from '../../models/storefront.models';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private readonly productsCollection = collection(db, 'products');
  private readonly categoriesCollection = collection(db, 'categories');

  /**
   * Get all available products from Firestore.
   */
  async getProducts(): Promise<CatalogProduct[]> {
    const snapshot = await getDocs(this.productsCollection);

    const products: CatalogProduct[] = [];

    snapshot.forEach((document) => {
      const data = document.data();

      const status = String(data['status'] ?? 'available');

      // Only show available products
      if (status !== 'available') {
        return;
      }

      products.push(this.mapProduct(document.id, data));
    });

    // Keep the same ordering as the old MySQL catalog
    products.sort((a, b) => a.id - b.id);

    return products;
  }

  /**
   * Get one product by its Firestore document ID.
   */
  async getProduct(productId: string): Promise<CatalogProduct | null> {
    const productRef = doc(db, 'products', productId);
    const snapshot = await getDoc(productRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();

    if (String(data['status'] ?? 'available') !== 'available') {
      return null;
    }

    return this.mapProduct(snapshot.id, data);
  }

  /**
   * Get all categories.
   *
   * This is useful later for category filters/navigation.
   */
  async getCategories(): Promise<Record<string, unknown>[]> {
    const snapshot = await getDocs(this.categoriesCollection);

    return snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data()
    }));
  }

  /**
   * Convert a Firestore product document
   * into the existing CatalogProduct model.
   */
  private mapProduct(
    documentId: string,
    data: Record<string, any>
  ): CatalogProduct {
    const productId = Number(
      data['productId'] ??
      data['product_id'] ??
      documentId
    );

    const sizes = this.mapOptions(data['sizes']);

    const crusts = this.mapOptions(data['crusts']);

    const toppings = this.mapOptions(data['toppings']);

    return {
      id: productId,

      category: String(
        data['categoryName'] ??
        data['category_name'] ??
        data['category'] ??
        'Pizza'
      ),

      name: String(
        data['productName'] ??
        data['product_name'] ??
        data['name'] ??
        ''
      ),

      description: String(
        data['description'] ?? ''
      ),

      /*
       * Images remain inside the Ionic application.
       *
       * Example:
       * assets/images/pizzapics/Pepperonithincrust.png
       */
      imagePath: String(
        data['imagePath'] ??
        data['image_path'] ??
        data['imageUrl'] ??
        ''
      ),

      /*
       * The old MySQL API used the lowest available size price
       * as the product's base price.
       */
      price: Number(
        data['price'] ??
        sizes[0]?.price ??
        0
      ),

      sizes,
      crusts,
      toppings
    };
  }

  /**
   * Convert Firestore option arrays into ProductOption[].
   */
  private mapOptions(value: unknown): ProductOption[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item: any) => ({
      id: Number(
        item?.id ??
        item?.sizeId ??
        item?.size_id ??
        item?.crustId ??
        item?.crust_id ??
        item?.toppingId ??
        item?.topping_id ??
        0
      ),

      name: String(
        item?.name ??
        item?.sizeName ??
        item?.size_name ??
        item?.crustName ??
        item?.crust_name ??
        item?.toppingName ??
        item?.topping_name ??
        ''
      ),

      price: Number(
        item?.price ??
        item?.additionalPrice ??
        item?.additional_price ??
        0
      )
    }));
  }
}