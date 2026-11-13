const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const app = require('../../server.js');

let server;
let endpoint;

before(async () => {
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  endpoint = `http://127.0.0.1:${server.address().port}/api/calculate-rewards`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

const post = body => fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body,
});

test('API returns a JSON projection for a valid request', async () => {
  const response = await post(JSON.stringify({
    principal: 1000, apy: 8, duration: 1,
    durationUnit: 'years', compoundingFrequency: 'monthly',
  }));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.finalBalance, 1080);
  assert.equal(result.durationDays, 365);
  assert.equal(result.chart.at(-1).balance, 1080);
});

test('API returns field errors and survives malformed requests', async () => {
  const invalid = await post('{"principal":-1}');
  assert.equal(invalid.status, 400);
  assert.ok((await invalid.json()).errors.principal);
  const malformed = await post('{');
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).message, 'Send valid JSON.');
  assert.equal((await post('{}')).status, 400);
});
