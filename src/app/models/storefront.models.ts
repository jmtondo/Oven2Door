export interface ProductOption {
  id: number;
  name: string;
  price: number;
}

export interface CatalogProduct {
  id: number;
  category: string;
  name: string;
  description: string;
  imagePath: string;
  price: number;
  sizes: ProductOption[];
  crusts: ProductOption[];
  toppings: ProductOption[];
}

export interface CartLine {
  product: CatalogProduct;
  quantity: number;
  size?: ProductOption;
  crust?: ProductOption;
  toppings: ProductOption[];
}

export interface Address {
  id: number;
  label: string;
  line: string;
}

export interface OrderSummary {
  number: string;
  status: string;
  total: number;
  createdAt: string;
}

export function optionFromJson(raw: Record<string, unknown>): ProductOption {
  return {
    id: Number(raw['id'] ?? 0),
    name: String(raw['name'] ?? ''),
    price: Number(raw['price'] ?? 0)
  };
}

export function productFromJson(raw: Record<string, unknown>): CatalogProduct {
  const options = (value: unknown): ProductOption[] =>
    Array.isArray(value)
      ? value.map((item) => optionFromJson(item as Record<string, unknown>))
      : [];

  return {
    id: Number(raw['product_id'] ?? 0),
    category: String(raw['category_name'] ?? 'Pizza'),
    name: String(raw['product_name'] ?? ''),
    description: String(raw['description'] ?? ''),
    imagePath: String(raw['image_path'] ?? ''),
    price: Number(raw['price'] ?? 0),
    sizes: options(raw['sizes']),
    crusts: options(raw['crusts']),
    toppings: options(raw['toppings'])
  };
}

export function addressFromJson(raw: Record<string, unknown>): Address {
  const line = [
    raw['house_number'],
    raw['street'],
    raw['barangay'],
    raw['city'],
    raw['province']
  ]
    .filter((part) => typeof part === 'string' && part.length > 0)
    .join(', ');

  return {
    id: Number(raw['address_id'] ?? 0),
    label: String(raw['address_label'] ?? 'Address'),
    line
  };
}

export function orderFromJson(raw: Record<string, unknown>): OrderSummary {
  return {
    number: String(raw['order_number'] ?? ''),
    status: String(raw['order_status'] ?? 'pending'),
    total: Number(raw['total_amount'] ?? 0),
    createdAt: String(raw['created_at'] ?? '')
  };
}

export function unitPrice(line: CartLine): number {
  return (
    line.product.price +
    (line.crust?.price ?? 0) +
    line.toppings.reduce((sum, item) => sum + item.price, 0)
  );
}

export function lineSubtotal(line: CartLine): number {
  return unitPrice(line) * line.quantity;
}

export function money(amount: number): string {
  return `₱${amount.toFixed(0)}`;
}

export function productImage(path: string): string {
  if (!path) {
    return 'assets/images/pizzapics/Pepperonithincrust.png';
  }
  return path.replace(/^assets\//, 'assets/');
}
