(() => {
  class CarListController {
    #template;
    #grid;
    #status;
    #count;
    #totalBadge;
    #loadMoreButton;
    #totalCars = 0;
    #loading = false;
    #showingTrending = false;
    #activeQuery = null;
    #yearFrom = null;
    #laterYearQuery = null;
    #showingRequestedYear = false;
    #requestVersion = 0;
    #renderedCarIds = new Set();
    #renderedCarKeys = new Set();
    #cars = [];
    #nextOffset = 0;

    constructor({ template, grid, status, count, totalBadge, loadMoreButton }) {
      this.#template = template;
      this.#grid = grid;
      this.#status = status;
      this.#count = count;
      this.#totalBadge = totalBadge;
      this.#loadMoreButton = loadMoreButton;
    }

    start() {
      window.addEventListener("cars:search", (event) => {
        this.search(event.detail);
      });
      this.#loadMoreButton.addEventListener("click", () => this.loadMore());
      this.#loadInitialCars();
      this.#loadTotalCarsBadge();
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
        CarFormat.formatPrice(car.sellingPriceEur);

      const callToAction = fragment.querySelector("[data-car-cta]");
      callToAction.dataset.carId = car.id;
      callToAction.href = detailUrl;
      callToAction.setAttribute("aria-label", `Shiko detajet për ${title}`);

      card.addEventListener("click", (event) => {
        if (!event.target.closest("a, button")) {
          window.location.assign(detailUrl);
        }
      });

      fragment.querySelector("[data-car-accident-badge]").hidden =
        car.accidentFree !== true;

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
      cars.forEach((car) => {
        const carId = String(car.id || "");
        const carKey = this.#carKey(car);
        if (
          !carId ||
          this.#renderedCarIds.has(carId) ||
          this.#renderedCarKeys.has(carKey)
        )
          return;

        this.#renderedCarIds.add(carId);
        this.#renderedCarKeys.add(carKey);
        this.#cars.push(car);
      });

      const fragment = document.createDocumentFragment();
      [...this.#cars]
        .sort((first, second) => this.#compareCars(first, second))
        .forEach((car) => fragment.append(this.#createCard(car)));
      this.#grid.replaceChildren(fragment);
    }

    #carKey(car) {
      return [
        car.photoUrl || "",
        car.manufacturer || "",
        car.model || "",
        car.badge || "",
        car.year || "",
        car.mileage || "",
        car.sellingPriceEur || "",
      ].join("|");
    }

    #compareCars(first, second) {
      const firstYear = Number(first.year) || Number.POSITIVE_INFINITY;
      const secondYear = Number(second.year) || Number.POSITIVE_INFINITY;

      // Keep the requested year first, followed by later years.
      if (this.#yearFrom && firstYear !== secondYear) {
        return firstYear - secondYear;
      }

      const firstPrice = Number.isFinite(Number(first.sellingPriceEur))
        ? Number(first.sellingPriceEur)
        : Number.POSITIVE_INFINITY;
      const secondPrice = Number.isFinite(Number(second.sellingPriceEur))
        ? Number(second.sellingPriceEur)
        : Number.POSITIVE_INFINITY;

      if (firstPrice !== secondPrice) return firstPrice - secondPrice;
      return firstYear - secondYear;
    }

    #updateState() {
      const renderedCars = this.#grid.children.length;

      this.#status.textContent = renderedCars
        ? `Po shfaqen ${CarFormat.formatNumber(renderedCars)} vetura`
        : "Nuk u gjet asnjë veturë.";
      this.#count.textContent = this.#showingTrending
        ? "Veturat më të kërkuara"
        : `${CarFormat.formatNumber(this.#totalCars)} vetura u gjetën`;
      const hasMoreCars =
        (this.#showingRequestedYear && this.#laterYearQuery) ||
        renderedCars < this.#totalCars;
      this.#loadMoreButton.hidden = renderedCars === 0 || !hasMoreCars;
    }

    #loadTotalCarsBadge() {
      window.encarTotalCarsCountRequest
        .then((total) => {
          console.log("Totali i veturave nga API-ja:", total);
          if (!total) return;

          this.#totalBadge.textContent = `${CarFormat.formatNumber(total)}+ vetura në ofertë`;
          this.#totalBadge.hidden = false;
        })
        .catch((error) => console.error(error));
    }

    #scrollToHash() {
      if (!location.hash) return;
      document.querySelector(location.hash)?.scrollIntoView();
    }

    async #loadInitialCars() {
      const requestVersion = this.#requestVersion;

      try {
        const result = await window.encarCarsRequest;
        if (!this.#isCurrent(requestVersion)) return;

        this.#totalCars = result.total;
        this.#showingTrending = Boolean(result.isTrending);
        this.#nextOffset = result.offset + result.limit;
        this.render(result.cars);
        this.#updateState();
        this.#scrollToHash();
      } catch (error) {
        if (!this.#isCurrent(requestVersion)) return;

        console.error(error);
        this.#status.textContent =
          "Veturat nuk mund të ngarkohen. Provo përsëri.";
        this.#count.textContent = "";
      }
    }

    async search({ query, yearFrom, exactYearQuery, laterYearQuery }) {
      const requestVersion = ++this.#requestVersion;

      this.#activeQuery = exactYearQuery || query;
      this.#yearFrom = yearFrom;
      this.#laterYearQuery = laterYearQuery;
      this.#showingRequestedYear = Boolean(exactYearQuery);
      this.#showingTrending = false;
      this.#renderedCarIds.clear();
      this.#renderedCarKeys.clear();
      this.#cars = [];
      this.#nextOffset = 0;
      this.#grid.replaceChildren();
      this.#status.textContent = "Duke kërkuar veturat...";
      this.#count.textContent = "";
      this.#loadMoreButton.hidden = true;

      try {
        const result = await window.EncarApi.searchCars({
          query: this.#activeQuery,
        });
        if (!this.#isCurrent(requestVersion)) return;

        if (
          this.#showingRequestedYear &&
          result.total === 0 &&
          this.#laterYearQuery
        ) {
          const laterResult = await window.EncarApi.searchCars({
            query: this.#laterYearQuery,
          });
          if (!this.#isCurrent(requestVersion)) return;

          this.#activeQuery = this.#laterYearQuery;
          this.#laterYearQuery = null;
          this.#showingRequestedYear = false;
          this.#totalCars = laterResult.total;
          this.#nextOffset = laterResult.offset + laterResult.limit;
          this.render(laterResult.cars);
        } else {
          this.#totalCars = result.total;
          this.#nextOffset = result.offset + result.limit;
          this.render(result.cars);
        }
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
        const loadLaterYears =
          !this.#showingTrending &&
          this.#showingRequestedYear &&
          this.#nextOffset >= this.#totalCars;
        const result = this.#showingTrending
          ? await window.EncarApi.searchTrendingCars({
              offset: this.#nextOffset,
            })
          : await window.EncarApi.searchCars({
              offset: loadLaterYears ? 0 : this.#nextOffset,
              query: loadLaterYears
                ? this.#laterYearQuery
                : this.#activeQuery || undefined,
            });
        if (!this.#isCurrent(requestVersion)) return;

        if (loadLaterYears) {
          this.#activeQuery = this.#laterYearQuery;
          this.#laterYearQuery = null;
          this.#showingRequestedYear = false;
          this.#totalCars += result.total;
        } else {
          this.#totalCars = result.total;
        }
        this.#nextOffset = result.offset + result.limit;
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
    totalBadge: document.querySelector("#cars-total-badge"),
    loadMoreButton: document.querySelector("#cars-load-more"),
  };

  if (Object.values(elements).some((element) => !element)) return;
  new CarListController(elements).start();
})();
