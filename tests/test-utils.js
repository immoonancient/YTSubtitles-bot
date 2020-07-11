require('dotenv').config();

const nock = require('nock');
const { createProbot } = require('probot');

function beforeEachTest() {
  nock.disableNetConnect();

  nock('https://raw.githubusercontent.com/')
    .get(`/${process.env.REPO_OWNER}/${process.env.REPO}/master/static/data/channels.json`)
    .replyWithFile(200, __dirname + '/fixtures/test_channels.json', { 'Content-Type': 'application-json'});

  nock('https://raw.githubusercontent.com')
    .get(`/${process.env.REPO_OWNER}/${process.env.REPO}/master/static/data/translation-table.json`)
    .replyWithFile(200, __dirname + '/fixtures/test_translation_table.json', { 'Content-Type': 'application-json'});
}

function afterEachTest() {
  nock.cleanAll();
  nock.enableNetConnect();
}

function createApp() {
  const probot = createProbot({ id: 1, cert: 'test', githubToken: 'test' });
  probot.load(require('..'));
  return probot;
}

function interceptWebRequest(domain, method, path, responseCode, responseBody) {
  return new Promise(resolve => {
    nock(domain)[method](path).reply(
      responseCode,
      (uri, requestBody) => {
        resolve(requestBody);
        return responseBody;
      });
  });
}

function timeout(delay) {
  return new Promise(resolve => setTimeout(resolve, delay));
}

module.exports = {
  beforeEachTest: beforeEachTest,
  afterEachTest: afterEachTest,
  createApp: createApp,
  intercept: interceptWebRequest,
  timeout: timeout,
};