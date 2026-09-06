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

  const trimTranslations = [
    ["에어로다이나믹", "Aerodynamic"],
    ["블루이피션시", "BlueEfficiency"],
    ["인스퍼레이션", "Inspiration"],
    ["익스클루시브", "Exclusive"],
    ["스타일패키지", "Style Package"],
    ["이그제큐티브", "Executive"],
    ["프레지덴셜", "Presidential"],
    ["오버랜드서밋", "Overland Summit"],
    ["인스크립션", "Inscription"],
    ["인텔리전트", "Intelligent"],
    ["얼티메이트", "Ultimate"],
    ["퍼포만테", "Performante"],
    ["퍼포먼스", "Performance"],
    ["포트폴리오", "Portfolio"],
    ["에코부스트", "EcoBoost"],
    ["어드밴티지", "Advantage"],
    ["어드밴스드", "Advanced"],
    ["아방가르드", "Avantgarde"],
    ["카브리올레", "Cabriolet"],
    ["카브레올레", "Cabriolet"],
    ["에스테이트", "Estate"],
    ["하이브리드", "Hibrid"],
    ["스포츠쿠페", "Sport Coupe"],
    ["그란스포츠", "GranSport"],
    ["오버트레일", "Overtrail"],
    ["트레일호크", "Trailhawk"],
    ["런치에디션", "Launch Edition"],
    ["플래티넘", "Platinum"],
    ["프레스티지", "Prestige"],
    ["컴패티션", "Competition"],
    ["컴페티션", "Competition"],
    ["컨버터블", "Convertible"],
    ["마누팍투어", "Manufaktur"],
    ["블루모션", "BlueMotion"],
    ["스포츠백", "Sportback"],
    ["스포트백", "Sportback"],
    ["그란쿠페", "GranCoupe"],
    ["그란루쏘", "GranLusso"],
    ["론지튜드", "Longitude"],
    ["로드스터", "Roadster"],
    ["엑셀런스", "Excellence"],
    ["블랙라벨", "Black Label"],
    ["하이랜드", "Highland"],
    ["하이테크", "Hi-Tech"],
    ["티타늄", "Titanium"],
    ["테크니카", "Tecnica"],
    ["리미티드", "Limited"],
    ["프리미엄", "Premium"],
    ["다이나믹", "Dynamic"],
    ["스파이더", "Spyder"],
    ["스탠다드", "Standard"],
    ["피오라노", "Fiorano"],
    ["오버랜드", "Overland"],
    ["에센셜", "Essential"],
    ["페이버드", "Favoured"],
    ["슈페리어", "Superior"],
    ["록킹햄", "Rockingham"],
    ["해치백", "Hatchback"],
    ["런치팩", "Launch Pack"],
    ["콰트로", "Quattro"],
    ["투어링", "Touring"],
    ["트로페오", "Trofeo"],
    ["폴고레", "Folgore"],
    ["카레라", "Carrera"],
    ["크리스털", "Crystal"],
    ["기본형", "Standard"],
    ["럭셔리", "Luxury"],
    ["블루텍", "BlueTEC"],
    ["스페셜", "Special"],
    ["컴포트", "Comfort"],
    ["액티브", "Active"],
    ["악티브", "Active"],
    ["알피나", "Alpina"],
    ["에디션", "Edition"],
    ["패키지", "Package"],
    ["플러스", "Plus"],
    ["스포츠", "Sport"],
    ["아반트", "Avant"],
    ["온라인", "Online"],
    ["가솔린", "Benzinë"],
    ["에어로", "Aero"],
    ["아우터", "Outer"],
    ["아주르", "Azure"],
    ["알뤼르", "Allure"],
    ["언톨드", "Untold"],
    ["에센스", "Essence"],
    ["엘리트", "Elite"],
    ["울트라", "Ultra"],
    ["모멘텀", "Momentum"],
    ["뮬리너", "Mulliner"],
    ["볼란테", "Volante"],
    ["브라이트", "Bright"],
    ["센서리", "Sensory"],
    ["슈프림", "Supreme"],
    ["스마트", "Smart"],
    ["리저브", "Reserve"],
    ["루비콘", "Rubicon"],
    ["레인지", "Range"],
    ["레이블", "Label"],
    ["사하라", "Sahara"],
    ["이탈리아", "Italia"],
    ["컴팩트", "Compact"],
    ["클래식", "Classic"],
    ["타르가", "Targa"],
    ["피렐리", "Pirelli"],
    ["티타늄", "Titanium"],
    ["펠린", "Feline"],
    ["퍼스트", "First"],
    ["파이널", "Final"],
    ["뱅크스", "Banks"],
    ["럭스팩", "Lux Pack"],
    ["드라이브", "Drive"],
    ["디자인", "Design"],
    ["스타일", "Style"],
    ["스피드", "Speed"],
    ["엔트리", "Entry"],
    ["베이스", "Base"],
    ["카본", "Carbon"],
    ["터보", "Turbo"],
    ["파워", "Power"],
    ["퓨어", "Pure"],
    ["모던", "Modern"],
    ["쿠페", "Coupe"],
    ["세단", "Sedan"],
    ["웨건", "Wagon"],
    ["디젤", "Diesel"],
    ["전기", "Elektrik"],
    ["다크", "Dark"],
    ["런치", "Launch"],
    ["레인", "Reign"],
    ["블랙", "Black"],
    ["블루", "Blue"],
    ["서밋", "Summit"],
    ["서스", "Suspension"],
    ["시티", "City"],
    ["에보", "EVO"],
    ["에어", "Air"],
    ["에코", "ECO"],
    ["유로", "Euro"],
    ["이글", "Eagle"],
    ["제트", "JET"],
    ["조이", "Joy"],
    ["첼로", "Cielo"],
    ["테크", "Tech"],
    ["하이", "High"],
    ["인승", "-seater"],
    ["마력", "hp"],
    ["도어", "-door"],
    ["라인", "Line"],
    ["모션", "Motion"],
    ["프로", "Pro"],
    ["기타", "Tjetër"],
    ["롱", "Long"],
    ["탑", "Top"],
    ["젠", "Gen"],
  ].sort((first, second) => second[0].length - first[0].length);

  const initialConsonants = [
    "g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj",
    "ch", "k", "t", "p", "h",
  ];
  const vowels = [
    "a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe",
    "yo", "u", "weo", "we", "wi", "yu", "eu", "yi", "i",
  ];
  const finalConsonants = [
    "", "k", "k", "k", "n", "n", "n", "t", "l", "l", "l", "l", "l", "l", "l",
    "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t",
  ];

  function romanize(value) {
    return String(value).replace(/[가-힣]+/g, (block) =>
      [...block]
        .map((character) => {
          const code = character.charCodeAt(0) - 0xac00;
          return (
            initialConsonants[Math.floor(code / 588)] +
            vowels[Math.floor((code % 588) / 28)] +
            finalConsonants[code % 28]
          );
        })
        .join(""),
    );
  }

  function latin(value) {
    const text = String(value ?? "");
    return /[가-힣]/.test(text) ? romanize(text) : text;
  }

  function badge(value) {
    if (!value) return "";

    const translated = trimTranslations.reduce(
      (text, [korean, english]) => text.replaceAll(korean, english),
      String(value),
    );

    return latin(translated).replace(/\s{2,}/g, " ").trim();
  }

  function formatNumber(value) {
    return numberFormatter.format(value);
  }

  function formatPrice(value) {
    return typeof value === "number"
      ? `${formatNumber(Math.round(value))} €`
      : "Çmimi sipas kërkesës";
  }

  function manufacturer(value) {
    return manufacturerNames[value] || latin(value) || "";
  }

  function model(value) {
    return modelNames[value] || latin(value) || "Veturë";
  }

  function fuel(value) {
    return fuelNames[value] || latin(value) || "—";
  }

  function transmission(value) {
    return transmissionNames[value] || latin(value) || "—";
  }

  function color(value) {
    return colorNames[value] || latin(value) || "—";
  }

  function body(value) {
    return bodyNames[value] || latin(value) || "—";
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
    badge,
  });
})();

window.CarFormat = CarFormat;
