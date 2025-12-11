// const { Queue } = require("bullmq");
// const { connection } = require("../config/redis");

// // إنشاء الـ Queue
// const productQueue = new Queue("productQueue", { connection });

// module.exports = { productQueue };

const { Queue } = require("bullmq");
const { connection } = require("../config/redis");

const productQueue = new Queue("productAdd", { connection });

module.exports = { productQueue };
