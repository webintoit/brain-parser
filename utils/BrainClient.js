const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');

const BRAIN_URL = 'http://api.brain.com.ua/';
const RELOGIN_AFTER_REQUESTS = 20;
const MODIFIED_TIME_SENSITIVITY_DAYS = 3; // items modified in the last 3 days

class BrainClient {
    constructor({ login, password, language='ua', logger, targetId = '57' }) {
        this._login = login;
        this._password = password;
        this._sessionToken = null;
        this._language = language;
        this._requestsMade = 0;
        this._logger = logger;
        this._targetId = targetId;
    }


    async login() {
        const formData = new FormData();
        formData.append('login', this._login);
        formData.append(
            'password',
            crypto.createHash('md5').update(this._password).digest("hex")
        )
        const response = await this._axios.post(`${BRAIN_URL}/auth`, formData);
        this._sessionToken = response.data.result;
        this._logger.info('Logged in to brain. Session token:', this._sessionToken);
    }

    async getCategories() {
        const { data } = await this._axios.get(`${BRAIN_URL}/categories/${this._sessionToken}?lang=${this._language}`);

        return data.result;
    }

    async getCategoryProducts({ category, limit, offset }) {
        const { data } = await this._axios.get(
            `${BRAIN_URL}/products/${category}/${this._sessionToken}?&limit=${limit}&offset=${offset}&lang=${this._language}`,
            { timeout: 15000, maxContentLength: Infinity }
        );

        return { list: data.result?.list || [], count: data.result?.count || 0 };
    }

    async getProductInfo(productId){
        const { data } = await this._axios.get(`${BRAIN_URL}/product/${productId}/${this._sessionToken}?lang=${this._language}`);
        return data.result;
    }

    async getProductImages(productId){
        const { data } = await this._axios.get(`${BRAIN_URL}/product_pictures/${productId}/${this._sessionToken}?lang=${this._language}`);
        return data.result;
    }

    async getVendors(){
        const { data } = await this._axios.get(`${BRAIN_URL}/vendors/${this._sessionToken}?lang=${this._language}`);
        return data.result;
    }

    async getPricelistUrl(){
        const { data } = await this._axios.get(
            `${BRAIN_URL}/pricelists/${this._targetId}/json/${this._sessionToken}?lang=${this._language}&full=3`
        );
        return data.url;
    }

    async getPrices(url){
        const { data } = await this._axios.get(url);
        return data;
    }

    async getUpdatedProductIds(){
        const limit = 100;
        let offset = 0;
        let productsCount = Infinity;
        const updatedProductIds = [];
        const modifiedDate = new Date();

        modifiedDate.setDate(modifiedDate.getDate() - MODIFIED_TIME_SENSITIVITY_DAYS);
        modifiedDate.setHours(0, 0, 0, 0);

        const modifiedDateString = encodeURIComponent(
            modifiedDate.toISOString().replace('T', ' ').replace(/\.\d{3}Z/, '')
        );

        while(true) {
            const { data } = await this._axios.get(
                `${BRAIN_URL}/modified_products/${this._sessionToken}?modified_time=${modifiedDateString}&limit=${limit}&offset=${offset}`
            );
            productsCount = data.result.count;
            updatedProductIds.push(...data.result.productIDs);

            if(data.result.length < limit || productsCount < offset + limit) {
                break;
            }

            offset += limit;
        }
        
        return updatedProductIds;
    }

    get _axios() {
        this._requestsMade++;

        if(this._requestsMade > RELOGIN_AFTER_REQUESTS) {
            this._requestsMade = 0;
            this.login().catch(error => { 
                this._logger.error('Could not login to brain', error)
            });
        }
        return axios;
    }
}

module.exports = BrainClient;
