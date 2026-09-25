Drop the three source JSON arrays here, then run:

  npm run seed:market

Expected files (field names already match the API):

  state-exports.json      — 38 Indian states/UTs, values in ₹ Crore
  top-products.json       — 100 HS products, values in ₹ Crore
  country-products.json   — ~3,200 country × product rows

These files were not in the backend repo when the endpoints were added.
Copy them from the frontend docs path:

  data/market-intelligence/state-exports.json
  data/market-intelligence/top-products.json
  data/market-intelligence/country-products.json

Admin can also POST the same arrays to:

  POST /admin/state-exports/bulk-replace
  POST /admin/top-products/bulk-replace
  POST /admin/country-products/bulk-replace
