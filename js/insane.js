import { getCountdown, onCountdownArrive } from './countdown.js';

// Insane mode. A countdown with it switched on arrives the usual way, and then the clock
// trembles, blows apart, and goes to warp: everything on screen but the countdown's name
// and its "now" is torn into letters that scatter, then come streaming back past as
// debris while the name and the "now" are flown into through a starfield. Then a flash,
// and the clock is back as if nothing happened.
//
// It all runs on one full-screen canvas over the page, plus a copy of the countdown line
// on top of it; the page itself is only hidden, never touched, so it comes back exactly
// as it was. The sound is synthesised on the spot, so there are no files to fetch.

// The script, in seconds from the moment it starts.
const BOOM = 0.8;       // the trembling before it, then everything goes
const PUNCH = 8.4;      // full speed: the name rushes up to fill the screen…
const END = 9.4;        // …and the screen goes white
const SETTLE = 0.9;     // the white clears off the clock, back in place

let audio = null;
let running = false;

// Browsers only let a page make sound after someone has clicked or typed on it, so the
// sound is set up in the click that switches Insane mode on, and kept ready by every
// click or key after that — a reload, like the hourly update one, starts the count over.
export function primeAudio() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return;
  if (!audio) audio = new Context();
  if (audio.state === 'suspended') audio.resume().catch(() => {});
}

export function initInsane() {
  onCountdownArrive((countdown) => {
    if (countdown.insane) goInsane();
  });
  const keepReady = () => {
    if (getCountdown().insane) primeAudio();
  };
  document.addEventListener('pointerdown', keepReady, true);
  document.addEventListener('keydown', keepReady, true);
}

// Waits for a frame the screen will actually show, so a tab in the background saves it
// for whoever comes back to it rather than playing to nobody.
export function goInsane() {
  if (running) return;
  running = true;
  requestAnimationFrame(start);
}

const rand = (min, max) => min + Math.random() * (max - min);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - (1 - x) ** 3;
const easeInOut = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function start(firstFrame) {
  const stage = document.querySelector('.stage');
  const countdownEl = document.getElementById('countdown');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shakeScale = reduceMotion ? 0 : 1;

  const W = window.innerWidth;
  const H = window.innerHeight;
  const accent = css('--accent') || '#8aa4c9';
  const pageBg = css('--bg') || '#0e1218';

  if (audio && audio.state === 'suspended') audio.resume().catch(() => {});
  if (audio) playSound(audio);

  // --- the overlay: a canvas reaching past the edges, so shaking never shows its rim ---

  const BLEED = 80;
  const overlay = document.createElement('div');
  overlay.className = 'insane';
  overlay.setAttribute('aria-hidden', 'true');
  const shaker = document.createElement('div');
  shaker.className = 'insane-shaker';
  const canvas = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = (W + BLEED * 2) * dpr;
  canvas.height = (H + BLEED * 2) * dpr;
  canvas.style.cssText = `left:${-BLEED}px;top:${-BLEED}px;width:${W + BLEED * 2}px;height:${H + BLEED * 2}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, dpr * BLEED, dpr * BLEED); // draw in page coordinates
  const flash = document.createElement('div');
  flash.className = 'insane-flash';
  shaker.append(canvas);
  overlay.append(shaker, flash);

  // --- state, filled in at the boom ---

  let exploded = false;
  let blastX = W / 2;
  let blastY = H / 2;
  let debris = [];
  let sparks = [];
  let hero = null;          // the copy of the countdown line, flown into
  let heroFrom = null;
  let heroMax = 4;
  let finished = false;

  const cx = W / 2;
  const cy = H / 2;
  const reach = Math.hypot(W, H) / 2;

  // Stars live in a box in front of the viewer and are projected as x / z. Moving them
  // toward z = 0 is flying forward; drawn from where each was a moment ago, they streak.
  const FAR = 8;
  const stars = Array.from({ length: Math.round(Math.min(900, (W * H) / 1800)) }, () => newStar(rand(0.2, FAR)));
  function newStar(z = rand(FAR * 0.7, FAR)) {
    return { x: rand(-1, 1) * Math.max(W, H), y: rand(-1, 1) * Math.max(W, H), z };
  }

  const space = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach);
  space.addColorStop(0, '#141a33');
  space.addColorStop(0.45, '#070914');
  space.addColorStop(1, '#010103');
  const nebula = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach * 0.6);
  nebula.addColorStop(0, accent);
  nebula.addColorStop(1, 'transparent');

  // How fast we're flying, in z per second.
  function speed(t) {
    if (t < BOOM + 0.4) return 0.4;
    if (t < BOOM + 2) return 0.4 + 5.6 * easeInOut((t - BOOM - 0.4) / 1.6);
    if (t < PUNCH) return 6 + 3 * ((t - BOOM - 2) / (PUNCH - BOOM - 2));
    return 9 * Math.exp(1.2 * (t - PUNCH));
  }

  function shake(t) {
    if (t < BOOM) return 7 * (t / BOOM) ** 2;
    const sinceBoom = t - BOOM;
    const settled = 9 + 4 * Math.sin(t * 3);
    if (t < PUNCH) return settled + 45 * Math.exp(-sinceBoom * 4);
    return settled + 22 * clamp01((t - PUNCH) / (END - PUNCH));
  }

  // --- the boom: tear the page into pieces and swap it for the overlay ---

  function explode() {
    exploded = true;
    stage.style.transform = '';
    const box = countdownEl.getBoundingClientRect();
    if (!countdownEl.hidden && box.width) {
      blastX = box.left + box.width / 2;
      blastY = box.top + box.height / 2;
    }

    debris = collectDebris(stage, [countdownEl]).map((piece) => {
      const dx = piece.x - blastX;
      const dy = piece.y - blastY;
      const d = Math.hypot(dx, dy) || 1;
      const v = rand(900, 2600) / (1 + d / 900);
      return {
        ...piece,
        mode: 'blast',
        vx: (dx / d) * v + rand(-200, 200),
        vy: (dy / d) * v + rand(-200, 200) - 150,
        rot: 0,
        spin: rand(-14, 14),
        grow: 1,
        tint: Math.random() < 0.35 ? accent : '#eef2ff',
      };
    });
    // Four times the letters on the way back past, so the debris is a stream, not a trickle.
    const extra = [1, 2, 3].flatMap(() => debris.map((piece) => ({ ...piece, mode: 'wait', wakeAt: BOOM + rand(0.8, 6) })));
    debris = debris.concat(extra);

    sparks = Array.from({ length: 220 }, () => {
      const a = rand(0, Math.PI * 2);
      const v = rand(400, 3000);
      return {
        x: blastX, y: blastY, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: rand(0.4, 1.2), color: ['#ffffff', '#ffd27a', '#ff7a45', accent][Math.floor(rand(0, 4))],
      };
    });

    // The countdown line, copied, to be what's left in the middle. It keeps its classes,
    // so the "now" pill keeps rippling.
    if (!countdownEl.hidden && box.width) {
      hero = countdownEl.cloneNode(true);
      hero.removeAttribute('id');
      hero.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      hero.classList.add('insane-hero');
      hero.style.left = `${box.left}px`;
      hero.style.top = `${box.top}px`;
      shaker.append(hero);
      heroFrom = { x: blastX - cx, y: blastY - cy };
      heroMax = Math.max(2.5, Math.min((W * 0.9) / box.width, (H * 0.4) / box.height));
    }

    stage.style.visibility = 'hidden';
    document.body.append(overlay);
    flash.style.opacity = '1';
  }

  // --- the frame ---

  let last = firstFrame;

  function frame(now) {
    const t = (now - firstFrame) / 1000;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (t >= END + 0.1) return finish();

    const amount = shake(t) * shakeScale;
    const sx = rand(-1, 1) * amount;
    const sy = rand(-1, 1) * amount;
    const sr = rand(-1, 1) * amount * 0.05;

    if (!exploded) {
      // The tremble: the clock still in place, starting to rattle.
      stage.style.transform = `translate(${sx}px, ${sy}px) rotate(${sr}deg)`;
      if (t >= BOOM) explode();
      requestAnimationFrame(frame);
      return;
    }

    shaker.style.transform = `translate(${sx}px, ${sy}px) rotate(${sr}deg)`;
    const tb = t - BOOM;
    const v = speed(t);

    // Space, fading in over the page's own background.
    ctx.globalAlpha = 1;
    ctx.fillStyle = space;
    ctx.fillRect(-BLEED, -BLEED, W + BLEED * 2, H + BLEED * 2);
    const spaceIn = clamp01(tb / 0.7);
    ctx.globalAlpha = 0.14 + 0.06 * Math.sin(t * 5);
    ctx.fillStyle = nebula;
    ctx.fillRect(-BLEED, -BLEED, W + BLEED * 2, H + BLEED * 2);
    if (spaceIn < 1) {
      ctx.globalAlpha = 1 - easeOut(spaceIn);
      ctx.fillStyle = pageBg;
      ctx.fillRect(-BLEED, -BLEED, W + BLEED * 2, H + BLEED * 2);
    }

    drawStars(v, dt, spaceIn);
    drawDebris(t, v, dt);
    drawBlast(tb, dt);
    moveHero(t, tb, amount);

    // White out at the boom, and again at the end.
    let white = Math.max(0, 1 - tb / 0.45) ** 2;
    if (t > END - 0.5) white = Math.max(white, easeInOut(clamp01((t - (END - 0.5)) / 0.5)));
    flash.style.opacity = String(reduceMotion ? white * 0.6 : white);

    requestAnimationFrame(frame);
  }

  function drawStars(v, dt, spaceIn) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';
    const trail = Math.min(1.2, 0.03 + v * 0.018);
    for (const star of stars) {
      star.z -= v * dt;
      if (star.z < 0.12) Object.assign(star, newStar());
      const x = cx + star.x / star.z;
      const y = cy + star.y / star.z;
      if (x < -BLEED || x > W + BLEED || y < -BLEED || y > H + BLEED) {
        Object.assign(star, newStar());
        continue;
      }
      const z0 = star.z + v * trail * 0.1 + 0.02;
      ctx.globalAlpha = clamp01((FAR - star.z) / 3) * spaceIn;
      ctx.lineWidth = Math.min(3.2, 1.4 / star.z + 0.3);
      ctx.beginPath();
      ctx.moveTo(cx + star.x / z0, cy + star.y / z0);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  // A piece flies out on the blast, waits off screen, then comes back from far ahead as
  // debris and rushes past, over and over until the end.
  function wake(piece) {
    const a = rand(0, Math.PI * 2);
    const r = rand(0.1, 0.7) * reach; // where it would sit at z = 1
    Object.assign(piece, {
      mode: 'warp', z: rand(FAR * 0.6, FAR), wx: Math.cos(a) * r, wy: Math.sin(a) * r,
      rot: rand(0, Math.PI * 2), spin: rand(-4, 4), scale: rand(1, 2.6),
    });
  }

  function drawDebris(t, v, dt) {
    for (const piece of debris) {
      if (piece.mode === 'blast') {
        const drag = Math.exp(-0.6 * dt);
        piece.vx *= drag;
        piece.vy *= drag;
        piece.x += piece.vx * dt;
        piece.y += piece.vy * dt;
        piece.rot += piece.spin * dt;
        piece.grow += dt * 1.8;
        const off = piece.x < -300 || piece.x > W + 300 || piece.y < -300 || piece.y > H + 300;
        if (off || t > BOOM + 2.2) {
          piece.mode = 'wait';
          piece.wakeAt = t + rand(0.2, 1.6);
          continue;
        }
        drawPiece(piece, piece.x, piece.y, piece.grow, piece.color, 1);
      } else if (piece.mode === 'wait') {
        if (t >= piece.wakeAt && t < PUNCH + 0.3) wake(piece);
      } else {
        piece.z -= v * dt * 0.85;
        piece.rot += piece.spin * dt;
        const x = cx + piece.wx / piece.z;
        const y = cy + piece.wy / piece.z;
        const gone = piece.z < 0.08 || x < -400 || x > W + 400 || y < -400 || y > H + 400;
        if (gone) {
          if (t < PUNCH + 0.3) wake(piece);
          else piece.mode = 'done';
          continue;
        }
        // Debris sizes are evened out, so a clock digit doesn't arrive as a wall.
        const size = Math.min(Math.max(piece.size, 24), 64) / piece.size;
        const alpha = clamp01((FAR - piece.z) / 2.5);
        drawPiece(piece, x, y, (size * piece.scale) / piece.z, piece.tint, alpha);
      }
    }
  }

  function drawPiece(piece, x, y, scale, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(piece.rot);
    ctx.scale(scale, scale);
    if (piece.kind === 'text') {
      ctx.font = piece.font;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(piece.ch, 0, 0);
    } else if (piece.kind === 'image') {
      if (piece.img.complete) ctx.drawImage(piece.img, -piece.w / 2, -piece.h / 2, piece.w, piece.h);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(-piece.w / 2, -piece.h / 2, piece.w, piece.h);
    }
    ctx.restore();
  }

  // The fireball, the shockwaves and the sparks, all in the first second.
  function drawBlast(tb, dt) {
    if (tb > 1.4) return;
    const ball = clamp01(tb / 0.5);
    if (ball < 1) {
      const r = 40 + 420 * easeOut(ball);
      const fire = ctx.createRadialGradient(blastX, blastY, 0, blastX, blastY, r);
      fire.addColorStop(0, 'rgba(255,255,255,1)');
      fire.addColorStop(0.25, 'rgba(255,214,140,0.9)');
      fire.addColorStop(0.6, 'rgba(255,110,60,0.45)');
      fire.addColorStop(1, 'rgba(255,60,40,0)');
      ctx.globalAlpha = 1 - ball;
      ctx.fillStyle = fire;
      ctx.beginPath();
      ctx.arc(blastX, blastY, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const [delay, colour] of [[0, '#ffffff'], [0.12, accent]]) {
      const ring = clamp01((tb - delay) / 0.9);
      if (ring <= 0 || ring >= 1) continue;
      ctx.globalAlpha = (1 - ring) ** 1.5;
      ctx.strokeStyle = colour;
      ctx.lineWidth = 34 * (1 - ring) + 2;
      ctx.beginPath();
      ctx.arc(blastX, blastY, reach * 1.4 * easeOut(ring), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineCap = 'round';
    for (const spark of sparks) {
      if (tb > spark.life) continue;
      spark.vx *= Math.exp(-1.5 * dt);
      spark.vy *= Math.exp(-1.5 * dt);
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      ctx.globalAlpha = 1 - tb / spark.life;
      ctx.strokeStyle = spark.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(spark.x - spark.vx * 0.03, spark.y - spark.vy * 0.03);
      ctx.lineTo(spark.x, spark.y);
      ctx.stroke();
    }
  }

  // The name and the "now" glide to the middle and swell as we fly at them, then at the
  // end rush up past the edges of the screen.
  function moveHero(t, tb, amount) {
    if (!hero) return;
    const travel = easeOut(clamp01(tb / 0.9));
    const x = heroFrom.x * (1 - travel);
    const y = heroFrom.y * (1 - travel);
    const cruise = 1 + (heroMax - 1) * clamp01(tb / (PUNCH - BOOM)) ** 0.8;
    const scale = t < PUNCH ? cruise : cruise * Math.exp(2.6 * (t - PUNCH));
    const fringe = (2 + amount * 0.3).toFixed(1);
    hero.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    hero.style.opacity = String(1 - clamp01((t - (END - 0.35)) / 0.3));
    hero.style.filter = shakeScale
      ? `drop-shadow(${fringe}px 0 0 rgba(255,40,90,0.75)) drop-shadow(-${fringe}px 0 0 rgba(0,220,255,0.75))`
      : '';
  }

  // Back to the clock: the overlay goes, the page returns behind the white, the white clears.
  function finish() {
    if (finished) return;
    finished = true;
    shaker.remove();
    stage.style.visibility = '';
    stage.style.transform = '';
    stage.classList.add('insane-return');
    flash.style.transition = `opacity ${SETTLE}s ease`;
    flash.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      stage.classList.remove('insane-return');
      running = false;
    }, SETTLE * 1000 + 100);
  }

  requestAnimationFrame(frame);
}

// Every visible character on the page, where it is and how it's set, and the few shapes
// that aren't text: the weather glyph, the divider and the seconds bar.
function collectDebris(root, skip) {
  const pieces = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || skip.some((el) => el.contains(parent))) continue;
    const style = getComputedStyle(parent);
    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const size = parseFloat(style.fontSize);
    const tracking = parseFloat(style.letterSpacing) || 0;
    const upper = style.textTransform === 'uppercase';
    const text = node.textContent;
    for (let i = 0; i < text.length; i++) {
      const ch = upper ? text[i].toUpperCase() : text[i];
      if (!ch.trim()) continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      pieces.push({
        kind: 'text', ch, font, size, color: style.color,
        x: r.left + (r.width - tracking) / 2, y: r.top + r.height / 2,
      });
    }
  }

  for (const svg of root.querySelectorAll('.glyph svg')) {
    const r = svg.getBoundingClientRect();
    if (!r.width) continue;
    const copy = svg.cloneNode(true);
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copy.setAttribute('width', String(r.width));
    copy.setAttribute('height', String(r.height));
    copy.setAttribute('color', getComputedStyle(svg).color);
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(copy.outerHTML)}`;
    pieces.push({ kind: 'image', img, w: r.width, h: r.height, size: r.height, x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }

  const line = getComputedStyle(document.documentElement).getPropertyValue('--line').trim();
  for (const el of root.querySelectorAll('.divider, .seconds-track, .date-row .dot')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const fill = getComputedStyle(el).backgroundColor;
    pieces.push({
      kind: 'shape', w: r.width, h: r.height, size: Math.max(r.width, r.height),
      color: fill === 'rgba(0, 0, 0, 0)' ? line : fill,
      x: r.left + r.width / 2, y: r.top + r.height / 2,
    });
  }
  return pieces;
}

// --- the sound: a rumble, a boom, a rocket, things whooshing past, and a thump ---

let noise = null;

function playSound(ac) {
  const t0 = ac.currentTime + 0.03;
  const boom = t0 + BOOM;
  const end = t0 + END;

  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  const limiter = ac.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.ratio.value = 8;
  const master = ac.createGain();
  master.gain.value = 0.85;
  master.connect(limiter);
  limiter.connect(ac.destination);

  // An echo for the spacey parts.
  const echo = ac.createDelay(1);
  echo.delayTime.value = 0.27;
  const feedback = ac.createGain();
  feedback.gain.value = 0.42;
  echo.connect(feedback);
  feedback.connect(echo);
  echo.connect(master);

  function hiss(from, to, offset = Math.random() * 1.5) {
    const source = ac.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    source.start(from, offset);
    source.stop(to);
    return source;
  }
  function filter(type, frequency, q = 0.7) {
    const node = ac.createBiquadFilter();
    node.type = type;
    node.frequency.value = frequency;
    node.Q.value = q;
    return node;
  }
  function tone(type, frequency, from, to) {
    const osc = ac.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.start(from);
    osc.stop(to);
    return osc;
  }
  // A gain that follows [time, level] points, ramping between them.
  function envelope(points, exponential = false) {
    const gain = ac.createGain();
    gain.gain.setValueAtTime(points[0][1], points[0][0]);
    for (const [time, level] of points.slice(1)) {
      if (exponential) gain.gain.exponentialRampToValueAtTime(Math.max(level, 0.0001), time);
      else gain.gain.linearRampToValueAtTime(level, time);
    }
    return gain;
  }
  const chain = (...nodes) => {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    return nodes[nodes.length - 1];
  };

  // The tremble: a low swell and a rising whine. Uh-oh.
  const swell = tone('sine', 40, t0, boom);
  swell.frequency.exponentialRampToValueAtTime(75, boom);
  chain(swell, envelope([[t0, 0], [boom, 0.6]]), master);
  const whine = tone('sine', 500, t0, boom);
  whine.frequency.exponentialRampToValueAtTime(2000, boom);
  chain(whine, envelope([[t0, 0], [boom - 0.05, 0.05], [boom, 0]]), master);

  // The boom: a burst of noise closing down, a falling sub, a crackle on top.
  const blastFilter = filter('lowpass', 5000);
  blastFilter.frequency.setValueAtTime(5000, boom);
  blastFilter.frequency.exponentialRampToValueAtTime(90, boom + 1.6);
  chain(hiss(boom, boom + 2.5), blastFilter, envelope([[boom, 1.3], [boom + 2.4, 0]], true), master);
  const sub = tone('sine', 170, boom, boom + 2);
  sub.frequency.exponentialRampToValueAtTime(28, boom + 1.1);
  chain(sub, envelope([[boom, 1.1], [boom + 1.9, 0]], true), master);
  chain(hiss(boom, boom + 0.5), filter('highpass', 3000), envelope([[boom, 0.6], [boom + 0.4, 0]], true), master);

  // The rocket: wide roaring noise that opens up as the speed climbs, over a rumble.
  for (const side of [-0.7, 0.7]) {
    const roarFilter = filter('lowpass', 300, 1.2);
    roarFilter.frequency.setValueAtTime(250, boom);
    roarFilter.frequency.exponentialRampToValueAtTime(1100, end - 1);
    roarFilter.frequency.exponentialRampToValueAtTime(4500, end);
    const roar = chain(hiss(boom + 0.1, end + 0.1), roarFilter,
      envelope([[boom + 0.1, 0], [boom + 1.4, 0.45], [end - 1, 0.5], [end, 0.95], [end + 0.08, 0]]));
    if (ac.createStereoPanner) {
      const pan = ac.createStereoPanner();
      pan.pan.value = side;
      chain(roar, pan, master);
    } else roar.connect(master);
  }
  chain(hiss(boom, end + 0.1), filter('lowpass', 90), envelope([[boom, 0], [boom + 0.6, 0.9], [end, 0.9], [end + 0.08, 0]]), master);

  // The warp itself: a detuned buzz climbing in pitch, with a shimmer on top, echoing.
  const warpFilter = filter('lowpass', 400, 4);
  warpFilter.frequency.setValueAtTime(400, boom);
  warpFilter.frequency.exponentialRampToValueAtTime(2400, end);
  const warpGain = envelope([[boom + 0.3, 0], [boom + 2, 0.09], [end - 0.6, 0.11], [end, 0.2], [end + 0.05, 0]]);
  for (const cents of [-14, 14]) {
    const buzz = tone('sawtooth', 55, boom + 0.3, end + 0.1);
    buzz.detune.value = cents;
    buzz.frequency.exponentialRampToValueAtTime(220, end - 1);
    buzz.frequency.exponentialRampToValueAtTime(900, end);
    buzz.connect(warpFilter);
  }
  chain(warpFilter, warpGain, master);
  warpGain.connect(echo);
  const shimmer = tone('sine', 660, boom + 1.5, end + 0.1);
  shimmer.frequency.exponentialRampToValueAtTime(1320, end);
  const wobble = tone('sine', 7, boom + 1.5, end + 0.1);
  chain(wobble, envelope([[boom + 1.5, 12]]), shimmer.frequency);
  const shimmerGain = envelope([[boom + 1.5, 0], [boom + 3, 0.035], [end, 0.06], [end + 0.05, 0]]);
  chain(shimmer, shimmerGain, echo);

  // Debris whooshing past, left to right and right to left.
  for (let at = boom + 0.9; at < end - 0.5; at += rand(0.3, 0.75)) {
    const length = rand(0.45, 0.8);
    const sweep = filter('bandpass', 300, 1.6);
    sweep.frequency.setValueAtTime(rand(250, 400), at);
    sweep.frequency.exponentialRampToValueAtTime(rand(2000, 3200), at + length * 0.5);
    sweep.frequency.exponentialRampToValueAtTime(rand(400, 700), at + length);
    const whoosh = chain(hiss(at, at + length), sweep, envelope([[at, 0], [at + length * 0.5, rand(0.35, 0.6)], [at + length, 0]]));
    if (ac.createStereoPanner) {
      const pan = ac.createStereoPanner();
      const from = Math.random() < 0.5 ? -1 : 1;
      pan.pan.setValueAtTime(from, at);
      pan.pan.linearRampToValueAtTime(-from, at + length);
      chain(whoosh, pan, master);
    } else whoosh.connect(master);
  }

  // Out of warp: a thump, and quiet.
  const thump = tone('sine', 130, end, end + 1.2);
  thump.frequency.exponentialRampToValueAtTime(34, end + 0.7);
  chain(thump, envelope([[end, 1], [end + 1.1, 0]], true), master);
  const settleFilter = filter('lowpass', 900);
  settleFilter.frequency.setValueAtTime(900, end);
  settleFilter.frequency.exponentialRampToValueAtTime(60, end + 1.2);
  chain(hiss(end, end + 1.5), settleFilter, envelope([[end, 0.7], [end + 1.4, 0]], true), master);
}
