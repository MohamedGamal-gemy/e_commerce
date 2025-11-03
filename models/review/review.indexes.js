module.exports = (schema) => {
  schema.index({ product: 1, user: 1 }, { unique: true }); // كل مستخدم يقدر يراجع المنتج مرة واحدة فقط
  schema.index({ rating: -1 });
};
