// const mongoose = require("mongoose");

// const orderItemSchema = new mongoose.Schema({
//   productId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Product",
//     required: true,
//   },
//   productTitle: {
//     type: String,
//     required: true,
//   },
//   variantId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "ProductVariant",
//     required: true,
//   },
//   color: {
//     name: String,
//     value: String,
//   },
//   image: String,
//   size: {
//     type: String,
//     required: true,
//   },
//   stock: {
//     type: Number,
//     required: true,
//     min: 1,
//   },
//   price: {
//     type: Number,
//     required: true,
//   },
// });

// const orderSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     orderItems: [orderItemSchema],
//     shippingAddress: {
//       fullName: String,
//       address: String,
//       city: String,
//       postalCode: String,
//       country: String,
//     },
//     paymentMethod: {
//       type: String,
//       enum: ["cash", "card", "paypal", "stripe"],
//       default: "cash",
//     },
//     paymentResult: {
//       id: String,
//       status: String,
//       update_time: String,
//       email_address: String,
//     },
//     itemsPrice: Number,
//     shippingPrice: Number,
//     taxPrice: Number,
//     totalPrice: Number,
//     isPaid: {
//       type: Boolean,
//       default: false,
//     },
//     paidAt: Date,
//     isDelivered: {
//       type: Boolean,
//       default: false,
//     },
//     deliveredAt: Date,
//   },
//   {
//     timestamps: true,
//   }
// );

// module.exports = mongoose.model("Order", orderSchema);

// models/Order.js

const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productTitle: String,
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductVariant",
  },
  color: {
    name: String,
    value: String,
  },
  image: String,
  size: String,
  stock: Number,
  price: Number,
});

const shippingAddressSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  address: String,
  city: String,
  state: String,
  zipCode: String,
  country: String,
  email: String,
  phone: String,
});

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderItems: [orderItemSchema],
    shippingAddress: shippingAddressSchema,

    paymentMethod: {
      type: String,
      default: "cash",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },

    shippingMethod: {
      type: String,
      default: "standard",
    },

    trackingNumber: {
      type: String,
    },
    estimatedDelivery: {
      type: Date,
    },

    isDelivered: {
      type: Boolean,
      default: false,
    },

    itemsPrice: {
      type: Number,
      default: 0,
    },
    shippingPrice: {
      type: Number,
      default: 0,
    },
    taxPrice: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },

    orderStatus: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
