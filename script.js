// Menu mobile, apparition des blocs au défilement, filtres de la page équipement
document.documentElement.classList.add("js");

const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

const reveals = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add("visible"));
}

const filters = document.querySelectorAll(".filters button");
filters.forEach((btn) => {
  btn.addEventListener("click", () => {
    filters.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    const cat = btn.dataset.filter;
    document.querySelectorAll(".gear").forEach((card) => {
      card.hidden = cat !== "all" && card.dataset.cat !== cat;
    });
  });
});
// Bannières animées : combats lointains entre les ruines,
// tirs bleus (République) à gauche et rouges (Séparatistes) à droite
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Générateur pseudo-aléatoire à graine fixe : la ville garde la même forme au redimensionnement
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Anime les tirs sur `canvas`. `layout(w, h)` renvoie { blue, red, scale } en pixels écran.
function startBattle(canvas, layout) {
  const ctx = canvas.getContext("2d");
  const COLORS = { blue: "120, 190, 255", red: "255, 70, 60" };
  let w = 0, h = 0, spots = { blue: [], red: [], scale: 1 };
  const bolts = [], flashes = [];

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    spots = layout(w, h);
  };
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const jitter = (p, r) => [p[0] + (Math.random() - 0.5) * r, p[1] + (Math.random() - 0.5) * r];

  const fire = (side) => {
    const own = spots[side], foe = spots[side === "blue" ? "red" : "blue"];
    if (!own.length || !foe.length) return;
    const s = spots.scale;
    const from = pick(own);
    const to = jitter(pick(foe), 70 * s);
    const shots = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < shots; i++) {
      setTimeout(() => {
        const start = jitter(from, 6 * s);
        const dx = to[0] - start[0], dy = to[1] - start[1];
        const dist = Math.hypot(dx, dy);
        bolts.push({ side, x: start[0], y: start[1], vx: dx / dist, vy: dy / dist, left: dist, speed: (1100 + Math.random() * 400) * s });
        flashes.push({ side, x: start[0], y: start[1], life: 1, size: 10 });
      }, i * (110 + Math.random() * 60));
    }
  };

  const schedule = () => {
    fire(Math.random() < 0.5 ? "blue" : "red");
    setTimeout(schedule, 350 + Math.random() * 900);
  };

  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const s = spots.scale;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      const step = b.speed * dt;
      b.x += b.vx * step;
      b.y += b.vy * step;
      b.left -= step;
      const len = 28 * s;
      const tx = b.x - b.vx * len, ty = b.y - b.vy * len;
      const c = COLORS[b.side];
      ctx.strokeStyle = `rgba(${c}, .35)`;
      ctx.lineWidth = Math.max(4 * s, 2.5);
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = `rgba(${c}, .95)`;
      ctx.lineWidth = Math.max(2 * s, 1.2);
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = "rgba(255, 255, 255, .9)";
      ctx.lineWidth = Math.max(0.8 * s, 0.6);
      ctx.beginPath(); ctx.moveTo(tx + b.vx * len * 0.3, ty + b.vy * len * 0.3); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (b.left <= 0) {
        bolts.splice(i, 1);
        flashes.push({ side: "impact", x: b.x, y: b.y, life: 1, size: 16 + Math.random() * 10 });
      }
    }

    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.life -= dt * (f.side === "impact" ? 3 : 6);
      if (f.life <= 0) { flashes.splice(i, 1); continue; }
      const r = Math.max(f.size * s * (f.side === "impact" ? 1.6 - f.life * 0.6 : 1), 3);
      const c = f.side === "impact" ? "255, 170, 80" : COLORS[f.side];
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      g.addColorStop(0, `rgba(255, 255, 255, ${0.9 * f.life})`);
      g.addColorStop(0.3, `rgba(${c}, ${0.7 * f.life})`);
      g.addColorStop(1, `rgba(${c}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
    requestAnimationFrame(frame);
  };

  resize();
  window.addEventListener("resize", resize);
  schedule();
  requestAnimationFrame(frame);
}

// Dessine une ville en ruine sur `canvas` et renvoie les positions de tir dans les tours
function drawSkyline(canvas) {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Une ville différente par page, mais stable d'un chargement à l'autre
  const rand = seeded([...location.pathname].reduce((a, c) => a + c.charCodeAt(0), 327));
  const ground = h * 0.86;
  const spots = { blue: [], red: [], scale: Math.max(h / 700, 0.55) };

  const layers = [
    { color: "#2c2826", grid: "rgba(255,220,180,.07)", min: 0.35, max: 0.7, wMin: 26, wMax: 60, gap: 8, fires: 0.05, shooters: true },
    { color: "#1c1a1a", grid: "rgba(255,220,180,.06)", min: 0.2, max: 0.48, wMin: 40, wMax: 95, gap: 18, fires: 0.07, shooters: true },
    { color: "#121012", grid: "rgba(0,0,0,0)", min: 0.06, max: 0.2, wMin: 60, wMax: 160, gap: 0, fires: 0, shooters: false }
  ];

  layers.forEach((L) => {
    let x = -20;
    while (x < w + 20) {
      const tw = L.wMin + rand() * (L.wMax - L.wMin);
      const th = h * (L.min + rand() * (L.max - L.min));
      const top = ground - th;
      const broken = rand() < 0.45;
      let peak = top;

      // Silhouette : flèche, toit plat ou sommet effondré
      ctx.fillStyle = L.color;
      ctx.beginPath();
      ctx.moveTo(x, ground);
      ctx.lineTo(x, top);
      if (broken) {
        const n = 4 + Math.floor(rand() * 4);
        for (let i = 1; i <= n; i++) ctx.lineTo(x + (tw * i) / n, top + rand() * th * 0.25);
      } else if (rand() < 0.5) {
        ctx.lineTo(x + tw * 0.35, top);
        peak = top - th * 0.12;
        ctx.lineTo(x + tw * 0.5, peak);
        ctx.lineTo(x + tw * 0.65, top);
        ctx.lineTo(x + tw, top);
      } else {
        ctx.lineTo(x + tw, top);
      }
      ctx.lineTo(x + tw, ground);
      ctx.closePath();
      ctx.fill();

      // Antenne
      if (!broken && rand() < 0.4) {
        ctx.strokeStyle = L.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + tw * 0.5, peak);
        ctx.lineTo(x + tw * 0.5, peak - th * 0.1);
        ctx.stroke();
      }

      // Structure apparente (étages et poutres)
      ctx.strokeStyle = L.grid;
      ctx.lineWidth = 1;
      for (let y = top + 10; y < ground; y += 9) {
        ctx.beginPath(); ctx.moveTo(x + 3, y); ctx.lineTo(x + tw - 3, y); ctx.stroke();
      }
      for (let gx = x + 6; gx < x + tw - 4; gx += 8) {
        ctx.beginPath(); ctx.moveTo(gx, top + 12); ctx.lineTo(gx, ground); ctx.stroke();
      }

      // Fenêtres en feu
      for (let y = top + 14; y < ground - 10; y += 9) {
        for (let gx = x + 6; gx < x + tw - 6; gx += 8) {
          if (rand() < L.fires) {
            ctx.fillStyle = `rgba(255, ${120 + Math.floor(rand() * 80)}, 40, ${0.35 + rand() * 0.4})`;
            ctx.fillRect(gx, y, 4, 4);
          }
        }
      }

      // Positions de tireurs dans le haut des tours, de part et d'autre du centre
      if (L.shooters) {
        const cx = x + tw / 2;
        const side = cx < w * 0.45 ? "blue" : cx > w * 0.55 ? "red" : null;
        if (side) spots[side].push([x + tw * (0.25 + rand() * 0.5), top + th * (0.08 + rand() * 0.3)]);
      }

      x += tw + L.gap * rand();
    }
  });

  // Gravats au premier plan
  ctx.fillStyle = "#121114";
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w + 20; x += 20) ctx.lineTo(x, ground - rand() * h * 0.05);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  return spots;
}

// Soldats de l'image d'accueil, découpés à la volée et placés au premier plan des bannières.
// Contours relevés à la main en pixels de l'image ; rien n'est stocké dans le site.
const HOME_IMG = "https://i.imgur.com/VZz8nz1.png";
const TROOPERS = [
  // Le commandant, au centre de l'image d'accueil
  { cut: 600, fade: [470, 590], extras: [[836, 177, 5, 75], [829, 170, 18, 8]],
    holes: [[[961, 404], [969, 404], [974, 430], [976, 468], [985, 472], [990, 490], [988, 520], [975, 525], [966, 505], [963, 470], [961, 440]]], outline: [
    [877, 191], [890, 190], [900, 191], [907, 195], [922, 210], [929, 230], [935, 243], [934, 267], [932, 290],
    [936, 303], [931, 317], [950, 319], [990, 326], [1023, 334], [1031, 339], [1020, 350], [1010, 362],
    [1013, 380], [1015, 400], [1013, 417], [1015, 435], [1016, 452], [1026, 473], [1029, 490], [1028, 523], [1022, 557],
    [1000, 565], [985, 575], [978, 600], [798, 600], [795, 550], [785, 540], [761, 525], [758, 497], [762, 473],
    [765, 437], [770, 400], [773, 370], [779, 357], [785, 344], [800, 338], [827, 324], [850, 318], [843, 307],
    [839, 297], [840, 283], [840, 257], [841, 246], [849, 240], [853, 220], [861, 202], [870, 195]] },
  // Le soldat à visière, juste à sa droite
  { cut: 600, fade: [470, 590], extras: [[1222, 248, 3, 25]], outline: [
    [1180, 244], [1195, 243], [1210, 245], [1217, 253], [1225, 275], [1226, 288], [1225, 305], [1224, 328],
    [1227, 345], [1250, 351], [1270, 356], [1296, 363], [1298, 367], [1286, 371], [1282, 400], [1281, 430],
    [1284, 457], [1291, 490], [1292, 520], [1292, 540], [1357, 580], [1352, 595], [1300, 568], [1272, 575],
    [1270, 600], [1100, 600], [1097, 560], [1096, 525], [1087, 512], [1084, 490], [1083, 470], [1086, 440],
    [1086, 400], [1088, 375], [1095, 359], [1120, 351], [1140, 346], [1140, 335], [1150, 322], [1148, 302],
    [1146, 290], [1155, 273], [1163, 256], [1172, 248]] }
];

function drawSquad(canvas, img, swap) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  // Les soldats sont d'abord dessinés à part, puis composés avec un halo flou autour
  const layer = document.createElement("canvas");
  layer.width = canvas.width;
  layer.height = canvas.height;
  const ctx = layer.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Un soldat de chaque côté du titre ; celui de droite est retourné pour regarder vers le centre
  const pair = swap ? [TROOPERS[1], TROOPERS[0]] : [TROOPERS[0], TROOPERS[1]];
  const narrow = w < 700;
  pair.forEach((t, i) => {
    const xs = t.outline.map((p) => p[0]), ys = t.outline.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const top = Math.min(...ys, ...t.extras.map((r) => r[1]));
    const k = (h * 0.93) / (t.cut - top);
    const cx = (minX + maxX) / 2;
    const flip = i === 1 ? -1 : 1;
    const screenX = i === 0 ? w * (narrow ? 0.04 : 0.11) : w * (narrow ? 0.96 : 0.89);

    ctx.save();
    ctx.translate(screenX, h);
    ctx.scale(flip * k, k);
    ctx.translate(-cx, -t.cut);
    ctx.beginPath();
    t.outline.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    t.extras.forEach(([x, y, rw, rh]) => ctx.rect(x, y, rw, rh));
    (t.holes || []).forEach((hole) => {
      hole.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    });
    ctx.save();
    ctx.clip("evenodd");
    ctx.filter = "brightness(.88) contrast(1.05)";
    ctx.drawImage(img, 0, 0);
    ctx.filter = "none";
    // Le bas du soldat (jupe, jambes, gravats) s'efface progressivement
    const [f0, f1] = t.fade;
    const g = ctx.createLinearGradient(0, f0, 0, f1);
    g.addColorStop(0, "rgba(0, 0, 0, 0)");
    g.addColorStop(1, "rgba(0, 0, 0, 1)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = g;
    ctx.fillRect(minX - 10, f0, maxX - minX + 20, t.cut - f0 + 10);
    ctx.restore();
    // Bords adoucis : léger flou le long du contour, qui fond les personnages dans le décor
    ctx.globalCompositeOperation = "destination-out";
    ctx.filter = "blur(3px)";
    ctx.strokeStyle = "#000";
    ctx.lineJoin = "round";
    ctx.lineWidth = 8 / k;
    // Uniquement le contour et les trous : l'antenne, trop fine, n'est pas gommée
    ctx.beginPath();
    [t.outline, ...(t.holes || [])].forEach((poly) => {
      poly.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    });
    ctx.stroke();
    ctx.restore();
  });

  const out = canvas.getContext("2d");
  out.clearRect(0, 0, canvas.width, canvas.height);
  // Halo : copie floue qui déborde du contour
  out.filter = `blur(${10 * dpr}px)`;
  out.globalAlpha = 0.85;
  out.drawImage(layer, 0, 0);
  // Personnages nets par-dessus
  out.filter = "none";
  out.globalAlpha = 1;
  out.drawImage(layer, 0, 0);
}
if (!reduceMotion) {
  document.querySelectorAll(".hero-anim .hero-bg").forEach((bg) => {
    const battle = bg.querySelector(".battle");
    if (!battle) return;
    const skyline = bg.querySelector(".skyline");
    if (skyline) {
      startBattle(battle, () => drawSkyline(skyline));
    } else {
      // Accueil : positions repérées dans l'image de fond (1792 × 1008, background-position: center 35%)
      const IMG_W = 1792, IMG_H = 1008;
      const BLUE = [[120, 170], [205, 120], [330, 140], [455, 178], [560, 110], [625, 165], [745, 130]];
      const RED = [[1020, 150], [1105, 172], [1290, 90], [1335, 160], [1470, 120], [1600, 140], [1705, 178]];
      startBattle(battle, (w, h) => {
        const scale = Math.max(w / IMG_W, h / IMG_H);
        const ox = (w - IMG_W * scale) * 0.5, oy = (h - IMG_H * scale) * 0.35;
        const map = ([x, y]) => [ox + x * scale, oy + y * scale];
        return { blue: BLUE.map(map), red: RED.map(map), scale };
      });
    }
  });
} else {
  // Sans animation, la ville reste dessinée
  document.querySelectorAll(".hero-anim .skyline").forEach(drawSkyline);
}
// Premier plan des pages intérieures (aussi affiché sans animation)
const squadCanvas = document.querySelector(".hero-anim .squad");
if (squadCanvas) {
  const img = new Image();
  // Alterne le côté de chaque soldat d'une page à l'autre
  const swap = [...location.pathname].reduce((a, c) => a + c.charCodeAt(0), 0) % 2 === 1;
  const render = () => drawSquad(squadCanvas, img, swap);
  img.onload = () => {
    render();
    window.addEventListener("resize", render);
  };
  img.src = HOME_IMG;
}