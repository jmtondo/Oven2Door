import { db } from "./firebase-config.js";

import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export async function backupProducts() {
  const snapshot = await getDocs(collection(db, "products"));

  const products = snapshot.docs.map((document) => ({
    firestoreDocumentId: document.id,
    data: document.data(),
  }));

  const backup = {
    collection: "products",
    exportedAt: new Date().toISOString(),
    totalProducts: products.length,
    products,
  };

  const json = JSON.stringify(
    backup,
    (key, value) => {
      // Preserve Firestore Timestamp values
      if (
        value &&
        typeof value === "object" &&
        typeof value.toDate === "function"
      ) {
        return {
          __type: "timestamp",
          value: value.toDate().toISOString(),
        };
      }

      return value;
    },
    2,
  );

  const blob = new Blob([json], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `oven2door-products-backup-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  console.log(`Backed up ${products.length} products.`);
}
