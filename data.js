export const dashboardData = {
  mainSpot: {
    name: "Punta Sabbioni",
    verdict: "SÌ",
    summary: "Vento NE 8 kn offshore e periodo 7 s: onda ordinata fino a metà mattina. Poi gira e si sfalda.",
    rating: 7,
    window: "06:40 → 10:20",
    waveHeight: 0.9,
    waveHeightRange: "0,6–1,1 m",
    period: 7,
    periodDesc: "wind swell corto",
    waveDir: "SE",
    waveDirDeg: 135,
    windSpeed: 8,
    windDir: "NE",
    windDesc: "offshore",
    tideInfo: "alta 09:48",
    tideValue: "0,7",
    tideTrend: "↑",
    waterTemp: 23,
    airTemp: 21,
    tempDesc: "shorty o niente muta",
    crowd: 4,
    crowdDesc: "in acqua · stimato",
    recommendedBoard: "8'6\" RIGIDA"
  },
  forecast7Days: [
    { day: "MER", height: 0.9, type: "neutral" },
    { day: "GIO", height: 0.5, type: "low" },
    { day: "GIO", height: 1.4, type: "best", desc: "MIGLIORE: GIO 18, 06:00–09:00" },
    { day: "VEN", height: 1.1, type: "neutral" },
    { day: "SAB", height: 0.3, type: "low" },
    { day: "DOM", height: 0.2, type: "low" },
    { day: "LUN", height: 0.7, type: "neutral" }
  ],
  spotComparison: [
    { name: "Punta Sabbioni", wave: "0,9 m", period: "7 s", wind: "NE 8 kn", crowd: 4, rating: 7, isBest: true },
    { name: "Camping Mediterraneo", wave: "0,7 m", period: "6 s", wind: "NE 9 kn", crowd: 0, rating: 5, isBest: false },
    { name: "Pizzeria Soleado", wave: "0,6 m", period: "6 s", wind: "NE 10 kn", crowd: 2, rating: 4, isBest: false }
  ],
  sessions: [
    { date: "12 set", spot: "Punta Sabbioni", duration: "1h 40", waves: 21 },
    { date: "08 set", spot: "Soleado", duration: "55 min", waves: 9 },
    { date: "02 set", spot: "Punta Sabbioni", duration: "2h 05", waves: 28 }
  ],
  maps: [
    { label: "Adesso · mer 16, 06 UTC", src: "https://forecast.uoa.gr/maps/0day/WAM/ION/MWH/000.MWH.png", highlight: false },
    { label: "+24h · gio 17, 06 UTC", src: "https://forecast.uoa.gr/maps/0day/WAM/ION/MWH/024.MWH.png", highlight: false },
    { label: "+48h · gio 18, 06 UTC · picco 1,4 m", src: "https://forecast.uoa.gr/maps/0day/WAM/ION/MWH/048.MWH.png", highlight: true }
  ]
};
