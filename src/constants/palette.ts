// 3D 씬·오브젝트 색상 팔레트 (파스텔 톤). 색은 여기서만 관리한다.

export const PALETTE = {
  /** 바닥 접지 그림자 색 (검정 대신 따뜻한 갈색이라 부드럽게 보임) */
  contactShadow: "#7a4a24",

  light: { key: "#fff1dc", fill: "#dfe9ff", sky: "#fffaf0", ground: "#f0dcc4" },

  // 공통 파스텔 색
  cream: "#fbf3e4",
  butter: "#ffe29a",
  peach: "#ffc7a8",
  coral: "#f48a83",
  cherry: "#e9636a",
  mint: "#a8e0c4",
  sky: "#a9d4f5",
  lavender: "#c9b8f0",
  cocoa: "#8a5a44",
  charcoal: "#3f3a40",

  // 원본 썸네일(img/치킨.png)의 주황빛 황금색 튀김옷 + 크림색 뼈
  chicken: {
    crustDeep: "#e07a1f",
    crust: "#f68b22",
    crustLight: "#ffaa45",
    bone: "#f8eed6",
    boneShade: "#eddcb6",
  },

  // 원본 썸네일(img/아이스크림.png): 노릇한 와플 콘 + 바닐라 크림
  icecream: {
    cone: "#df9f50",
    coneLight: "#f0bd72",
    coneLine: "#c4843f",
    creamShade: "#f8e7c2",
    cream: "#fff8e6",
  },

  // 원본 썸네일(img/삼각김밥.png): 하얀 밥 + 짙은 초록 김
  samgak: {
    riceShade: "#efe2c6",
    rice: "#fffaee",
    nori: "#1d2f22",
    noriLight: "#2f4a35",
  },

  // 원본 썸네일(img/컵라면.png): 빨간 컵 + 크림색 밑단 + 노란 면
  cupramen: {
    cup: "#d8352a",
    cupLight: "#ec5544",
    cupBase: "#f3e7d2",
    rim: "#fbf6ee",
    noodleDeep: "#d9982e",
    noodle: "#f0bf4e",
    noodleLight: "#ffdf8a",
    scallion: "#4f9c3a",
    carrot: "#f07a2a",
    lid: "#f8f2e6",
    lidShade: "#e9dfcc",
    chopstick: "#c9995f",
  },

  // 원본 썸네일(img/커피.png): 클레이 테이크아웃 컵 — 베이지 컵·뚜껑 + 초콜릿색 슬리브
  coffee: {
    cupDeep: "#d6c19c",
    cup: "#e2cfac",
    cupLight: "#eddfc3",
    lid: "#efe3cb",
    sleeveDeep: "#5a3828",
    sleeve: "#6e4635",
    sleeveLight: "#805544",
    hole: "#9c7b58",
  },

  // 원본 썸네일(img/떡볶이.png): 붉은 그릇 + 빨간 소스 + 하얀 떡 + 주황 어묵
  tteokbokki: {
    bowl: "#b8301e",
    bowlLight: "#e04a2c",
    sauceDeep: "#a4220f",
    sauce: "#c9351a",
    sauceLight: "#de4a26",
    cakeShade: "#f3e4c8",
    cake: "#fff8ea",
    fishcake: "#f08a3a",
    scallion: "#4caf3a",
  },

  // 원본 썸네일(img/소주.png): 초록 유리병 + 진한 초록 뚜껑 + 크림색 라벨
  soju: {
    glassDeep: "#2b7a35",
    glass: "#4aa552",
    label: "#f3ecd6",
    cap: "#1f5f29",
    capLight: "#2e7a37",
  },

  // 원본 썸네일(img/햄버거.png)
  burger: {
    bunDeep: "#c97a2e",
    bun: "#efb05a",
    sesame: "#fbf1da",
    pattyDeep: "#3a1f12",
    patty: "#5a3420",
    pattyLight: "#7c4c2e",
    cheese: "#f6c23c",
    tomato: "#e0432d",
    lettuceDeep: "#3f8f2c",
    lettuce: "#6cbf3c",
    lettuceLight: "#9ad65a",
  },

  // 원본 썸네일(img/국밥.png): 검은 뚝배기 + 뽀얀 국물
  gukbap: {
    bowl: "#232020",
    bowlLight: "#47413d",
    broth: "#e6d6ba",
    brothLight: "#f6eedf",
    beef: "#7a4c33",
    beefLight: "#a06c4c",
    scallion: "#5aab3c",
  },

  // 원본 썸네일(img/피자.png): 노릇한 도우, 노란 치즈, 빨간 페퍼로니, 검은 올리브, 초록 바질
  pizza: {
    crustDeep: "#c06a25",
    crust: "#e0923d",
    crustLight: "#f3b866",
    cheeseToasted: "#f0b04c",
    cheese: "#f8d47a",
    cheeseLight: "#fde6a6",
    pepperoni: "#cf3324",
    pepperoniLight: "#e4503a",
    olive: "#2a2522",
    basil: "#3f8a35",
    basilLight: "#6cb04f",
  },
} as const;
