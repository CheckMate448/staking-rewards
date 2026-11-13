const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  app.use(createProxyMiddleware('/api/calculate-rewards', {
    target: process.env.REWARDS_API_TARGET || 'http://127.0.0.1:5025',
    timeout: 10000,
    proxyTimeout: 10000,
  }));
};
