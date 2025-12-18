// // const express = require("express");
// // const bcrypt = require("bcryptjs");
// // const jwt = require("jsonwebtoken");
// // const expressAsyncHandler = require("express-async-handler");
// // const {
// //   validateRegisterUser,
// //   validateLoginUser,
// // } = require("../validations/userValidation");
// // const User = require("../models/user");
// // // const {
// // //   validateRegisterUser,
// // //   User,
// // //   validateLoginUser,
// // // } = require("../models/userModel");

// // const router = express.Router();

// // /**
// //  * @description Register New User
// //  * @route /api/auth/register
// //  * @method POST
// //  * @access public
// //  */
// // router.post(
// //   "/register",
// //   expressAsyncHandler(async (req, res) => {
// //     const { email, username, password } = req.body;

// //     const { error } = validateRegisterUser(req.body);
// //     if (error)
// //       return res.status(400).json({ message: error.details[0].message });

// //     let user = await User.findOne({ email });
// //     if (user)
// //       return res
// //         .status(400)
// //         .json({ message: "This email is already registered." });

// //     user = new User({ email, username, password });
// //     await user.save();

// //     const token = user.generateToken();
// //     const userObj = user.toObject();
// //     delete userObj.password;

// //     // res.cookie("token", token, {
// //     //   httpOnly: true,
// //     //   secure: true, // حتى لو على localhost - مش مشكلة
// //     //   sameSite: "none", // إلزامي لعشان تبعت الكوكي عبر دومينات مختلفة
// //     //   path: "/",
// //     //   maxAge: 24 * 60 * 60 * 1000,
// //     // });
// //     const isProduction = process.env.NODE_ENV === "production";
// //     const isHttps =
// //       req.secure ||
// //       (req.headers["x-forwarded-proto"] &&
// //         req.headers["x-forwarded-proto"] === "https");

// //     res.cookie("token", token, {
// //       httpOnly: true,
// //       secure: isProduction || isHttps, // true in production or when using HTTPS
// //       sameSite: isProduction ? "none" : "lax", // 'none' in production, 'lax' in development
// //       maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
// //       path: "/", // Ensure cookie is available across all paths
// //       // domain: isProduction ? '.yourdomain.com' : undefined  // Set your production domain
// //     });

// //     res.status(201).json({
// //       message: "Registration successful.",
// //       user: userObj,
// //     });
// //   })
// // );

// // router.post("/logout", (req, res) => {
// //   res.clearCookie("token", {
// //     httpOnly: true,
// //     secure: false,
// //     // secure: process.env.NODE_ENV === "production" ? true : false,
// //     sameSite: "lax",
// //   });
// //   return res.status(200).json({ message: "Logout successful" });
// // });
// // /**
// // //  * @description Login User
// // //  * @route /api/auth/login
// // //  * @method POST
// // //  * @access public
// // //  */
// // router.post(
// //   "/login",
// //   expressAsyncHandler(async (req, res) => {
// //     const { email, password } = req.body;

// //     // ✅ Validate input
// //     const { error } = validateLoginUser(req.body);
// //     if (error) {
// //       return res.status(400).json({ message: error.details[0].message });
// //     }

// //     // ✅ Find user (include password since it's select: false)
// //     const user = await User.findOne({ email }).select("+password");
// //     if (!user) {
// //       return res.status(400).json({ message: "Invalid email or password" });
// //     }

// //     // ✅ Compare password
// //     const isPasswordMatch = await user.comparePassword(password);
// //     if (!isPasswordMatch) {
// //       return res.status(400).json({ message: "Invalid email or password" });
// //     }

// //     // ✅ Generate JWT
// //     const token = user.generateToken();

// //     // ✅ Remove password before sending user
// //     const userObj = user.toObject();
// //     delete userObj.password;

// //     // res.cookie("token", token, {
// //     //   httpOnly: true,
// //     //   secure: process.env.NODE_ENV === "production",
// //     //   sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",

// //     //   path: "/",
// //     //   maxAge: 24 * 60 * 60 * 1000,
// //     // });

// //     const isProduction = process.env.NODE_ENV === "production";
// //     const isHttps =
// //       req.secure ||
// //       (req.headers["x-forwarded-proto"] &&
// //         req.headers["x-forwarded-proto"] === "https");

// //     res.cookie("token", token, {
// //       httpOnly: true,
// //       secure: isProduction || isHttps, // true in production or when using HTTPS
// //       sameSite: isProduction ? "none" : "lax", // 'none' in production, 'lax' in development
// //       maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
// //       path: "/", // Ensure cookie is available across all paths
// //       // domain: isProduction ? '.yourdomain.com' : undefined  // Set your production domain
// //     });

// //     // ✅ Update lastLogin (optional, for analytics)
// //     user.lastLogin = new Date();
// //     await user.save({ validateBeforeSave: false });

// //     // ✅ Response
// //     res.status(200).json({
// //       message: "Login successful",
// //       user: userObj,
// //       token,
// //     });
// //   })
// // );

// // // //

// // // router.get("/check-auth", (req, res) => {
// // //   const token = req.cookies.token;
// // //   // console.log(token);

// // //   if (!token) {
// // //     return res.status(401).json({ isAuthenticated: false });
// // //   }

// // //   try {
// // //     const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
// // //     res.status(200).json({ isAuthenticated: true, user: decoded });
// // //   } catch (error) {
// // //     res.status(401).json({ isAuthenticated: false });
// // //   }
// // // });

// // // router.post(
// // //   "/login",
// // //   expressAsyncHandler(async (req, res) => {
// // //     const { email, password } = req.body;

// // //     // Validate
// // //     const { error } = validateLoginUser(req.body);
// // //     if (error) {
// // //       return res.status(400).json({ message: error.details[0].message });
// // //     }

// // //     // Find user
// // //     const user = await User.findOne({ email }).select("+password");
// // //     if (!user) {
// // //       return res.status(400).json({ message: "Invalid email or password" });
// // //     }

// // //     // Compare password
// // //     const isMatch = await user.comparePassword(password);
// // //     if (!isMatch) {
// // //       return res.status(400).json({ message: "Invalid email or password" });
// // //     }

// // //     // Generate token
// // //     const token = user.generateToken();

// // //     const isProduction = process.env.NODE_ENV === "production";
// // //     const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";

// // //     // Set Cookie
// // //     // res.cookie("token", token, {
// // //     //   httpOnly: true,
// // //     //   secure: isProduction || isHttps,
// // //     //   sameSite: isProduction ? "none" : "lax",
// // //     //   maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
// // //     //   path: "/",
// // //     // });
// // //     res.cookie("token", token, {
// // //       httpOnly: true,
// // //       secure: false,
// // //       sameSite: "lax",
// // //     });

// // //     // Update last login
// // //     user.lastLogin = new Date();
// // //     await user.save({ validateBeforeSave: false });

// // //     // Send clean user data
// // //     const responseUser = {
// // //       id: user._id,
// // //       username: user.username,
// // //       email: user.email,
// // //       role: user.role,
// // //     };

// // //     res.status(200).json({
// // //       message: "Login successful",
// // //       user: responseUser,
// // //     });
// // //   })
// // // );

// // //

// // const authController require
// const express = require("express");
// const router = express.Router();
// const authController = require("../controllers/auth.controller");

// router.post("/register", authController.register);
// router.post("/login", authController.login);
// router.get("/refresh", authController.refresh);
// router.post("/logout", protectOptional, authController.logout);
// router.get("/check-auth", authController.checkAuth);

// module.exports = router;

const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { protectOptional } = require("../middleware/auth.middleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/refresh", authController.refresh);
//
// router.post("/refresh", authController.refresh);
//
router.post("/logout", protectOptional, authController.logout);
router.get("/check-auth", authController.checkAuth);

module.exports = router;
