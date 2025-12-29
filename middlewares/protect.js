// // const jwt = require("jsonwebtoken");
// // const { User } = require("../models/userModel");

// // const protect = async (req, res, next) => {
// //   let token;
// //   token = req.cookies.token;

// //   if (token) {
// //     try {
// //       const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

// //       req.user = await User.findById(decoded.id).select("-password");

// //       if (!req.user) {
// //         return res.status(404).json({ message: "المستخدم غير موجود" });
// //       }

// //       next();
// //     } catch (error) {
// //       res.status(401).json({ message: "Not authorized, token failed" });
// //     }
// //   } else {
// //     res.status(401).json({ message: "Not authorized, no token" });
// //   }
// // };

// // module.exports = { protect };

// // const jwt = require("jsonwebtoken");
// // const User = require("../models/user");

// // exports.protect = async (req, res, next) => {
// //   try {
// //     const token =
// //       req.cookies?.token || req.headers.authorization?.split(" ")[1] || null;

// //     if (!token) {
// //       return res.status(401).json({ message: "Not authorized, no token" });
// //     }

// //     const decoded = jwt.verify(token, process.env.JWT_SECRET);
// //     req.user = await User.findById(decoded.id).select("-password");
// //     next();
// //   } catch (error) {
// //     console.error("❌ Auth error:", error.message);
// //     res.status(401).json({ message: "Invalid or expired token" });
// //   }
// // };

const jwt = require("jsonwebtoken");
const User = require("../models/user");

// exports.protect = async (req, res, next) => {
//   try {
//     // 1️⃣ احصل على التوكن من الكوكيز أو الهيدر
//     const token =
//       req.cookies?.accessToken || // الأفضل تسميه accessToken واضح
//       (req.headers.authorization?.startsWith("Bearer ") &&
//         req.headers.authorization.split(" ")[1]) ||
//       null;

//     if (!token) {
//       return res.status(401).json({ message: "Not authorized, no token" });
//     }

//     // 2️⃣ تحقق من التوكن
//     const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

//     // 3️⃣ احصل على بيانات المستخدم من DB
//     const user = await User.findById(decoded.id).select("-password");
//     if (!user) {
//       return res.status(401).json({ message: "User not found" });
//     }

//     // 4️⃣ أضف user للـ request
//     req.user = user;

//     next();
//   } catch (error) {
//     console.error("❌ Auth error:", error.message);

//     // 5️⃣ تفريق بين Expired و Invalid token
//     if (error.name === "TokenExpiredError") {
//       return res.status(401).json({ message: "Token expired" });
//     }

//     res.status(401).json({ message: "Invalid token" });
//   }
// };

exports.protect = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      (req.headers.authorization?.startsWith("Bearer ") &&
        req.headers.authorization.split(" ")[1]);

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }

    return res.status(401).json({ message: "Invalid token" });
  }
};

