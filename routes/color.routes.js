// 📁 routes/colorRoutes.js
const express = require("express");
const router = express.Router();
const { getColorsWithCounts } = require("../controllers/colorController");

router.get("/", getColorsWithCounts);

module.exports = router;
