const { MongoClient } = require("mongodb");
const express = require("express");

const config = require("./config");
const LoggerProvider = require('./utils/LoggerProvider');
const QueueManager = require('./jobs/QueueManager');
const BrainClient = require('./utils/BrainClient');
const GetCategoryProductsHandler = require('./jobs/GetCategoryProductsHandler');
const ProcessProductHandler = require('./jobs/ProcessProductHandler');
const XMLGenerator = require('./utils/XMLGenerator');
const uri = `mongodb://${config.mongo.user}:${config.mongo.password}@${config.mongo.host}:${config.mongo.port}`;

async function main(){
    LoggerProvider.initConsoleLogger('debug');
    const queueManager = new QueueManager({
        redisHost: config.redis.host,
        redisPort: config.redis.port,
    });
    const brainClient = new BrainClient({
        login: config.brainLogin,
        password: config.brainPassword,
        logger: LoggerProvider.create('BrainClient'),
    });
    const app = express();
    const client = new MongoClient(uri);
    const database = client.db(config.dbName);
    const logger = LoggerProvider.create('app');
    const processProductQueue =  queueManager.getQueue(ProcessProductHandler.queueName);
    const getCategoryProductsQueue =  queueManager.getQueue(GetCategoryProductsHandler.queueName);
    const syncQueue =  queueManager.getQueue('sync');

    await client.connect();

    const processProductHandler = new ProcessProductHandler({
        logger: LoggerProvider.create('ProcessProductHandler'),
        brainClient,
        database,
    });
    const getCategoryProductsHandler = new GetCategoryProductsHandler({ 
        logger: LoggerProvider.create('GetCategoryProductsHandler'),
        brainClient,
        processProductQueue,
    });

    await brainClient.login();

    let vendors = await brainClient.getVendors();
    let categories = await brainClient.getCategories();

    processProductQueue.process(1, job => processProductHandler.handle(job));
    getCategoryProductsQueue.process(1, job => getCategoryProductsHandler.handle(job));

    syncQueue.process(1, async () => {
        await brainClient.login();

        // update the list every sync
        categories = await brainClient.getCategories();
        vendors = await brainClient.getVendors();

        getCategoryProductsQueue.addBulk(
            categories.map(category => {
                return {
                    data: {
                        categoryName: category.name,
                        categoryId: category.categoryID,
                    }
                }
            })
        );
    });

    syncQueue.add(
        {},
        { 
            repeat: { 
                cron: '* */5 * * *' // every 5 hours
            }
        }
    );

    app.get('/brain.xml', async (req, res) => {
        const generator = new XMLGenerator({
            logger: LoggerProvider.create('XMLGenerator'),
            database,
        });

        const xml = await generator.generate(
            categories,
            vendors,
        );

        res.set('Content-Type', 'text/xml');
        res.send(xml);
    });

    app.listen(3000, () => {
        logger.info("Server running on port 3000");
    });
}

main().catch(console.error);