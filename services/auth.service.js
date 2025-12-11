// const User = require("../models/user");
// const jwt = require("jsonwebtoken");

// const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || "15m";
// const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || "30d";

// async function registerUser({ username, email, password }) {
//   const exists = await User.findOne({ email });
//   if (exists) throw { status: 400, message: "Email already registered" };

//   const user = new User({ username, email, password });
//   await user.save();
//   const accessToken = user.generateAccessToken();
//   const rawRefresh = user.createRefreshToken();
//   user.refreshTokenHash = user.hashToken(rawRefresh);
//   await user.save();

//   return { user: sanitize(user), accessToken, refreshToken: rawRefresh };
// }

// async function loginUser({ email, password }) {
//   const user = await User.findOne({ email }).select(
//     "+password +refreshTokenHash"
//   );
//   if (!user) throw { status: 400, message: "Invalid credentials" };
//   const ok = await user.comparePassword(password);
//   if (!ok) throw { status: 400, message: "Invalid credentials" };

//   const accessToken = user.generateAccessToken();
//   const rawRefresh = user.createRefreshToken();
//   user.refreshTokenHash = user.hashToken(rawRefresh);
//   user.lastLogin = new Date();
//   await user.save();

//   return { user: sanitize(user), accessToken, refreshToken: rawRefresh };
// }

// function publicUser(user) {
//   return {
//     id: user._id,
//     username: user.username,
//     email: user.email,
//     role: user.role,
//   };
// }

// async function refreshTokens(refreshToken) {
//   if (!refreshToken) throw { status: 401, message: "No refresh token" };

//   const hashed = crypto.createHash("sha256").update(refreshToken).digest("hex");

//   const user = await User.findOne({ refreshTokenHash: hashed });
//   if (!user) throw { status: 401, message: "Invalid refresh token" };

//   // Rotate refresh token (Google-style)
//   const newAccess = user.generateAccessToken();
//   const newRefresh = user.createRefreshToken();

//   user.refreshTokenHash = crypto
//     .createHash("sha256")
//     .update(newRefresh)
//     .digest("hex");

//   await user.save();

//   return {
//     accessToken: newAccess,
//     refreshToken: newRefresh,
//     user: sanitize(user),
//   };
// }

// async function logoutUser(userId) {
//   await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: "" } });
// }

// function sanitize(user) {
//   const obj = user.toObject();
//   delete obj.password;
//   delete obj.refreshTokenHash;
//   return obj;
// }

// module.exports = {
//   registerUser,
//   loginUser,
//   refreshTokens,
//   logoutUser,
//   publicUser,
// };

const User = require("../models/user");
const crypto = require("crypto");

function publicUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

async function registerUser({ username, email, password }) {
  const exists = await User.findOne({ email });
  if (exists) throw { status: 400, message: "Email already registered" };

  const user = new User({ username, email, password });
  await user.save();

  const accessToken = user.generateAccessToken();
  const refreshRaw = user.createRefreshToken();
  user.refreshTokenHash = crypto
    .createHash("sha256")
    .update(refreshRaw)
    .digest("hex");
  await user.save();

  return {
    user: publicUser(user),
    accessToken,
    refreshToken: refreshRaw,
  };
}

async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select(
    "+password +refreshTokenHash"
  );
  if (!user) throw { status: 400, message: "Invalid credentials" };

  const ok = await user.comparePassword(password);
  if (!ok) throw { status: 400, message: "Invalid credentials" };

  const accessToken = user.generateAccessToken();
  const rawRefresh = user.createRefreshToken();

  user.refreshTokenHash = crypto
    .createHash("sha256")
    .update(rawRefresh)
    .digest("hex");
  user.lastLogin = new Date();
  await user.save();

  return {
    user: publicUser(user),
    accessToken,
    refreshToken: rawRefresh,
  };
}

async function refreshTokens(refreshToken) {
  if (!refreshToken) throw { status: 401, message: "No refresh token" };

  const hashed = crypto.createHash("sha256").update(refreshToken).digest("hex");

  const user = await User.findOne({ refreshTokenHash: hashed });
  if (!user) throw { status: 401, message: "Invalid refresh token" };

  // Token rotation
  const newAccess = user.generateAccessToken();
  const newRefresh = user.createRefreshToken();

  user.refreshTokenHash = crypto
    .createHash("sha256")
    .update(newRefresh)
    .digest("hex");
  await user.save();

  return {
    accessToken: newAccess,
    refreshToken: newRefresh,
    user: publicUser(user),
  };
}

async function logoutUser(userId) {
  await User.findByIdAndUpdate(userId, {
    $unset: { refreshTokenHash: "" },
  });
}

module.exports = {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
};
