// Ubur-ubur drone penjaga: patroli waypoint, vision cone, curiga bertahap,
// lalu waspada dan mengejar posisi terakhir terlihat. Deteksi memberi kesempatan
// pulih: sembunyi di kelp, jongkok pelan, atau tutup cone dengan tinta.
import { GUARD, PEARL_GLOW } from './config.js';
import { canSee } from './vision.js';
import { resolveCircleWalls } from './world.js';

export function createGuard(route, speed) {
  return {
    route,
    speed,
    x: route[0].x,
    y: route[0].y,
    waypoint: 1,
    facing: 0,
    suspicion: 0,
    state: 'patrol', // patrol | suspicious | alert
    alertTimer: 0,
    lastSeenX: 0,
    lastSeenY: 0,
    wobble: Math.random() * Math.PI * 2,
    stuckTimer: 0,
    lastX: route[0].x,
    lastY: route[0].y,
  };
}

function guardConeRange(pearlTaken) {
  return GUARD.coneRange * (pearlTaken ? PEARL_GLOW.coneRangeMultiplier : 1);
}

// Seberapa cepat guard ini mengenali pemain saat ini (0 = tidak terlihat).
export function guardDetectionRate(guard, player, game, pearlTaken, inkClouds) {
  const range = guardConeRange(pearlTaken);
  const seen = canSee(guard.x, guard.y, guard.facing, range, GUARD.coneHalfAngle, player.x, player.y, game.world.walls);
  if (!seen) return 0;
  // Tinta menutup pandangan sepenuhnya.
  for (const cloud of inkClouds) {
    if (Math.hypot(player.x - cloud.x, player.y - cloud.y) < cloud.radius) return 0;
  }
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  // Dekat = dikenali lebih cepat; jauh = lebih lambat.
  let rate = GUARD.suspicionPerSecond * (1.6 - (dist / range) * 0.9);
  if (player.sneaking) rate *= 0.55;
  if (game.hidden) rate *= 0.25; // bersembunyi di kelp gelap
  if (pearlTaken) rate *= PEARL_GLOW.detectMultiplier; // mutiara hidup membuatmu bersinar
  return rate;
}

export function updateGuard(guard, dt, player, game, pearlTaken, inkClouds, now) {
  const speedBoost = pearlTaken ? PEARL_GLOW.patrolSpeedMultiplier : 1;
  const rate = guardDetectionRate(guard, player, game, pearlTaken, inkClouds);

  if (rate > 0) {
    guard.suspicion = Math.min(1, guard.suspicion + rate * dt);
    guard.lastSeenX = player.x;
    guard.lastSeenY = player.y;
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - GUARD.suspicionDecay * dt);
  }

  if (guard.suspicion >= GUARD.alertAt) {
    guard.state = 'alert';
    guard.alertTimer = GUARD.alertSeconds;
  } else if (guard.suspicion >= GUARD.suspiciousAt) {
    if (guard.state === 'patrol') guard.state = 'suspicious';
  } else if (guard.state === 'suspicious') {
    guard.state = 'patrol';
  }

  if (guard.state === 'alert') {
    guard.alertTimer -= dt;
    // Kejar posisi terakhir terlihat, lalu kembali patroli.
    // Penjaga juga menabrak dinding: tidak ada yang menembus karang.
    const dx = guard.lastSeenX - guard.x;
    const dy = guard.lastSeenY - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 8) {
      const step = GUARD.chaseSpeed * speedBoost * dt;
      const moved = resolveCircleWalls(
        guard.x + (dx / dist) * Math.min(step, dist),
        guard.y + (dy / dist) * Math.min(step, dist),
        GUARD.radius,
        game.world.walls,
      );
      guard.x = moved.x;
      guard.y = moved.y;
      guard.facing = Math.atan2(dy, dx);
    }
    if (guard.alertTimer <= 0 && guard.suspicion < GUARD.alertAt) {
      guard.state = 'patrol';
    }
  } else {
    // Patroli: jalan ke waypoint berikut, hadap arah gerak.
    const target = guard.route[guard.waypoint];
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const dist = Math.hypot(dx, dy);
    const step = guard.speed * speedBoost * dt;
    if (dist <= Math.max(step, 4)) {
      guard.waypoint = (guard.waypoint + 1) % guard.route.length;
    } else {
      const moved = resolveCircleWalls(
        guard.x + (dx / dist) * step,
        guard.y + (dy / dist) * step,
        GUARD.radius,
        game.world.walls,
      );
      guard.x = moved.x;
      guard.y = moved.y;
      guard.facing = Math.atan2(dy, dx);
    }
    // Pengaman: bila dinding menjepit (tak bergerak >1,5 dtk), lewati waypoint.
    if (Math.hypot(guard.x - guard.lastX, guard.y - guard.lastY) < 1) {
      guard.stuckTimer += dt;
      if (guard.stuckTimer > 1.5) {
        guard.waypoint = (guard.waypoint + 1) % guard.route.length;
        guard.stuckTimer = 0;
      }
    } else {
      guard.stuckTimer = 0;
    }
    guard.lastX = guard.x;
    guard.lastY = guard.y;
    // Curiga: berhenti sejenak dan menoleh ke arah pemain.
    if (guard.state === 'suspicious' && rate > 0) {
      guard.facing = Math.atan2(player.y - guard.y, player.x - guard.x);
    }
  }

  guard.wobble = now;
  return rate;
}
