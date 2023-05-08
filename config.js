module.exports = {
    dbName: 'brain_db',
    mongo:{
        host: process.env.MONGO_HOST || 'mongo',
        port: process.env.MONGO_PORT || 27017,
        user: process.env.MONGO_USER || 'root',
        password: process.env.MONGO_PASSWORD || 'password',
    },
    redis: {
        host: process.env.APP_REDIS_HOST || 'localhost',
        port: process.env.APP_REDIS_PORT || 6379,
        expire: 30 * 24 * 60 * 60, // 30 days
    },
    brainLogin: process.env.BRAIN_LOGIN || 'login',
    brainPassword: process.env.BRAIN_PASSWORD || 'password',
    parseFromPricelist: process.env.PARSE_FROM_PRICELIST,
};