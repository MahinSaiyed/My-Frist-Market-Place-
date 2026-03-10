const http = require('node:http');
const app = require('./src/app');

const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  app(req, res);
});

server.listen(PORT, () => {
  console.log(`TradeFusion AI Market running on http://localhost:${PORT}`);
});
