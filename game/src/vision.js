// Geometri penglihatan: apakah target ada di dalam vision cone,
// dan apakah garis pandang terhalang dinding.
export function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// True bila segmen (x1,y1)-(x2,y2) tidak menembus satu pun dinding.
export function lineOfSightClear(x1, y1, x2, y2, walls) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / 7));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    for (const wall of walls) {
      if (pointInRect(px, py, wall)) return false;
    }
  }
  return true;
}

// True bila target terlihat dari (ox, oy) menghadap `facing`, dalam jangkauan
// dan setengah sudut cone, dengan garis pandang bersih.
export function canSee(ox, oy, facing, range, halfAngle, tx, ty, walls) {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 1) return true;
  const targetAngle = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(targetAngle, facing)) > halfAngle) return false;
  return lineOfSightClear(ox, oy, tx, ty, walls);
}
