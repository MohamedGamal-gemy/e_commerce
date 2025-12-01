const jwt = require("jsonwebtoken");
// const User = require("../models");

exports.protect = async (req, res, next) => {
  try {
    let token = null;

    // prefer cookie
    if (req.cookies?.accessToken) token = req.cookies.accessToken;
    // fallback to bearer
    else if (req.headers.authorization?.startsWith("Bearer "))
      token = req.headers.authorization.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Not authorized" });

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};

// optional protect: doesn't 401, but attaches user if possible
exports.protectOptional = async (req, res, next) => {
  try {
    let token =
      req.cookies?.accessToken ||
      (req.headers.authorization?.startsWith("Bearer ") &&
        req.headers.authorization.split(" ")[1]);
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
  } catch (err) {
    /* ignore */
  }
  return next();
};
