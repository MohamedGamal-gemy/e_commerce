// const express = require("express");
// require("dotenv").config();
// const cors = require("cors");
// const helmet = require("helmet");
// const rateLimit = require("express-rate-limit");
// const xss = require("xss-clean");
// const hpp = require("hpp");
// const  morgan = require("morgan");

// const logger = require("./middlewares/logger");
// const { notFound, errorHandler } = require("./middlewares/errors");
// const connectToDB = require("./config/db");
// const mongoose = require("mongoose");
// const app = express();
// app.use(express.json());
// app.use(helmet());
// app.use(xss());
// app.use(hpp());

// //
// // app.use(cors());
// const cookieParser = require("cookie-parser");
// app.use(cookieParser());
// app.use(
//   cors({
//     origin: "http://localhost:5000",
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// ); //
// connectToDB();

// app.use(logger);
// //
// app.use(
//   helmet.contentSecurityPolicy({
//     directives: {
//       defaultSrc: ["'self'"],
//       scriptSrc: ["'self'", "'unsafe-inline'", "https://trusted-cdn.com"],
//       styleSrc: ["'self'", "'unsafe-inline'"],
//       imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
//     },
//   })
// );

// // const limiter = rateLimit({
// //   windowMs: 15 * 60 * 1000, // 15 دقيقة
// //   max: 100, // 100 طلب فقط لكل IP خلال الـ 15 دقيقة
// //   message: {
// //     message: "Too many requests from this IP, please try again later.",
// //   },
// //   standardHeaders: true, // يعرض الـ Rate Limit في الهيدر
// //   legacyHeaders: false, // يخفي الهيدرات القديمة
// // });

// const loginLimiter = rateLimit({
//   windowMs: 10 * 60 * 1000, // 10 دقائق
//   max: 5, // أقصى عدد محاولات
//   message: {
//     message: "Too many login attempts. Try again after 10 minutes.",
//   },
// });

// app.use("/api/auth/login", loginLimiter);

// // ✅ تطبيق الـ Limiter على كل الـ Routes
// app.use("/api", limiter);
// //
// app.use("/api/address", require("./routes/addressRoutes"));
// //
// app.use("/api/products", require("./routes/productFilter"));
// //
// app.use("/api/orders", require("./routes/order"));
// app.use("/api/cart", require("./routes/cart"));
// app.use("/api/variants", require("./routes/variantsRouter"));
// app.use("/api/categories", require("./routes/categoriesRoutes"));
// app.use("/api/subcategories", require("./routes/subcategoriesRoutes"));
// //
// app.use("/api/users", require("./routes/userRoutes"));
// app.use("/api/products", require("./routes/products"));
// app.use("/api/reviews", require("./routes/reviewRoutes"));
// app.use("/api/auth", require("./routes/auth"));
// // app.use("/api/stripe", require("./routes/stripe"));
// // error
// app.use(notFound);
// app.use(errorHandler);

// const PORT = process.env.PORT || 7000;
// // const PORT = 4000;
// app.listen(PORT, () => console.log(`server listening on port ${PORT}`));

const express = require("express");
require("dotenv").config();
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const xss = require("xss-clean");
const hpp = require("hpp");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { notFound, errorHandler } = require("./middlewares/errors");
const connectToDB = require("./config/db");

const app = express();

// ✅ Connect to DB
connectToDB();

// ✅ Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(xss());
app.use(hpp());

// ✅ Helmet (with CSP)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://trusted-cdn.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      },
    },
  })
);

// ✅ CORS
app.use(
  cors({
    origin: "http://localhost:5000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100,
  message: { message: "Too many requests, try again later." },
});
app.use("/api", apiLimiter);

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 دقائق
  max: 10,
  message: { message: "Too many login attempts, try again in 10 min." },
});
app.use("/api/auth/login", loginLimiter);

// ✅ Routes
app.use("/api/address", require("./routes/addressRoutes"));
app.use("/api/products", require("./routes/productFilter"));
app.use("/api/orders", require("./routes/order"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/variants", require("./routes/variantsRouter"));
app.use("/api/categories", require("./routes/categoriesRoutes"));
app.use("/api/subcategories", require("./routes/subcategoriesRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/products", require("./routes/products"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/auth", require("./routes/auth"));

// ✅ Error handling
app.use(notFound);
app.use(errorHandler);

// ✅ Start server
const PORT = process.env.PORT || 7000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
