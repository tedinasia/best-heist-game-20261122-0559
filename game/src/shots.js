// Adegan deterministik di balik ?shot=start|play|getaway|win.
// Setiap adegan menata state game yang sama persis setiap kali, lalu dirender
// sekali — jadi screenshot cover selalu menampilkan frame yang lengkap:
// ruangan, thief, guard + vision cone, kamera, loot, dan alarm meter.
import { GUARD } from './config.js';

const SHOT_NOW = 8.4;

function placeGuard(guard, x, y, facing, suspicion, state) {
  guard.x = x;
  guard.y = y;
  guard.facing = facing;
  guard.suspicion = suspicion;
  guard.state = state;
  guard.alertTimer = state === 'alert' ? GUARD.alertSeconds : 0;
  guard.lastSeenX = x;
  guard.lastSeenY = y;
}

export function stageShot(name, game) {
  game.now = SHOT_NOW;
  game.banner = null;
  game.bubbles = [];
  game.inkClouds = [];
  game.elapsed = 0;
  game.score = 0;
  game.lootTaken = 0;
  game.inkCharges = 3;
  game.alarm = 0;
  game.pearlTaken = false;
  game.cause = null;
  for (const pearl of game.world.loot) pearl.taken = false;
  game.world.pearl.taken = false;

  if (name === 'play') {
    // Cover: penyusupan tengah jalan. Satu guard sudah curiga (cone kuning),
    // kamera menyapu, alarm 34, tinta tinggal 2, dua mutiara kecil sudah diambil.
    game.screen = 'playing';
    game.player.x = 560;
    game.player.y = 540;
    game.player.facing = -Math.PI / 2;
    game.player.sneaking = true;
    game.player.moving = false;
    game.elapsed = 47;
    game.score = 200;
    game.lootTaken = 2;
    game.world.loot[0].taken = true;
    game.world.loot[1].taken = true;
    game.inkCharges = 2;
    game.alarm = 34;
    placeGuard(game.guards[0], 700, 220, Math.PI, 0.55, 'suspicious');
    placeGuard(game.guards[1], 1100, 300, Math.PI / 2, 0.1, 'patrol');
    placeGuard(game.guards[2], 300, 320, Math.PI / 2, 0, 'patrol');
    game.cameras[0].sweepTime = 1.1;
    game.cameras[1].sweepTime = 0.4;
    game.cameras[2].sweepTime = 2.0;
    game.cameras[0].angle = game.cameras[0].baseAngle + Math.sin(1.1 * 0.55) * game.cameras[0].sweep;
    game.cameras[1].angle = game.cameras[1].baseAngle + Math.sin(0.4 * 0.55) * game.cameras[1].sweep;
    game.cameras[2].angle = game.cameras[2].baseAngle + Math.sin(2.0 * 0.55) * game.cameras[2].sweep;
    game.inkClouds.push({ x: 700, y: 420, radius: 108, ttl: 3 });
    game.hidden = false;
    return;
  }

  if (name === 'getaway') {
    // Twist: Mutiara sudah diambil dan HIDUP — pemain bersinar amber,
    // alarm 68, semua guard waspada, tinta aktif menutupi pelarian.
    game.screen = 'playing';
    game.pearlTaken = true;
    game.world.pearl.taken = true;
    game.player.x = 980;
    game.player.y = 520;
    game.player.facing = Math.PI;
    game.player.sneaking = false;
    game.player.moving = true;
    game.elapsed = 96;
    game.score = 700;
    game.lootTaken = 4;
    game.world.loot[0].taken = true;
    game.world.loot[1].taken = true;
    game.world.loot[2].taken = true;
    game.world.loot[3].taken = true;
    game.inkCharges = 1;
    game.alarm = 68;
    placeGuard(game.guards[0], 850, 480, Math.PI, 1, 'alert');
    game.guards[0].lastSeenX = 980;
    game.guards[0].lastSeenY = 520;
    placeGuard(game.guards[1], 1080, 420, Math.PI / 2, 0.9, 'alert');
    game.guards[1].lastSeenX = 980;
    game.guards[1].lastSeenY = 520;
    placeGuard(game.guards[2], 330, 420, 0, 0.3, 'suspicious');
    game.cameras[0].sweepTime = 2.4;
    game.cameras[1].sweepTime = 1.0;
    game.cameras[2].sweepTime = 0.7;
    game.cameras[0].angle = game.cameras[0].baseAngle + Math.sin(2.4 * 0.55) * game.cameras[0].sweep;
    game.cameras[1].angle = game.cameras[1].baseAngle + Math.sin(1.0 * 0.55) * game.cameras[1].sweep;
    game.cameras[2].angle = game.cameras[2].baseAngle + Math.sin(0.7 * 0.55) * game.cameras[2].sweep;
    game.inkClouds.push({ x: 960, y: 500, radius: 108, ttl: 3.5 });
    game.banner = { text: 'MUTIARA HIDUP!', sub: 'Ia bersinar — semua penjaga melihatmu lebih cepat. LARI KE AIRLOCK!', ttl: 99 };
    game.hidden = false;
    return;
  }

  if (name === 'win') {
    // Layar menang: penyelam sudah di airlock dengan Mutiara.
    game.screen = 'won';
    game.pearlTaken = true;
    game.world.pearl.taken = true;
    game.player.x = game.world.hatch.x;
    game.player.y = game.world.hatch.y;
    game.player.facing = Math.PI;
    game.elapsed = 118;
    game.score = 1240;
    game.lootTaken = 5;
    for (const pearl of game.world.loot) pearl.taken = true;
    game.alarm = 22;
    game.inkCharges = 1;
    game.endStats = { score: 1240, time: 118, loot: 5 };
    placeGuard(game.guards[0], 450, 220, 0, 0, 'patrol');
    placeGuard(game.guards[1], 980, 170, Math.PI / 2, 0, 'patrol');
    placeGuard(game.guards[2], 150, 150, Math.PI / 2, 0, 'patrol');
    game.hidden = false;
    return;
  }

  // Default: layar judul di atas ruangan yang hidup.
  game.screen = 'title';
  placeGuard(game.guards[0], 450, 220, 0, 0, 'patrol');
  placeGuard(game.guards[1], 980, 120, Math.PI / 2, 0, 'patrol');
  placeGuard(game.guards[2], 150, 150, Math.PI / 2, 0, 'patrol');
  game.player.x = game.world.spawn.x;
  game.player.y = game.world.spawn.y;
  game.player.facing = 0;
  game.hidden = false;
}
