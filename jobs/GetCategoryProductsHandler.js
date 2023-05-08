const LIMIT = 50;
const JOB_MAX_ATTEMPTS = 3;
const JOB_BACKOFF_DELAY_MS = 1000;
const REQUEST_INTERVAL_MS = 3000;

class GetCategoryProductsHandler {
    constructor({ 
        logger,
        brainClient,
        processProductQueue
    }) {
        this._logger = logger;
        this._brainClient = brainClient;
        this._processProductQueue = processProductQueue;
    }

    static get queueName(){
        return 'get-category-products';
    }

    async handle(job) {
        try {
            this._logger.info('Handling category %s', job.data.categoryName);

            let offset = 0;
            let productsCount = Infinity;

            while(true) {
                const { list, count } = await this._brainClient.getCategoryProducts({
                    category: job.data.categoryId,
                    limit: LIMIT,
                    offset
                });
                productsCount = count;

                this._processProductQueue.addBulk(
                    list.map((product) => ({
                        data: { product, categoryId: job.data.categoryId, categoryName: job.data.categoryName },
                        opts: { 
                            backoff: { type: 'exponential', delay: JOB_BACKOFF_DELAY_MS },
                            attempts: JOB_MAX_ATTEMPTS,
                        }
                    }))
                );

                this._logger.info(
                    'Added %d products to queue for category %s. Offset: %d. Total Count: %d',
                    list.length,
                    job.data.categoryName,
                    offset,
                    count
                );

                if(list.length < LIMIT || productsCount < offset + LIMIT) {
                    break;
                }

                offset += LIMIT;

                await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS));
            }
           
        } catch (error) {
            this._logger.error('Could not execute job:', job.data,  error);
            throw error;
        }
    }
}

module.exports = GetCategoryProductsHandler;
