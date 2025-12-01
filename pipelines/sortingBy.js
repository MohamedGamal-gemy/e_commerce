const SORT_OPTIONS = {
  "price-asc": { price: 1 },
  "price-desc": { price: -1 },
  "rating-desc": { rating: -1 },
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  "name-asc": { title: 1 },
  "name-desc": { title: -1 },
};

// function buildSortPipeline(sortBy = "newest") {
function buildSortPipeline(sortBy) {
  // Default to newest first if invalid sort option is provided
  //   const sortOption = SORT_OPTIONS[sortBy] || SORT_OPTIONS["newest"];
  if (!sortBy) return;
  const sortOption = SORT_OPTIONS[sortBy];
  //    || SORT_OPTIONS["price-desc"];

  return [
    {
      $sort: sortOption,
    },
  ];
}

module.exports = {
  buildSortPipeline,
  SORT_OPTIONS,
};
