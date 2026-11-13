const periodsPerYear = Object.freeze({ daily: 365, weekly: 52, monthly: 12, annually: 1 });
const daysPerYear = 365;
const limits = Object.freeze({ principal: 1e12, apy: 1000, years: 50, tokenPrice: 1e9 });

function validateRewards(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { errors: { body: 'Send a JSON object.' } };
  }

  const { principal, apy, duration, durationUnit, compoundingFrequency, tokenPrice } = input;
  const errors = {};
  const finite = Number.isFinite;
  const durationYears = durationUnit === 'days' ? duration / daysPerYear : duration;
  if (!finite(principal) || principal <= 0 || principal > limits.principal) {
    errors.principal = 'Enter a principal greater than 0 and at most 1 trillion tokens.';
  }
  if (!finite(apy) || apy < 0 || apy > limits.apy) {
    errors.apy = 'Enter an APY from 0 to 1,000 percent.';
  }
  if (durationUnit !== 'days' && durationUnit !== 'years') {
    errors.durationUnit = 'Choose days or years.';
  }
  if (!finite(duration) || !(durationYears > 0) || durationYears > limits.years) {
    errors.duration = 'Enter a duration greater than 0 and at most 50 years (18,250 days).';
  }
  if (typeof compoundingFrequency !== 'string' || !Object.hasOwn(periodsPerYear, compoundingFrequency)) {
    errors.compoundingFrequency = 'Choose daily, weekly, monthly, or annually.';
  }
  if (tokenPrice !== undefined && (!finite(tokenPrice) || tokenPrice < 0 || tokenPrice > limits.tokenPrice)) {
    errors.tokenPrice = 'Enter a USD token price from 0 to 1 billion.';
  }

  if (Object.keys(errors).length) return { errors };
  return {
    value: { principal, apy, durationYears, periods: periodsPerYear[compoundingFrequency], tokenPrice },
  };
}

module.exports = { validateRewards, daysPerYear };
