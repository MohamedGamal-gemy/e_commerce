// const { Queue } = require("bullmq");
// const { connection } = require("../config/redis");

// // إنشاء الـ Queue
// const productQueue = new Queue("productQueue", { connection });

// module.exports = { productQueue };

const { Queue } = require("bullmq");
const { connection } = require("../config/redis");

// const productUpdateQueue = new Queue("processProduct", { connection });
// const productQueue = new Queue("productAdd", { connection });
const productQueue = new Queue("productProcessor", { connection });

module.exports = { productQueue };
