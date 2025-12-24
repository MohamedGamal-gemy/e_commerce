const Cart = require("../models/Cart");
const GuestCart = require("../models/GuestCart");
const User = require("../models/user");
const crypto = require("crypto");

function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

// async function registerUser({ username, email, password }) {
//   const exists = await User.findOne({ email });
//   if (exists) throw { status: 400, message: "Email already registered" };

//   const user = new User({ username, email, password });
//   await user.save();

//   const accessToken = user.generateAccessToken();
//   const refreshRaw = user.createRefreshToken();
//   user.refreshTokenHash = crypto
//     .createHash("sha256")
//     .update(refreshRaw)
//     .digest("hex");
//   await user.save();

//   return {
//     user: publicUser(user),
//     accessToken,
//     refreshToken: refreshRaw,
//   };
// }

// async function loginUser({ email, password }) {
//   const user = await User.findOne({ email }).select(
//     "+password +refreshTokenHash"
//   );
//   if (!user) throw { status: 400, message: "Invalid credentials" };

//   const ok = await user.comparePassword(password);
//   if (!ok) throw { status: 400, message: "Invalid credentials" };

//   const accessToken = user.generateAccessToken();
//   const rawRefresh = user.createRefreshToken();

//   user.refreshTokenHash = crypto
//     .createHash("sha256")
//     .update(rawRefresh)
//     .digest("hex");
//   user.lastLogin = new Date();
//   await user.save();

//   return {
//     user: publicUser(user),
//     accessToken,
//     refreshToken: rawRefresh,
//   };
// }

// هنضيف sessionId كـ Parameter تانى للفانكشن

async function registerUser({ username, email, password }) {
  const exists = await User.findOne({ email });
  if (exists) throw { status: 400, message: "Email already registered" };

  const user = new User({ username, email, password });
  await user.save();

  const accessToken = user.generateAccessToken();
  const refreshRaw = user.createRefreshToken();
  user.refreshTokenHash = crypto
    .createHash("sha256")
    .update(refreshRaw)
    .digest("hex");
  await user.save();

  return {
    user: publicUser(user),
    accessToken,
    refreshToken: refreshRaw,
  };
}

// async function loginUser({ email, password }, sessionId) {
//   const user = await User.findOne({ email }).select(
//     "+password +refreshTokenHash"
//   );

//   if (!user) throw { status: 400, message: "Invalid credentials" };

//   const ok = await user.comparePassword(password);
//   if (!ok) throw { status: 400, message: "Invalid credentials" };

//   // --- بداية منطق دمج الكارت (Cart Merge Logic) ---
//   if (sessionId) {
//     // بنجلب كارت الجيست وكارت اليوزر في نفس الوقت لتوفير الوقت
//     const [guestCart, userCart] = await Promise.all([
//       GuestCart.findOne({ sessionId, isActive: true }),
//       Cart.findOne({ user: user._id, isActive: true }),
//     ]);

//     if (guestCart && guestCart.items.length > 0) {
//       if (!userCart) {
//         // حالة 1: اليوزر معندوش كارت -> بننقل منتجات الجيست لكارت جديد لليوزر
//         await Cart.create({
//           user: user._id,
//           items: guestCart.items,
//         });
//       } else {
//         // حالة 2: اليوزر عنده كارت -> بنعمل دمج للمنتجات بدون تكرار
//         guestCart.items.forEach((gItem) => {
//           const existingItem = userCart.items.find(
//             (uItem) =>
//               uItem.variant.toString() === gItem.variant.toString() &&
//               uItem.size === gItem.size
//           );

//           if (existingItem) {
//             existingItem.quantity += gItem.quantity;
//           } else {
//             userCart.items.push(gItem);
//           }
//         });
//         // الحسابات (Total Price/Items) هتتحدث تلقائياً بفضل الـ Pre-save Hook
//         await userCart.save();
//       }
//       // مسح كارت الجيست بعد نجاح الدمج
//       await GuestCart.deleteOne({ _id: guestCart._id });
//     }
//   }
//   // --- نهاية منطق دمج الكارت ---

//   // توليد التوكنات وتحديث بيانات الدخول
//   const accessToken = user.generateAccessToken();
//   const rawRefresh = user.createRefreshToken();

//   user.refreshTokenHash = crypto
//     .createHash("sha256")
//     .update(rawRefresh)
//     .digest("hex");

//   user.lastLogin = new Date();
//   await user.save();

//   return {
//     user: publicUser(user),
//     accessToken,
//     refreshToken: rawRefresh,
//   };
// }
async function loginUser({ email, password }, sessionId) {
  const user = await User.findOne({ email }).select(
    "+password +refreshTokenHash"
  );

  if (!user) throw { status: 400, message: "Invalid credentials" };

  const ok = await user.comparePassword(password);
  if (!ok) throw { status: 400, message: "Invalid credentials" };

  // --- بداية منطق دمج الكارت (Cart Merge Logic المحسن) ---
  let session; // للـ transaction لو هتستخدم
  if (sessionId) {
    // جلب الكارتين معًا
    const [guestCart] = await Promise.all([
      GuestCart.findOne({ sessionId, isActive: true }).lean(), // lean عشان أسرع هنا
      // مش محتاجين userCart دلوقتي، هنستخدم الـ static method
    ]);

    if (guestCart && guestCart.items.length > 0) {
      // optional: ابدأ transaction لو عايز atomicity
      // session = await mongoose.startSession();
      // session.startTransaction();

      try {
        // كل item من guest بنضيفه لكارت اليوزر باستخدام الـ static method الموحد
        for (const gItem of guestCart.items) {
          // نحول الـ item لـ plain object عشان نضمن compatibility
          const itemPayload = {
            product: gItem.product,
            variant: gItem.variant,
            size: gItem.size,
            color: gItem.color,
            quantity: gItem.quantity,
            price: gItem.price,
          };

          // ده هيعمل create لو مفيش كارت، أو update لو فيه
          await Cart.addItemToCart(
            { user: user._id },
            itemPayload
            // { session } // لو بتستخدم transaction
          );
        }

        // مسح كارت الجيست بعد الدمج الناجح
        await GuestCart.deleteOne({ _id: guestCart._id });

        // await session.commitTransaction();
      } catch (mergeError) {
        // await session.abortTransaction();
        console.error("Cart merge failed:", mergeError);
        // مش هنفشل الـ login كله بسبب الـ cart، بس ممكن log
      } finally {
        // session?.endSession();
      }
    }
  }
  // --- نهاية منطق الدمج ---

  // توليد التوكنات
  const accessToken = user.generateAccessToken();
  const rawRefresh = user.createRefreshToken();

  user.refreshTokenHash = crypto
    .createHash("sha256")
    .update(rawRefresh)
    .digest("hex");

  user.lastLogin = new Date();
  await user.save();

  return {
    user: publicUser(user),
    accessToken,
    refreshToken: rawRefresh,
  };
}
async function refreshTokens(refreshToken) {
  if (!refreshToken) throw { status: 401, message: "No refresh token" };

  const hashed = crypto.createHash("sha256").update(refreshToken).digest("hex");

  const user = await User.findOne({ refreshTokenHash: hashed });
  if (!user) throw { status: 401, message: "Invalid refresh token" };

  // Token rotation
  const newAccess = user.generateAccessToken();
  const newRefresh = user.createRefreshToken();

  user.refreshTokenHash = crypto
    .createHash("sha256")
    .update(newRefresh)
    .digest("hex");
  await user.save();

  return {
    accessToken: newAccess,
    refreshToken: newRefresh,
    user: publicUser(user),
  };
}

async function logoutUser(userId) {
  await User.findByIdAndUpdate(userId, {
    $unset: { refreshTokenHash: "" },
  });
}

module.exports = {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
};
