const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const expressAsyncHandler = require("express-async-handler");
const {
  validateRegisterUser,
  validateLoginUser,
} = require("../validations/userValidation");
const User = require("../models/user");
// const {
//   validateRegisterUser,
//   User,
//   validateLoginUser,
// } = require("../models/userModel");

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
//     const { email, username, password } = req.body;

//     // Validate input
//     const { error } = validateRegisterUser(req.body);
//     if (error) {
//       return res.status(400).json({ message: error.details[0].message });
//     }

//     // Check if user already exists
//     let user = await User.findOne({ email });
//     if (user) {
//       return res
//         .status(400)
//         .json({ message: "This email is already registered." });
//     }

//     // Hash password
//     // const salt = await bcrypt.genSalt(10);
//     // const passwordHash = await bcrypt.hash(password, salt);

//     // Create and save user
// user = new User({ email, username, password });
//     const savedUser = await user.save();
//     const token = user.generateToken();

//     const userObj = savedUser.toObject();
//     delete userObj.password;

//     // Set token in cookie
//     res.cookie("token", token, {
//       httpOnly: true, // Prevent client-side access to the cookie
//       secure: process.env.NODE_ENV === "production", // Use secure in production
//       maxAge: 24 * 60 * 60 * 1000, // Cookie expiry: 1 day
//       sameSite: "lax", // Prevent CSRF
//     });

//     res.status(201).json({
//       ...userObj,
//       message: "Registration successful.",
//     });
//   })
// );

router.post(
  "/register",
  expressAsyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    const { error } = validateRegisterUser(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    let user = await User.findOne({ email });
    if (user)
      return res
        .status(400)
        .json({ message: "This email is already registered." });

    user = new User({ email, username, password });
    await user.save();

    const token = user.generateToken();
    const userObj = user.toObject();
    delete userObj.password;

    // res.cookie("token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   path: "/",
    //   sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    //   maxAge: 24 * 60 * 60 * 1000,
    // });
    // res.cookie("token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production", // على localhost خليها false
    //   sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    //   path: "/",
    //   maxAge: 24 * 60 * 60 * 1000, // يوم واحد
    // });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true, // حتى لو على localhost - مش مشكلة
      sameSite: "none", // إلزامي لعشان تبعت الكوكي عبر دومينات مختلفة
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      message: "Registration successful.",
      user: userObj,
    });
  })
);

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    // secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: "lax",
  });
  return res.status(200).json({ message: "Logout successful" });
});
/**
//  * @description Login User
//  * @route /api/auth/login
//  * @method POST
//  * @access public
//  */
// router.post(
//   "/login",
//   expressAsyncHandler(async (req, res) => {
//     const { error } = validateLoginUser(req.body);

//     if (error) {
//       return res.status(400).json({ message: error.details[0].message });
//     }

//     let user = await User.findOne({ email: req.body.email });
//     if (!user) {
//       return res.status(400).json({ message: "Invalid email" });
//     }

//     const isPasswordMatch = await bcrypt.compare(
//       req.body.password,
//       user.password
//     );
//     if (!isPasswordMatch) {
//       return res.status(400).json({ message: "Invalid password" });
//     }

//     const token = user.generateToken();
//     const { password, ...other } = user._doc;

//     // Set token in cookie
//     res.cookie("token", token, {
//       httpOnly: false, // Prevent client-side access to the cookie
//       // httpOnly: true, // Prevent client-side access to the cookie
//       // secure: process.env.NODE_ENV === "production", // Use secure in production
//       secure: false, // Use secure in production
//       maxAge: 24 * 60 * 60 * 1000, // Cookie expiry: 1 day
//       // sameSite: "strict", // Prevent CSRFh
//       sameSite: "lax", // Prevent CSRF
//     });

//     res.status(200).json({ ...other, message: "Login successful" });
//   })
// );

router.post(
  "/login",
  expressAsyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // ✅ Validate input
    const { error } = validateLoginUser(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // ✅ Find user (include password since it's select: false)
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ Compare password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ Generate JWT
    const token = user.generateToken();

    // ✅ Remove password before sending user
    const userObj = user.toObject();
    delete userObj.password;

    // ✅ Set token cookie
    // res.cookie("token", token, {
    //   httpOnly: true, // prevent client JS access
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "lax",
    //   maxAge: 24 * 60 * 60 * 1000, // 1 day
    // });

    // res.cookie("token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production", // على localhost خليها false
    //   sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    //   path: "/",
    //   maxAge: 24 * 60 * 60 * 1000, // يوم واحد
    // });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",

      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    // ✅ Update lastLogin (optional, for analytics)
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // ✅ Response
    res.status(200).json({
      message: "Login successful",
      user: userObj,
      token,
    });
  })
);

//

router.get("/check-auth", (req, res) => {
  const token = req.cookies.token;
  // console.log(token);

  if (!token) {
    return res.status(401).json({ isAuthenticated: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    res.status(200).json({ isAuthenticated: true, user: decoded });
  } catch (error) {
    res.status(401).json({ isAuthenticated: false });
  }
});

module.exports = router;
