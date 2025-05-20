const express = require("express");
require("dotenv").config();
const cors = require("cors");
const logger = require("./middlewares/logger");
const { notFound, errorHandler } = require("./middlewares/errors");
const connectToDB = require("./config/db");
const mongoose = require("mongoose");
const app = express();
app.use(express.json());

connectToDB();

app.use(cors());

app.use(logger);

app.use("/api/address", require("./routes/addressRoutes"));
//
app.use("/api/products", require("./routes/productFilter"));
//
app.use("/api/users", require("./routes/users"));
app.use("/api/products", require("./routes/products"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/stripe", require("./routes/stripe"));
// error
app.use(notFound);
app.use(errorHandler);


const PORT = process.env.PORT || 7000;
// const PORT = 4000;
app.listen(PORT, () => console.log(`server listening on port ${PORT}`));
