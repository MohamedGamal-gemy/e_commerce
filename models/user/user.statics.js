module.exports = (schema) => {
  // 🔍 Find user by email safely
  schema.statics.findByEmail = async function (email) {
    return await this.findOne({ email: email.toLowerCase() });
  };

  // 🔍 Get active users
  schema.statics.getActiveUsers = async function () {
    return await this.find({ isActive: true });
  };
};
