// Keyboard + mouse untuk Arsip Abyssal. Tidak ada dependensi luar.
// Tekan sekali (Spasi/E/P/R/M) diantrekan: keydown yang cepat (down+up di
// antara dua frame) tidak boleh hilang — jadi consumeKey membaca antrean
// `pressed`, bukan state tombol yang sedang ditahan.
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const clicks = [];

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(event.code);
    keys.add(event.code);
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onClick(event) {
    const rect = canvas.getBoundingClientRect();
    clicks.push({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('click', onClick);

  function isDown(...codes) {
    return codes.some((code) => keys.has(code));
  }

  function moveVector() {
    let x = 0;
    let y = 0;
    if (isDown('KeyA', 'ArrowLeft')) x -= 1;
    if (isDown('KeyD', 'ArrowRight')) x += 1;
    if (isDown('KeyW', 'ArrowUp')) y -= 1;
    if (isDown('KeyS', 'ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  function consumeClicks() {
    return clicks.splice(0, clicks.length);
  }

  // Sekali tekan sejak pemanggilan terakhir (tahan tombol = satu kali).
  function consumeKey(code) {
    if (pressed.has(code)) {
      pressed.delete(code);
      return true;
    }
    return false;
  }

  return {
    isDown,
    moveVector,
    consumeClicks,
    consumeKey,
    get sneaking() {
      return isDown('ShiftLeft', 'ShiftRight');
    },
  };
}
