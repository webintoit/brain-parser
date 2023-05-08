const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');

const BRAIN_URL = 'http://api.brain.com.ua/';
const RELOGIN_AFTER_REQUESTS = 20;

class BrainClient {
    constructor({ login, password, language='ua', logger }) {
        this._login = login;
        this._password = password;
        this._sessionToken = null;
        this._language = language;
        this._requestsMade = 0;
        this._logger = logger;
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
