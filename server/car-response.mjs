const carListFields = [
  "Id",
  "Manufacturer",
  "Model",
  "Badge",
  "FormYear",
  "Mileage",
  "FuelType",
  "Photos",
];

export function createCarListItem(car, category = null) {
  const carListItem = {};

  for (const field of carListFields) {
    carListItem[field] = car[field];
  }

  if (category) {
    carListItem.ManufacturerEnglish = category.manufacturerEnglishName;
    carListItem.ModelEnglish = category.modelGroupEnglishName;
    carListItem.BadgeEnglish = category.gradeEnglishName;
  }

  return carListItem;
}

function findInspectionItem(items, code) {
  for (const item of items || []) {
    if (item.type?.code === code) return item;
    const child = findInspectionItem(item.children, code);
    if (child) return child;
  }

  return null;
}

function getInspectionCondition(items, code) {
  const item = findInspectionItem(items, code);
  if (!item?.statusType) return null;
  return item.statusType.code === "1";
}

function createAccidentSummary(report) {
  if (!report || report.accidentCnt === undefined) return null;

  return {
    accidentCount: Number(report.accidentCnt) || 0,
    myDamageCount: Number(report.myAccidentCnt) || 0,
    otherDamageCount: Number(report.otherAccidentCnt) || 0,
    ownerChangeCount: Number(report.ownerChangeCnt) || 0,
    totalLossCount: Number(report.totalLossCnt) || 0,
    floodCount:
      (Number(report.floodTotalLossCnt) || 0) +
      (Number(report.floodPartLossCnt) || 0),
    theftCount: Number(report.robberCnt) || 0,
  };
}

function createInspectionSummary(report) {
  const master = report?.master;
  const detail = master?.detail;
  if (!master || !detail) return null;

  return {
    accident: typeof master.accdient === "boolean" ? master.accdient : null,
    simpleRepair: typeof master.simpleRepair === "boolean" ? master.simpleRepair : null,
    bodyOk: detail.carStateType ? detail.carStateType.code === "1" : null,
    engineOk: getInspectionCondition(report.inners, "s001"),
    transmissionOk: getInspectionCondition(report.inners, "s002"),
    waterDamage: typeof detail.waterlog === "boolean" ? detail.waterlog : null,
    mileage: Number(detail.mileage) || 0,
  };
}

function createBodyDiagnosisSummary(report) {
  if (!Array.isArray(report?.items)) return null;

  const panels = report.items
    .filter(
      (item) =>
        typeof item.name === "string" && typeof item.resultCode === "string",
    )
    .map((item) => ({
      name: item.name,
      status: item.resultCode,
    }));

  if (!panels.length) return null;
  const abnormalPanels = panels.filter((panel) => panel.status !== "NORMAL");

  return {
    panelsChecked: panels.length,
    abnormalPanelCount: abnormalPanels.length,
    allPanelsNormal: abnormalPanels.length === 0,
    panels,
  };
}

export function createReportSummary(reports) {
  if (!reports) return null;

  return {
    accident: createAccidentSummary(reports.accident),
    inspection: createInspectionSummary(reports.inspection),
    diagnosis: createBodyDiagnosisSummary(reports.diagnosis),
  };
}

export function createCarDetailsResponse(carId, car, report) {
  const category = car.category || {};
  const spec = car.spec || {};

  return {
    id: String(carId),
    manufacturer: category.manufacturerEnglishName || category.manufacturerName || "",
    model: category.modelGroupEnglishName || category.modelName || "",
    modelDetail: category.modelName || "",
    grade: category.gradeEnglishName || category.gradeName || "",
    gradeDetail: category.gradeDetailEnglishName || category.gradeDetailName || "",
    year: category.formYear || "",
    registrationMonth: category.yearMonth || "",
    mileage: Number(spec.mileage) || 0,
    displacementCc: Number(spec.displacement) || 0,
    transmission: spec.transmissionName || "",
    fuelType: spec.fuelName || "",
    color: spec.colorName || "",
    seats: Number(spec.seatCount) || 0,
    bodyType: spec.bodyName || "",
    accidentReportAvailable: car.condition?.accident?.recordView === true,
    inspectionAvailable: (car.condition?.inspection?.formats?.length || 0) > 0,
    seizingCount: Number(car.condition?.seizing?.seizingCount) || 0,
    pledgeCount: Number(car.condition?.seizing?.pledgeCount) || 0,
    report,
    photos: Array.isArray(car.photos)
      ? car.photos
          .filter((photo) => typeof photo.path === "string" && photo.path.startsWith("/"))
          .map((photo) => ({
            code: photo.code,
            type: photo.type,
            url: `/api/car-image?path=${encodeURIComponent(photo.path)}`,
          }))
      : [],
  };
}
