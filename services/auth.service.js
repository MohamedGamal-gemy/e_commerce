const User = require("../models/user");
const jwt = require("jsonwebtoken");

const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || "15m";
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || "30d";

async function registerUser({ username, email, password }) {
  const exists = await User.findOne({ email });
  if (exists) throw { status: 400, message: "Email already registered" };

  const user = new User({ username, email, password });
  await user.save();
  const accessToken = user.generateAccessToken();
  const rawRefresh = user.createRefreshToken();
  user.refreshTokenHash = user.hashToken(rawRefresh);
  await user.save();

  return { user: sanitize(user), accessToken, refreshToken: rawRefresh };
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
  user.refreshTokenHash = user.hashToken(rawRefresh);
  user.lastLogin = new Date();
  await user.save();

  return { user: sanitize(user), accessToken, refreshToken: rawRefresh };
}

async function refreshTokens(refreshToken) {
  if (!refreshToken) throw { status: 401, message: "No refresh token" };

  const hash = User.prototype.hashToken.call({}, refreshToken); // reuse method without instance
  // find user by stored hash
  const user = await User.findOne({ refreshTokenHash: hash });
  if (!user) throw { status: 401, message: "Invalid refresh token" };

  // rotation: issue new refresh token and save new hash
  const accessToken = user.generateAccessToken();
  const newRawRefresh = user.createRefreshToken();
  user.refreshTokenHash = user.hashToken(newRawRefresh);
  await user.save();

  return { accessToken, refreshToken: newRawRefresh, user: sanitize(user) };
}

async function logoutUser(userId) {
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: "" } });
}

function sanitize(user) {
  const obj = user.toObject();
  delete obj.password;
  delete obj.refreshTokenHash;
  return obj;
}

module.exports = {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
};
