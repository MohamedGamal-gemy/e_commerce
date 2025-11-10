// const jwt = require("jsonwebtoken");
// const { User } = require("../models/userModel");

// const protect = async (req, res, next) => {
//   let token;
//   token = req.cookies.token;

//   if (token) {
//     try {
//       const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

//       req.user = await User.findById(decoded.id).select("-password");

//       if (!req.user) {
//         return res.status(404).json({ message: "المستخدم غير موجود" });
//       }

//       next();
//     } catch (error) {
//       res.status(401).json({ message: "Not authorized, token failed" });
//     }
//   } else {
//     res.status(401).json({ message: "Not authorized, no token" });
//   }
// };

// module.exports = { protect };

const jwt = require("jsonwebtoken");
const User = require("../models/user");

exports.protect = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token || req.headers.authorization?.split(" ")[1] || null;

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    next();
  } catch (error) {
    console.error("❌ Auth error:", error.message);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
