const express = require("express");
const router = express.Router();
const productTypeController = require("../controllers/productType.Controller");

// CRUD Endpoints
router.get("/", productTypeController.getAllProductTypes);
router.get("/:id", productTypeController.getProductTypeById);
router.post("/", productTypeController.createProductType);
router.put("/:id", productTypeController.updateProductType);
router.delete("/:id", productTypeController.deleteProductType);

module.exports = router;
