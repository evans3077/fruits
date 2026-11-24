export type FlavourId = 'berry' | 'kiwi' | 'banana' | 'strawberry';
export type FlavourFilter = 'All' | 'Berry' | 'Kiwi' | 'Banana' | 'Strawberry' | 'Mixed';
export type ProductCategory = 'Single Bottles' | 'Multi-Packs' | 'Boxes & Bundles' | 'Merch & Gear';

export interface ProductVariant {
  id: string;
  label: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
}

export interface ProductNutrition {
  calories: string;
  sugarAdded: string;
  fruitContent: string;
  vitaminC: string;
  volume: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  author: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  verified: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  flavour: Exclude<FlavourFilter, 'All'>;
  tagline: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  rating: number;
  reviewCount: number;
  tag?: string;
  visualType: 'sprite' | 'duo-sprite' | 'photo';
  flavourIds: FlavourId[];
  imageKey?: 'variety-pack' | 'tasting-crate' | 'craft-press' | 'cooler-tote';
  bgTint: string;
  variants: ProductVariant[];
  ingredients: string[];
  nutrition: ProductNutrition;
  featuredRank: number;
}

export interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface OrderItemReceipt {
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  flavourIds: FlavourId[];
  visualType: 'sprite' | 'duo-sprite' | 'photo';
  imageKey?: 'variety-pack' | 'tasting-crate' | 'craft-press' | 'cooler-tote';
  bgTint: string;
}

export interface OrderShipping {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  deliveryMethod: 'standard' | 'express';
}

export interface Order {
  orderNumber: string;
  userId: string | null;
  status: 'Confirmed' | 'Chilling & Packing' | 'Out for Delivery';
  createdAt: string;
  estimatedDelivery: string;
  paymentMethod: 'card' | 'cod';
  promoCode: string | null;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  shipping: OrderShipping;
  items: OrderItemReceipt[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}
