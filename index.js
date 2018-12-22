const osmosis = require('osmosis');
const axios = require('axios');
const botData = require('./config.js');
const cron = require('node-cron');
const emoji = require('node-emoji');
const url = require('url');

const REQUEST_URL = 'https://ze-fir.com/api/parser_page';
const HEADERS_CONFIG = {
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    }
};

/**
 * Get data at post request
 *
 * @returns {object Promise}
 */
function fetchPageData() {
    return axios
        .post(REQUEST_URL, botData)
        .then((response) => {
            if (response.status === 200) {
                return {
                    url: response.data.url,
                    id: response.data.id
                };
            }
        })
        .catch(error => console.log(error));
}

/**
 * Run scraping to specific web site
 *
 * @param value {String}
 *
 * @returns {object Promise}
 */
function runScraping(path) {
    const selector = 'body';
    const parsedURI = url.parse(path).href;

    return new Promise((resolve, reject) => {
        let content = [];

        osmosis
            .get(parsedURI)
            .then((context) => {
                content.push(context.get(selector).toString());
            })
            .error(error => reject(error))
            .done(() => resolve(content));
    });
}

/**
 * Get data and send changed data
 *
 * @Abstract
 *
 * @returns {function}
 */
function middleware() {
    const promise = fetchPageData();

    promise
        .then((response) => {
            let page = Object.assign({}, response);

            runScraping(page.url)
                .then((content) => {
                    page.page_content = content.join();
                    page.is_success = 'true';
                    savePageData(page);
                })
                .catch((error) => {
                    page.page_content = 'empty';
                    page.is_success = 'false';
                    console.log(error);
                    savePageData(page);
                });
        })
        .catch(error => console.log(error));
}

/**
 * Save data by API
 *
 * @returns {object Promise}
 */
const savePageData = (page) => {
    console.log(`Scraping is ${page.is_success === 'true' ? 
        `done! ${emoji.get('hamster')}` : 
        `fail! ${emoji.get('japanese_ogre')}`}`);

    const data = {
        ...page,
        ...botData
    };

    axios
        .patch(`${REQUEST_URL}/${page.id}/saved`, data, HEADERS_CONFIG)
        .then((response) => {
            if (response.status === 200) {
                console.log(`${page.url} : ${JSON.stringify(response.data)}`);
            }
        })
        .catch((error) => {
            console.log(error);
            task.stop();
        });
};

const task = cron.schedule('*/45 * * * * *', () => {
    console.log(`-------------------`);
    console.log(`Running Cron Job`);
    middleware();
}, { scheduled: false });

task.start();
