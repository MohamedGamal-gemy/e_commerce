const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const GuestCart = require("../models/GuestCart");
const { recalcCart } = require("../utils/cart.utils");
const ProductVariant = require("../models/productVariant");

class CartService {
  static _getModel(userId) {
    return userId ? Cart : GuestCart;
  }

  static _getOwnerQuery({ userId, sessionId }) {
    return userId ? { user: userId } : { sessionId };
  }

  // static async addItem({ userId, sessionId, item }) {
  //   const session = await mongoose.startSession();
  //   session.startTransaction();

  //   try {
  //     const Model = this._getModel(userId);
  //     const ownerQuery = this._getOwnerQuery({ userId, sessionId });

  //     // 1️⃣ atomic stock update
  //     const variant = await ProductVariant.findOneAndUpdate(
  //       {
  //         _id: item.variant,
  //         "sizes.size": item.size,
  //         "sizes.stock": { $gte: item.quantity },
  //       },
  //       { $inc: { "sizes.$.stock": -item.quantity } },
  //       { new: true, session }
  //     );

  //     if (!variant) {
  //       throw new Error("OUT_OF_STOCK");
  //     }

  //     // 2️⃣ get cart
  //     let cart = await Model.findOne({ ...ownerQuery, isActive: true }, null, {
  //       session,
  //     });

  //     if (!cart) {
  //       cart = new Model({
  //         ...ownerQuery,
  //         items: [item],
  //       });
  //     } else {
  //       const index = cart.items.findIndex(
  //         (i) => i.variant.equals(item.variant) && i.size === item.size
  //       );

  //       if (index > -1) {
  //         cart.items[index].quantity += item.quantity;
  //       } else {
  //         cart.items.push(item);
  //       }
  //     }

  //     recalcCart(cart);
  //     await cart.save({ session });

  //     await session.commitTransaction();
  //     session.endSession();

  //     return cart;
  //   } catch (err) {
  //     await session.abortTransaction();
  //     session.endSession();
  //     throw err;
  //   }
  // }

  //

  static async addItem({ userId, sessionId, item }) {
    // لسنا بحاجة لـ Transaction هنا لأننا لا نعدل في جداول متعددة، مجرد Read و Update للسلة
    try {
      const Model = this._getModel(userId);
      const ownerQuery = this._getOwnerQuery({ userId, sessionId });

      // 1️⃣ التحقق من المخزون (فقط قراءة)
      const product = await ProductVariant.findOne({
        _id: item.variant,
        "sizes.size": item.size,
      });

      const sizeData = product?.sizes.find((s) => s.size === item.size);

      if (!sizeData || sizeData.stock < item.quantity) {
        throw new Error("OUT_OF_STOCK");
      }

      // 2️⃣ التعامل مع السلة (إضافة أو تحديث)
      let cart = await Model.findOne({ ...ownerQuery, isActive: true });

      if (!cart) {
        cart = new Model({ ...ownerQuery, items: [item] });
      } else {
        const index = cart.items.findIndex(
          (i) => i.variant.equals(item.variant) && i.size === item.size
        );

        if (index > -1) {
          // التأكد من أن المجموع الجديد لا يتخطى المخزون
          if (sizeData.stock < cart.items[index].quantity + item.quantity) {
            throw new Error("EXCEEDS_AVAILABLE_STOCK");
          }
          cart.items[index].quantity += item.quantity;
        } else {
          cart.items.push(item);
        }
      }

      recalcCart(cart);
      await cart.save();
      return cart;
    } catch (err) {
      throw err;
    }
  }
  // static async updateQuantity({ userId, sessionId, variant, size, quantity }) {
  //   const session = await mongoose.startSession();
  //   session.startTransaction();

  //   try {
  //     if (quantity < 1) throw new Error("INVALID_QUANTITY");

  //     const Model = this._getModel(userId);
  //     const ownerQuery = this._getOwnerQuery({ userId, sessionId });

  //     const cart = await Model.findOne(
  //       { ...ownerQuery, isActive: true },
  //       null,
  //       { session }
  //     );

  //     if (!cart) throw new Error("CART_NOT_FOUND");

  //     const item = cart.items.find(
  //       (i) => i.variant.equals(variant) && i.size === size
  //     );

  //     if (!item) throw new Error("ITEM_NOT_FOUND");

  //     const diff = quantity - item.quantity;

  //     // لو الكمية زادت → اسحب من المخزون
  //     if (diff > 0) {
  //       const updated = await ProductVariant.updateOne(
  //         {
  //           _id: variant,
  //           "sizes.size": size,
  //           "sizes.stock": { $gte: diff },
  //         },
  //         { $inc: { "sizes.$.stock": -diff } },
  //         { session }
  //       );

  //       if (updated.modifiedCount === 0) {
  //         throw new Error("OUT_OF_STOCK");
  //       }
  //     }

  //     // لو الكمية قلت → رجّع للمخزون
  //     if (diff < 0) {
  //       await ProductVariant.updateOne(
  //         { _id: variant, "sizes.size": size },
  //         { $inc: { "sizes.$.stock": Math.abs(diff) } },
  //         { session }
  //       );
  //     }

  //     item.quantity = quantity;

  //     recalcCart(cart);
  //     await cart.save({ session });

  //     await session.commitTransaction();
  //     session.endSession();

  //     return cart;
  //   } catch (err) {
  //     await session.abortTransaction();
  //     session.endSession();
  //     throw err;
  //   }
  // }

  static async updateQuantity({ userId, sessionId, variant, size, quantity }) {
    try {
      if (quantity < 1) throw new Error("INVALID_QUANTITY");

      const Model = this._getModel(userId);
      const ownerQuery = this._getOwnerQuery({ userId, sessionId });

      // 1️⃣ التحقق من المخزون الحالي قبل التحديث
      const product = await ProductVariant.findOne({
        _id: variant,
        "sizes.size": size,
      });

      const sizeData = product?.sizes.find((s) => s.size === size);
      if (!sizeData || sizeData.stock < quantity) {
        throw new Error("OUT_OF_STOCK");
      }

      // 2️⃣ تحديث السلة
      const cart = await Model.findOne({ ...ownerQuery, isActive: true });
      if (!cart) throw new Error("CART_NOT_FOUND");

      const item = cart.items.find(
        (i) => i.variant.equals(variant) && i.size === size
      );
      if (!item) throw new Error("ITEM_NOT_FOUND");

      item.quantity = quantity;

      recalcCart(cart);
      await cart.save();
      return cart;
    } catch (err) {
      throw err;
    }
  }
  // static async removeItem({ userId, sessionId, variant, size }) {
  //   const session = await mongoose.startSession();
  //   session.startTransaction();

  //   try {
  //     const Model = this._getModel(userId);
  //     const ownerQuery = this._getOwnerQuery({ userId, sessionId });

  //     const cart = await Model.findOne(
  //       { ...ownerQuery, isActive: true },
  //       null,
  //       { session }
  //     );

  //     if (!cart) throw new Error("CART_NOT_FOUND");

  //     const item = cart.items.find(
  //       (i) => i.variant.equals(variant) && i.size === size
  //     );

  //     if (!item) throw new Error("ITEM_NOT_FOUND");

  //     await ProductVariant.updateOne(
  //       { _id: variant, "sizes.size": size },
  //       { $inc: { "sizes.$.stock": item.quantity } },
  //       { session }
  //     );

  //     cart.items = cart.items.filter(
  //       (i) => !(i.variant.equals(variant) && i.size === size)
  //     );

  //     if (cart.items.length === 0) {
  //       cart.isActive = false;
  //     }

  //     recalcCart(cart);
  //     await cart.save({ session });

  //     await session.commitTransaction();
  //     session.endSession();

  //     return cart;
  //   } catch (err) {
  //     await session.abortTransaction();
  //     session.endSession();
  //     throw err;
  //   }
  // }

  static async removeItem({ userId, sessionId, variant, size }) {
    // لم نعد بحاجة لـ Transaction لأننا لا نعدل في جدولين (المنتجات والسلة)
    // نعدل فقط في جدول السلة
    try {
      const Model = this._getModel(userId);
      const ownerQuery = this._getOwnerQuery({ userId, sessionId });

      const cart = await Model.findOne({ ...ownerQuery, isActive: true });

      if (!cart) throw new Error("CART_NOT_FOUND");

      // 1️⃣ البحث عن العنصر للتأكد من وجوده قبل الحذف (اختياري للـ Validation)
      const itemExists = cart.items.some(
        (i) => i.variant.equals(variant) && i.size === size
      );

      if (!itemExists) throw new Error("ITEM_NOT_FOUND");

      // 2️⃣ حذف العنصر من قائمة السلة فقط
      cart.items = cart.items.filter(
        (i) => !(i.variant.equals(variant) && i.size === size)
      );

      // 3️⃣ تحديث حالة السلة لو أصبحت فارغة
      if (cart.items.length === 0) {
        cart.isActive = false;
        // ملحوظة: في بعض المواقع نفضل بقاء السلة active لكن بـ items فارغة
        // حسب الـ Logic الخاص بموقعك
      }

      recalcCart(cart);
      await cart.save();

      return cart;
    } catch (err) {
      throw err;
    }
  }
  // static async clearCart({ userId, sessionId }) {
  //   const session = await mongoose.startSession();
  //   session.startTransaction();

  //   try {
  //     const Model = this._getModel(userId);
  //     const ownerQuery = this._getOwnerQuery({ userId, sessionId });

  //     const cart = await Model.findOne(
  //       { ...ownerQuery, isActive: true },
  //       null,
  //       { session }
  //     );

  //     if (!cart) return null;

  //     // رجع كل المخزون
  //     for (const item of cart.items) {
  //       await ProductVariant.updateOne(
  //         { _id: item.variant, "sizes.size": item.size },
  //         { $inc: { "sizes.$.stock": item.quantity } },
  //         { session }
  //       );
  //     }

  //     cart.items = [];
  //     cart.totalItems = 0;
  //     cart.totalPrice = 0;
  //     cart.isActive = false;

  //     await cart.save({ session });

  //     await session.commitTransaction();
  //     session.endSession();

  //     return cart;
  //   } catch (err) {
  //     await session.abortTransaction();
  //     session.endSession();
  //     throw err;
  //   }
  // }

  static async clearCart({ userId, sessionId }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const Model = this._getModel(userId);
      const ownerQuery = this._getOwnerQuery({ userId, sessionId });

      const cart = await Model.findOne(
        { ...ownerQuery, isActive: true },
        null,
        { session }
      );

      if (!cart) return null;

      // رجع كل المخزون
      for (const item of cart.items) {
        await ProductVariant.updateOne(
          { _id: item.variant, "sizes.size": item.size },
          { $inc: { "sizes.$.stock": item.quantity } },
          { session }
        );
      }

      cart.items = [];
      cart.totalItems = 0;
      cart.totalPrice = 0;
      cart.isActive = false;

      await cart.save({ session });

      await session.commitTransaction();
      session.endSession();

      return cart;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  // static async getCart({ userId, sessionId }) {
  //   const Model = this._getModel(userId);
  //   const ownerQuery = this._getOwnerQuery({ userId, sessionId });

  //   const cart = await Model.findOne({ ...ownerQuery, isActive: true })
  //     .populate([
  //       { path: "items.product", select: "title slug price thumbnail" },
  //       { path: "items.variant", select: "color images" },
  //     ])
  //     .lean();

  //   if (cart?.items?.length) {
  //     for (const item of cart.items) {
  //       if (item.variant?.images?.length) {
  //         // خليه صورة واحدة فقط
  //         item.variant.images = [item.variant.images[0]];
  //       }
  //     }
  //   }

  //   return cart;
  // }

  static async getCart({ userId, sessionId }) {
    const Model = this._getModel(userId);
    const ownerQuery = this._getOwnerQuery({ userId, sessionId });

    const cart = await Model.findOne({ ...ownerQuery, isActive: true })
      .populate([
        {
          path: "items.product",
          select: "title slug price thumbnail isPublished",
        },
        { path: "items.variant", select: "color images sizes" }, // جلبنا الـ sizes هنا للتحقق
      ])
      .lean();

    if (cart?.items?.length) {
      let isChanged = false;

      for (const item of cart.items) {
        // 1️⃣ تحسين الصور (كما في كودك)
        if (item.variant?.images?.length) {
          item.variant.images = [item.variant.images[0]];
        }

        // 2️⃣ منطق الـ UX: التحقق من توفر المخزون حالياً
        const sizeData = item.variant?.sizes?.find((s) => s.size === item.size);
        const currentStock = sizeData ? sizeData.stock : 0;

        // إضافة معلومات حالة المخزون للـ Frontend
        item.isAvailable = currentStock > 0 && item.product?.isPublished;
        item.availableStock = currentStock;

        // لو العميل كان طالب 5 والآن المتاح 2 فقط
        if (item.quantity > currentStock) {
          item.stockWarning = `Only ${currentStock} pieces available right now`;

          // ملاحظة: لا تعدل السلة في الداتابيز هنا تلقائياً،
          // اترك العميل يقرر (مثلاً يقلل الكمية أو يحذف المنتج)
        }

        if (!item.isAvailable) {
          item.statusMessage = "نفد من المخزون";
        }
      }
    }

    return cart;
  }
  //
  static async getCartCount({ userId, sessionId }) {
    const Model = this._getModel(userId);
    const ownerQuery = this._getOwnerQuery({ userId, sessionId });

    const cart = await Model.findOne(
      { ...ownerQuery, isActive: true },
      { items: 1 }
    ).lean();

    if (!cart?.items?.length) return 0;

    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  //
  static async mergeGuestCartToUser(userId, sessionId) {
    if (!sessionId) return;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const guestCart = await GuestCart.findOne({
        sessionId,
        isActive: true,
      }).session(session);

      if (!guestCart || !guestCart.items.length) {
        await session.commitTransaction();
        session.endSession();
        return;
      }

      let userCart = await Cart.findOne({
        user: userId,
        isActive: true,
      }).session(session);

      if (!userCart) {
        // لو المستخدم ملوش سلة، انقل سلة الضيف بالكامل له
        userCart = new Cart({
          user: userId,
          items: guestCart.items,
          isActive: true,
        });
      } else {
        // دمج العناصر بذكاء
        for (const guestItem of guestCart.items) {
          const index = userCart.items.findIndex(
            (i) =>
              i.variant.equals(guestItem.variant) && i.size === guestItem.size
          );

          if (index > -1) {
            // دمج الكميات
            userCart.items[index].quantity += guestItem.quantity;
          } else {
            userCart.items.push(guestItem);
          }
        }
      }

      // 💡 Business Logic: التأكد من أن الكميات المدمجة لا تتخطى المتاح حالياً
      // بنعمل ده عشان الـ UX يكون سليم لما يفتح سلة التسوق بعد الـ Login
      for (const item of userCart.items) {
        const variant = await ProductVariant.findById(item.variant).lean();
        const sizeData = variant?.sizes.find((s) => s.size === item.size);
        const stock = sizeData ? sizeData.stock : 0;

        // لو الكمية بعد الدمج أكبر من المخزون، قللها للمتاح (أو اتركها والـ getCart هتعالج التنبيه)
        // المواقع الاحترافية بتسيبها وتخلي الـ getCart تنبه العميل (Soft Validation)
      }

      recalcCart(userCart);
      await userCart.save({ session });

      // إبطال سلة الضيف
      guestCart.isActive = false;
      await guestCart.save({ session });

      await session.commitTransaction();
      session.endSession();
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }
}
module.exports = CartService;
