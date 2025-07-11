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

// router.post(
//   "/register",
//   expressAsyncHandler(async (req, res) => {
//     // console.log(req.body);
//     const { email, username, password } = req.body;
//     const { error } = validateRegisterUser(req.body);
//     if (error) {
//       return res.status(400).json({ message: error.details[0].message });
//     }
//     let user = await User.findOne({ email });
//     if (user) {
//       return res.status(400).json({ message: "this user already registered" });
//     }
//     const salt = await bcrypt.genSalt(10);
//     const passwordHash = await bcrypt.hash(password, salt);
//     user = new User({
//       email,
//       username,
//       password: passwordHash,
//     });
//     const result = await user.save();
//     const token = user.generateToken();
//     const { password, ...other } = result._doc;
//     res.status(201).json({ ...other, message: "Success Register", token });
//   })
// );

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
    // console.log("user", user);

    const savedUser = await user.save();
    const token = user.generateToken();

    const userObj = savedUser.toObject();
    delete userObj.password;

    res.status(201).json({
      ...userObj,
      message: "Registration successful.",
      token,
    });
  })
);

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
      return res.status(400).json({ message: "invalid email" });
    }
    // console.log("user", user);

    const isPasswordMatch = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "invalid password" });
    }
    const token = user.generateToken();
    const { password, ...other } = user._doc;
    res.status(201).json({ ...other, message: "Success Login", token });
  })
);

module.exports = router;
