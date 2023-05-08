const JOB_MAX_ATTEMPTS = 1;
const JOB_BACKOFF_DELAY_MS = 1000;

class GetProductsFromPricelistHandler {
    constructor({ 
        logger,
        brainClient,
        processProductQueue,
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
            const updatedProductIds = await this._brainClient.getUpdatedProductIds();
            const pricelistUrl = await this._brainClient.getPricelistUrl();
            this._logger.info('Got pricelist url:', pricelistUrl);
            const prices = await this._brainClient.getPrices(pricelistUrl);
            const availableItems = Object.values(prices).filter(item => {
                return item.Available || updatedProductIds.includes(item.ProductID);
            });

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

            this._logger.info('Found %d modified items', updatedProductIds.length);

            /**
             * Add products that were updated (out of stock ?) to the queue as pricelist has only `available` items
             */
            this._processProductQueue.addBulk(
                updatedProductIds
                    .map((id) => ({
                        data: {
                            product: {
                                productID: id,
                                name: id,
                                price: 0,
                                vendorID: 0,
                            },
                        },
                        opts: { 
                            backoff: { type: 'exponential', delay: JOB_BACKOFF_DELAY_MS },
                            attempts: JOB_MAX_ATTEMPTS,
                        }
                    }))
            );

            this._logger.info(
                'Found %d products to queue for pricelist of %d.',
                availableItems.length,
                Object.keys(prices).length
            )

           
        } catch (error) {
            this._logger.error('Could not execute job:', job.data,  error);
            throw error;
        }
    }
}

module.exports = GetProductsFromPricelistHandler;
