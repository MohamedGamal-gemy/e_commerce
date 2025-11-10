const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

module.exports = (schema) => {
  // ✅ Compare entered password with hashed one
  schema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };

  // ✅ Generate verification code (for email verification)
  schema.methods.generateVerificationCode = function () {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.verificationCode = code;
    return code;
  };

  // ✅ Generate password reset token (hashed version stored)
  schema.methods.generatePasswordResetToken = function () {
    const resetToken = crypto.randomBytes(20).toString("hex");
    this.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    this.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    return resetToken;
  };

  // ✅ Generate JWT token (for authentication)
  schema.methods.generateToken = function () {
    return jwt.sign(
      { id: this._id, email: this.email, role: this.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" } // token valid for 1 day
    );
  };
};
