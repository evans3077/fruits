export type FlavourId = 'berry' | 'kiwi' | 'banana' | 'strawberry';
export type UserRole = 'owner' | 'manager' | 'fulfilment_staff' | 'customer';
export type ProductStatus = 'draft' | 'published' | 'archived';

export interface ProductVariantDto {
  id: number;
  productId: number;
  sku: string;
  label: string;
  priceCents: number;
  compareAtCents: number | null;
  stockQty: number;
  reservedQty: number;
  availableQty: number;
  lowStockThreshold: number;
  isActive: boolean;
  sortOrder: number;
}

export interface ProductDto {
  id: number;
  slug: string;
  name: string;
  flavour: string;
  category: string;
  shortDescription: string;
  description: string;
  status: ProductStatus;
  heroSpecKey: FlavourId | null;
  imageUrl: string;
  imageAlt: string;
  bgTint: string;
  ingredientsText: string;
  allergensText: string;
  nutritionJson: Record<string, string>;
  storageInstructions: string;
  shelfLife: string;
  volumeLabel: string;
  seoTitle: string;
  seoDescription: string;
  sortOrder: number;
  variants: ProductVariantDto[];
}

export interface StoreSettingsDto {
  brandName: string;
  strapline: string;
  announcementText: string;
  announcementEnabled: boolean;
  currency: string;
  timezone: string;
  supportPhone: string;
  supportEmail: string;
  whatsappNumber: string;
  physicalAddress: string;
  operatingHours: string;
  taxLabel: string;
  taxRateBps: number;
  allowPayOnDelivery: boolean;
  allowPayOnPickup: boolean;
  maintenanceMode: boolean;
  heroConfigJson: {
    activeFlavours: string[];
    autoplayMs: number;
  };
}

export interface DeliveryZoneDto {
  id: number;
  county: string;
  town: string;
  areaLabel: string;
  feeCents: number;
  freeThresholdCents: number | null;
  minOrderCents: number;
  estimateText: string;
  operatingNote: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CollectionPointDto {
  id: number;
  name: string;
  county: string;
  town: string;
  addressLine: string;
  hoursText: string;
  instructions: string;
  feeCents: number;
  isActive: boolean;
}

export interface FaqDto {
  id: number;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isPublished: boolean;
  lastReviewedAt: string;
}

export interface ContentPageDto {
  id: number;
  slug: string;
  title: string;
  bodyMarkdown: string;
  reviewStatus: 'draft_needs_review' | 'approved';
  seoTitle: string;
  seoDescription: string;
  updatedAt: string;
}

export interface TestimonialDto {
  id: number;
  authorName: string;
  locationLabel: string;
  quote: string;
  productId: number | null;
  isApproved: boolean;
  createdAt: string;
}

export interface PaymentProviderInfo {
  provider: 'intasend' | 'sandbox_sim' | 'none';
  environment: 'live' | 'sandbox' | 'simulator' | 'unconfigured';
  mpesaAvailable: boolean;
  isLive: boolean;
  label: string;
}

export interface GuestCartItem {
  productId: number;
  variantId: number;
  quantity: number;
}

export interface QuotedCartLineDto {
  productId: number;
  variantId: number;
  slug: string;
  productName: string;
  variantLabel: string;
  sku: string;
  flavour: string;
  heroSpecKey: FlavourId | null;
  imageUrl: string;
  bgTint: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  availableQty: number;
}

export interface CartQuoteDto {
  lines: QuotedCartLineDto[];
  issues: string[];
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
  appliedPromoCode: string | null;
  promoMessage: string;
  fulfilmentValid: boolean;
  fulfilmentSummary: string;
}

export interface OrderSummaryDto {
  id: number;
  orderRef: string;
  customerName: string;
  customerPhone: string;
  payerPhone: string;
  customerEmail: string;
  fulfilmentType: 'delivery' | 'collection';
  deliveryZoneId?: number | null;
  collectionPointId?: number | null;
  county: string;
  town: string;
  estate: string;
  building: string;
  landmark: string;
  deliveryInstructions: string;
  paymentMethod: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
  promoCode: string | null;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  items: {
    id: number;
    productNameSnapshot: string;
    variantLabelSnapshot: string;
    skuSnapshot: string;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
  }[];
  events: {
    id: number;
    eventType: string;
    fromStatus: string;
    toStatus: string;
    note: string;
    createdAt: string;
  }[];
  transactions: {
    id: number;
    provider: string;
    environment: string;
    invoiceId: string;
    mpesaReceipt: string;
    amountCents: number;
    state: string;
    failureReason: string;
    createdAt: string;
  }[];
}

export interface AuthProfileDto {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
}
