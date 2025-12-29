import { updateQuantity } from "@/features/services/cart.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateQuantityPayload, Cart } from "@/features/types/cart.types";

export const useUpdateQuantity = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateQuantityPayload) => updateQuantity(payload),
    onMutate: async ({ variant, size, quantity }) => {
      // Cancel any outgoing refetches
      await qc.cancelQueries({ queryKey: ["cart"] });

      // Snapshot the previous value
      const previousCart = qc.getQueryData<Cart>(["cart"]);

      if (!previousCart) return { previousCart };

      // Optimistically update the cart
      const updatedItems = previousCart.items.map((item) => {
        if (item.variant._id === variant && item.size === size) {
          return { ...item, quantity };
        }
        return item;
      });

      // Recalculate totals
      const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = updatedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);

      qc.setQueryData<Cart>(["cart"], {
        ...previousCart,
        items: updatedItems,
        totalItems,
        totalPrice,
      });

      return { previousCart };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousCart) {
        qc.setQueryData(["cart"], context.previousCart);
      }

      console.error('فشل في تحديث الكمية:', error.message);
    },
    onSuccess: (data) => {
      // Invalidate to ensure we have the latest server state
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["cart-count"] });

      console.log('تم تحديث الكمية بنجاح');
    },
  });
};
