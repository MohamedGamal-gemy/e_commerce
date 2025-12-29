// const authService = require("../services/auth.service");

// const cookieOpts = (req) => {
//   const isProduction = process.env.NODE_ENV === "production";
//   const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
//   return {
//     httpOnly: true,
//     secure: isProduction || isHttps,
//     sameSite: isProduction ? "none" : "lax",
//     maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
//     path: "/",
//   };
// };

// exports.register = async (req, res) => {
//   try {
//     const { username, email, password } = req.body;
//     const { user, accessToken, refreshToken } = await authService.registerUser({
//       username,
//       email,
//       password,
//     });

//     res.cookie("accessToken", accessToken, cookieOpts(req)); // optional: short cookie
//     res.cookie("refreshToken", refreshToken, cookieOpts(req));

//     return res.status(201).json({ user });
//   } catch (err) {
//     return res
//       .status(err.status || 400)
//       .json({ message: err.message || "Error" });
//   }
// };

// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const { user, accessToken, refreshToken } = await authService.loginUser({
//       email,
//       password,
//     });

//     res.cookie("accessToken", accessToken, cookieOpts(req));
//     res.cookie("refreshToken", refreshToken, cookieOpts(req));

//     return res.json({ user });
//   } catch (err) {
//     return res
//       .status(err.status || 400)
//       .json({ message: err.message || "Error" });
//   }
// };

// exports.refresh = async (req, res) => {
//   try {
//     const rawRefresh = req.cookies.refreshToken;
//     const { accessToken, refreshToken, user } = await authService.refreshTokens(
//       rawRefresh
//     );

//     // set new cookies (rotation)
//     res.cookie("accessToken", accessToken, cookieOpts(req));
//     res.cookie("refreshToken", refreshToken, cookieOpts(req));

//     return res.json({ user });
//   } catch (err) {
//     return res
//       .status(err.status || 401)
//       .json({ message: err.message || "Unauthorized" });
//   }
// };

// exports.logout = async (req, res) => {
//   try {
//     // If user id available in req.user, clear DB, otherwise just clear cookies
//     if (req.user?.id) {
//       await authService.logoutUser(req.user.id);
//     }
//     res.clearCookie("accessToken", { path: "/" });
//     res.clearCookie("refreshToken", { path: "/" });
//     return res.json({ message: "Logged out" });
//   } catch (err) {
//     return res.status(500).json({ message: "Logout failed" });
//   }
// };

// // check-auth: try access cookie first, else try refresh cookie (and rotate)
// exports.checkAuth = async (req, res) => {
//   try {
//     const { cookies } = req;
//     const accessToken = cookies.accessToken;
//     const refreshToken = cookies.refreshToken;
//     const jwt = require("jsonwebtoken");
//     const User = require("../models");

//     // 1) Try access token
//     if (accessToken) {
//       try {
//         const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
//         const user = await User.findById(decoded.id).select(
//           "username email role"
//         );

//         if (!user) throw new Error();

//         return res.json({
//           isAuthenticated: true,
//           user,
//         });
//       } catch (err) {
//         // invalid access token → go to refresh
//       }
//     }

//     // 2) Try refresh token
//     if (refreshToken) {
//       try {
//         const result = await authService.refreshTokens(refreshToken);

//         // Save new tokens to cookies
//         res.cookie("accessToken", result.accessToken, cookieOpts(req));
//         res.cookie("refreshToken", result.refreshToken, cookieOpts(req));

//         // Extract only safe fields
//         const { username, email, role } = result.user;

//         return res.json({
//           isAuthenticated: true,
//           user: { username, email, role },
//         });
//       } catch (err) {
//         return res.json({ isAuthenticated: false });
//       }
//     }

//     // 3) No tokens
//     return res.json({ isAuthenticated: false });
//   } catch (err) {
//     return res.status(500).json({ isAuthenticated: false });
//   }
// };

const authService = require("../services/auth.service");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const Cart = require("../models/Cart");

const cookieOpts = (req) => {
  const isProduction = process.env.NODE_ENV === "production";
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";

  return {
    httpOnly: true,
    secure: isProduction || isHttps,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    path: "/",
  };
};

// =====================================
// REGISTER
// =====================================
// exports.register = async (req, res) => {
//   try {
//     const { user, accessToken, refreshToken } = await authService.registerUser(
//       req.body
//     );

//     res.cookie("accessToken", accessToken, cookieOpts(req));
//     res.cookie("refreshToken", refreshToken, cookieOpts(req));

//     return res.status(201).json({
//       success: true,
//       user,
//     });
//   } catch (err) {
//     return res.status(err.status || 400).json({
//       success: false,
//       message: err.message || "Error",
//     });
//   }
// };

exports.register = async (req, res) => {
  try {
    // جلب الـ sessionId من الـ request (اللي المفروض الميدل وير بتاعك بيجهزه)
    const sessionId = req.sessionId;

    const { user, accessToken, refreshToken } = await authService.registerUser(
      req.body,
      sessionId // تمرير الـ ID هنا للسيرفس عشان تعمل عملية النقل
    );

    res.cookie("accessToken", accessToken, cookieOpts(req));
    res.cookie("refreshToken", refreshToken, cookieOpts(req));

    return res.status(201).json({
      success: true,
      user,
    });
  } catch (err) {
    return res.status(err.status || 400).json({
      success: false,
      message: err.message || "Error",
    });
  }
};
// =====================================
// LOGIN
// =====================================
// exports.login = async (req, res) => {
//   try {
//     const { user, accessToken, refreshToken } = await authService.loginUser(
//       req.body
//     );

//     res.cookie("accessToken", accessToken, cookieOpts(req));
//     res.cookie("refreshToken", refreshToken, cookieOpts(req));

//     return res.json({
//       success: true,
//       user,
//     });
//   } catch (err) {
//     return res.status(err.status || 400).json({
//       success: false,
//       message: err.message || "Error",
//     });
//   }
// };

exports.login = async (req, res) => {
  try {
    const sessionId = req.sessionId;
    console.log("session", sessionId);

    const { user, accessToken, refreshToken } = await authService.loginUser(
      req.body,
      sessionId
    );

    res.cookie("accessToken", accessToken, cookieOpts(req));
    res.cookie("refreshToken", refreshToken, cookieOpts(req));

    return res.json({
      success: true,
      user,
    });
  } catch (err) {
    return res.status(err.status || 400).json({
      success: false,
      message: err.message || "Error",
    });
  }
};

// exports.login = async (req, res) => {
//   try {
//     const sessionId = req.sessionId;

//     const { user, accessToken, refreshToken } = await authService.loginUser(
//       req.body,
//       sessionId
//     );

//     res.cookie("accessToken", accessToken, cookieOpts(req));
//     res.cookie("refreshToken", refreshToken, cookieOpts(req));

//     // ── هنا نضيف جلب السلة ──
//     let cart = { items: [] }; // default فاضي

//     const userCart = await Cart.findOne({ user: user._id, isActive: true })
//       .populate([
//         { path: "items.product", select: "title slug price thumbnail" },
//         { path: "items.variant", select: "color images" },
//       ])
//       .lean();

//     if (userCart) {
//       // نفس الـ transform بتاع getCart
//       userCart.items = userCart.items.map((item) => {
//         if (item.variant && item.variant.images) {
//           item.variant.images = item.variant.images.slice(0, 1);
//         }
//         return item;
//       });
//       cart = userCart;
//     }

//     return res.json({
//       success: true,
//       user,
//       cart, // ← أضفناه هنا
//     });
//   } catch (err) {
//     return res.status(err.status || 400).json({
//       success: false,
//       message: err.message || "Error",
//     });
//   }
// };

// =====================================
// REFRESH TOKENS
// =====================================
exports.refresh = async (req, res) => {
  try {
    const raw = req.cookies.refreshToken;

    const { accessToken, refreshToken, user } = await authService.refreshTokens(
      raw
    );

    res.cookie("accessToken", accessToken, cookieOpts(req));
    res.cookie("refreshToken", refreshToken, cookieOpts(req));

    return res.json({
      success: true,
      user,
      refreshed: true,
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
};

// =====================================
// LOGOUT
// =====================================
exports.logout = async (req, res) => {
  try {
    if (req.user?.id) {
      await authService.logoutUser(req.user.id);
    }

    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });

    return res.json({ success: true, message: "Logged out" });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

// =====================================
// CHECK AUTH
// =====================================
exports.checkAuth = async (req, res) => {
  try {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    // 1) Try Access Token
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);

        const user = await User.findById(decoded.id).select(
          "username email role"
        );

        if (user) {
          return res.json({
            isAuthenticated: true,
            user,
          });
        }
      } catch {}
    }

    // 2) Try Refresh Token
    if (refreshToken) {
      try {
        const result = await authService.refreshTokens(refreshToken);

        res.cookie("accessToken", result.accessToken, cookieOpts(req));
        res.cookie("refreshToken", result.refreshToken, cookieOpts(req));

        const { username, email, role, _id } = result.user;

        return res.json({
          isAuthenticated: true,
          user: { username, email, role },
          refreshed: true,
        });
      } catch {}
    }

    // 3) No tokens
    return res.json({ isAuthenticated: false });
  } catch {
    return res.status(500).json({ isAuthenticated: false });
  }
};
