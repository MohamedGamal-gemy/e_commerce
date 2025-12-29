import { addToCart } from "@/features/services/cart.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AddToCartPayload, Cart } from "@/features/types/cart.types";

export const useAddToCart = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddToCartPayload) => addToCart(payload),
    onSuccess: (data, variables) => {
      // Invalidate cart queries to refetch latest data
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["cart-count"] });

      // Optional: Show success message
      console.log('تم إضافة المنتج للسلة بنجاح');
    },
    onError: (error: any, variables) => {
      // Error is already handled in the API function
      // You can add additional error handling here if needed
      console.error('فشل في إضافة المنتج للسلة:', error.message);

      // Optional: You could use a toast notification here
      // toast.error(error.message);
    },
  });
};
