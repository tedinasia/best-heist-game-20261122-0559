// Menggambar saja: state game masuk, piksel keluar. Arena 1280x720 diskalakan
// agar muat di jendela, margin diisi warna laut dalam. Cahaya bioluminescent
// cyan, bahaya kuning-oranye-merah, loot amber — bedanya terlihat sekilas.
import { ALARM, CAMERA, GUARD, PALETTE, PLAYER, VIEW_H, VIEW_W } from './config.js';
import { pointInRect } from './vision.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function coneColor(state) {
  if (state === 'alert') return { fill: '255,84,112', edge: '#ff5470' };
  if (state === 'suspicious') return { fill: '255,197,61', edge: '#ffc53d' };
  return { fill: '255,197,61', edge: '#ffc53d' };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / VIEW_W, canvas.height / VIEW_H);
    view.x = (canvas.width - VIEW_W * view.scale) / 2;
    view.y = (canvas.height - VIEW_H * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    ctx.font = `${weight ? '700 ' : ''}${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function castRay(ox, oy, angle, range, walls) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    for (let d = 6; d <= range; d += 6) {
      const x = ox + dx * d;
      const y = oy + dy * d;
      for (const wall of walls) {
        if (pointInRect(x, y, wall)) return [x, y];
      }
    }
    return [ox + dx * range, oy + dy * range];
  }

  // Cone sebagai poligon yang berhenti di dinding, bukan sekadar sektor.
  function drawCone(ox, oy, facing, halfAngle, range, walls, rgb, edge, alphaScale) {
    const rays = 26;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    for (let i = 0; i <= rays; i += 1) {
      const a = facing - halfAngle + ((2 * halfAngle * i) / rays);
      const [x, y] = castRay(ox, oy, a, range, walls);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    const gradient = ctx.createRadialGradient(ox, oy, 8, ox, oy, range);
    gradient.addColorStop(0, `rgba(${rgb},${0.34 * alphaScale})`);
    gradient.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.globalAlpha = 0.35 * alphaScale;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawFloor(game, now) {
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    gradient.addColorStop(0, '#082a3a');
    gradient.addColorStop(1, PALETTE.deep);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Lantai: ubin samar.
    ctx.strokeStyle = 'rgba(63,245,230,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= VIEW_W; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, VIEW_H);
      ctx.stroke();
    }
    for (let y = 0; y <= VIEW_H; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW_W, y);
      ctx.stroke();
    }
    // Titik cahaya plankton yang berkelip.
    for (const dot of game.world.glowDots) {
      const twinkle = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(now * 1.4 + dot.twinkle));
      ctx.fillStyle = `rgba(63,245,230,${twinkle})`;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawKelp(game, now) {
    for (const kelp of game.world.kelpShadows) {
      const gradient = ctx.createRadialGradient(kelp.x, kelp.y, 4, kelp.x, kelp.y, kelp.r);
      gradient.addColorStop(0, 'rgba(2,18,24,0.92)');
      gradient.addColorStop(0.8, 'rgba(4,38,43,0.75)');
      gradient.addColorStop(1, 'rgba(4,38,43,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(kelp.x, kelp.y, kelp.r, 0, Math.PI * 2);
      ctx.fill();
      // Helai kelp bergoyang.
      ctx.strokeStyle = 'rgba(13,90,85,0.9)';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        const sway = Math.sin(now * 0.9 + i * 1.7) * 8;
        ctx.beginPath();
        ctx.moveTo(kelp.x + Math.cos(a) * kelp.r * 0.55, kelp.y + Math.sin(a) * kelp.r * 0.55);
        ctx.quadraticCurveTo(
          kelp.x + Math.cos(a) * kelp.r * 0.8 + sway,
          kelp.y + Math.sin(a) * kelp.r * 0.8 - 14,
          kelp.x + Math.cos(a) * (kelp.r * 0.95) + sway,
          kelp.y + Math.sin(a) * (kelp.r * 0.95) - 22,
        );
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(127,184,176,0.75)';
      text('BAYANGAN', kelp.x, kelp.y + kelp.r - 8, 10, 'rgba(127,184,176,0.75)', 'center');
    }
  }

  function drawWalls(game) {
    for (const wall of game.world.walls) {
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.fillStyle = PALETTE.wallTop;
      if (wall.w >= wall.h) ctx.fillRect(wall.x, wall.y, wall.w, 4);
      else ctx.fillRect(wall.x, wall.y, 4, wall.h);
      ctx.strokeStyle = 'rgba(25,200,216,0.55)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(wall.x + 0.75, wall.y + 0.75, wall.w - 1.5, wall.h - 1.5);
    }
  }

  function drawCorals(game, now) {
    for (const coral of game.world.corals) {
      ctx.strokeStyle = PALETTE.coral;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (const arm of coral.arms) {
        const sway = Math.sin(now * 0.8 + arm.angle * 3) * 2;
        ctx.beginPath();
        ctx.moveTo(coral.x, coral.y);
        ctx.lineTo(coral.x + Math.cos(arm.angle) * arm.len + sway, coral.y + Math.sin(arm.angle) * arm.len);
        ctx.stroke();
        ctx.fillStyle = PALETTE.coralTip;
        ctx.beginPath();
        ctx.arc(coral.x + Math.cos(arm.angle) * arm.len + sway, coral.y + Math.sin(arm.angle) * arm.len, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawHatch(game, now) {
    const hatch = game.world.hatch;
    const pulse = 0.5 + 0.5 * Math.sin(now * 2.2);
    ctx.save();
    ctx.shadowColor = PALETTE.cyan;
    ctx.shadowBlur = 18 + pulse * 10;
    ctx.strokeStyle = PALETTE.cyan;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(hatch.x, hatch.y, hatch.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(3,16,29,0.85)';
    ctx.beginPath();
    ctx.arc(hatch.x, hatch.y, hatch.r - 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(63,245,230,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hatch.x, hatch.y, hatch.r - 12, now, now + Math.PI * 1.5);
    ctx.stroke();
    text('AIRLOCK', hatch.x, hatch.y + hatch.r + 18, 11, PALETTE.cyan, 'center', true);
    text('PELARIAN', hatch.x, hatch.y + hatch.r + 32, 10, PALETTE.muted, 'center');
  }

  function drawLoot(game, now) {
    for (const pearl of game.world.loot) {
      if (pearl.taken) continue;
      const pulse = 0.6 + 0.4 * Math.sin(now * 3 + pearl.x);
      ctx.save();
      ctx.shadowColor = PALETTE.amber;
      ctx.shadowBlur = 14 * pulse;
      ctx.fillStyle = PALETTE.amber;
      ctx.beginPath();
      ctx.arc(pearl.x, pearl.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath();
      ctx.arc(pearl.x - 2.5, pearl.y - 2.5, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPearl(game, now) {
    const pearl = game.world.pearl;
    if (pearl.taken) return;
    const pulse = 0.5 + 0.5 * Math.sin(now * 2.4);
    // Alas brankas.
    ctx.strokeStyle = PALETTE.amberDeep;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pearl.x, pearl.y, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = PALETTE.amber;
    ctx.shadowBlur = 30 + pulse * 18;
    const gradient = ctx.createRadialGradient(pearl.x, pearl.y, 2, pearl.x, pearl.y, 20);
    gradient.addColorStop(0, '#fff3d6');
    gradient.addColorStop(0.55, PALETTE.amber);
    gradient.addColorStop(1, PALETTE.amberDeep);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pearl.x, pearl.y, 18 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = `rgba(255,179,71,${0.5 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pearl.x, pearl.y, 40 + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
    text('MUTIARA ABYSSAL', pearl.x, pearl.y - 46, 12, PALETTE.amber, 'center', true);
  }

  function drawGuards(game, now) {
    for (const guard of game.guards) {
      const range = GUARD.coneRange * (game.pearlTaken ? 1.15 : 1);
      const color = coneColor(guard.state);
      drawCone(guard.x, guard.y, guard.facing, GUARD.coneHalfAngle, range, game.world.walls, color.fill, color.edge, guard.state === 'patrol' ? 0.8 : 1);
      // Ubur-ubur drone: kubah + tentakel bergoyang.
      ctx.save();
      ctx.translate(guard.x, guard.y);
      ctx.rotate(guard.facing);
      const wobble = Math.sin(now * 3 + guard.wobble) * 2;
      ctx.shadowColor = guard.state === 'alert' ? PALETTE.danger : PALETTE.violet;
      ctx.shadowBlur = 14;
      const dome = ctx.createLinearGradient(0, -GUARD.radius, 0, GUARD.radius);
      dome.addColorStop(0, '#d9c8ff');
      dome.addColorStop(1, '#7a5fd0');
      ctx.fillStyle = dome;
      ctx.beginPath();
      ctx.arc(0, 0, GUARD.radius, Math.PI * 0.5, Math.PI * 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Tentakel (tidak dirotasi penuh agar tetap menggantung).
      ctx.strokeStyle = 'rgba(183,140,255,0.85)';
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i += 1) {
        const tx = guard.x + i * 6;
        const sway = Math.sin(now * 2.4 + i * 1.3 + guard.wobble) * 5;
        ctx.beginPath();
        ctx.moveTo(tx, guard.y + 8);
        ctx.quadraticCurveTo(tx + sway, guard.y + 22, tx + sway * 1.4, guard.y + 32 + wobble);
        ctx.stroke();
      }
      // Mata.
      ctx.fillStyle = guard.state === 'alert' ? PALETTE.danger : '#fff';
      ctx.beginPath();
      ctx.arc(guard.x + Math.cos(guard.facing) * 10, guard.y + Math.sin(guard.facing) * 10, 3.5, 0, Math.PI * 2);
      ctx.fill();
      // Cincin curiga di atas kepala.
      if (guard.suspicion > 0.05) {
        ctx.strokeStyle = guard.state === 'alert' ? PALETTE.danger : PALETTE.warn;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(guard.x, guard.y, GUARD.radius + 10, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
        ctx.stroke();
        if (guard.state === 'alert') text('!', guard.x, guard.y - GUARD.radius - 16, 20, PALETTE.danger, 'center', true);
        else if (guard.state === 'suspicious') text('?', guard.x, guard.y - GUARD.radius - 16, 18, PALETTE.warn, 'center', true);
      }
    }
  }

  function drawCameras(game) {
    for (const camera of game.cameras) {
      drawCone(camera.x, camera.y, camera.angle, CAMERA.halfAngle, CAMERA.range, game.world.walls, '183,140,255', PALETTE.violet, 0.9);
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.rotate(camera.angle);
      ctx.fillStyle = '#2a1b4d';
      ctx.strokeStyle = PALETTE.violet;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PALETTE.violet;
      ctx.beginPath();
      ctx.arc(5, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawInk(game) {
    for (const cloud of game.inkClouds) {
      const fade = Math.min(1, cloud.ttl / 1.2);
      const gradient = ctx.createRadialGradient(cloud.x, cloud.y, 4, cloud.x, cloud.y, cloud.radius);
      gradient.addColorStop(0, `rgba(7,11,22,${0.92 * fade})`);
      gradient.addColorStop(0.8, `rgba(16,20,44,${0.75 * fade})`);
      gradient.addColorStop(1, 'rgba(16,20,44,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(183,140,255,${0.5 * fade})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.radius * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      text('TINTA', cloud.x, cloud.y, 10, `rgba(183,140,255,${0.8 * fade})`, 'center', true);
    }
  }

  function drawPlayer(game, now) {
    const player = game.player;
    if (game.pearlTaken) {
      const pulse = 0.5 + 0.5 * Math.sin(now * 5);
      const glow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 64 + pulse * 14);
      glow.addColorStop(0, 'rgba(255,179,71,0.5)');
      glow.addColorStop(1, 'rgba(255,179,71,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 64 + pulse * 14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.globalAlpha = game.hidden ? 0.55 : 1;
    ctx.translate(player.x, player.y);
    ctx.rotate(player.facing);
    // Sirip.
    ctx.fillStyle = '#0b5e57';
    ctx.beginPath();
    ctx.moveTo(-8, -10);
    ctx.lineTo(-22, -16);
    ctx.lineTo(-20, -6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-8, 10);
    ctx.lineTo(-22, 16);
    ctx.lineTo(-20, 6);
    ctx.closePath();
    ctx.fill();
    // Tabung oksigen.
    ctx.fillStyle = '#9aa7b0';
    ctx.fillRect(-16, -5, 10, 10);
    // Badan penyelam.
    ctx.shadowColor = PALETTE.cyan;
    ctx.shadowBlur = game.pearlTaken ? 22 : 10;
    const body = ctx.createLinearGradient(0, -PLAYER.radius, 0, PLAYER.radius);
    body.addColorStop(0, '#1fb3a6');
    body.addColorStop(1, '#0b5e57');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Helm kaca.
    ctx.fillStyle = 'rgba(216,255,248,0.9)';
    ctx.beginPath();
    ctx.arc(6, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.cyan;
    ctx.beginPath();
    ctx.arc(7.5, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (game.pearlTaken) {
      ctx.fillStyle = PALETTE.amber;
      ctx.beginPath();
      ctx.arc(player.x - 4, player.y - 18, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (game.hidden) text('TERSEMBUNYI', player.x, player.y + 30, 10, PALETTE.muted, 'center', true);
  }

  function drawBubbles(game) {
    ctx.fillStyle = 'rgba(216,255,248,0.5)';
    for (const bubble of game.bubbles) {
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function drawHud(game) {
    ctx.fillStyle = 'rgba(3,16,29,0.82)';
    ctx.fillRect(0, 0, VIEW_W, 54);
    ctx.fillStyle = 'rgba(25,200,216,0.35)';
    ctx.fillRect(0, 54, VIEW_W, 1);
    // Meter alarm.
    const alarmColor = game.alarm < 40 ? PALETTE.cyan : game.alarm < 70 ? PALETTE.warn : PALETTE.danger;
    text('ALARM', 24, 34, 14, PALETTE.text, 'left', true);
    ctx.fillStyle = '#0a2531';
    ctx.fillRect(92, 18, 240, 20);
    ctx.fillStyle = alarmColor;
    ctx.fillRect(92, 18, 240 * (game.alarm / ALARM.caughtAt), 20);
    ctx.strokeStyle = 'rgba(216,255,248,0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(92.75, 18.75, 240, 20);
    text(`${Math.floor(game.alarm)}%`, 342, 34, 13, alarmColor, 'left', true);
    // Tinta: label + droplet, rapat di kiri.
    text('TINTA', 384, 34, 13, PALETTE.text, 'left', true);
    for (let i = 0; i < PLAYER.inkMax; i += 1) {
      ctx.fillStyle = i < game.inkCharges ? PALETTE.violet : '#14303c';
      ctx.beginPath();
      ctx.arc(436 + i * 22, 28, 7, 0, Math.PI * 2);
      ctx.fill();
      if (i < game.inkCharges) {
        ctx.fillStyle = '#efe6ff';
        ctx.beginPath();
        ctx.arc(434 + i * 22, 26, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Objective di tengah (digeser kanan supaya tidak menabrak droplet tinta).
    const objective = game.pearlTaken
      ? 'MUTIARA HIDUP — KEMBALI KE AIRLOCK!'
      : 'CURI MUTIARA ABYSSAL, LALU KEMBALI KE AIRLOCK';
    text(objective, 710, 34, 12, game.pearlTaken ? PALETTE.amber : PALETTE.text, 'center', true);
    // Waktu, skor, loot di kanan — muat semua di dalam frame.
    text(`WAKTU ${formatTime(game.elapsed)}`, 920, 34, 12, PALETTE.text, 'left', true);
    text(`SKOR ${game.score}`, 1030, 34, 12, PALETTE.text, 'left', true);
    text(`MUTIARA ${game.lootTaken}/5`, 1130, 34, 12, PALETTE.amber, 'left', true);
    // Petunjuk bawah.
    text('WASD/Panah gerak  •  Shift jongkok pelan  •  Spasi semburan tinta  •  E ambil  •  P jeda  •  M suara', VIEW_W / 2, VIEW_H - 12, 12, PALETTE.muted, 'center');
    // Banner momen penting.
    if (game.banner && game.banner.ttl > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, game.banner.ttl);
      ctx.shadowColor = PALETTE.amber;
      ctx.shadowBlur = 24;
      text(game.banner.text, VIEW_W / 2, 150, 34, PALETTE.amber, 'center', true);
      ctx.restore();
      if (game.banner.sub) text(game.banner.sub, VIEW_W / 2, 182, 16, PALETTE.text, 'center');
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    ctx.fillStyle = 'rgba(3,16,29,0.88)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const width = 780;
    const height = 150 + lines.length * 34 + 80;
    const x = (VIEW_W - width) / 2;
    const y = (VIEW_H - height) / 2;
    ctx.fillStyle = '#06222e';
    ctx.strokeStyle = accent || PALETTE.cyan;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.fill();
    ctx.stroke();
    text(title, VIEW_W / 2, y + 74, 46, accent || PALETTE.cyan, 'center', true);
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], VIEW_W / 2, y + 130 + i * 34, 18, PALETTE.text, 'center');
    }
    text(prompt, VIEW_W / 2, y + height - 34, 20, PALETTE.amber, 'center', true);
  }

  function draw(game, now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.deep;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor(game, now);
    drawKelp(game, now);
    drawWalls(game);
    drawCorals(game, now);
    drawHatch(game, now);
    drawLoot(game, now);
    drawPearl(game, now);
    drawCameras(game);
    drawGuards(game, now);
    drawInk(game);
    drawPlayer(game, now);
    drawBubbles(game);
    if (game.screen === 'playing' || game.screen === 'paused' || game.screen === 'won' || game.screen === 'lost') {
      drawHud(game);
    }
    if (game.screen === 'title') {
      drawPanel(
        'ARSIP ABYSSAL',
        [
          'Arsip laut dalam. Satu Mutiara Abyssal. Tiga ubur-ubur drone, tiga Mata Abyssal.',
          'Lewati cone penglihatan mereka. Sembunyi di kelp gelap, jongkok pelan,',
          'atau tutup pandangan mereka dengan semburan tinta.',
          'AWAS: begitu Mutiara diambil, ia HIDUP dan bersinar — pelarianmu',
          'jauh lebih berat daripada penyusupanmu.',
          game.best > 0 ? `Skor terbaik: ${game.best}` : '',
        ].filter((line) => line !== ''),
        'Klik atau tekan Spasi untuk mulai',
        PALETTE.cyan,
      );
    } else if (game.screen === 'paused') {
      drawPanel('JEDA', ['Arsip menunggu dalam gelap.'], 'Tekan P untuk lanjut', PALETTE.cyan);
    } else if (game.screen === 'won') {
      drawPanel(
        'PELARIAN BERHASIL!',
        [
          `Mutiara Abyssal berhasil dibawa pulang.`,
          `Waktu ${formatTime(game.endStats.time)}  •  Mutiara kecil ${game.endStats.loot}/5  •  Skor ${game.endStats.score}`,
          game.endStats.score >= game.best ? 'Skor terbaik baru!' : `Skor terbaik: ${game.best}`,
        ],
        'Tekan R atau klik untuk main lagi',
        PALETTE.amber,
      );
    } else if (game.screen === 'lost') {
      drawPanel(
        'TERTANGKAP!',
        [
          game.cause === 'touch'
            ? 'Drone ubur-ubur menyentuhmu di tengah arus.'
            : 'Alarm memuncak — seluruh arsip terbangun dan mengepungmu.',
          `Skor ${game.score}  •  Waktu ${formatTime(game.elapsed)}`,
        ],
        'Tekan R atau klik untuk coba lagi',
        PALETTE.danger,
      );
    }
    // Vignette: tepi gelap seperti laut dalam.
    const vignette = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85);
    vignette.addColorStop(0, 'rgba(3,16,29,0)');
    vignette.addColorStop(1, 'rgba(3,16,29,0.5)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
