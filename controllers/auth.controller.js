const authService = require("../services/auth.service");

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

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.registerUser({
      username,
      email,
      password,
    });

    res.cookie("accessToken", accessToken, cookieOpts(req)); // optional: short cookie
    res.cookie("refreshToken", refreshToken, cookieOpts(req));

    return res.status(201).json({ user });
  } catch (err) {
    return res
      .status(err.status || 400)
      .json({ message: err.message || "Error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.loginUser({
      email,
      password,
    });

    res.cookie("accessToken", accessToken, cookieOpts(req));
    res.cookie("refreshToken", refreshToken, cookieOpts(req));

    return res.json({ user });
  } catch (err) {
    return res
      .status(err.status || 400)
      .json({ message: err.message || "Error" });
  }
};

exports.refresh = async (req, res) => {
  try {
    const rawRefresh = req.cookies.refreshToken;
    const { accessToken, refreshToken, user } = await authService.refreshTokens(
      rawRefresh
    );

    // set new cookies (rotation)
    res.cookie("accessToken", accessToken, cookieOpts(req));
    res.cookie("refreshToken", refreshToken, cookieOpts(req));

    return res.json({ user });
  } catch (err) {
    return res
      .status(err.status || 401)
      .json({ message: err.message || "Unauthorized" });
  }
};

exports.logout = async (req, res) => {
  try {
    // If user id available in req.user, clear DB, otherwise just clear cookies
    if (req.user?.id) {
      await authService.logoutUser(req.user.id);
    }
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });
    return res.json({ message: "Logged out" });
  } catch (err) {
    return res.status(500).json({ message: "Logout failed" });
  }
};

// check-auth: try access cookie first, else try refresh cookie (and rotate)
exports.checkAuth = async (req, res) => {
  try {
    const { cookies } = req;
    const accessToken = cookies.accessToken;
    const refreshToken = cookies.refreshToken;
    const jwt = require("jsonwebtoken");

    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
        const User = require("../models");
        const user = await User.findById(decoded.id).select(
          "username email role"
        );
        if (!user) throw new Error();
        return res.json({ isAuthenticated: true, user });
      } catch (err) {
        // continue to try refresh
      }
    }

    if (refreshToken) {
      try {
        const result = await authService.refreshTokens(refreshToken);
        // set new cookies
        res.cookie("accessToken", result.accessToken, cookieOpts(req));
        res.cookie("refreshToken", result.refreshToken, cookieOpts(req));
        return res.json({ isAuthenticated: true, user: result.user });
      } catch (err) {
        return res.json({ isAuthenticated: false });
      }
    }

    return res.json({ isAuthenticated: false });
  } catch (err) {
    return res.status(500).json({ isAuthenticated: false });
  }
};
