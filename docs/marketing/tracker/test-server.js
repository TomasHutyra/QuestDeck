const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const TEST_PORT = 3001;
const TEST_DATA_FILE = path.join(__dirname, '_test-data.json');

function req(method, urlPath, bodyObj) {
  return new Promise((resolve, reject) => {
    const body = bodyObj !== undefined ? JSON.stringify(bodyObj) : null;
    const options = {
      hostname: 'localhost', port: TEST_PORT,
      path: urlPath, method,
      headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}
    };
    const r = http.request(options, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function runTests() {
  if (fs.existsSync(TEST_DATA_FILE)) fs.unlinkSync(TEST_DATA_FILE);

  // Test 1: GET /data creates and returns default structure when file is absent
  let r = await req('GET', '/data');
  assert.strictEqual(r.status, 200, 'GET /data status');
  assert.deepStrictEqual(JSON.parse(r.body), { tasks: {}, routine: {}, metrics: {} });
  assert(fs.existsSync(TEST_DATA_FILE), 'data file was created');
  console.log('  ✓ GET /data returns default structure and creates file');

  // Test 2: POST /data saves and confirms
  const testData = { tasks: { 'w0-mon-0': true }, routine: {}, metrics: {} };
  r = await req('POST', '/data', testData);
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(JSON.parse(r.body), { ok: true });
  console.log('  ✓ POST /data saves data and returns {ok:true}');

  // Test 3: GET /data returns what was saved
  r = await req('GET', '/data');
  assert.deepStrictEqual(JSON.parse(r.body), testData);
  console.log('  ✓ GET /data returns previously saved data');

  // Test 4: POST /data with invalid JSON returns 400
  const badReq = await new Promise((resolve, reject) => {
    const body = 'not-json';
    const opts = {
      hostname: 'localhost', port: TEST_PORT, path: '/data', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const r2 = http.request(opts, res => {
      let d = ''; res.on('data', c => { d += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r2.on('error', reject);
    r2.write(body);
    r2.end();
  });
  assert.strictEqual(badReq.status, 400);
  console.log('  ✓ POST /data with invalid JSON returns 400');
}

// Require server.js — this will fail until server.js exists
const { createRequestHandler, DEFAULT_DATA } = require('./server');
const server = http.createServer(createRequestHandler(TEST_DATA_FILE, path.join(__dirname, 'index.html')));
server.listen(TEST_PORT, async () => {
  try {
    await runTests();
    console.log('\nAll server tests passed ✓');
  } catch (e) {
    console.error('\n✗ Test failed:', e.message);
    process.exitCode = 1;
  } finally {
    server.close();
    if (fs.existsSync(TEST_DATA_FILE)) fs.unlinkSync(TEST_DATA_FILE);
  }
});
