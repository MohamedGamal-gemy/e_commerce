"use client";

import { memo } from "react";
import Image from "next/image";
import {
  Trash2,
  Plus,
  Minus,
  Loader2,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CartItem } from "@/features/types/cart.types";

interface CartItemProps {
  item: CartItem;
  isPending: boolean;
  onUpdateQuantity: (payload: { variant: string; size: string; quantity: number }) => void;
  onRemoveItem: (payload: { variant: string; size: string }) => void;
}

const CartItemComponent = ({
  item,
  isPending,
  onUpdateQuantity,
  onRemoveItem,
}: CartItemProps) => {
  const {
    isAvailable = true, // Default to true for backward compatibility
    availableStock = 0,
    stockWarning,
    quantity,
    product,
    variant,
    size,
    price,
  } = item;

  const imageUrl = variant?.images?.[0]?.url ?? "/placeholder.png";

  // Determine if item is out of stock
  const isOutOfStock = !isAvailable && availableStock <= 0;

  return (
    <div
      className={cn(
        "group relative border rounded-2xl p-4 transition-all duration-300",
        "bg-slate-900/40 border-white/5 hover:border-white/10",
        isOutOfStock && "bg-red-950/10 border-red-500/20"
      )}
    >
      <div className="flex flex-col sm:flex-row gap-5">
        {/* Product Image Section */}
        <div className="relative w-full sm:w-28 h-36 rounded-xl overflow-hidden bg-slate-800 shadow-2xl">
          <Image
            fill
            src={imageUrl}
            alt={product.title}
            className={cn(
              "object-cover object-top transition-transform duration-500 group-hover:scale-110",
              isOutOfStock && "grayscale"
            )}
          />

          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-2 text-center">
              <span className="text-[10px] font-black text-red-400 uppercase leading-tight">
                نفد من المخزون
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-between py-1">
          <div>
            <div className="flex justify-between items-start">
              <h3 className="text-slate-100 font-semibold text-lg line-clamp-1">
                {product.title}
              </h3>
              <p className="text-sky-400 font-black text-lg">
                LE {price.toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-bold px-2 py-1 bg-slate-800 rounded text-slate-300 uppercase">
                Size: {size}
              </span>

              {!isOutOfStock && (
                <span className="text-[10px] text-emerald-500 flex items-center gap-1 font-bold">
                  <ShieldCheck size={12} /> متوفر
                </span>
              )}
            </div>

            {/* Stock Warning */}
            {stockWarning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1.5 mt-3 text-amber-500 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10"
              >
                <AlertTriangle size={14} className="shrink-0" />
                <span className="text-[11px] font-bold tracking-tight leading-none">
                  {stockWarning}
                </span>
              </motion.div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 sm:mt-0">
            {/* Quantity Controller */}
            <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-slate-400 hover:text-white"
                disabled={quantity <= 1 || isPending || isOutOfStock}
                onClick={() =>
                  onUpdateQuantity({
                    variant: variant._id,
                    size,
                    quantity: quantity - 1,
                  })
                }
              >
                <Minus size={14} />
              </Button>

              <div className="w-10 text-center text-sm font-bold text-slate-100">
                {isPending ? (
                  <Loader2
                    size={14}
                    className="animate-spin mx-auto text-sky-500"
                  />
                ) : (
                  quantity
                )}
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-sky-500 hover:text-sky-400"
                disabled={
                  quantity >= availableStock ||
                  isPending ||
                  isOutOfStock ||
                  (!isAvailable && quantity >= availableStock)
                }
                onClick={() =>
                  onUpdateQuantity({
                    variant: variant._id,
                    size,
                    quantity: quantity + 1,
                  })
                }
              >
                <Plus size={14} />
              </Button>
            </div>

            <button
              onClick={() => onRemoveItem({ variant: variant._id, size })}
              disabled={isPending}
              className="group/del flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-widest p-2 disabled:opacity-50"
            >
              <Trash2
                size={16}
                className="group-hover/del:scale-110 transition-transform"
              />
              <span className="hidden sm:inline">حذف</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(CartItemComponent);
