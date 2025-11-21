const express = require("express");
require("dotenv").config();
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const xss = require("xss-clean");
const hpp = require("hpp");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
require("./queues/workers/productWorker");

const { notFound, errorHandler } = require("./middlewares/errors");
const connectToDB = require("./config/db");

const app = express();

// ✅ Connect to DB
connectToDB();

app.use("/api/webhook", require("./routes/stripeWebhook"));

// ✅ Middlewares
app.use(express.json());
app.use(cookieParser());

// app.use(
//   cors({
//     origin: ["http://localhost:5000", "http://localhost:3000"],
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
//     // allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );
// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Credentials", "true");
//   res.header("Access-Control-Allow-Origin", req.headers.origin);
//   res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
//   res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
//   next();
// });

// app.use(
//   cors({
//     origin: (origin, callback) => callback(null, true),
//     credentials: true,
//   })
// );

// app.options("*", cors());

// const allowedOrigin = "http://localhost:5000"; // البورت الافتراضي لـ Next.js dev server

// app.use(
//   cors({
//     origin: allowedOrigin,
//     credentials: true,
//   })
// );

// app.options(
//   "*",
//   cors({
//     origin: allowedOrigin,
//     credentials: true,
//   })
// );
app.use(cors({
  // origin: 'http://localhost:5000',
  origin: "*",
  credentials: true
}));
// app.use(
//   cors({
//     origin: [
//       "http://localhost:5000",
//       "http://localhost:3000",
//       // "https://YOUR_FRONTEND_REPLIT_URL.repl.co",
//     ],
//     credentials: true,
//   })
// );

// ✅ بعد كده الميدل وير الباقيين
app.use(morgan("dev"));
app.use(xss());
app.use(hpp());

// ✅ بعد كده Helmet
// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'"],
//         scriptSrc: ["'self'", "'unsafe-inline'", "https://trusted-cdn.com"],
//         styleSrc: ["'self'", "'unsafe-inline'"],
//         imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
//         connectSrc: ["'self'", "http://localhost:5000"], // ✅ أضف ده علشان يسمح بالrequests من الفرونت
//       },
//     },
//   })
// );
// ✅ Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100,
  message: { message: "Too many requests, try again later." },
});
// app.use("/api", apiLimiter);

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 دقائق
  max: 10,
  message: { message: "Too many login attempts, try again in 10 min." },
});
// app.use("/api/auth/login", );

// ✅ Routes
// Default route for root
app.get("/", (req, res) => {
  res.status(200).json({ message: "API is running 🚀" });
});

// app.use("/api/stripe", require("./routes/stripe"));
// app.use("/api/address", require("./routes/addressRoutes"));
app.use("/api/colors", require("./routes/color.routes"));
// app.use("/api/products", require("./routes/productFilter"));
app.use("/api/product-types", require("./routes/productType.route"));
// app.use("/api/orders", require("./routes/order"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/checkout", require("./routes/checkout"));
// app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/products", require("./routes/products"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/auth", require("./routes/auth"));

// ✅ Error handling
app.use(notFound);
app.use(errorHandler);

// ✅ Start server
// const PORT = process.env.PORT || 7000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const PORT = process.env.PORT || 7000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);
