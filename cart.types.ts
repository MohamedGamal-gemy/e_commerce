// Cart types with updated fields for enhanced UX
export interface CartItem {
  product: {
    _id: string;
    title: string;
    slug: string;
    price: number;
    thumbnail?: string;
    isPublished?: boolean;
  };
  variant: {
    _id: string;
    color: {
      _id: string;
      name: string;
    };
    images: Array<{
      _id: string;
      url: string;
      alt?: string;
    }>;
    sizes?: Array<{
      size: string;
      stock: number;
    }>;
  };
  size: string;
  color: string;
  quantity: number;
  price: number;
  // New fields for enhanced stock management and UX
  isAvailable?: boolean;
  availableStock?: number;
  stockWarning?: string;
  statusMessage?: string;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  currency: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  data?: T;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Hook payload types
export interface AddToCartPayload {
  product: string;
  variant: string;
  size: string;
  quantity: number;
}

export interface UpdateQuantityPayload {
  variant: string;
  size: string;
  quantity: number;
}

export interface RemoveItemPayload {
  variant: string;
  size: string;
}

// Mutation response types
export interface CartMutationResponse {
  cart: {
    totalItems: number;
    totalPrice: number;
  };
}

export interface CartCountResponse {
  success: boolean;
  count: number;
}

// Error types
export class CartApiError extends Error {
  public status?: number;
  public errors?: ValidationError[];

  constructor(message: string, status?: number, errors?: ValidationError[]) {
    super(message);
    this.name = 'CartApiError';
    this.status = status;
    this.errors = errors;
  }
}
