Market Data releases (US$ million, district / sector / state).

  npm run seed:market

reads every JSON file in:

  data/market-intelligence/releases/*.json

Each file is one period (one MarketRelease). Replace a period by editing
the file and re-running, or by publishing from Admin → Market Data.

The old ₹ Crore HS-code arrays (state-exports.json, top-products.json,
country-products.json) are still imported if present, but the public
Exporter Corner page now uses GET /market-releases.
