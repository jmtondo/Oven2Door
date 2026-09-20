import fs from 'fs';
import path from 'path';

const sqlPath = path.resolve('./migration/oven2door_db.sql');
const outputPath = path.resolve('./migration/catalog-migration.json');

const sql = fs.readFileSync(sqlPath, 'utf8');

function getInsertBlock(tableName) {
  const regex = new RegExp(
    `INSERT INTO\\s+\`${tableName}\`[^;]*;`,
    'gi'
  );

  const match = sql.match(regex);

  return match ? match.join('\n') : '';
}

function cleanValue(value) {
  let result = value.trim();

  if (result.toUpperCase() === 'NULL') {
    return null;
  }

  result = result.replace(/^['"]|['"]$/g, '');

  result = result
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');

  return result;
}

function parseValues(text) {
  const rows = [];

  let currentRow = [];
  let currentValue = '';

  let insideString = false;
  let insideRow = false;
  let escaping = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (escaping) {
      currentValue += char;
      escaping = false;
      continue;
    }

    if (char === '\\') {
      currentValue += char;
      escaping = true;
      continue;
    }

    if (char === "'") {
      if (insideString && text[i + 1] === "'") {
        currentValue += "'";
        i++;
        continue;
      }

      insideString = !insideString;
      continue;
    }

    if (!insideString && char === '(') {
      if (!insideRow) {
        insideRow = true;
        currentRow = [];
        currentValue = '';
      } else {
        currentValue += char;
      }

      continue;
    }

    if (!insideString && char === ',') {
      if (insideRow) {
        currentRow.push(cleanValue(currentValue));
        currentValue = '';
      }

      continue;
    }

    if (!insideString && char === ')') {
      if (insideRow) {
        currentRow.push(cleanValue(currentValue));

        rows.push(currentRow);

        currentRow = [];
        currentValue = '';
        insideRow = false;
      }

      continue;
    }

    if (insideRow) {
      currentValue += char;
    }
  }

  return rows;
}

function getRows(tableName) {
  const block = getInsertBlock(tableName);

  if (!block) {
    console.log(`⚠ No INSERT found for ${tableName}`);
    return [];
  }

  const valuesStart = block.indexOf('VALUES');

  if (valuesStart === -1) {
    console.log(`⚠ No VALUES found for ${tableName}`);
    return [];
  }

  return parseValues(block.slice(valuesStart + 6));
}

function number(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function string(value, fallback = '') {
  return value === null || value === undefined
    ? fallback
    : String(value);
}

/*
 * ==========================================
 * READ SOURCE TABLES
 * ==========================================
 */

const categoriesRows = getRows('categories');
const productsRows = getRows('products');

const sizesRows = getRows('sizes');
const crustsRows = getRows('crusts');
const toppingsRows = getRows('toppings');

const productSizesRows = getRows('product_sizes');
const productCrustsRows = getRows('product_crusts');
const productToppingsRows = getRows('product_toppings');

console.log('');
console.log('Source rows found:');

console.log(`categories:       ${categoriesRows.length}`);
console.log(`products:         ${productsRows.length}`);
console.log(`sizes:            ${sizesRows.length}`);
console.log(`crusts:           ${crustsRows.length}`);
console.log(`toppings:         ${toppingsRows.length}`);

console.log(`product_sizes:    ${productSizesRows.length}`);
console.log(`product_crusts:   ${productCrustsRows.length}`);
console.log(`product_toppings: ${productToppingsRows.length}`);

console.log('');

/*
 * ==========================================
 * LOOKUP TABLES
 * ==========================================
 */

const sizes = new Map();

for (const row of sizesRows) {
  const id = number(row[0]);

  sizes.set(id, {
    id,
    name: string(row[1]),
    status: string(row[2], 'active')
  });
}

const crusts = new Map();

for (const row of crustsRows) {
  const id = number(row[0]);

  crusts.set(id, {
    id,
    name: string(row[1]),
    additionalPrice: number(row[2]),
    status: string(row[3], 'active')
  });
}

const toppings = new Map();

for (const row of toppingsRows) {
  const id = number(row[0]);

  toppings.set(id, {
    id,
    name: string(row[1]),
    additionalPrice: number(row[2]),
    status: string(row[3], 'active')
  });
}

/*
 * ==========================================
 * CATEGORIES
 * ==========================================
 */

const categoryMap = new Map();

for (const row of categoriesRows) {
  const id = number(row[0]);

  categoryMap.set(id, {
    id,
    name: string(row[1]),
    description: string(row[2]),
    status: string(row[3], 'active')
  });
}

/*
 * ==========================================
 * PRODUCT → SIZE
 *
 * Actual table structure:
 *
 * product_id
 * size_id
 * price
 * status
 * ==========================================
 */

const productSizes = new Map();

for (const row of productSizesRows) {
  const productId = number(row[0]);
  const sizeId = number(row[1]);
  const price = number(row[2]);
  const status = string(row[3], 'active');

  if (!productSizes.has(productId)) {
    productSizes.set(productId, []);
  }

  if (status === 'active') {
    const size = sizes.get(sizeId);

    if (size) {
      productSizes.get(productId).push({
        id: size.id,
        name: size.name,
        price
      });
    }
  }
}

/*
 * ==========================================
 * PRODUCT → CRUST
 *
 * Actual table structure:
 *
 * product_id
 * crust_id
 * additional_price
 * status
 * ==========================================
 */

const productCrusts = new Map();

for (const row of productCrustsRows) {
  const productId = number(row[0]);
  const crustId = number(row[1]);
  const additionalPrice = number(row[2]);
  const status = string(row[3], 'active');

  if (!productCrusts.has(productId)) {
    productCrusts.set(productId, []);
  }

  if (status === 'active') {
    const crust = crusts.get(crustId);

    if (crust) {
      productCrusts.get(productId).push({
        id: crust.id,
        name: crust.name,
        price: additionalPrice
      });
    }
  }
}

/*
 * ==========================================
 * PRODUCT → TOPPING
 *
 * Actual table structure:
 *
 * product_id
 * topping_id
 * additional_price
 * status
 * ==========================================
 */

const productToppings = new Map();

for (const row of productToppingsRows) {
  const productId = number(row[0]);
  const toppingId = number(row[1]);
  const additionalPrice = number(row[2]);
  const status = string(row[3], 'active');

  if (!productToppings.has(productId)) {
    productToppings.set(productId, []);
  }

  if (status === 'active') {
    const topping = toppings.get(toppingId);

    if (topping) {
      productToppings.get(productId).push({
        id: topping.id,
        name: topping.name,
        price: additionalPrice
      });
    }
  }
}

/*
 * ==========================================
 * FIRESTORE CATEGORIES
 * ==========================================
 */

const categories = categoriesRows.map((row) => {
  const id = number(row[0]);

  const category = categoryMap.get(id);

  return {
    categoryId: id,
    categoryName: category?.name ?? '',
    description: category?.description ?? '',
    status: category?.status ?? 'active'
  };
});

/*
 * ==========================================
 * FIRESTORE PRODUCTS
 * ==========================================
 */

const products = productsRows.map((row) => {
  const productId = number(row[0]);
  const categoryId = number(row[1]);

  const category = categoryMap.get(categoryId);

  const sizesForProduct =
    productSizes.get(productId) ?? [];

  const crustsForProduct =
    productCrusts.get(productId) ?? [];

  const toppingsForProduct =
    productToppings.get(productId) ?? [];

  return {
    productId,

    productName: string(row[2]),

    categoryId,

    categoryName:
      category?.name ?? 'Uncategorized',

    description:
      string(row[3]),

    imagePath:
      string(row[4]),

    status:
      string(row[5], 'available'),

    price:
      sizesForProduct.length > 0
        ? sizesForProduct[0].price
        : 0,

    sizes:
      sizesForProduct,

    crusts:
      crustsForProduct,

    toppings:
      toppingsForProduct
  };
});

/*
 * ==========================================
 * FINAL JSON
 * ==========================================
 */

const migrationData = {
  generatedAt: new Date().toISOString(),

  source: {
    database: 'oven2door_db',

    tables: [
      'categories',
      'products',
      'sizes',
      'crusts',
      'toppings',
      'product_sizes',
      'product_crusts',
      'product_toppings'
    ]
  },

  categories,

  products
};

/*
 * ==========================================
 * SAVE
 * ==========================================
 */

fs.writeFileSync(
  outputPath,
  JSON.stringify(migrationData, null, 2),
  'utf8'
);

console.log('======================================');
console.log('Catalog conversion completed!');
console.log('======================================');

console.log(`Categories: ${categories.length}`);
console.log(`Products:   ${products.length}`);

console.log('');
console.log(`Output: ${outputPath}`);
console.log('');