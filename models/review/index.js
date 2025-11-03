const mongoose = require("mongoose");
const ReviewSchema = require("./review.schema");

require("./review.hooks")(ReviewSchema);
require("./review.statics")(ReviewSchema);
require("./review.indexes")(ReviewSchema);

module.exports = mongoose.model("Review", ReviewSchema);
