const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

module.exports = (schema) => {
  schema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
  };

  schema.methods.generateAccessToken = function () {
    return jwt.sign(
      { id: this._id, role: this.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "15m" }
    );
  };

  // return raw refresh token (store hashed)
  schema.methods.createRefreshToken = function () {
    const token = crypto.randomBytes(48).toString("hex");
    return token;
  };

  schema.methods.hashToken = function (token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  };
};
