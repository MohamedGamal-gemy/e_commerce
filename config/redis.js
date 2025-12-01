// config/redis.js
require("dotenv").config();
const Redis = require("ioredis");

const HOST = "redis-16204.c89.us-east-1-3.ec2.redns.redis-cloud.com";
const PORT = 16204;
const USERNAME = "default";
const PASSWORD = "mRjVv04lQQIyrnkRTvex1RFhVqrfkcTo";

// ✅ اتصال غير مشفر (Non-TLS) لأن السيرفر لا يدعم TLS
const connection = new Redis({
  host: HOST,
  port: PORT,
  username: USERNAME,
  password: PASSWORD,

  // IMPORTANT
  // tls: null, // ❌ ممنوع وجود TLS
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on("connect", () => console.log("✅ Connected to Redis Cloud (NO TLS)"));
connection.on("ready", () => console.log("🚀 Redis ready"));
connection.on("error", (err) =>
  console.error("❌ Redis error:", err)
);

module.exports = { connection };
