import { isInsane, onMoodChange } from './settings.js';
import { onTick } from './clock.js';
import { isShowRunning } from './insane.js';

// Insane mode, the everyday part. The clock is always a little bit warp: it flies slowly
// through a starfield in the theme's colours, its figures run edge to edge with the
// seconds on, and it never quite sits still.
//
//   every second   the figures kick, and their red and cyan fringe flares
//   every minute   a shockwave and a spray of sparks go out from the time
//   every hour     two seconds of full warp, then it settles back to cruising
//
// Easy to live with on purpose: the full show (js/insane.js) is saved for a countdown.
// With reduced motion asked for, it's a still starfield and nothing moves.

const FAR = 8;
const CRUISE = 0.35;     // z per second
const HOUR_WARP = 2.2;   // seconds of it, on the hour
const WARP_SPEED = 7;

const rand = (min, max) => min + Math.random() * (max - min);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - (1 - x) ** 3;
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function channels(colour) {
  const hex = colour.replace('#', '');
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex.slice(0, 6);
  const n = parseInt(full, 16);
  return /^[0-9a-f]{6}$/i.test(full) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : null;
}
function mix(a, b, amount) {
  const from = channels(a);
  const to = channels(b);
  if (!from || !to) return a;
  return `#${from.map((v, i) => Math.round(v + (to[i] - v) * amount).toString(16).padStart(2, '0')).join('')}`;
}

export function initWarp() {
  const canvas = document.getElementById('warp');
  const ctx = canvas.getContext('2d');
  const timeEl = document.getElementById('time');
  const center = document.querySelector('.center');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let W = 0;
  let H = 0;
  let stars = [];
  let look = null;
  let raf = 0;
  let last = 0;

  // What just happened, as the moment it happened (performance.now()), so every frame
  // knows how far along each beat is.
  let kickAt = -1e9;
  let waves = [];
  let sparks = [];
  let warpAt = -1e9;

  function readLook() {
    const light = document.querySelector('meta[name="color-scheme"]')?.content === 'light';
    const fg = css('--fg') || '#eef1f5';
    const bg = css('--bg') || '#0e1218';
    const weight = parseFloat(getComputedStyle(timeEl).fontWeight) || 300;
    look = {
      light, fg, bg,
      accent: css('--accent') || '#8aa4c9',
      accent2: css('--accent-2') || '#5a6f8a',
      glow: light ? fg : '#ffffff',
      stroke: 0.5 + weight / 500,
    };
  }

  function newStar(z = rand(FAR * 0.7, FAR)) {
    const span = Math.max(W, H);
    return { x: rand(-1, 1) * span, y: rand(-1, 1) * span, z };
  }

  function size() {
    W = window.innerWidth;
    H = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.round(Math.min(600, (W * H) / 2600)) }, () => newStar(rand(0.3, FAR)));
  }

  // Where the time is on screen, for the shockwaves to start from.
  function timeCentre() {
    const box = timeEl.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2, w: box.width };
  }

  function draw(now, dt) {
    const cx = W / 2;
    const cy = H / 2;
    const reach = Math.hypot(W, H) / 2;
    const { glow, accent, accent2, stroke } = look;

    // How fast we're flying: cruising, a nudge on each second, full warp on the hour.
    const sinceWarp = (now - warpAt) / 1000;
    let v = CRUISE + 0.5 * Math.exp(-((now - kickAt) / 1000) * 6);
    let warp = 0;
    if (sinceWarp >= 0 && sinceWarp < HOUR_WARP) {
      warp = Math.sin(Math.PI * (sinceWarp / HOUR_WARP)) ** 0.7;
      v += (WARP_SPEED - CRUISE) * warp;
    }

    ctx.clearRect(0, 0, W, H);
    // Deep space tinted by the theme in the dark. In the light, the page's own paper
    // shows through and the stars are ink.
    if (!look.light) {
      const space = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach);
      space.addColorStop(0, mix(mix(look.bg, '#000000', 0.2), accent, 0.14));
      space.addColorStop(0.5, mix(look.bg, '#000000', 0.5));
      space.addColorStop(1, mix(look.bg, '#000000', 0.82));
      ctx.globalAlpha = 1;
      ctx.fillStyle = space;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.lineCap = 'round';
    ctx.strokeStyle = glow;
    const trail = Math.min(1.2, 0.04 + v * 0.02);
    for (const star of stars) {
      star.z -= v * dt;
      if (star.z < 0.12) Object.assign(star, newStar());
      const x = cx + star.x / star.z;
      const y = cy + star.y / star.z;
      if (x < -20 || x > W + 20 || y < -20 || y > H + 20) {
        Object.assign(star, newStar());
        continue;
      }
      const z0 = star.z + v * trail * 0.1 + 0.03;
      ctx.globalAlpha = clamp01((FAR - star.z) / 3) * (look.light ? 0.45 : 0.85);
      ctx.lineWidth = Math.min(2.6, 1.2 / star.z + 0.3) * stroke;
      ctx.beginPath();
      ctx.moveTo(cx + star.x / z0, cy + star.y / z0);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    // The minute's shockwaves: two rings, the accent and the second accent.
    waves = waves.filter((wave) => {
      const age = (now - wave.at) / 1000;
      const ring = age / 1.1;
      if (ring >= 1) return false;
      if (ring > 0) {
        ctx.globalAlpha = (1 - ring) ** 1.5 * 0.8;
        ctx.strokeStyle = wave.colour;
        ctx.lineWidth = (18 * (1 - ring) + 1.5) * stroke;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.from + reach * 1.2 * easeOut(ring), 0, Math.PI * 2);
        ctx.stroke();
      }
      return true;
    });

    sparks = sparks.filter((spark) => {
      const age = (now - spark.at) / 1000;
      if (age > spark.life) return false;
      spark.vx *= Math.exp(-1.6 * dt);
      spark.vy *= Math.exp(-1.6 * dt);
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      ctx.globalAlpha = 1 - age / spark.life;
      ctx.strokeStyle = spark.colour;
      ctx.lineWidth = 2 * stroke;
      ctx.beginPath();
      ctx.moveTo(spark.x - spark.vx * 0.03, spark.y - spark.vy * 0.03);
      ctx.lineTo(spark.x, spark.y);
      ctx.stroke();
      return true;
    });
    ctx.globalAlpha = 1;

    // The figures: a kick each second that rings out in a few tenths, and the colour
    // fringe flaring with it. The warp shakes the whole column, harder at its peak.
    const kick = Math.exp(-((now - kickAt) / 1000) * 9);
    const big = waves.length ? 2.2 : 1;
    const k = kick * 3.2 * big;
    timeEl.style.transform = k > 0.05
      ? `translate(${rand(-1, 1) * k}px, ${rand(-1, 1) * k * 0.6}px) rotate(${rand(-1, 1) * k * 0.08}deg)`
      : '';
    timeEl.style.setProperty('--fringe', `${(1.5 + kick * 5 * big + warp * 6).toFixed(2)}px`);
    const s = warp * 9;
    center.style.transform = s > 0.05 ? `translate(${rand(-1, 1) * s}px, ${rand(-1, 1) * s}px)` : '';
  }

  function frame(now) {
    raf = 0;
    if (!running()) {
      clearMotion();
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    draw(now, dt);
    raf = requestAnimationFrame(frame);
  }

  const running = () => isInsane() && !document.hidden && !reduceMotion.matches && !isShowRunning();

  function clearMotion() {
    timeEl.style.transform = '';
    timeEl.style.removeProperty('--fringe');
    center.style.transform = '';
  }

  // Starts or stops the flight to match the mood, the tab and the motion setting. With
  // reduced motion, one still frame of stars.
  function sync() {
    if (!isInsane()) {
      cancelAnimationFrame(raf);
      raf = 0;
      clearMotion();
      return;
    }
    readLook();
    if (!W) size();
    if (reduceMotion.matches) {
      cancelAnimationFrame(raf);
      raf = 0;
      clearMotion();
      draw(performance.now(), 0);
      return;
    }
    if (!raf && running()) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  onTick((date) => {
    if (!isInsane()) return;
    // The theme or light/dark may have changed since the last second.
    readLook();
    if (!running()) {
      sync();
      return;
    }
    const now = performance.now();
    kickAt = now;
    if (date.getSeconds() !== 0) return;
    const { x, y, w } = timeCentre();
    waves.push({ at: now, x, y, from: w * 0.2, colour: look.accent }, { at: now + 120, x, y, from: w * 0.2, colour: look.accent2 });
    const colours = [look.glow, mix(look.accent, look.glow, 0.5), look.accent, look.accent2];
    for (let i = 0; i < 90; i++) {
      const a = rand(0, Math.PI * 2);
      const speed = rand(300, 1600);
      sparks.push({
        at: now, x: x + Math.cos(a) * w * 0.15, y: y + Math.sin(a) * w * 0.05,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: rand(0.4, 1.1), colour: colours[i % 4],
      });
    }
    if (date.getMinutes() === 0) warpAt = now;
  });

  addEventListener('resize', () => {
    if (!W) return;
    size();
    if (isInsane() && reduceMotion.matches) draw(performance.now(), 0);
  });
  document.addEventListener('visibilitychange', sync);
  reduceMotion.addEventListener('change', sync);
  onMoodChange(sync);
  // A new theme or light/dark is written onto <html>'s style; the sky follows at once
  // rather than on the next second.
  new MutationObserver(() => {
    if (!isInsane()) return;
    readLook();
    if (reduceMotion.matches) draw(performance.now(), 0);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  // The full show hides the stage; pick the flight back up when it's over.
  document.addEventListener('insane-done', sync);
  sync();
}
