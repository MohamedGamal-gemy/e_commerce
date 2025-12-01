// const mongoose = require("mongoose");
// const UserSchema = require("./user.schema");

// require("./user.hooks")(UserSchema);
// require("./user.methods")(UserSchema);
// require("./user.statics")(UserSchema);
// require("./user.indexes")(UserSchema);

// module.exports = mongoose.model("User", UserSchema);

const mongoose = require("mongoose");
const UserSchema = require("./user.schema");

require("./user.hooks")(UserSchema);
require("./user.methods")(UserSchema);

module.exports = mongoose.model("User", UserSchema);
