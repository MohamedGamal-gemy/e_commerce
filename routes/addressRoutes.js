const express = require("express");
const router = express.Router();
const egyptCities = require("../egyptCities");

// إرجاع المحافظات
router.get("/governorates", (req, res) => {
  const governorates = Object.keys(egyptCities.Egypt);
  res.json(governorates);
});

// console.log(egyptCities.Egypt["Suez"]);
// إرجاع المدن بناءً على المحافظة
router.get("/cities/:governorate", (req, res) => {
  const { governorate } = req.params;
  const cities = egyptCities.Egypt[governorate];

  if (!cities) {
    return res.status(404).json({ message: "Governorate not found" });
  }

  res.json(Object.keys(cities));
});

module.exports = router;
