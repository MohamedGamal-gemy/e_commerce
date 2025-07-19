const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const expressAsyncHandler = require("express-async-handler");
const {
  validateRegisterUser,
  User,
  validateLoginUser,
} = require("../models/userModel");

const router = express.Router();

/**
 * @description Register New User
 * @route /api/auth/register
 * @method POST
 * @access public
 */
router.post(
  "/register",
  expressAsyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    // Validate input
    const { error } = validateRegisterUser(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ message: "This email is already registered." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create and save user
    user = new User({
      email,
      username,
      password: passwordHash,
    });

    const savedUser = await user.save();
    const token = user.generateToken();

    const userObj = savedUser.toObject();
    delete userObj.password;

    // Set token in cookie
    res.cookie("token", token, {
      httpOnly: true, // Prevent client-side access to the cookie
      secure: process.env.NODE_ENV === "production", // Use secure in production
      maxAge: 24 * 60 * 60 * 1000, // Cookie expiry: 1 day
      sameSite: "strict", // Prevent CSRF
    });

    res.status(201).json({
      ...userObj,
      message: "Registration successful.",
    });
  })
);

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logout successful" });
});
/**
 * @description Login User
 * @route /api/auth/login
 * @method POST
 * @access public
 */
router.post(
  "/login",
  expressAsyncHandler(async (req, res) => {
    const { error } = validateLoginUser(req.body);

    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    let user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const isPasswordMatch = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = user.generateToken();
    const { password, ...other } = user._doc;

    // Set token in cookie
    res.cookie("token", token, {
      httpOnly: true, // Prevent client-side access to the cookie
      // secure: process.env.NODE_ENV === "production", // Use secure in production
      secure: false, // Use secure in production
      maxAge: 24 * 60 * 60 * 1000, // Cookie expiry: 1 day
      // sameSite: "strict", // Prevent CSRF
      sameSite: "lax", // Prevent CSRF
    });

    res.status(200).json({ ...other, message: "Login successful" });
  })
);

module.exports = router;
