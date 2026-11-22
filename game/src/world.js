// Arsip Abyssal — denah level: satu ruangan besar 1280x720 yang terlihat utuh
// dalam satu frame. Barat: airlock (titik masuk & pelarian). Tengah: aula karang.
// Timur: brankas Mutiara Abyssal. Dinding memblokir gerak dan garis pandang;
// kelp gelap = bayangan tempat bersembunyi; karang = dekor bercahaya.
import { makeRng, pickBetween } from './random.js';

const BORDER = 24;

export function buildWorld() {
  const walls = [
    // Bingkai luar.
    { x: 0, y: 0, w: 1280, h: BORDER },
    { x: 0, y: 696, w: 1280, h: BORDER },
    { x: 0, y: 0, w: BORDER, h: 720 },
    { x: 1256, y: 0, w: BORDER, h: 720 },
    // Dinding barat-tengah, celah pintu di y 300..420.
    { x: 360, y: BORDER, w: 24, h: 276 },
    { x: 360, y: 420, w: 24, h: 276 },
    // Dinding brankas timur, celah pintu di y 480..696.
    { x: 900, y: BORDER, w: 24, h: 456 },
    // Blok karang tengah (penutup + pemecah garis pandang).
    { x: 560, y: 120, w: 120, h: 36 },
    { x: 680, y: 430, w: 140, h: 36 },
    { x: 600, y: 360, w: 24, h: 140 },
    // Blok dalam brankas, di sudut bawah-kanan: tidak memotong koridor
    // pendakian ke Mutiara, tapi memecah garis pandang di dekat kelp.
    { x: 1150, y: 600, w: 80, h: 30 },
  ];

  // Zona bayangan kelp: berdiri di sini nyaris tak terlihat.
  const kelpShadows = [
    { x: 300, y: 180, r: 72 },
    { x: 200, y: 420, r: 70 },
    { x: 520, y: 620, r: 80 },
    { x: 760, y: 180, r: 75 },
    { x: 640, y: 360, r: 70 },
    { x: 980, y: 180, r: 60 },
    { x: 1120, y: 560, r: 85 },
  ];

  // Mutiara kecil (loot opsional, +skor dan +1 tinta).
  const loot = [
    { x: 300, y: 120, taken: false },
    { x: 470, y: 240, taken: false },
    { x: 820, y: 620, taken: false },
    { x: 1150, y: 420, taken: false },
    { x: 980, y: 640, taken: false },
  ];

  const pearl = { x: 1140, y: 110, taken: false };
  const hatch = { x: 72, y: 648, r: 30 };
  const spawn = { x: 120, y: 620 };

  // Rute patroli ubur-ubur drone — bisa dipelajari, berulang, berirama.
  const guardRoutes = [
    // Aula tengah: kotak besar.
    [
      { x: 450, y: 220 },
      { x: 850, y: 220 },
      { x: 850, y: 620 },
      { x: 450, y: 620 },
    ],
    // Brankas timur: mengitari Mutiara dari jarak aman (60px dari alasnya).
    [
      { x: 980, y: 170 },
      { x: 1180, y: 170 },
      { x: 1180, y: 430 },
      { x: 980, y: 430 },
    ],
    // Barat: menjaga pintu masuk dan celah dinding — tapi tidak pernah
    // mengintip ke sudut airlock: titik awal dan pelarian harus aman.
    [
      { x: 150, y: 150 },
      { x: 300, y: 150 },
      { x: 300, y: 480 },
      { x: 150, y: 480 },
    ],
  ];

  // Mata Abyssal — kamera di dinding.
  const cameraMounts = [
    { x: 640, y: 30, baseAngle: Math.PI / 2, sweep: 0.9, phase: 0 },
    { x: 1250, y: 300, baseAngle: Math.PI, sweep: 0.7, phase: 1.4 },
    { x: 520, y: 690, baseAngle: -Math.PI / 2, sweep: 0.8, phase: 2.6 },
  ];

  // Dekor deterministik: gelembung cahaya dan karang kecil.
  const rng = makeRng(20261122);
  const glowDots = [];
  for (let i = 0; i < 90; i += 1) {
    glowDots.push({
      x: pickBetween(rng, 40, 1240),
      y: pickBetween(rng, 40, 680),
      r: pickBetween(rng, 1, 3.2),
      twinkle: pickBetween(rng, 0, Math.PI * 2),
    });
  }
  const corals = [];
  const coralSpots = [
    [400, 60], [860, 660], [940, 660], [60, 300], [1240, 640],
    [430, 660], [700, 60], [1080, 660], [60, 90], [330, 660],
  ];
  for (const [cx, cy] of coralSpots) {
    const branches = 3 + Math.floor(rng() * 3);
    const arms = [];
    for (let i = 0; i < branches; i += 1) {
      arms.push({
        angle: -Math.PI / 2 + pickBetween(rng, -0.9, 0.9),
        len: pickBetween(rng, 14, 34),
      });
    }
    corals.push({ x: cx, y: cy, arms });
  }

  return { walls, kelpShadows, loot, pearl, hatch, spawn, guardRoutes, cameraMounts, glowDots, corals };
}

// Apakah titik (px,py) berada di dalam zona bayangan kelp.
export function insideKelp(x, y, kelpShadows) {
  for (const kelp of kelpShadows) {
    if (Math.hypot(x - kelp.x, y - kelp.y) < kelp.r) return true;
  }
  return false;
}

// Geser lingkaran (pemain) keluar dari dinding; kembalikan posisi yang sudah dikoreksi.
export function resolveCircleWalls(px, py, radius, walls) {
  let x = px;
  let y = py;
  for (const wall of walls) {
    const nearestX = Math.max(wall.x, Math.min(x, wall.x + wall.w));
    const nearestY = Math.max(wall.y, Math.min(y, wall.y + wall.h));
    const dx = x - nearestX;
    const dy = y - nearestY;
    const distSq = dx * dx + dy * dy;
    if (distSq < radius * radius) {
      if (distSq === 0) {
        // Tepat di dalam dinding: dorong ke atas.
        y = wall.y - radius;
      } else {
        const dist = Math.sqrt(distSq);
        x = nearestX + (dx / dist) * radius;
        y = nearestY + (dy / dist) * radius;
      }
    }
  }
  return { x, y };
}
