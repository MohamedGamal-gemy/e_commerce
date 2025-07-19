// const jwt = require("jsonwebtoken");
// function verifyToken(req, res, next) {
//   const token = req.headers.token;
//   if (token) {
//     try {
//       const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
//       req.user = decoded;
//       next();
//     } catch (error) {
//       res.status(401).json({ message: "invalid token" });
//     }
//   } else {
//     res.status(401).json({ message: "no token provided" });
//   }
// }
// // verify Token and Authorize the user

// function verifyTokenAndAuthorization(req, res, next) {
//   verifyToken(req, res, () => {
//     if (req.params.id === req.user.id || req.user.isAdmin) {
//       next();
//     } else {
//       return res.status(403).json({ message: "you ara not allowed" });
//     }
//   });
// }
// // Verify Token & Admin
// function verifyTokenAndAdmin(req, res, next) {
//   verifyToken(req, res, () => {
//     if (req.user.isAdmin) {
//       next();
//     } else {
//       return res.status(403).json({ message: "you ara not allowed" });
//     }
//   });
// }
// module.exports = {
//   verifyToken,
//   verifyTokenAndAuthorization,
//   verifyTokenAndAdmin,
// };

const jwt = require("jsonwebtoken");
const { User } = require("../models/userModel");

// Verify Token
function verifyToken(req, res, next) {
  const token = req.cookies.token; // Extract token from cookies
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ message: "Invalid token" });
    }
  } else {
    res.status(401).json({ message: "No token provided" });
  }
}

// Verify Token and Authorization
function verifyTokenAndAuthorization(req, res, next) {
  verifyToken(req, res, async () => {
    try {
      // Fetch user from database
      const user = await User.findById(req.user.id).select("-password");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (req.params.id === req.user.id || user.isAdmin) {
        req.user = user; // Update user data
        next();
      } else {
        return res.status(403).json({ message: "You are not allowed" });
      }
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
}

// Verify Token and Admin
function verifyTokenAndAdmin(req, res, next) {
  verifyToken(req, res, async () => {
    try {
      // Fetch user from database
      const user = await User.findById(req.user.id).select("-password");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.isAdmin) {
        req.user = user; // Update user data
        next();
      } else {
        return res
          .status(403)
          .json({ message: "You are not allowed, admin required" });
      }
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
}

module.exports = {
  verifyToken,
  verifyTokenAndAuthorization,
  verifyTokenAndAdmin,
};
