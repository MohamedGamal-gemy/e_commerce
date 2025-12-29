import { getCartCount } from "@/features/services/cart.api";
import { useQuery } from "@tanstack/react-query";

export const useCartCount = () => {
  return useQuery({
    queryKey: ["cart-count"],
    queryFn: getCartCount,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on rate limiting
      if (error?.status === 429) {
        return false;
      }
      return failureCount < 1;
    },
  });
};
