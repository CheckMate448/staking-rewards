# Staking Rewards Calculator

The calculator lives at `/dashboard` in the existing React and Material UI app. Enter a stake, effective annual yield, and term to project the token balance and rewards. Enter a token price to see the same figures in USD. The calculator needs no database, wallet, or API credentials.

## Run locally

Use Node.js 22 or later. From the directory containing `package.json`:

```sh
npm ci --ignore-scripts
npm start
```

Open [localhost:3000/dashboard](http://localhost:3000/dashboard). The React dev server proxies the calculator request to Express on port `5025`. To use a different API port, set `PORT` for Express and point `REWARDS_API_TARGET` at that port in the React process.

For a production build, run `npm run build`, then start `npm run server` with `NODE_ENV=production`. Express serves the compiled app and the API on the same port. In PowerShell, set the environment variable with `$env:NODE_ENV = "production"` before starting the server.

## API

`POST /api/calculate-rewards` accepts a JSON body. The example uses 1,000 tokens at 8% APY for one year.

```json
{
  "principal": 1000,
  "apy": 8,
  "duration": 365,
  "durationUnit": "days",
  "compoundingFrequency": "monthly",
  "tokenPrice": 2.5
}
```

The response contains `finalBalance` (1080), `rewards` (80), `durationYears` (1), `durationDays` (365), and an ordered `chart` array of `{ days, balance }` points. The optional `usd` object contains `finalBalance` (2700) and `rewards` (200) when a price is supplied.

| Field | Accepted values |
| --- | --- |
| `principal` | Greater than 0 through 1 trillion tokens |
| `apy` | 0 through 1,000 percent |
| `duration` | Greater than 0 through 50 years or 18,250 days. Fractions are allowed. |
| `durationUnit` | `days` or `years` |
| `compoundingFrequency` | `daily`, `weekly`, `monthly`, or `annually` |
| `tokenPrice` | Optional USD price from 0 through 1 billion |

Numeric fields must be finite JSON numbers. Invalid fields return HTTP 400 with an `errors` object keyed by field name. Malformed JSON returns HTTP 400 with a message. Unexpected failures return HTTP 500 with a generic message.

## Calculation model

For effective annual yield `y = apy / 100` and `n` periods per year, the periodic rate is `q = (1 + y)^(1/n) - 1`. Over `t` years, the balance is `P × (1 + q)^(n × t) = P × (1 + y)^t`. With a fixed APY and term, the final balance is identical across frequencies. Frequency determines the chart’s intermediate sample dates.

The model uses a 365-day year and 365, 52, 12, or 1 periods per year. A partial final period accrues exponentially. The service uses `log1p` and `expm1` to preserve precision at small yields and leaves display rounding to the UI. APY and token price are held constant throughout the projection. Fees and taxes are outside the model.

The final balance takes **O(1)** time and space. Generating and storing **k** chart points takes **O(k)** time and space. Longer projections sample every few compounding boundaries to keep the series at or below 121 points, including both endpoints.

## Code layout

| Path | Responsibility |
| --- | --- |
| `server/routes/api/rewards.js` | HTTP endpoint and response status |
| `server/validation/rewards.js` | Input bounds, enum validation, and duration normalization |
| `server/services/rewards.js` | Projection and chart sampling |
| `src/views/dashboard/rewards/` | Form state, request handling, and chart interaction |

The browser sends inputs to the server for calculation. Editing a field clears the previous result and cancels any pending request. The chart supports mouse hover and a slider for keyboard and touch input.

## Verify

```sh
npm run test:rewards
npm test -- --watchAll=false --runInBand
npm run build
```

The tests cover the calculation, validation, HTTP responses, and frontend request and error states. For a quick browser check, open the dashboard and calculate with the defaults. The result should show **1,080 tokens** and **80 tokens in rewards**.

## Starter source

The dashboard was adapted from Bitbucket revision `4d9178c0b382`. This copy excludes the original automatic editor task, a script disguised as a font asset, a remote-code loader, and the unused alternate server entry point. The calculator uses the local Express app and runs independently of the legacy database-backed routes.
