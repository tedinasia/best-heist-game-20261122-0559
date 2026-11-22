// Boot dan satu loop Arsip Abyssal: input dibaca tiap frame, simulasi maju
// dalam langkah tetap 1/60 detik, renderer melukis apa yang ada.
// Layar: title → playing ⇄ paused → won / lost.
// ?shot=start|play|getaway|win menata adegan itu, merendernya, lalu
// menandai window.__shotReady untuk screenshot.
import { ALARM, GUARD, INK_RECHARGE_PER_PEARL, PLAYER, SCORE } from './config.js';
import { makeRng } from './random.js';
import { createInput } from './input.js';
import { buildWorld, insideKelp, resolveCircleWalls } from './world.js';
import { createGuard, updateGuard } from './guards.js';
import { createCamera, updateCamera } from './cameras.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;
const BEST_KEY = 'abyssal.best';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261122;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();
const rng = makeRng(seed);

function createGame() {
  const world = buildWorld();
  return {
    screen: 'title',
    world,
    player: {
      x: world.spawn.x,
      y: world.spawn.y,
      facing: 0,
      sneaking: false,
      moving: false,
    },
    guards: world.guardRoutes.map((route) => createGuard(route, GUARD.patrolSpeed)),
    cameras: world.cameraMounts.map((mount) => createCamera(mount)),
    inkClouds: [],
    bubbles: [],
    inkCharges: PLAYER.inkCharges,
    alarm: 0,
    score: 0,
    lootTaken: 0,
    pearlTaken: false,
    elapsed: 0,
    banner: null,
    endStats: null,
    cause: null,
    hidden: false,
    now: 0,
    best: readBest(),
    bubbleTimer: 0,
    alarmBeepTimer: 0,
    wasAlert: false,
  };
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage bisa mati (jendela privat): skor terbaik lalu hanya bertahan sekali kunjungan.
  }
}

let game = createGame();

function announce(message) {
  status.textContent = message;
}

function resetGame() {
  game = createGame();
}

function startGame() {
  resetGame();
  game.screen = 'playing';
  audio.unlock();
  announce('Bermain. Curi Mutiara Abyssal, lalu kembali ke airlock.');
}

function endGame(won, cause) {
  game.screen = won ? 'won' : 'lost';
  game.cause = cause;
  if (won) {
    const timeBonus = Math.max(0, SCORE.timeBonusCap - Math.floor(game.elapsed) * SCORE.timeBonusPerSecond);
    game.score += timeBonus;
    game.endStats = { score: game.score, time: game.elapsed, loot: game.lootTaken };
    if (game.score > game.best) {
      game.best = game.score;
      saveBest(game.best);
    }
    audio.win();
    announce(`Menang! Skor ${game.score}.`);
  } else {
    audio.caught();
    announce('Tertangkap! Tekan R untuk coba lagi.');
  }
}

function grabNearbyLoot() {
  for (const pearl of game.world.loot) {
    if (pearl.taken) continue;
    if (Math.hypot(game.player.x - pearl.x, game.player.y - pearl.y) < PLAYER.grabRadius) {
      pearl.taken = true;
      game.lootTaken += 1;
      game.score += SCORE.smallPearl;
      game.inkCharges = Math.min(PLAYER.inkMax, game.inkCharges + INK_RECHARGE_PER_PEARL);
      audio.pickup();
      announce(`Mutiara kecil ${game.lootTaken} dari 5. Tinta +1.`);
      return;
    }
  }
  const pearl = game.world.pearl;
  if (!pearl.taken && Math.hypot(game.player.x - pearl.x, game.player.y - pearl.y) < PLAYER.grabRadius + 6) {
    pearl.taken = true;
    game.pearlTaken = true;
    game.score += SCORE.bigPearl;
    game.banner = {
      text: 'MUTIARA HIDUP!',
      sub: 'Ia bersinar — semua penjaga melihatmu lebih cepat. LARI KE AIRLOCK!',
      ttl: 4,
    };
    audio.bigPearl();
    announce('Mutiara Abyssal diambil — dan ia hidup! Kembali ke airlock!');
  }
}

function burstInk() {
  if (game.inkCharges <= 0) return;
  game.inkCharges -= 1;
  game.inkClouds.push({ x: game.player.x, y: game.player.y, radius: PLAYER.inkRadius, ttl: PLAYER.inkSeconds });
  audio.inkBurst();
}

function stepPlaying(dt, input) {
  const player = game.player;
  game.elapsed += dt;
  game.now += dt;

  // Gerak + tabrakan dinding.
  const move = input.moveVector();
  player.sneaking = input.sneaking;
  player.moving = move.x !== 0 || move.y !== 0;
  if (player.moving) {
    const speed = player.sneaking ? PLAYER.sneakSpeed : PLAYER.speed;
    player.facing = Math.atan2(move.y, move.x);
    const next = resolveCircleWalls(
      player.x + move.x * speed * dt,
      player.y + move.y * speed * dt,
      PLAYER.radius,
      game.world.walls,
    );
    player.x = next.x;
    player.y = next.y;
  }
  game.hidden = insideKelp(player.x, player.y, game.world.kelpShadows);

  // Aksi sekali tekan.
  if (input.consumeKey('Space')) burstInk();
  if (input.consumeKey('KeyE')) grabNearbyLoot();
  if (input.consumeKey('KeyM')) {
    const muted = audio.toggleMute();
    announce(muted ? 'Suara mati.' : 'Suara hidup.');
  }

  // Tinta menipis.
  for (let i = game.inkClouds.length - 1; i >= 0; i -= 1) {
    game.inkClouds[i].ttl -= dt;
    if (game.inkClouds[i].ttl <= 0) game.inkClouds.splice(i, 1);
  }

  // Gelembung ambient.
  game.bubbleTimer -= dt;
  if (game.bubbleTimer <= 0) {
    game.bubbleTimer = 0.4 + rng() * 0.6;
    game.bubbles.push({
      x: player.x + (rng() - 0.5) * 120,
      y: player.y + 20 + rng() * 30,
      r: 1.5 + rng() * 2.5,
    });
  }
  for (let i = game.bubbles.length - 1; i >= 0; i -= 1) {
    const bubble = game.bubbles[i];
    bubble.y -= 26 * dt;
    bubble.x += Math.sin(game.now * 2 + i) * 8 * dt;
    if (bubble.y < 60) game.bubbles.splice(i, 1);
  }

  // Penjaga dan kamera: deteksi tertinggi menentukan laju alarm.
  let peak = 0;
  let anyAlert = false;
  for (const guard of game.guards) {
    updateGuard(guard, dt, player, game, game.pearlTaken, game.inkClouds, game.now);
    peak = Math.max(peak, guard.suspicion);
    if (guard.state === 'alert') anyAlert = true;
    if (Math.hypot(player.x - guard.x, player.y - guard.y) < GUARD.touchRadius) {
      endGame(false, 'touch');
      return;
    }
  }
  for (const camera of game.cameras) {
    const rate = updateCamera(camera, dt, player, game, game.pearlTaken, game.inkClouds);
    if (rate > 0) peak = Math.max(peak, 1);
  }

  if (anyAlert && !game.wasAlert) audio.spotted();
  game.wasAlert = anyAlert;

  if (peak >= GUARD.alertAt) game.alarm += ALARM.risePerSecond * dt;
  else if (peak >= GUARD.suspiciousAt) game.alarm += ALARM.risePerSecond * 0.35 * dt;
  else game.alarm -= ALARM.decayPerSecond * dt;
  if (game.pearlTaken) game.alarm += ALARM.escapePulsePerSecond * dt; // denyut mutiara hidup
  game.alarm = Math.max(0, Math.min(ALARM.caughtAt, game.alarm));

  if (game.alarm >= 60) {
    game.alarmBeepTimer -= dt;
    if (game.alarmBeepTimer <= 0) {
      game.alarmBeepTimer = 0.55;
      audio.alarmTick();
    }
  }

  if (game.banner) {
    game.banner.ttl -= dt;
    if (game.banner.ttl <= 0) game.banner = null;
  }

  if (game.alarm >= ALARM.caughtAt) {
    endGame(false, 'alarm');
    return;
  }

  // Menang: bawa Mutiara hidup kembali ke airlock.
  if (game.pearlTaken) {
    const hatch = game.world.hatch;
    if (Math.hypot(player.x - hatch.x, player.y - hatch.y) < hatch.r + 12) {
      endGame(true, null);
    }
  }
}

function stepTitle(dt) {
  game.now += dt;
  // Latar hidup: penjaga tetap patroli di balik panel judul.
  for (const guard of game.guards) {
    const target = guard.route[guard.waypoint];
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const dist = Math.hypot(dx, dy);
    const step = guard.speed * dt;
    if (dist <= Math.max(step, 4)) guard.waypoint = (guard.waypoint + 1) % guard.route.length;
    else {
      guard.x += (dx / dist) * step;
      guard.y += (dy / dist) * step;
      guard.facing = Math.atan2(dy, dx);
    }
  }
  for (const camera of game.cameras) {
    camera.sweepTime += dt * 0.55;
    camera.angle = camera.baseAngle + Math.sin(camera.sweepTime) * camera.sweep;
  }
}

function runShot(name) {
  stageShot(name, game);
  let painted = 0;
  function paint() {
    renderer.draw(game, game.now);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();

  function handleScreens() {
    const clicks = input.consumeClicks();
    if (game.screen === 'title') {
      if (clicks.length > 0 || input.consumeKey('Space') || input.consumeKey('Enter')) {
        audio.click();
        startGame();
      }
      return;
    }
    if (game.screen === 'won' || game.screen === 'lost') {
      if (clicks.length > 0 || input.consumeKey('KeyR') || input.consumeKey('Space') || input.consumeKey('Enter')) {
        audio.click();
        startGame();
      }
      return;
    }
    if (game.screen === 'playing') {
      if (input.consumeKey('KeyP') || input.consumeKey('Escape')) {
        game.screen = 'paused';
        announce('Jeda.');
      }
      return;
    }
    if (game.screen === 'paused') {
      if (input.consumeKey('KeyP') || input.consumeKey('Escape') || clicks.length > 0) {
        game.screen = 'playing';
        announce('Lanjut.');
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleScreens();
    if (game.screen === 'playing') {
      while (accumulator >= STEP) {
        stepPlaying(STEP, input);
        accumulator -= STEP;
        if (game.screen !== 'playing') {
          accumulator = 0;
          break;
        }
      }
    } else if (game.screen === 'title') {
      while (accumulator >= STEP) {
        stepTitle(STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(game, game.now);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.screen === 'playing') {
      game.screen = 'paused';
      announce('Jeda.');
    }
  });

  announce('Arsip Abyssal. Klik atau tekan Spasi untuk mulai.');
  requestAnimationFrame(frame);
}

// Hook untuk playtest otomatis lewat DevTools/CDP (bukan bagian dari gameplay).
window.__abyssal = {
  get game() {
    return game;
  },
  start: startGame,
};

if (shot) runShot(shot);
else runGame();
