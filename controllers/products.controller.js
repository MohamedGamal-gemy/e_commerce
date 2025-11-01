// src/controllers/products.controller.js
const asyncHandler = require("express-async-handler");
const { getProducts, getProductFacets, createProductService } = require("../services/products.service");
// const { getProductFacets, getProducts } = require("../services/products.service");

exports.facets = asyncHandler(async (req, res) => {
    const data = await getProductFacets(req.query);
    res.json(data);
});

exports.show = asyncHandler(async (req, res) => {
    const data = await getProducts(req.query);
    res.json(data);
});

// const { createProductService } = require("../services/products.service");

exports.createProduct = async (req, res) => {
    const data = await createProductService(req);
    res.status(201).json({
        message: "Product created successfully",
        product: data,
    });
};
