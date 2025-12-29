import { getCart } from "@/features/services/cart.api";
import { Cart } from "@/features/types/cart.types";
import { useQuery } from "@tanstack/react-query";

export const useCart = () => {
  return useQuery<Cart>({
    queryKey: ["cart"],
    queryFn: getCart,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on validation errors or rate limiting
      if (error?.status === 400 || error?.status === 429) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    placeholderData: {
      items: [],
      totalItems: 0,
      totalPrice: 0,
      currency: "EGP",
    },
  });
};
