(() => {
  class CarListController {
    #template;
    #grid;
    #status;
    #count;
    #loadMoreButton;
    #totalCars = 0;
    #loading = false;
    #showingTrending = false;
    #activeQuery = null;
    #requestVersion = 0;

    constructor({ template, grid, status, count, loadMoreButton }) {
      this.#template = template;
      this.#grid = grid;
      this.#status = status;
      this.#count = count;
      this.#loadMoreButton = loadMoreButton;
    }

    start() {
      window.addEventListener("cars:search", (event) => {
        this.search(event.detail.query);
      });
      this.#loadMoreButton.addEventListener("click", () => this.loadMore());
      this.#loadInitialCars();
    }

    #isCurrent(requestVersion) {
      return requestVersion === this.#requestVersion;
    }

    #createCard(car) {
      const fragment = this.#template.content.cloneNode(true);
      const card = fragment.querySelector(".car-card");
      const image = fragment.querySelector(".car-card__image");
      const placeholder = fragment.querySelector(".car-card__placeholder");
      const manufacturer = CarFormat.manufacturer(car.manufacturer);
      const model = CarFormat.model(car.model);
      const title = `${manufacturer} ${model}`.trim();
      const detailUrl = car.detailUrl;

      fragment.querySelector("[data-car-title]").textContent = title;
      fragment.querySelector("[data-car-badge]").textContent =
        car.badge || "Detajet e modelit nuk janë listuar";
      fragment.querySelector("[data-car-year]").textContent = car.year || "—";
      fragment.querySelector("[data-car-mileage]").textContent =
        `${CarFormat.formatNumber(car.mileage)} km`;
      fragment.querySelector("[data-car-fuel]").textContent = CarFormat.fuel(
        car.fuelType,
      );
      fragment.querySelector("[data-car-transmission]").textContent =
        CarFormat.transmission(
          car.transmission || car.transmissionName || car.gearbox,
        );
      fragment.querySelector("[data-car-kosovo-price]").textContent =
        CarPricing.formatSellingPrice(car.sellingPriceEur);

      const callToAction = fragment.querySelector("[data-car-cta]");
      callToAction.dataset.carId = car.id;
      callToAction.href = detailUrl;
      callToAction.setAttribute("aria-label", `Shiko detajet për ${title}`);

      card.addEventListener("click", (event) => {
        if (!event.target.closest("a, button")) {
          window.location.assign(detailUrl);
        }
      });

      if (car.photoUrl) {
        image.src = car.photoUrl;
        image.alt = title;
        image.addEventListener("error", () => {
          image.hidden = true;
          placeholder.hidden = false;
        });
      } else {
        image.hidden = true;
        placeholder.hidden = false;
      }

      return fragment;
    }

    render(cars) {
      const fragment = document.createDocumentFragment();

      cars.forEach((car) => {
        fragment.append(this.#createCard(car));
      });

      this.#grid.append(fragment);
    }

    #updateState() {
      const renderedCars = this.#grid.children.length;

      this.#status.textContent = renderedCars
        ? `Po shfaqen ${CarFormat.formatNumber(renderedCars)} vetura`
        : "Nuk u gjet asnjë veturë.";
      this.#count.textContent = this.#showingTrending
        ? "Veturat më të kërkuara"
        : `${CarFormat.formatNumber(this.#totalCars)} vetura u gjetën`;
      this.#loadMoreButton.hidden =
        renderedCars === 0 || renderedCars >= this.#totalCars;
    }

    async #loadInitialCars() {
      const requestVersion = this.#requestVersion;

      try {
        const result = await window.encarCarsRequest;
        if (!this.#isCurrent(requestVersion)) return;

        this.#totalCars = result.total;
        this.#showingTrending = Boolean(result.isTrending);
        this.render(result.cars);
        this.#updateState();
      } catch (error) {
        if (!this.#isCurrent(requestVersion)) return;

        console.error(error);
        this.#status.textContent =
          "Veturat nuk mund të ngarkohen. Provo përsëri.";
        this.#count.textContent = "";
      }
    }

    async search(query) {
      const requestVersion = ++this.#requestVersion;

      this.#activeQuery = query;
      this.#showingTrending = false;
      this.#grid.replaceChildren();
      this.#status.textContent = "Duke kërkuar veturat...";
      this.#count.textContent = "";
      this.#loadMoreButton.hidden = true;

      try {
        const result = await window.EncarApi.searchCars({ query });
        if (!this.#isCurrent(requestVersion)) return;

        this.#totalCars = result.total;
        this.render(result.cars);
        this.#updateState();
      } catch (error) {
        if (!this.#isCurrent(requestVersion)) return;

        console.error(error);
        this.#status.textContent = "Kërkimi dështoi. Provo përsëri.";
      }
    }

    async loadMore() {
      if (this.#loading) return;

      this.#loading = true;
      const requestVersion = this.#requestVersion;
      this.#loadMoreButton.disabled = true;
      this.#loadMoreButton.textContent = "Duke ngarkuar...";

      try {
        const result = this.#showingTrending
          ? await window.EncarApi.searchTrendingCars({
              offset: this.#grid.children.length,
            })
          : await window.EncarApi.searchCars({
              offset: this.#grid.children.length,
              query: this.#activeQuery || undefined,
            });
        if (!this.#isCurrent(requestVersion)) return;

        this.#totalCars = result.total;
        this.render(result.cars);
        this.#updateState();
      } catch (error) {
        if (!this.#isCurrent(requestVersion)) return;

        console.error(error);
        this.#status.textContent = "Veturat e tjera nuk mund të ngarkohen.";
      } finally {
        this.#loading = false;
        this.#loadMoreButton.disabled = false;
        this.#loadMoreButton.textContent = "Shfaq më shumë";
      }
    }
  }

  const elements = {
    template: document.querySelector("#car-card-template"),
    grid: document.querySelector("#cars-grid"),
    status: document.querySelector("#cars-status"),
    count: document.querySelector("#cars-count"),
    loadMoreButton: document.querySelector("#cars-load-more"),
  };

  if (Object.values(elements).some((element) => !element)) return;
  new CarListController(elements).start();
})();
