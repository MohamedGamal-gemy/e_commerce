// require("dotenv").config();
// const Redis = require("ioredis");

// const redis = new Redis({
//   host: "redis-16204.c89.us-east-1-3.ec2.redns.redis-cloud.com",
//   port: 16204,
//   username: "default",
//   password: "mRjVv04lQQIyrnkRTvex1RFhVqrfkcTo",
//   // ⚠️ لاحظ مفيش tls هنا لأن السيرفر مش مفعّل SSL
// });

// redis.on("connect", () => console.log("✅ Connected to Redis Cloud"));
// redis.on("error", (err) => console.error("❌ Redis error:", err));

// (async () => {
//   try {
//     const pong = await redis.ping();
//     console.log("Ping result:", pong);

//     await redis.set("testKey", "Hello Redis Cloud!");
//     const value = await redis.get("testKey");
//     console.log("Stored value:", value);

//     redis.quit();
//   } catch (err) {
//     console.error("❌ Redis test failed:", err);
//   }
// })();

const Redis = require("ioredis");

const client = new Redis({
  host: "redis-16204.c89.us-east-1-3.ec2.redns.redis-cloud.com",
  port: 16204,
  username: "default",
  password: "mRjVv04lQQIyrnkRTvex1RFhVqrfkcTo",
  // 🔹 جرب من غير TLS أولًا
});

client.on("connect", () => console.log("✅ Connected (no TLS)"));
client.on("ready", () => console.log("🚀 Redis ready"));
client.on("error", (err) => console.error("❌ Redis error:", err));
client.on("close", () => console.log("⚠️ Redis closed"));
