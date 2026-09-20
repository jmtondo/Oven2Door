import fs from 'fs';
import path from 'path';

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword
} from 'firebase/auth';

import {
  getFirestore,
  collection,
  doc,
  writeBatch
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA2237IQgmv-F4DHnKB5MWJZgDM4BU4x4o',
  authDomain: 'oven2door.firebaseapp.com',
  projectId: 'oven2door',
  storageBucket: 'oven2door.firebasestorage.app',
  messagingSenderId: '670039143562',
  appId: '1:670039143562:web:b285777d39aab8adc62973',
  measurementId: 'G-TC6K1YL9VS'
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const migrationPath = path.resolve(
  './migration/catalog-migration.json'
);

const migrationData = JSON.parse(
  fs.readFileSync(migrationPath, 'utf8')
);

/*
 * ==========================================
 * GET FIREBASE LOGIN
 * ==========================================
 */

const email = process.env.FIREBASE_MIGRATION_EMAIL;
const password = process.env.FIREBASE_MIGRATION_PASSWORD;

if (!email || !password) {
  console.error('');
  console.error('Missing Firebase migration credentials.');
  console.error('');
  console.error('PowerShell example:');
  console.error('$env:FIREBASE_MIGRATION_EMAIL="your@email.com"');
  console.error('$env:FIREBASE_MIGRATION_PASSWORD="your-password"');
  console.error('');

  process.exit(1);
}

/*
 * ==========================================
 * SIGN IN
 * ==========================================
 */

console.log('');
console.log('Signing in to Firebase...');

try {
  await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  console.log('Firebase authentication successful.');
} catch (error) {
  console.error('');
  console.error('Firebase authentication failed.');
  console.error(error.message);
  console.error('');

  process.exit(1);
}

/*
 * ==========================================
 * CREATE BATCH
 * ==========================================
 */

const batch = writeBatch(db);

let operationCount = 0;

/*
 * ==========================================
 * CATEGORIES
 * ==========================================
 */

for (const category of migrationData.categories) {
  const categoryRef = doc(
    db,
    'categories',
    String(category.categoryId)
  );

  batch.set(categoryRef, {
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    description: category.description,
    status: category.status
  });

  operationCount++;
}

/*
 * ==========================================
 * PRODUCTS
 * ==========================================
 */

for (const product of migrationData.products) {
  const productRef = doc(
    db,
    'products',
    String(product.productId)
  );

  batch.set(productRef, {
    productId: product.productId,

    productName: product.productName,

    categoryId: product.categoryId,

    categoryName: product.categoryName,

    description: product.description,

    imagePath: product.imagePath,

    status: product.status,

    price: product.price,

    sizes: product.sizes,

    crusts: product.crusts,

    toppings: product.toppings
  });

  operationCount++;
}

/*
 * ==========================================
 * UPLOAD
 * ==========================================
 */

console.log('');
console.log(`Preparing ${operationCount} Firestore writes...`);
console.log('');

try {
  await batch.commit();

  console.log('======================================');
  console.log('CATALOG MIGRATION SUCCESSFUL');
  console.log('======================================');

  console.log(`Categories uploaded: ${migrationData.categories.length}`);
  console.log(`Products uploaded:   ${migrationData.products.length}`);
  console.log(`Total writes:        ${operationCount}`);

  console.log('');
  console.log('Firestore catalog is now populated.');
  console.log('');
} catch (error) {
  console.error('');
  console.error('======================================');
  console.error('CATALOG MIGRATION FAILED');
  console.error('======================================');
  console.error('');

  console.error(error);
  console.error('');

  process.exit(1);
}