// https://angular.io/guide/build#proxying-to-a-backend-server

const PROXY_CONFIG = {
  '/api/**': {
    target: 'http://localhost:8080',
    changeOrigin: true,
    secure: false,
    logLevel: 'debug',
  },
  '/users/**': {
    target: 'https://api.github.com',
    changeOrigin: true,
    secure: false,
    logLevel: 'debug',
  },
};

module.exports = PROXY_CONFIG;
