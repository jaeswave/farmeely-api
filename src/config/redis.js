const redis = require("redis");

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  password: process.env.REDIS_PASSWORD,
});

redisClient
  .connect()
  .then(() => console.log("✅ Connected to Redis Cloud!"))
  .catch((err) => {
    console.error("❌ Redis client not connected", err);
    process.exit(1);
  });

module.exports = { redisClient };
