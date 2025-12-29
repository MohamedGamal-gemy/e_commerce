# Cart API Documentation

## Overview
نظام سلة التسوق المطور مع دعم المستخدمين المسجلين والزوار، مع التركيز على الأمان والأداء.

## Features
- ✅ دعم السلة للزوار والمستخدمين المسجلين
- ✅ إدارة متقدمة للمخزون
- ✅ التحقق من صحة البيانات
- ✅ rate limiting للحماية من الإساءة
- ✅ logging شامل للتتبع
- ✅ error handling موحد
- ✅ validation و sanitization للمدخلات
- ✅ دعم الـ caching (قابل للتوسع)

## API Endpoints

### GET /api/cart
الحصول على محتويات السلة

**Response:**
```json
{
  "success": true,
  "cart": {
    "items": [...],
    "totalItems": 5,
    "totalPrice": 150.00,
    "currency": "EGP"
  }
}
```

### GET /api/cart/count
الحصول على عدد العناصر في السلة

**Response:**
```json
{
  "success": true,
  "count": 5
}
```

### POST /api/cart/items
إضافة منتج للسلة

**Request Body:**
```json
{
  "product": "507f1f77bcf86cd799439011",
  "variant": "507f1f77bcf86cd799439012",
  "size": "M",
  "quantity": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم إضافة المنتج للسلة بنجاح",
  "cart": {
    "totalItems": 7,
    "totalPrice": 250.00
  }
}
```

### PATCH /api/cart/items
تحديث كمية منتج في السلة

**Request Body:**
```json
{
  "variant": "507f1f77bcf86cd799439012",
  "size": "M",
  "quantity": 3
}
```

### DELETE /api/cart/items
حذف منتج من السلة

**Request Body:**
```json
{
  "variant": "507f1f77bcf86cd799439012",
  "size": "M"
}
```

### DELETE /api/cart
مسح السلة بالكامل

## Validation Rules

### Add to Cart
- `product`: مطلوب، ObjectId صحيح
- `variant`: مطلوب، ObjectId صحيح
- `size`: مطلوب، 1-10 أحرف، uppercase
- `quantity`: اختياري، 1-99، default: 1

### Update Quantity
- `variant`: مطلوب، ObjectId صحيح
- `size`: مطلوب، 1-10 أحرف، uppercase
- `quantity`: مطلوب، 1-99

### Remove Item
- `variant`: مطلوب، ObjectId صحيح
- `size`: مطلوب، 1-10 أحرف، uppercase

## Security Features

### Authentication & Authorization
- دعم المستخدمين المسجلين والزوار
- التحقق من ملكية السلة
- session validation

### Rate Limiting
- 30 عملية في الدقيقة لكل مستخدم
- تطبيق على عمليات الكتابة والقراءة

### Input Validation & Sanitization
- Joi validation schemas
- MongoDB ObjectId validation
- XSS protection
- SQL injection protection

### Error Handling
- رسائل خطأ موحدة باللغة العربية
- logging شامل للأخطاء
- عدم كشف تفاصيل النظام في production

## Error Codes

| Code | Message |
|------|---------|
| OUT_OF_STOCK | المنتج غير متوفر بالكمية المطلوبة |
| INVALID_QUANTITY | الكمية يجب أن تكون رقم موجب |
| CART_NOT_FOUND | السلة غير موجودة |
| ITEM_NOT_FOUND | العنصر غير موجود في السلة |
| INVALID_PAYLOAD | البيانات المرسلة غير صحيحة |
| NOT_FOUND | المنتج أو المتغير غير موجود |

## Performance Optimizations

### Database Queries
- استخدام select() لجلب الحقول المطلوبة فقط
- Promise.all للاستعلامات المتوازية
- indexing على user و sessionId

### Caching Strategy (Future Enhancement)
- Redis caching للسلة
- cache invalidation عند التعديل
- TTL: 5 دقائق

### Rate Limiting
- In-memory rate limiting
- قابل للترقية لـ Redis

## Business Logic

### Stock Management
- التحقق من المخزون قبل الإضافة/التحديث
- منع الطلبات الزائدة عن المخزون المتاح
- transaction safety للعمليات الحساسة

### Cart Merging
- دمج سلة الزائر مع سلة المستخدم عند تسجيل الدخول
- التعامل الذكي مع التعارضات
- الحفاظ على الكميات الصحيحة

## Architecture

```
controllers/cartController.js     # Controller layer
services/cart.service.js          # Business logic
middlewares/cartValidation.js     # Input validation
middlewares/cartAuth.js          # Security & auth
constants/cartConstants.js       # Configuration
routes/cart.js                   # Route definitions
```

## Future Enhancements

- [ ] Redis caching implementation
- [ ] Cart persistence strategies
- [ ] Advanced analytics
- [ ] Bulk operations
- [ ] Cart sharing features
- [ ] Wishlist integration
