const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const expressAsyncHandler = require("express-async-handler");
const {
  validateRegisterUser,
  User,
  validateLoginUser,
} = require("../models/User");
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
    const { error } = validateRegisterUser(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    let user = await User.findOne({ email: req.body.email });
    if (user) {
      return res.status(400).json({ message: "this user already registered" });
    }
    const salt = await bcrypt.genSalt(10);
    req.body.password = await bcrypt.hash(req.body.password, salt);
    user = new User({
      email: req.body.email,
      name: req.body.name,
      password: req.body.password,
    });
    const result = await user.save();
    const token = user.generateToken();
    const { password, ...other } = result._doc;
    res.status(201).json({ ...other, message: "Success Register", token });
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
