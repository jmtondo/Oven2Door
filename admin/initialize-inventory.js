import { db } from "./firebase-config.js";

import {
  collection,
  getDocs,
  doc,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export async function initializeInventory() {
  const snapshot = await getDocs(collection(db, "products"));

  let updatedCount = 0;

  for (const productDoc of snapshot.docs) {
    const productRef = doc(db, "products", productDoc.id);

    const updated = await runTransaction(db, async (transaction) => {
      const currentSnapshot = await transaction.get(productRef);

      if (!currentSnapshot.exists()) return false;

      const product = currentSnapshot.data();

      if (!Array.isArray(product.sizes) || product.sizes.length === 0) {
        return false;
      }

      let hasChanges = false;

      const updatedSizes = product.sizes.map((size) => {
        if (size.stockQuantity !== undefined) {
          return size;
        }

        hasChanges = true;

        return {
          ...size,
          stockQuantity: 0,
        };
      });

      if (!hasChanges) return false;

      transaction.update(productRef, {
        sizes: updatedSizes,
      });

      return true;
    });

    if (updated) updatedCount++;
  }

  console.log(`Inventory initialized for ${updatedCount} products.`);

  return updatedCount;
}
