exports.protect = (req, res, next) => {
  // ⚠️ Placeholder: هنضيف JWT authentication لاحقًا
  req.user = { _id: "6732c12...", role: "admin" }; // مؤقتًا
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied ❌" });
    }
    next();
  };
};
