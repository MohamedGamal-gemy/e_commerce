const express = require("express");
require("dotenv").config();
const cors = require("cors");
const logger = require("./middlewares/logger");
const { notFound, errorHandler } = require("./middlewares/errors");
const connectToDB = require("./config/db");
const mongoose = require("mongoose");
const app = express();
app.use(express.json());
//
// app.use(cors());
const cookieParser = require("cookie-parser");
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
); //
connectToDB();


app.use(logger);

app.use("/api/address", require("./routes/addressRoutes"));
//
app.use("/api/products", require("./routes/productFilter"));
//
app.use("/api/orders", require("./routes/order"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/variants", require("./routes/variantsRouter"));
app.use("/api/categories", require("./routes/categoriesRoutes"));
app.use("/api/subcategories", require("./routes/subcategoriesRoutes"));
//
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/products", require("./routes/products"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/auth", require("./routes/auth"));
// app.use("/api/stripe", require("./routes/stripe"));
// error
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 7000;
// const PORT = 4000;
app.listen(PORT, () => console.log(`server listening on port ${PORT}`));
