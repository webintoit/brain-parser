const YML = require('yandex-market-language');

class XMLGenerator {
    constructor({
        database,
        logger,
    }) {
        this._database = database;
        this._logger = logger;
    }


    async generate(categories, vendors) {
        const productsInStock = await this._database.collection('products').find({
            productInStock: { $gt: 0 },
        }).toArray();

        console.log(vendors)

        this._logger.info('Generating XML for %d products', productsInStock.length);

        const ymlData = {
            name: 'Brain YML',
            company: 'MaksiShop',
            url: 'https://maksi.shop',
            currencies: [
                { id: 'UAH', rate: 1 },
            ],
            'delivery-options': [
                { cost: 0, days: [1, 20], 'order-before': 12 }
            ],
            categories: categories.map((category) => {
                return {
                    id: String(category.categoryID),
                    parentId: String(category.parentID),
                    name: category.name,
                };
            }),
            offers: productsInStock.map((product) => {
                const pictures = product.images.map((image) => image.full_image);
                const vendor = vendors.find((vendor) => vendor.vendorID == product.vendorID);

                const offer = {
                    id: String(product.productID),
                    available: true,
                    url: `https://maksi.shop/product/${product.productID}`,
                    price: Number(product.price_uah || product.retail_price || 0),
                    currencyId: 'UAH',
                    categoryId: String(product.categoryID),
                    picture: pictures,
                    store: true,
                    pickup: true,
                    delivery: true,
                    name: product.name,
                    country_of_origin: product.country,
                    vendor: vendor?.name || 'MSBR',
                    weight: product.weight,
                    description: product.description,
                    vendorCode: product.articul,
                    param: product.options.map((option) => {
                        return {
                            name: option.name,
                            value: option.value,
                        };
                    }),
                    inStock: product.productInStock,
                    ean: product.EAN,
                };
                
                if(product.warranty){
                    offer.param.push({
                        name: 'Гарантія, міс.',
                        value: product.warranty,
                    });
                }

                if(product.product_code){
                    offer.param.push({
                        name: 'Код товару',
                        value: product.product_code,
                    });
                }

                return offer;
            }),
        };


        const yml = YML(ymlData, { validate: false });

       return yml.create().end({ pretty: true });
    }
}

module.exports = XMLGenerator;
