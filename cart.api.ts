import { api } from "@/lib/api";
import { Cart } from "../types/cart.types";

// Base API response structure
interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
  data?: T;
}

// Cart-specific responses
interface CartApiResponse extends ApiResponse {
  cart?: Cart;
}

interface CartCountApiResponse extends ApiResponse {
  count?: number;
}

interface CartMutationResponse extends ApiResponse {
  cart?: {
    totalItems: number;
    totalPrice: number;
  };
}

export const getCart = async (): Promise<Cart> => {
  try {
    const { data } = await api.get<CartApiResponse>("/cart");

    if (!data.success) {
      throw new Error(data.message || 'فشل في تحميل السلة');
    }

    return data.cart || {
      items: [],
      totalItems: 0,
      totalPrice: 0,
      currency: "EGP",
    };
  } catch (error: any) {
    // Handle rate limiting
    if (error.response?.status === 429) {
      throw new Error('تم تجاوز الحد المسموح للعمليات، يرجى المحاولة لاحقاً');
    }

    // Handle validation errors
    if (error.response?.status === 400 && error.response.data?.errors) {
      const firstError = error.response.data.errors[0];
      throw new Error(firstError.message);
    }

    // Handle other API errors
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw error;
  }
};

export const getCartCount = async (): Promise<number> => {
  try {
    const { data } = await api.get<CartCountApiResponse>("/cart/count");

    if (!data.success) {
      throw new Error(data.message || 'فشل في تحميل عدد المنتجات');
    }

    return data.count || 0;
  } catch (error: any) {
    if (error.response?.status === 429) {
      throw new Error('تم تجاوز الحد المسموح للعمليات');
    }
    throw error;
  }
};

export const addToCart = async (payload: {
  product: string;
  variant: string;
  size: string;
  quantity: number;
}): Promise<CartMutationResponse['cart']> => {
  try {
    const { data } = await api.post<CartMutationResponse>("/cart/items", payload);

    if (!data.success) {
      throw new Error(data.message || 'فشل في إضافة المنتج للسلة');
    }

    return data.cart;
  } catch (error: any) {
    // Handle rate limiting
    if (error.response?.status === 429) {
      throw new Error('تم تجاوز الحد المسموح للعمليات، يرجى المحاولة لاحقاً');
    }

    // Handle validation errors with detailed messages
    if (error.response?.status === 400 && error.response.data?.errors) {
      const errorMessages = error.response.data.errors.map((err: any) => err.message);
      throw new Error(errorMessages.join('. '));
    }

    // Handle other API errors
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw error;
  }
};

export const updateQuantity = async (payload: {
  variant: string;
  size: string;
  quantity: number;
}): Promise<CartMutationResponse['cart']> => {
  try {
    const { data } = await api.patch<CartMutationResponse>("/cart/items", payload);

    if (!data.success) {
      throw new Error(data.message || 'فشل في تحديث الكمية');
    }

    return data.cart;
  } catch (error: any) {
    if (error.response?.status === 429) {
      throw new Error('تم تجاوز الحد المسموح للعمليات، يرجى المحاولة لاحقاً');
    }

    if (error.response?.status === 400 && error.response.data?.errors) {
      const errorMessages = error.response.data.errors.map((err: any) => err.message);
      throw new Error(errorMessages.join('. '));
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw error;
  }
};

export const removeItem = async (payload: {
  variant: string;
  size: string;
}): Promise<CartMutationResponse['cart']> => {
  try {
    const { data } = await api.delete<CartMutationResponse>("/cart/items", {
      data: payload
    });

    if (!data.success) {
      throw new Error(data.message || 'فشل في حذف المنتج من السلة');
    }

    return data.cart;
  } catch (error: any) {
    if (error.response?.status === 429) {
      throw new Error('تم تجاوز الحد المسموح للعمليات');
    }

    if (error.response?.status === 400 && error.response.data?.errors) {
      const errorMessages = error.response.data.errors.map((err: any) => err.message);
      throw new Error(errorMessages.join('. '));
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw error;
  }
};

export const clearCart = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const { data } = await api.delete<ApiResponse>("/cart");

    if (!data.success) {
      throw new Error(data.message || 'فشل في مسح السلة');
    }

    return {
      success: true,
      message: data.message || 'تم مسح السلة بنجاح'
    };
  } catch (error: any) {
    if (error.response?.status === 429) {
      throw new Error('تم تجاوز الحد المسموح للعمليات');
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw error;
  }
};
