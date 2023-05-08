/** @typedef {import('bull').Queue} BullQueue */

const Queue = require('bull');
const Redis = require('ioredis');
class QueueManager {
    constructor({ redisHost, redisPort }) {
        this._queues = new Map();
        this._redisConfig = {
            host: redisHost,
            port: redisPort,
        };
    }

    get redisPub() {
        if (!this._redisPub){
            this._redisPub = new Redis(this._redisConfig, { enableReadyCheck: false, maxRetriesPerRequest: null });
        }
        return this._redisPub;
    }

    get redisSub() {
        if (!this._redisSub){
            this._redisSub = new Redis(this._redisConfig, { enableReadyCheck: false, maxRetriesPerRequest: null });
        }
        return this._redisSub;
    }

    createRedisClient(type) {
        switch (type) {
            case 'client':
                return this.redisPub;
            case 'subscriber':
                return this.redisSub;
            default:
                return new Redis(this._redisConfig, { enableReadyCheck: false, maxRetriesPerRequest: null });
        }
    }

    /** @returns {BullQueue} */
    getQueue(name, settings = null) {
        if (!this._queues.get(name)) {
            const config = {
                createClient: type => this.createRedisClient(type),
                settings
            };
            const q = new Queue(name, config);
            this._queues.set(name, q);
        }
        return this._queues.get(name);
    }

}

module.exports = QueueManager;
