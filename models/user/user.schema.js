const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },

    role: {
      type: String,
      enum: ["user", "admin", "vendor"],
      default: "user",
    },

    avatar: {
      url: { type: String },
      publicId: { type: String },
    },

    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    verificationCode: { type: String, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date },

    // E-Commerce related
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

module.exports = UserSchema;
