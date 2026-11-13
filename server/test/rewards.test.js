const assert = require('node:assert/strict');
const test = require('node:test');
const { validateRewards } = require('../validation/rewards');
const { calculateRewards } = require('../services/rewards');

const base = {
  principal: 1000, apy: 8, duration: 365,
  durationUnit: 'days', compoundingFrequency: 'monthly',
};
const project = overrides => calculateRewards(validateRewards({ ...base, ...overrides }).value);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);

test('effective APY yields the same annual balance at each supported frequency', () => {
  for (const compoundingFrequency of ['daily', 'weekly', 'monthly', 'annually']) {
    const result = project({ compoundingFrequency });
    near(result.finalBalance, 1080);
    near(result.rewards, 80);
    assert.equal(result.durationYears, 1);
  }
});

test('fractional years compound through the final fractional period', () => {
  const result = project({ duration: 1.5, durationUnit: 'years', tokenPrice: 2.5, compoundingFrequency: 'annually' });
  near(result.finalBalance, 1000 * 1.08 ** 1.5);
  near(result.usd.finalBalance, result.finalBalance * 2.5);
  near(result.usd.rewards, result.rewards * 2.5);
  assert.deepEqual(result.chart.map(point => point.days), [0, 365, 547.5]);
});

test('zero yield produces a flat chart and zero price remains a valid USD projection', () => {
  const result = project({ apy: 0, tokenPrice: 0 });
  assert.equal(result.rewards, 0);
  assert.ok(result.chart.every(point => point.balance === 1000));
  assert.deepEqual(result.usd, { finalBalance: 0, rewards: 0 });
  assert.equal(project({}).usd, undefined);
});

test('long daily projections have bounded, increasing samples and exact endpoints', () => {
  const result = project({ apy: 1000, duration: 50, durationUnit: 'years', compoundingFrequency: 'daily' });
  assert.ok(result.chart.length <= 121);
  assert.ok(Number.isFinite(result.finalBalance));
  assert.deepEqual(result.chart[0], { days: 0, balance: 1000 });
  assert.deepEqual(result.chart.at(-1), { days: 18250, balance: result.finalBalance });
  assert.ok(result.chart.slice(1).every((point, index) => point.days > result.chart[index].days && point.balance >= result.chart[index].balance));
});

test('validation rejects non-numeric, non-finite, invalid and out-of-range inputs', () => {
  const invalid = {
    principal: [undefined, '1000', 0, -1, Infinity, 1e13],
    apy: [null, -1, NaN, 1001],
    duration: [0, -1, 18251, '365'],
    durationUnit: ['months'],
    compoundingFrequency: ['hourly', 'constructor', ['daily']],
    tokenPrice: [null, -1, Infinity, 1e10],
  };
  for (const [field, values] of Object.entries(invalid)) {
    for (const value of values) {
      assert.ok(validateRewards({ ...base, [field]: value }).errors[field], field);
    }
  }
  assert.ok(validateRewards(null).errors.body);
  assert.ok(validateRewards([]).errors.body);
});
