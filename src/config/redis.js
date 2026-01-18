const redis = require("redis");

// Railway provides multiple Redis URL formats
// Use the appropriate one based on your needs:

// Option 1: Using REDIS_URL (most reliable)
const redisClient = redis.createClient({
  url: process.env.REDIS_PUBLIC_URL, // Use this instead of REDIS_URL
  password: process.env.REDIS_PASSWORD,
});


redisClient
  .connect()
  .then(() => console.log("✅ Connected to Railway Redis!"))
  .catch((err) => {
    console.error("❌ Redis connection error:", err.message);
    // Don't exit immediately in production - you might want to retry
    if (process.env.NODE_ENV === "production") {
      console.log("⚠️  Continuing without Redis (fallback mode)");
    } else {
      process.exit(1);
    }
  });

// Handle connection errors gracefully
redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err.message);
});

redisClient.on("reconnecting", () => {
  console.log("Redis client reconnecting...");
});

module.exports = { redisClient };
