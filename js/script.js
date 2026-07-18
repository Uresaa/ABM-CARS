document.querySelectorAll(".faq__question").forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.parentElement.classList.toggle("active");
  });
});

const carCardTemplate = document.querySelector("#car-card-template");
const carsGrid = document.querySelector("#cars-grid");
const carsStatus = document.querySelector("#cars-status");
const carsCount = document.querySelector("#cars-count");
const carsLoadMore = document.querySelector("#cars-load-more");

let totalCars = 0;
let loadingCars = false;

function createCarCard(car) {
  const fragment = carCardTemplate.content.cloneNode(true);
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
  fragment.querySelector("[data-car-fuel]").textContent = CarFormat.fuel(car.fuelType);

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

function appendCars(cars) {
  const fragment = document.createDocumentFragment();

  cars.forEach((car) => {
    fragment.append(createCarCard(car));
  });

  carsGrid.append(fragment);
}

function updateCarsState() {
  const renderedCars = carsGrid.children.length;

  carsStatus.textContent = renderedCars
    ? `Po shfaqen ${CarFormat.formatNumber(renderedCars)} vetura`
    : "Nuk u gjet asnjë veturë.";
  carsCount.textContent = `${CarFormat.formatNumber(totalCars)} vetura u gjetën`;
  carsLoadMore.hidden = renderedCars === 0 || renderedCars >= totalCars;
}

async function loadInitialCars() {
  try {
    const result = await window.encarCarsRequest;
    totalCars = result.total;
    appendCars(result.cars);
    updateCarsState();
  } catch (error) {
    console.error(error);
    carsStatus.textContent = "Veturat nuk mund të ngarkohen. Provo përsëri.";
    carsCount.textContent = "";
  }
}

async function loadMoreCars() {
  if (loadingCars) {
    return;
  }

  loadingCars = true;
  carsLoadMore.disabled = true;
  carsLoadMore.textContent = "Duke ngarkuar...";

  try {
    const result = await window.EncarApi.searchCars({ offset: carsGrid.children.length });
    totalCars = result.total;
    appendCars(result.cars);
    updateCarsState();
  } catch (error) {
    console.error(error);
    carsStatus.textContent = "Veturat e tjera nuk mund të ngarkohen.";
  } finally {
    loadingCars = false;
    carsLoadMore.disabled = false;
    carsLoadMore.textContent = "Shfaq më shumë";
  }
}

if (carCardTemplate && carsGrid) {
  carsLoadMore.addEventListener("click", loadMoreCars);
  loadInitialCars();
}
