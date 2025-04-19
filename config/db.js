const mongoose = require("mongoose");

async function connectToDB() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Connected to MongoDB...");
  } catch (error) {
    console.log("Couldn't connect to MongoDB!", error);
  }
}

module.exports = connectToDB;
