const express = require("express");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const { User, validateUpdateUser } = require("../models/User");
const {
  verifyTokenAndAuthorization,
  verifyTokenAndAdmin,
} = require("../middlewares/verifyToken");

const router = express.Router();

/**
 * @desc Get All Users
 * @route /api/users
 * @method GET
 * @access private (only admin)
 */
router.get(
  "/",
  verifyTokenAndAdmin,
  asyncHandler(async (req, res) => {
    const users = await User.find().select("-password");
    res.json(users);
  })
);
/**
 * @desc Get Single User
 * @route /api/users/:id
 * @method GET
 * @access private
 */
router.get(
  "/:id",
  verifyTokenAndAuthorization,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select("-password -__v");
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    res.json(user);
  })
);
/**
 * @desc Delete User
 * @route /api/users/:id
 * @method DELETE
 * @access private
 */
router.delete(
  "/:id",
  verifyTokenAndAuthorization,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }
    await User.findByIdAndDelete(id);
    res.json({ message: "user has been deleted seccessfully" });
  })
);
/**
 * @desc Update User
 * @route /api/users:/id
 * @method PUT
 * @access private
 */
router.put(
  "/:id",
  verifyTokenAndAuthorization,
  asyncHandler(async (req, res) => {
    const { error } = validateUpdateUser(req.body);
    const { email, password, name } = req.body;
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
    }
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          // email: req.body.email,
          email /*es6*/,
          password,
          name,
        },
      },
      { new: true }
    ).select("-password");
    res.status(200).json({ message: "Update Success", updatedUser });
  })
);

module.exports = router;
