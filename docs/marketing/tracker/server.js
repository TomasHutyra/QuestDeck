const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DEFAULT_DATA = { tasks: {}, routine: {}, metrics: {} };

function readData(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_DATA, null, 2), 'utf8');
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeData(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function createRequestHandler(dataFilePath, htmlFilePath) {
  const dir = path.dirname(htmlFilePath);
  return function handler(req, res) {
    if (req.method === 'GET' && req.url === '/') {
      try {
        const html = fs.readFileSync(htmlFilePath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch {
        res.writeHead(404);
        res.end('index.html not found');
      }
    } else if (req.method === 'GET' && req.url === '/utils.js') {
      try {
        const js = fs.readFileSync(path.join(dir, 'utils.js'), 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
        res.end(js);
      } catch {
        res.writeHead(404);
        res.end('utils.js not found');
      }
    } else if (req.method === 'GET' && req.url === '/data') {
      const data = readData(dataFilePath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } else if (req.method === 'POST' && req.url === '/data') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          writeData(dataFilePath, data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid JSON' }));
        }
      });
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  };
}

if (require.main === module) {
  const dataFilePath = path.join(__dirname, 'tracker-data.json');
  const htmlFilePath = path.join(__dirname, 'index.html');
  const server = http.createServer(createRequestHandler(dataFilePath, htmlFilePath));
  server.listen(PORT, () => {
    console.log(`QuestDeck Launch Tracker → http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop.');
  });
}

module.exports = { readData, writeData, createRequestHandler, DEFAULT_DATA };
