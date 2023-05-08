const JOB_MAX_ATTEMPTS = 3;
const JOB_BACKOFF_DELAY_MS = 1000;

class GetProductsFromPricelistHandler {
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
        return 'get-products-from-pricelist';
    }

    async handle(job) {
        try {
            const pricelistUrl = await this._brainClient.getPricelistUrl();
            this._logger.info('Got pricelist url:', pricelistUrl);
            const prices = await this._brainClient.getPrices(pricelistUrl);

            const availableItems = Object.values(prices).filter(item => item.Available);

            this._processProductQueue.addBulk(
                availableItems
                    .map((product) => ({
                        data: {
                            product: {
                                productID: product.ProductID,
                                name: product.Name,
                                price: product.Price,
                                vendorID: product.VendorID,
                                groupId: product.GroupID,
                                product_code: product.Code,
                            },
                        },
                        opts: { 
                            backoff: { type: 'exponential', delay: JOB_BACKOFF_DELAY_MS },
                            attempts: JOB_MAX_ATTEMPTS,
                        }
                    }))
            );

            this._logger.info(
                'Found %d products to queue for pricelist.',
                availableItems.length,
            )

           
        } catch (error) {
            this._logger.error('Could not execute job:', job.data,  error);
            throw error;
        }
    }
}

module.exports = GetProductsFromPricelistHandler;
