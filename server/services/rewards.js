const { daysPerYear } = require('../validation/rewards');

const maxIntervals = 120;

function calculateRewards({ principal, apy, durationYears, periods, tokenPrice }) {
  // Effective APY sets the annual growth factor. Convert it into a per-period log return.
  const periodLogReturn = Math.log1p(apy / 100) / periods;
  const totalPeriods = durationYears * periods;
  const rewardsAt = elapsedPeriods => principal * Math.expm1(periodLogReturn * elapsedPeriods);
  const rewards = rewardsAt(totalPeriods);
  const finalBalance = principal + rewards;

  // Sample compounding boundaries and always include the exact fractional endpoint.
  const stride = Math.ceil(Math.ceil(totalPeriods) / maxIntervals);
  const chart = [{ days: 0, balance: principal }];
  for (let period = stride; period < totalPeriods; period += stride) {
    chart.push({ days: period / periods * daysPerYear, balance: principal + rewardsAt(period) });
  }
  const durationDays = durationYears * daysPerYear;
  chart.push({ days: durationDays, balance: finalBalance });

  return {
    finalBalance,
    rewards,
    durationYears,
    durationDays,
    chart,
    ...(tokenPrice === undefined ? {} : {
      usd: { finalBalance: finalBalance * tokenPrice, rewards: rewards * tokenPrice },
    }),
  };
}

module.exports = { calculateRewards };
