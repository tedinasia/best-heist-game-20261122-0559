// Mata Abyssal — kamera dinding yang menyapu ruangan dengan cone ungu.
// Ia tidak bergerak, tapi pandangannya berayun; pelajari ritmenya lalu lewat.
import { CAMERA, PEARL_GLOW } from './config.js';
import { canSee } from './vision.js';

export function createCamera(mount) {
  return {
    x: mount.x,
    y: mount.y,
    baseAngle: mount.baseAngle,
    sweep: mount.sweep,
    phase: mount.phase,
    angle: mount.baseAngle,
    sweepTime: mount.phase,
  };
}

export function updateCamera(camera, dt, player, game, pearlTaken, inkClouds) {
  camera.sweepTime += dt * CAMERA.sweepSpeed;
  camera.angle = camera.baseAngle + Math.sin(camera.sweepTime) * camera.sweep;
  const range = CAMERA.range * (pearlTaken ? PEARL_GLOW.coneRangeMultiplier : 1);
  const seen = canSee(camera.x, camera.y, camera.angle, range, CAMERA.halfAngle, player.x, player.y, game.world.walls);
  if (!seen) return 0;
  for (const cloud of inkClouds) {
    if (Math.hypot(player.x - cloud.x, player.y - cloud.y) < cloud.radius) return 0;
  }
  let rate = CAMERA.detectPerSecond;
  if (player.sneaking) rate *= 0.55;
  if (game.hidden) rate *= 0.25;
  if (pearlTaken) rate *= PEARL_GLOW.detectMultiplier;
  return rate;
}
