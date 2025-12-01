const bcrypt = require("bcryptjs");

module.exports = (schema) => {
  schema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
  });
};
