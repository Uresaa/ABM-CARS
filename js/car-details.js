const status = document.querySelector("#status");
const details = document.querySelector("#car-details");
const error = document.querySelector("#error");
const mainImage = document.querySelector("#main-image");
const placeholder = document.querySelector("#image-placeholder");
const thumbnails = document.querySelector("#thumbnails");
const formatNumber = CarFormat.formatNumber;
const panelLabels = {
  HOOD: "Kapaku i motorit",
  TRUNK_LID: "Kapaku i bagazhit",
  FRONT_FENDER_LEFT: "Paneli mbi rrotën e përparme majtas",
  FRONT_FENDER_RIGHT: "Paneli mbi rrotën e përparme djathtas",
  FRONT_DOOR_LEFT: "Dera e përparme majtas",
  FRONT_DOOR_RIGHT: "Dera e përparme djathtas",
  BACK_DOOR_LEFT: "Dera e pasme majtas",
  BACK_DOOR_RIGHT: "Dera e pasme djathtas",
};

const panelStatusLabels = {
  NORMAL: "Pa vërejtje",
  REPLACEMENT: "E zëvendësuar",
};

function registrationDate(value) {
  const date = String(value || "");
  return /^\d{6}$/.test(date)
    ? `${date.slice(4)} / ${date.slice(0, 4)}`
    : "—";
}

function fillFields(values) {
  Object.entries(values).forEach(([field, value]) => {
    document.querySelectorAll(`[data-field="${field}"]`).forEach((element) => {
      element.textContent = value ?? "—";
    });
  });
}

function yesNo(value) {
  if (value === null || value === undefined) return "—";
  return value ? "Po" : "Jo";
}

function conditionLabel(value) {
  if (value === null || value === undefined) return "—";
  return value ? "Në gjendje të mirë" : "Kërkon kontroll";
}

function setVerdictState(field, warning) {
  document
    .querySelector(`[data-field="${field}"]`)
    .classList.toggle("report-verdict--warning", warning);
}

function showReportCard(cardId, verdictField, warning, fields) {
  fillFields(fields);
  setVerdictState(verdictField, warning);
  document.querySelector(`#${cardId}`).hidden = false;
}

function getPanelState(status) {
  if (status === "NORMAL") return "normal";
  if (status === "REPLACEMENT") return "replacement";
  return "attention";
}

function getPanelStatusLabel(status) {
  return panelStatusLabels[status] || "Kërkon kontroll";
}

function renderPanelReport(panels = []) {
  const diagram = document.querySelector("#car-panel-report");
  const findings = document.querySelector("#car-panel-report-findings");

  const diagramPanels = Array.from(
    diagram.querySelectorAll("[data-car-panel]"),
  );

  diagramPanels.forEach((panelElement) => {
    panelElement.removeAttribute("data-status");
  });

  findings.replaceChildren();

  let hasRenderedPanel = false;

  panels.forEach((panel) => {
    const panelElement = diagramPanels.find(
      (diagramPanel) => diagramPanel.dataset.carPanel === panel.name,
    );

    if (!panelElement) return;

    panelElement.dataset.status = getPanelState(panel.status);
    hasRenderedPanel = true;

    if (panel.status === "NORMAL") return;

    const finding = document.createElement("li");
    const panelLabel = panelLabels[panel.name] || panel.name;
    finding.textContent = `${panelLabel}: ${getPanelStatusLabel(panel.status)}`;
    findings.append(finding);
  });

  findings.hidden = findings.children.length === 0;
  diagram.hidden = !hasRenderedPanel;
}

function renderReport(report) {
  const reportSection = document.querySelector("#vehicle-report");
  let hasReport = false;

  if (report?.accident) {
    const accident = report.accident;
    const hasSeriousHistory = [
      accident.accidentCount,
      accident.totalLossCount,
      accident.floodCount,
      accident.theftCount,
    ].some((count) => count > 0);

    showReportCard("accident-report-card", "accidentVerdict", hasSeriousHistory, {
      accidentVerdict: hasSeriousHistory
        ? `${accident.accidentCount} aksidente të regjistruara`
        : "Pa aksidente të regjistruara",
      accidentCount: accident.accidentCount,
      myDamageCount: accident.myDamageCount,
      otherDamageCount: accident.otherDamageCount,
      ownerChangeCount: accident.ownerChangeCount,
      totalLossCount: accident.totalLossCount,
      floodCount: accident.floodCount,
      theftCount: accident.theftCount,
    });
    hasReport = true;
  }

  if (report?.inspection) {
    const inspection = report.inspection;
    const hasInspectionWarning =
      [inspection.accident, inspection.simpleRepair, inspection.waterDamage]
        .some((value) => value === true) ||
      [inspection.bodyOk, inspection.engineOk, inspection.transmissionOk]
        .some((value) => value === false);

    showReportCard("inspection-report-card", "inspectionVerdict", hasInspectionWarning, {
      inspectionVerdict: hasInspectionWarning
        ? "Raporti i inspektimit përmban vërejtje"
        : "Pa vërejtje kryesore në inspektim",
      inspectionAccident: yesNo(inspection.accident),
      simpleRepair: yesNo(inspection.simpleRepair),
      bodyCondition: conditionLabel(inspection.bodyOk),
      engineCondition: conditionLabel(inspection.engineOk),
      transmissionCondition: conditionLabel(inspection.transmissionOk),
      waterDamage: yesNo(inspection.waterDamage),
      inspectionMileage: inspection.mileage
        ? `${formatNumber(inspection.mileage)} km`
        : "—",
    });
    hasReport = true;
  }

  if (report?.diagnosis) {
    const diagnosis = report.diagnosis;
    const abnormalPanelWord =
      diagnosis.abnormalPanelCount === 1 ? "panel" : "panele";
    showReportCard("diagnosis-report-card", "diagnosisVerdict", !diagnosis.allPanelsNormal, {
      diagnosisVerdict: diagnosis.allPanelsNormal
        ? "Të gjitha panelet e kontrolluara janë normale"
        : `${diagnosis.abnormalPanelCount} ${abnormalPanelWord} me vërejtje`,
      panelsChecked: diagnosis.panelsChecked,
      abnormalPanelCount: diagnosis.abnormalPanelCount,
    });
    renderPanelReport(diagnosis.panels);
    hasReport = true;
  }

  reportSection.hidden = !hasReport;
}

function selectPhoto(photo, title, button) {
  mainImage.src = photo.url;
  mainImage.alt = `${title} - fotografi`;
  mainImage.hidden = false;
  placeholder.hidden = true;

  thumbnails.querySelectorAll("button").forEach((item) => {
    item.classList.toggle("active", item === button);
  });
}

function renderGallery(photos, title) {
  if (!photos.length) {
    mainImage.hidden = true;
    placeholder.hidden = false;
    return;
  }

  const mainPhoto = photos.find((photo) => photo.code === "001");
  const galleryPhotos = mainPhoto
    ? [mainPhoto, ...photos.filter((photo) => photo !== mainPhoto)]
    : photos;
  const fragment = document.createDocumentFragment();

  galleryPhotos.forEach((photo, index) => {
    const button = document.createElement("button");
    const image = document.createElement("img");

    button.type = "button";
    button.setAttribute("aria-label", `Fotografia ${index + 1}`);
    image.src = photo.url;
    image.alt = "";
    image.loading = "lazy";
    button.append(image);
    button.addEventListener("click", () => selectPhoto(photo, title, button));
    fragment.append(button);
  });

  thumbnails.append(fragment);
  selectPhoto(galleryPhotos[0], title, thumbnails.firstElementChild);
  mainImage.addEventListener("error", () => {
    mainImage.hidden = true;
    placeholder.hidden = false;
  });
}

function renderCar(car) {
  const title = `${car.manufacturer || ""} ${car.model || "Veturë"}`.trim();
  const grade = [car.grade, car.gradeDetail].filter(Boolean).join(" · ");
  const values = {
    manufacturer: car.manufacturer,
    model: car.model,
    year: car.year,
    mileage: `${formatNumber(car.mileage)} km`,
    fuel: CarFormat.fuel(car.fuelType),
    engine: car.displacementCc ? `${formatNumber(car.displacementCc)} cc` : "—",
    transmission: CarFormat.transmission(car.transmission),
    color: CarFormat.color(car.color),
    seats: car.seats ? `${car.seats} ulëse` : "—",
    body: CarFormat.body(car.bodyType),
    registration: registrationDate(car.registrationMonth),
    variant: car.gradeDetail || car.grade,
    photos: `${car.photos?.length || 0} fotografi`,
    accidentReport: car.report?.accident
      ? `${car.report.accident.accidentCount} të regjistruara`
      : car.accidentReportAvailable ? "Në dispozicion" : "Jo publik",
    inspection: car.report?.inspection
      ? "Raporti u ngarkua"
      : car.inspectionAvailable
        ? "Në dispozicion"
        : "Jo publik",
    seizures: car.seizingCount ? `${car.seizingCount} të regjistruara` : "0 të regjistruara",
    pledges: car.pledgeCount ? `${car.pledgeCount} të regjistruara` : "0 të regjistruara",
  };

  document.title = `${title} | ABM CARS KOREA`;
  document.querySelector("#car-title").textContent = title;
  document.querySelector("#car-grade").textContent = grade || "Detajet e modelit";
  document.querySelector("#car-id").textContent = car.id;

  fillFields(values);

  renderGallery(car.photos || [], title);
  renderReport(car.report);
  status.hidden = true;
  details.hidden = false;
}

function showError() {
  status.hidden = true;
  error.hidden = false;
}

async function loadCar() {
  const carId = new URLSearchParams(location.search).get("id");

  if (!/^\d+$/.test(carId || "")) {
    showError();
    return;
  }

  try {
    const response = await fetch(`/api/cars/${carId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    renderCar(await response.json());
  } catch (requestError) {
    console.error(requestError);
    showError();
  }
}

loadCar();
