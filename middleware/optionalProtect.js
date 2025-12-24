exports.optionalProtect = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      // مفيش توكن؟ مفيش مشكلة، كمل كـ Guest
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (user) {
      req.user = user; // لو اليوزر موجود بنحطه في الـ Request
    }
    
    next();
  } catch (error) {
    // لو التوكن منتهي أو بايظ، برضه كمل كـ Guest
    // (اختياري: ممكن هنا تحاول تعمل Refresh للتوكن لو حابب)
    next();
  }
};