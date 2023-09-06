const redis = require("redis")
const redisPort = process.env.REDIS_PORT || 6379
const redisHost = process.env.HOST || '127.0.0.1'
const redisClient = redis.createClient(redisPort, redisHost)



module.exports = {redisClient} 