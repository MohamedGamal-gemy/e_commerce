exports.buildProductMatch = function buildProductMatch({
  productTypeName,
  search,
  minPrice,
  maxPrice,
}) {
  const productMatch = { isAvailable: true, status: "active" };

  if (productTypeName) {
    // accept string or array, normalize to trimmed values
    const types = Array.isArray(productTypeName)
      ? productTypeName
      : String(productTypeName).split(",");

    productMatch.productTypeName = {
      $in: types.map((t) => String(t || "").trim()),
    };
  }

  if (search) {
    productMatch.searchableText = { $regex: String(search), $options: "i" };
  }

  // IMPORTANT: check for undefined explicitly (0 should be allowed)
  if (minPrice !== undefined || maxPrice !== undefined) {
    productMatch.price = {};
    if (minPrice !== undefined) productMatch.price.$gte = Number(minPrice);
    if (maxPrice !== undefined) productMatch.price.$lte = Number(maxPrice);
  }

  return productMatch;
};
