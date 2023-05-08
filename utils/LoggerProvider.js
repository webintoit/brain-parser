const log4js = require('log4js');

class LoggerProvider {
    static initConsoleLogger(defaultLogLevel) {
        this._defaultLevel = defaultLogLevel;
        
        log4js.configure({
            appenders: {
                console: { type: 'console' }
            },
            categories: {
                default: {
                    appenders: [ 'console' ],
                    level: defaultLogLevel,
                }
            }
        });

        return this;
    }

    static create(category, level = this._defaultLevel) {
        const logger = log4js.getLogger(category);

        if (level){
            logger.level = level;
        }

        return logger;
    }
}

module.exports = LoggerProvider;
