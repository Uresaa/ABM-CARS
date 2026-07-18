const CarFormat = (() => {
  const numberFormatter = new Intl.NumberFormat("sq-AL");

  const manufacturerNames = {
    현대: "Hyundai",
    기아: "Kia",
    제네시스: "Genesis",
    벤츠: "Mercedes-Benz",
    아우디: "Audi",
    폭스바겐: "Volkswagen",
    "쉐보레(GM대우)": "Chevrolet",
    "KG모빌리티(쌍용)": "SsangYong",
    ChevroletGMDaewoo: "Chevrolet",
  };

  const modelNames = { Santafe: "Santa Fe", Canival: "Carnival" };

  const fuelNames = {
    가솔린: "Benzinë",
    디젤: "Naftë",
    전기: "Elektrike",
    "가솔린+전기": "Hibride",
    "디젤+전기": "Hibride",
    LPG: "LPG",
  };

  const transmissionNames = { 오토: "Automatik", 수동: "Manual" };

  const colorNames = {
    검정색: "E zezë",
    흰색: "E bardhë",
    은색: "E argjendtë",
    쥐색: "Gri",
    청색: "E kaltër",
    빨간색: "E kuqe",
    진주색: "E bardhë perle",
  };

  const bodyNames = {
    경차: "Mini",
    소형차: "E vogël",
    준중형차: "Kompakte",
    중형차: "E mesme",
    대형차: "E madhe",
    승합차: "Minibus",
    화물차: "Transportuese",
  };

  function formatNumber(value) {
    return numberFormatter.format(value);
  }

  function manufacturer(value) {
    return manufacturerNames[value] || value || "";
  }

  function model(value) {
    return modelNames[value] || value || "Veturë";
  }

  function fuel(value) {
    return fuelNames[value] || value || "—";
  }

  function transmission(value) {
    return transmissionNames[value] || value || "—";
  }

  function color(value) {
    return colorNames[value] || value || "—";
  }

  function body(value) {
    return bodyNames[value] || value || "—";
  }

  return Object.freeze({ formatNumber, manufacturer, model, fuel, transmission, color, body });
})();

window.CarFormat = CarFormat;
