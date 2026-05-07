export type UserRole = "USER" | "SELLER" | "MASTER";

export interface Product {
  id: string;
  productName: string;
  description: string;
  price: number;
  category: string;
  companyName: string;
  isActive: boolean;
  options: ProductOption[];
}

export interface ProductOption {
  id: string;
  size: string;
  color: string;
}

export interface TimeDeal {
  id: string;
  title: string;
  description: string;
  discountPrice: number;
  originalPrice: number;
  status: "SCHEDULED" | "ACTIVE" | "SOLD_OUT" | "ENDED";
  startAt: string;
  endAt: string;
  limitQuantity: number;
  products: TimeDealProduct[];
}

export interface TimeDealProduct {
  productId: string;
  productOptionId: string;
  status: "IN_STOCK" | "OUT_OF_STOCK";
}

export interface Order {
  orderId: string;
  userId: number;
  status: "PENDING" | "PENDING_PAYMENT" | "PAID" | "PURCHASE_CONFIRMED" | "CANCELLED" | "REFUNDED";
  totalAmount: number;
  pointUsed: number;
  finalAmount: number;
  orderedAt: string;
  items: OrderItem[];
}

export interface OrderItem {
  orderItemId: string;
  timeDealStockId: string;
  quantity: number;
  discountPrice: number;
  subtotal: number;
  productSnapshot: {
    productName: string;
    productDescription: string;
    originalPrice: number;
  };
}
