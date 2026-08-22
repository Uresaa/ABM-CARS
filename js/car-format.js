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
    "LPG(일반인 구입)": "LPG",
    "가솔린+LPG": "Benzinë + LPG",
    "LPG+전기": "LPG Hibride",
    "LPG+가솔린": "Benzinë + LPG",
    "가솔린+CNG": "Benzinë + CNG",
    수소: "Hidrogjen",
    기타: "Tjetër",
  };

  const transmissionNames = {
    오토: "Automatik",
    수동: "Manual",
    세미오토: "Gjysmë-automatik",
    CVT: "CVT",
    기타: "Tjetër",
  };

  const colorNames = {
    흰색: "E bardhë",
    검정색: "E zezë",
    쥐색: "Gri",
    청색: "E kaltër",
    은색: "E argjendtë",
    은회색: "Gri argjendi",
    진주색: "E bardhë perle",
    빨간색: "E kuqe",
    하늘색: "Blu qielli",
    녹색: "E gjelbër",
    갈색: "Kafe",
    노란색: "E verdhë",
    담녹색: "E gjelbër e çelur",
    명은색: "Argjend i ndritshëm",
    연금색: "E artë e çelur",
    은하색: "Gri e errët",
    연두색: "E gjelbër e verdhë",
    주황색: "Portokalli",
    자주색: "Bordo",
    갈대색: "Bezhë",
    청옥색: "Blu safir",
    보라색: "Vjollcë",
    검정투톤: "E zezë (dy-ngjyra)",
    흰색투톤: "E bardhë (dy-ngjyra)",
    분홍색: "Rozë",
    금색: "E artë",
    은색투톤: "E argjendtë (dy-ngjyra)",
    진주투톤: "Perle (dy-ngjyra)",
    갈색투톤: "Kafe (dy-ngjyra)",
    금색투톤: "E artë (dy-ngjyra)",
    "기타 색상": "Ngjyrë tjetër",
  };

  const bodyNames = {
    경차: "Mini",
    소형차: "E vogël",
    준중형차: "Kompakte",
    중형차: "E mesme",
    대형차: "E madhe",
    승합차: "Minibus",
    경승합차: "Minibus i vogël",
    화물차: "Transportuese",
    스포츠카: "Veturë sportive",
    SUV: "SUV",
    RV: "Furgon (RV)",
    기타: "Tjetër",
  };

  function formatNumber(value) {
    return numberFormatter.format(value);
  }

  function formatPrice(value) {
    return typeof value === "number"
      ? `${formatNumber(Math.round(value))} €`
      : "Çmimi sipas kërkesës";
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

  return Object.freeze({
    formatNumber,
    formatPrice,
    manufacturer,
    model,
    fuel,
    transmission,
    color,
    body,
  });
})();

window.CarFormat = CarFormat;
