# Encar API handoff

The Encar integration is isolated in `js/encar-api.js`. It does not render or style any cards.

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
      photoUrl: "https://ci.encar.com/...jpg",
      detailUrl: "https://fem.encar.com/cars/detail/42355805",
    },
  ],
}
```

## Rendering cards

Add an empty container wherever the vehicle cards should appear:

```html
<div id="cars-grid"></div>
```

Then render the normalized objects. Prices are intentionally excluded from the normalized data and should not be displayed on vehicle cards.

```js
window.encarCarsRequest.then(({ cars }) => {
  const grid = document.querySelector("#cars-grid");
  const fragment = document.createDocumentFragment();

  cars.forEach((car) => {
    const card = document.createElement("article");
    const title = document.createElement("h3");
    const image = document.createElement("img");
    const link = document.createElement("a");

    title.textContent = `${car.manufacturer} ${car.model}`;
    image.src = car.photoUrl;
    image.alt = title.textContent;
    image.loading = "lazy";
    link.href = "#contact";
    link.textContent = "Kërko ofertë";

    card.append(image, title, link);
    fragment.append(card);
  });

  grid.append(fragment);
});
```

For the next page, increase `offset`:

```js
const nextPage = await window.EncarApi.searchCars({
  offset: 12,
  limit: 12,
});
```

An Encar search query can be supplied through `query`. For example, BMW vehicles:

```js
const bmwCars = await window.EncarApi.searchCars({
  query: "(And.Hidden.N._.(C.CarType.N._.Manufacturer.BMW.))",
});
```

The Encar response contains a price field, amo na e injorojm se sdojm me pa klienti sa kushton kerri n kore hehe :)

