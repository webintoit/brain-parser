class ProcessProductHandler {
    constructor({ 
        logger,
        brainClient,
        database,
    }) {
        this._logger = logger;
        this._brainClient = brainClient;
        this._database = database;
    }

    static get queueName(){
        return 'get-product-info';
    }

    async handle(job) {
        try {
            this._logger.info('Handling product. Id: %s, Name: %s', job.data.product.productID, job.data.product.name);
            const products = this._database.collection('products');


            const productFromDb = await products.findOne({ productID: job.data.product.productID, product_code: job.data.product.product_code });

            const productInfo = await this._brainClient.getProductInfo(job.data.product.productID);
            const productInStock = Object.values(productInfo.available).reduce((acc, val) => acc + Number(val), 0);
            
            if(!productInStock && !productFromDb) {
                // it is not in stock and we don't want it in db
                return;
            }
            
            let images = [];

            if(!productFromDb || !productFromDb.images || !productFromDb.images.length){
                images = await this._brainClient.getProductImages(job.data.product.productID);
            }

            if(productFromDb){
                await products.updateOne(
                    { _id: productFromDb._id },
                    { $set: { ...productInfo, images, productInStock } }
                );
            } else {
                await products.insertOne({ ...productInfo, images, productInStock });
            }

            this._logger.info('Product handled. Id: %s, Name: %s. Stock: %d', job.data.product.productID, job.data.product.name, productInStock);
           
        } catch (error) {
            this._logger.error('Could not execute job:', job.data,  error);
            throw error;
        }
    }
}

module.exports = ProcessProductHandler;
