const jwt = require("jsonwebtoken");

exports.protectOption = (req, res, next) => {
  const token = req.cookies?.accessToken;

  if (!token) return next(); // guest

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };
  } catch (err) {
    console.error("JWT ERROR:", err.name, err.message);
    req.user = null;
  }

  next();
};
