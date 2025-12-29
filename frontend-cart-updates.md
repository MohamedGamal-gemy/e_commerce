# تحديثات نظام السلة - الفرونت اند

## نظرة عامة
تم تحديث نظام السلة في الباك اند ليكون أكثر أماناً وموثوقية. يتطلب ذلك تحديثات في الفرونت اند للتعامل مع التغييرات الجديدة.

## التغييرات الرئيسية

### 1. هيكل الاستجابات الجديد
جميع API endpoints الآن ترجع استجابات موحدة:

```typescript
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
  data?: T;
}
```

### 2. حقول جديدة في CartItem
```typescript
interface CartItem {
  // ... الحقول الموجودة
  isAvailable?: boolean;      // هل المنتج متوفر
  availableStock?: number;    // المخزون المتاح
  stockWarning?: string;      // تحذير المخزون
  statusMessage?: string;     // رسالة الحالة
}
```

### 3. معالجة الأخطاء المحسنة
- رسائل خطأ باللغة العربية
- تفاصيل validation errors
- معالجة rate limiting (429 errors)

## الملفات المحدثة

### 1. `cart.api.ts` - ✅ محدث
```typescript
// الآن يتعامل مع success/error responses
export const getCart = async (): Promise<Cart> => {
  const { data } = await api.get("/cart");

  if (!data.success) {
    throw new Error(data.message || 'فشل في تحميل السلة');
  }

  return data.cart || DEFAULT_CART;
};
```

### 2. `cart.types.ts` - ✅ محدث
- إضافة حقول جديدة للـ UX المحسن
- types للـ API responses
- error handling types

### 3. React Hooks - ✅ محدثة
- `useCart` - مع retry logic محسن
- `useAddToCart` - مع success/error handling
- `useUpdateQuantity` - مع optimistic updates محسن
- `useRemoveItem` - مع error recovery
- `useCartCount` - مع rate limiting handling

### 4. `CartItem.tsx` - ✅ محدث
```tsx
// الآن يستخدم الحقول الجديدة
const {
  isAvailable = true,
  availableStock = 0,
  stockWarning,
  quantity,
  product,
  variant,
  size,
  price,
} = item;
```

## كيفية الترقية

### الخطوة 1: استبدال الملفات
```bash
# استبدل الملفات القديمة بالمحدثة
cp cart.api.updated.ts src/features/services/cart.api.ts
cp cart.types.updated.ts src/features/types/cart.types.ts
cp useCart.updated.ts src/features/cart/useCart.ts
# ... وهكذا
```

### الخطوة 2: تحديث الـ Components
```tsx
// في CartItem.tsx، أضف التحقق من التوفر
{!isAvailable && availableStock <= 0 && (
  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
    <span className="text-red-400">نفد من المخزون</span>
  </div>
)}

// في quantity controls، احجز الزيادة إذا تجاوز المخزون
disabled={quantity >= availableStock || isPending}
```

### الخطوة 3: إضافة Error Handling
```tsx
// في الـ components، أضف معالجة الأخطاء
const { mutate, isError, error } = useAddToCart();

if (isError) {
  return <div className="text-red-500">{error.message}</div>;
}
```

## مميزات جديدة في الفرونت اند

### 1. تجربة مستخدم محسنة
- **تحذيرات المخزون**: إشعارات عندما تكون الكمية محدودة
- **حالة التوفر**: عرض واضح للمنتجات المتاحة/غير المتاحة
- **رسائل خطأ واضحة**: باللغة العربية

### 2. أداء محسن
- **Optimistic Updates**: تحديث فوري للواجهة
- **Error Recovery**: استرجاع الحالة السابقة عند فشل العملية
- **Smart Retry**: عدم إعادة المحاولة لأخطاء التحقق

### 3. أمان محسن
- **Rate Limiting Handling**: معالجة حدود العمليات
- **Input Validation**: تحقق من البيانات قبل الإرسال
- **Error Boundaries**: منع الأخطاء من تعطيل التطبيق

## أمثلة على الاستخدام

### عرض تحذير المخزون
```tsx
{stockWarning && (
  <div className="flex items-center gap-2 text-amber-500">
    <AlertTriangle size={16} />
    <span>{stockWarning}</span>
  </div>
)}
```

### تعطيل الأزرار حسب التوفر
```tsx
<Button
  disabled={!isAvailable || quantity >= availableStock}
  onClick={() => onUpdateQuantity({...})}
>
  +
</Button>
```

### معالجة أخطاء الـ API
```tsx
try {
  await addToCart(payload);
  toast.success('تم إضافة المنتج بنجاح');
} catch (error) {
  toast.error(error.message);
}
```

## التوافق
- ✅ متوافق مع الباك اند الجديد
- ✅ backward compatible مع البيانات القديمة
- ✅ لا يؤثر على الوظائف الموجودة

## ملاحظات مهمة
1. تأكد من تحديث جميع الـ imports
2. اختبر جميع العمليات (إضافة، تحديث، حذف)
3. تأكد من عرض رسائل الخطأ بشكل صحيح
4. اختبر معالجة rate limiting

## استكشاف الأخطاء

### مشكلة: لا تظهر التحذيرات
**الحل**: تأكد من أن الـ API يرجع `isAvailable`, `availableStock`, `stockWarning`

### مشكلة: الأخطاء لا تظهر بالعربية
**الحل**: تأكد من استخدام `cart.api.ts` المحدث

### مشكلة: optimistic updates لا يعمل
**الحل**: تأكد من استخدام `useUpdateQuantity` و `useRemoveItem` المحدثة
