import { removeItem } from "@/features/services/cart.api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RemoveItemPayload, Cart } from "@/features/types/cart.types";

export const useRemoveItem = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: RemoveItemPayload) => removeItem(payload),
    onMutate: async ({ variant, size }) => {
      // Cancel outgoing refetches
      await qc.cancelQueries({ queryKey: ["cart"] });

      // Snapshot previous value
      const previousCart = qc.getQueryData<Cart>(["cart"]);

      if (!previousCart) return { previousCart };

      // Optimistically remove the item
      const updatedItems = previousCart.items.filter(
        (item) => !(item.variant._id === variant && item.size === size)
      );

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

      console.error('فشل في حذف المنتج من السلة:', error.message);
    },
    onSuccess: () => {
      // Invalidate cart count
      qc.invalidateQueries({ queryKey: ["cart-count"] });

      console.log('تم حذف المنتج من السلة بنجاح');
    },
  });
};
