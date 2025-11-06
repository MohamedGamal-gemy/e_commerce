// const mongoose = require("mongoose");
// require("dotenv").config();

// (async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URL);

//     const collections = await mongoose.connection.db
//       .listCollections()
//       .toArray();

//     for (const collection of collections) {
//       await mongoose.connection.db.dropCollection(collection.name);
//       console.log(`🗑️ Collection ${collection.name} dropped`);
//     }

//     console.log("✅ كل البيانات اتشالت بنجاح!");
//     process.exit(0);
//   } catch (err) {
//     console.error("❌ Error:", err);
//     process.exit(1);
//   }
// })();

const mongoose = require("mongoose");
require("dotenv").config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ Connected to MongoDB");

    // أسماء الكولكشنز اللي عايز تحذفها فقط
    const collectionsToDelete = ["products", "productvariants"];

    for (const name of collectionsToDelete) {
      const exists = await mongoose.connection.db
        .listCollections({ name })
        .hasNext();

      if (exists) {
        await mongoose.connection.db.dropCollection(name);
        console.log(`🗑️ Collection "${name}" dropped`);
      } else {
        console.log(`⚠️ Collection "${name}" not found, skipping`);
      }
    }

    console.log("✅ المطلوب فقط اتحذف بنجاح!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
})();
