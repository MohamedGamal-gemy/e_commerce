module.exports = (schema) => {
  schema.pre("save", function (next) {
    if (!this.slug && this.name) {
      const base = this.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      this.slug = `${base}-${Date.now().toString().slice(-4)}`;
    }
    next();
  });
};
