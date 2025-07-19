const jwt = require("jsonwebtoken");
const { User } = require("../models/userModel");

const protect = async (req, res, next) => {
  let token;
  token = req.cookies.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }

      next();
    } catch (error) {
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

module.exports = { protect };
