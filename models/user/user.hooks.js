const bcrypt = require("bcryptjs");

module.exports = (schema) => {
  // 🧂 Hash password before save
  schema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  });
};
