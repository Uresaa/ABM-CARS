# Encar API handoff

The Encar API client is isolated in `js/encar-api.js`. The browser calls the same-origin proxy in `server.mjs`, which forwards the request to Encar. The card template is in `html/index.html`, rendering is handled by `js/script.js`, and card styles live in `scss/search.scss` with compiled output in `css/style.css`.

Start the page with:

```bash
node server.mjs
```

The proxy is required; a plain static server cannot serve `/api/cars`.

`html/index.html` loads the API client before the existing `js/script.js`. When the page opens, the first twelve cars are requested automatically and exposed as:

```js
window.encarCarsRequest
```

The same client can be called again for searching or pagination:

```js
const result = await window.EncarApi.searchCars({
  offset: 0,
  limit: 12,
});
```

The returned structure is:

```js
{
  total: 158000,
  offset: 0,
  limit: 12,
  cars: [
    {
      id: "42355805",
      manufacturer: "BMW",
      model: "X5",
      year: "2023",
      mileage: 34000,
      fuelType: "디젤",
      photoUrl: "/api/car-image?path=...",
      detailUrl: "./car-details.html?id=42355805",
    },
  ],
}
```

## Card rendering

`html/index.html` contains the results container and a reusable card template:

```html
<div id="cars-grid"></div>
<template id="car-card-template">...</template>
```

`js/script.js` waits for the initial request, clones the template for each normalized car, and fills the photograph, title, variant, year, mileage, fuel, and location. Clicking the card or “Shiko detajet” opens its local detail page. Prices are intentionally excluded.

The “Shfaq më shumë” button requests the next page by increasing `offset`:

```js
const nextPage = await window.EncarApi.searchCars({
  offset: 12,
  limit: 12,
});
```

## Car detail page

Each card links to `html/car-details.html?id=ENCAR_ID`. The detail page requests the sanitized car data from the same-origin route:

```text
GET /api/cars/:id
```

The response includes the gallery, model and grade, year, mileage, engine size, transmission, fuel, color, seats, body type, Encar's seizure and pledge counts, and sanitized accident, inspection, and body-diagnosis summaries. The detail page groups these fields into basic information, performance, condition, and verified-report sections. Users are never redirected to Encar. Price, VIN, registration plate, seller contact, inspector information, and the seller description are not returned to the browser.

An Encar search query can be supplied through `query`. For example, BMW vehicles:

```js
const bmwCars = await window.EncarApi.searchCars({
  query: "(And.Hidden.N._.(C.CarType.N._.Manufacturer.BMW.))",
});
```

The proxy removes Encar's price field before returning list results to the browser.

The list endpoint only provides Korean model names. `server.mjs` enriches each result with the English manufacturer, model group, and grade from Encar's per-car endpoint before the card is rendered.
