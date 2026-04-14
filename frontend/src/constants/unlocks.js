// src/constants/unlocks.js

// --- Thresholds (currently used for did-you-know energy bands) ---
// NOTE:
// This file is still using the older 4-threshold band model for motivational /
// "Wussten Sie?" texts. Core unlock logic now comes from AI_TASKS elsewhere.
export const UNLOCKS = [
  { label: "6 Google-Suchanfragen", threshold: 0.002 },
  { label: "Bilderkennung", threshold: 0.004 },
  { label: "20 ChatGpt-Abfragen", threshold: 0.006 },
  { label: "Text zu Audio", threshold: 0.008 },
];

// Helper: how many tasks are unlocked at a given energy?
export const countUnlocked = (energy) =>
  UNLOCKS.filter((u) => energy >= u.threshold).length;

// --- Energy bands derived from thresholds ---
// 0: [0,      0.002)
// 1: [0.002,  0.004)
// 2: [0.004,  0.006)
// 3: [0.006,  0.008)
// 4: [0.008,  ∞)
export const ENERGY_BANDS = [
  { min: 0,                    max: UNLOCKS[0].threshold },
  { min: UNLOCKS[0].threshold, max: UNLOCKS[1].threshold },
  { min: UNLOCKS[1].threshold, max: UNLOCKS[2].threshold },
  { min: UNLOCKS[2].threshold, max: UNLOCKS[3].threshold },
  { min: UNLOCKS[3].threshold, max: Infinity },
];

// Fisher-Yates shuffle
export const shuffleArray = (items) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Returns a shuffled copy of the full band message map
export const getShuffledBandMessages = () => {
  const shuffled = {};
  Object.entries(BAND_MESSAGES).forEach(([band, messages]) => {
    shuffled[band] = shuffleArray(messages);
  });
  return shuffled;
};

// --- Energy-based “Did you know?” messages (formal German) ---
export const BAND_MESSAGES = {
  0: [
    "Wussten Sie? Mit 0.002 kWh Energie kann die KI erkennen, ob ein Wort eher fröhlich oder traurig ist.",
    "Wussten Sie? Mit 0.002 kWh Energie kann die KI „Hallo“ in einer anderen Sprache sagen.",
    "Wussten Sie? Mit 0.002 kWh Energie kann die KI einfache Rechenaufgaben wie 1+1 oder 5×3 sofort lösen.",
    "Wussten Sie? Mit 0.002 kWh Energie kann die KI Tierlaute zuordnen — etwa ob ein Geräusch von einer Kuh (Muh) oder einem Hund (Wuff) stammt.",
  ],

  1: [
    "Wussten Sie? Mit 0.004 kWh Energie kann die KI auf einem Bild zwischen einer Katze und einem Hund unterscheiden.",
    "Wussten Sie? Mit 0.004 kWh Energie kann die KI Ihnen eine kurze, spannende Wissensinfo erzählen — z. B. über das Weltall oder Dinosaurier.",
    "Wussten Sie? Mit 0.004 kWh Energie kann die KI Ihren Namen in eine andere Sprache übertragen oder aussprechen.",
    "Wussten Sie? Mit 0.004 kWh Energie kann die KI eine gewählte Farbe zuverlässig benennen.",
  ],

  2: [
    "Wussten Sie? Mit 0.006 kWh Energie kann die KI ein kurzes gesprochenes Wort als Text aufschreiben.",
    "Wussten Sie? Mit 0.006 kWh Energie kann die KI per Emoji einschätzen, ob Ihre Stimmung eher 😊, 😡 oder 😴 ist.",
    "Wussten Sie? Mit 0.006 kWh Energie kann die KI Ihnen ein kurzes Rätsel stellen.",
    "Wussten Sie? Mit 0.006 kWh Energie kann die KI einschätzen, ob ein Ton eher hoch oder tief ist.",
  ],

  3: [
    "Wussten Sie? Mit 0.008 kWh Energie kann die KI einen kurzen Ein-Satz-Geschichtenanfang erfinden.",
    "Wussten Sie? Mit 0.008 kWh Energie kann die KI Ihnen einen lustigen Zeichen-Vorschlag machen — z. B. eine Rakete oder eine Blume.",
    "Wussten Sie? Mit 0.008 kWh Energie kann die KI „Hallo“ in einer witzigen Roboter- oder Tierstimme sprechen.",
    "Wussten Sie? Mit 0.008 kWh Energie kann die KI Ihnen eine einfache Quizfrage stellen.",
  ],

  4: [
    "Alle Aufgaben sind freigeschaltet — probieren Sie sie der Reihe nach aus!",
    "Sie erzeugen weiterhin Energie — ideal für zusätzliche Experimente.",
    "Tipp: Variieren Sie das Tempo und beobachten Sie, wie die KI-Anzeige reagiert.",
    "Hinweis: Sie können nun beliebig zwischen den KI-Aufgaben wechseln.",
  ],
};