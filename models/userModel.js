// // const mongoose = require("mongoose");
// // const Joi = require("joi");
// // const jwt = require("jsonwebtoken");

// // // User schema
// // const UserSchema = new mongoose.Schema(
// //   {
// //     email: {
// //       type: String,
// //       required: true,
// //       trim: true,
// //       unique: true,
// //       minlength: 5,
// //       maxlength: 100,
// //     },
// //     username: {
// //       type: String,
// //       required: true,
// //       trim: true,
// //       minlength: 3,
// //       maxlength: 200,
// //     },
// //     password: {
// //       type: String,
// //       required: true,
// //       trim: true,
// //       minlength: 6,
// //     },
// //     isAdmin: {
// //       type: Boolean,
// //       default: false,
// //     },
// //   },
// //   { timestamps: true }
// // );

// // // Generate Token
// // UserSchema.methods.generateToken = function () {
// //   return jwt.sign(
// //     {
// //       id: this._id,
// //       isAdmin: this.isAdmin,
// //       username: this.username,
// //       email: this.email,
// //     },
// //     process.env.JWT_SECRET_KEY,
// //     { expiresIn: "1d" } // Token expires in 1 day
// //   );
// // };

// // const User = mongoose.model("User", UserSchema);

// // // Validation for Register User
// // function validateRegisterUser(obj) {
// //   const schema = Joi.object({
// //     email: Joi.string().trim().min(5).max(100).required().email(),
// //     username: Joi.string().trim().min(3).max(200).required(),
// //     password: Joi.string().trim().min(6).required(),
// //   });
// //   return schema.validate(obj);
// // }

// // // Validation for Login User
// // function validateLoginUser(obj) {
// //   const schema = Joi.object({
// //     email: Joi.string().trim().min(5).max(100).required().email(),
// //     password: Joi.string().trim().min(6).required(),
// //   });
// //   return schema.validate(obj);
// // }

// // // Validation for Update User
// // function validateUpdateUser(obj) {
// //   const schema = Joi.object({
// //     email: Joi.string().trim().min(5).max(100).email(),
// //     username: Joi.string().trim().min(3).max(200),
// //     password: Joi.string().trim().min(6),
// //   });
// //   return schema.validate(obj);
// // }

// // module.exports = {
// //   User,
// //   validateLoginUser,
// //   validateRegisterUser,
// //   validateUpdateUser,
// // };

// const mongoose = require("mongoose");
// const Joi = require("joi");
// const jwt = require("jsonwebtoken");

// const UserSchema = new mongoose.Schema(
//   {
//     email: {
//       type: String,
//       required: true,
//       trim: true,
//       unique: true,
//       minlength: 5,
//       maxlength: 100,
//     },
//     username: {
//       type: String,
//       required: true,
//       trim: true,
//       minlength: 3,
//       maxlength: 200,
//     },
//     password: {
//       type: String,
//       required: true,
//       trim: true,
//       minlength: 6,
//     },
//     isAdmin: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   { timestamps: true }
// );

// // توليد JWT
// UserSchema.methods.generateAuthToken = function () {
//   const token = jwt.sign(
//     { _id: this._id, isAdmin: this.isAdmin },
//     process.env.JWT_SECRET,
//     { expiresIn: "7d" }
//   );
//   return token;
// };

// function validateUser(user) {
//   const schema = Joi.object({
//     email: Joi.string().email().min(5).max(100).required(),
//     username: Joi.string().min(3).max(200).required(),
//     password: Joi.string().min(6).required(),
//     isAdmin: Joi.boolean(),
//   });
//   return schema.validate(user);
// }

// const User = mongoose.model("User", UserSchema);

// module.exports = { User, validateUser };
