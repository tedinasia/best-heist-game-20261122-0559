// Arsip Abyssal — semua angka tuning dan palet warna dalam satu tempat.
// Laut dalam gelap (navy/teal) + cahaya bioluminescent cyan + loot amber hangat.
export const VIEW_W = 1280;
export const VIEW_H = 720;

export const PALETTE = {
  deep: '#03101d',
  floor: '#06222e',
  floorAlt: '#072a38',
  wall: '#0b3542',
  wallEdge: '#19c8d8',
  wallTop: '#10505e',
  coral: '#0d4b4a',
  coralTip: '#3ff5e6',
  kelp: '#04262b',
  kelpEdge: '#0d5a55',
  cyan: '#3ff5e6',
  cyanDim: '#1f9d94',
  amber: '#ffb347',
  amberDeep: '#ff8c1a',
  danger: '#ff5470',
  warn: '#ffc53d',
  violet: '#b78cff',
  ink: '#070b16',
  text: '#d8fff8',
  muted: '#7fb8b0',
};

// Penyelam pencuri.
export const PLAYER = {
  radius: 14,
  speed: 178,
  sneakSpeed: 88,
  inkCharges: 3,
  inkMax: 4,
  inkRadius: 108,
  inkSeconds: 4.5,
  grabRadius: 34,
};

// Ubur-ubur drone penjaga.
export const GUARD = {
  radius: 20,
  coneRange: 215,
  coneHalfAngle: 0.56, // ~32 derajat
  patrolSpeed: 62,
  chaseSpeed: 122,
  suspicionPerSecond: 1.35,
  suspicionDecay: 0.55,
  alertSeconds: 2.6,
  touchRadius: 27,
  suspiciousAt: 0.45,
  alertAt: 0.85,
};

// Mata Abyssal — kamera dinding.
export const CAMERA = {
  range: 250,
  halfAngle: 0.44,
  sweepSpeed: 0.55,
  detectPerSecond: 1.7,
};

// Meter alarm 0..100. Di 100: tertangkap.
export const ALARM = {
  risePerSecond: 13,
  decayPerSecond: 7,
  escapePulsePerSecond: 2.2, // mutiara hidup berdenyut: alarm merayap naik
  caughtAt: 100,
};

// Begitu Mutiara Abyssal diambil, ia HIDUP dan bersinar: kamu jadi suar.
export const PEARL_GLOW = {
  detectMultiplier: 1.6,
  coneRangeMultiplier: 1.15,
  patrolSpeedMultiplier: 1.3,
};

export const SCORE = {
  smallPearl: 100,
  bigPearl: 500,
  timeBonusPerSecond: 5,
  timeBonusCap: 600,
};

export const INK_RECHARGE_PER_PEARL = 1;
