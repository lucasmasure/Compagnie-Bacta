// Menu mobile
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
if (toggle) toggle.addEventListener('click', () => links.classList.toggle('open'));

// Apparition au scroll + jauges
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('visible');
    e.target.querySelectorAll('.fill').forEach(f => { f.style.width = f.dataset.value + '%'; });
    io.unobserve(e.target);
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Filtres de la page Équipement
const buttons = document.querySelectorAll('.filter button');
buttons.forEach(btn => btn.addEventListener('click', () => {
  buttons.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const cat = btn.dataset.cat;
  document.querySelectorAll('.gear').forEach(g => {
    g.classList.toggle('hidden', cat !== 'all' && g.dataset.cat !== cat);
  });
}));

// Accueil : scène animée (incendies, fumée et tirs derrière les ARC Rogue, braises devant)
const scene = document.getElementById('scene');
const fx = document.getElementById('fx');
if (scene && fx) {
  const IW = 1792, IH = 1008;
  const sctx = scene.getContext('2d');
  const fctx = fx.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const img = new Image();
  img.src = 'https://i.imgur.com/nWPVz5E.png';

  // Silhouettes des trois soldats (coordonnées de l'image) : redessinées par-dessus les effets
  const soldiers = [
    [[562,272],[576,272],[578,292],[604,286],[636,294],[650,330],[650,382],[726,398],[728,422],[718,442],[728,515],[720,560],[718,640],[724,736],[708,762],[712,905],[706,925],[650,925],[636,800],[612,770],[602,800],[608,890],[594,920],[518,918],[540,880],[540,762],[502,738],[506,562],[494,520],[510,440],[506,400],[564,382],[561,330]],
    [[838,228],[854,228],[855,256],[892,248],[934,266],[944,320],[940,372],[1024,382],[1028,420],[1012,450],[1036,510],[1032,598],[1072,656],[1074,706],[1036,706],[1030,772],[1016,792],[1018,978],[1004,996],[946,996],[940,832],[900,806],[874,832],[876,978],[796,986],[794,962],[794,792],[768,772],[772,622],[754,540],[764,450],[772,382],[840,366],[837,320]],
    [[1124,278],[1140,278],[1141,304],[1168,296],[1200,310],[1208,350],[1206,398],[1274,408],[1276,440],[1268,470],[1286,540],[1276,578],[1332,638],[1334,676],[1286,672],[1272,738],[1256,762],[1262,908],[1244,920],[1190,920],[1184,804],[1160,766],[1140,804],[1136,908],[1074,918],[1084,880],[1084,762],[1054,732],[1056,592],[1044,540],[1056,470],[1056,410],[1122,394],[1119,350]]
  ];

  // Foyers d'incendie visibles sur l'image
  const fires = [
    { x: 215, y: 655, s: 1.2 }, { x: 245, y: 455, s: .9 }, { x: 95, y: 520, s: .7 },
    { x: 1355, y: 525, s: .9 }, { x: 1640, y: 765, s: 1.1 }, { x: 1470, y: 380, s: .6 }, { x: 470, y: 600, s: .6 },
    { x: 735, y: 470, s: .55 }, { x: 1045, y: 455, s: .5 }
  ];

  // Sprite de fumée pré-rendu
  const puff = document.createElement('canvas');
  puff.width = puff.height = 128;
  const pctx = puff.getContext('2d');
  const g = pctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(75,70,68,.7)');
  g.addColorStop(.5, 'rgba(58,55,54,.32)');
  g.addColorStop(1, 'rgba(40,40,42,0)');
  pctx.fillStyle = g;
  pctx.fillRect(0, 0, 128, 128);

  let sw, sh, fw, fh, k, ox, oy;
  const resize = () => {
    sw = scene.width = scene.clientWidth;
    sh = scene.height = scene.clientHeight;
    fw = fx.width = innerWidth;
    fh = fx.height = innerHeight;
    k = Math.max(sw / IW, sh / IH);
    ox = (sw - IW * k) / 2;
    oy = (sh - IH * k) * .35;
  };
  resize();
  addEventListener('resize', resize);

  const smoke = [], flames = [], embers = [];
  let bolts = [];
  const newSmoke = f => ({
    x: f.x + (Math.random() - .5) * 20 * f.s, y: f.y - 20, r: (16 + Math.random() * 16) * f.s,
    vx: .05 + Math.random() * .15, vy: -(.5 + Math.random() * .6), grow: .1 + Math.random() * .1,
    life: 0, max: 500 + Math.random() * 400, rot: Math.random() * 6.28, vr: (Math.random() - .5) * .004
  });
  const newFlame = f => ({
    x: f.x + (Math.random() - .5) * 50 * f.s, y: f.y + Math.random() * 10, r: (6 + Math.random() * 10) * f.s,
    vy: -(.8 + Math.random() * 1.4), life: 0, max: 30 + Math.random() * 30
  });
  const newEmber = () => ({
    x: Math.random() * fw, y: fh + Math.random() * 40, r: Math.random() * 1.8 + .6,
    vy: Math.random() * .8 + .3, vx: (Math.random() - .5) * .4, life: 0, max: Math.random() * 400 + 250, hue: 18 + Math.random() * 22
  });
  const newBolt = () => {
    const ltr = Math.random() < .5;
    return { x: ltr ? -150 : IW + 150, y: 380 + Math.random() * 300, vx: (ltr ? 1 : -1) * (22 + Math.random() * 10), vy: (Math.random() - .5) * 2, len: 110 + Math.random() * 70 };
  };
  fires.forEach(f => { for (let i = 0; i < 14; i++) { const p = newSmoke(f); p.life = Math.random() * p.max; p.y -= p.life * .8; p.x += p.life * p.vx; p.r += p.life * p.grow; smoke.push(p); } });
  for (let i = 0; i < 70; i++) { const e = newEmber(); e.y = Math.random() * fh; embers.push(e); }

  // Calque des soldats aux bords adoucis, calculé une seule fois
  const front = document.createElement('canvas');
  const buildFront = () => {
    front.width = IW; front.height = IH;
    const c = front.getContext('2d');
    c.filter = 'blur(5px)';
    c.fillStyle = '#000';
    soldiers.forEach(poly => {
      c.beginPath();
      poly.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
      c.closePath();
      c.fill();
    });
    c.filter = 'none';
    c.globalCompositeOperation = 'source-in';
    c.drawImage(img, 0, 0, IW, IH);
  };

  let t = 0;
  const drawScene = () => {
    t++;
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, sw, sh);
    sctx.setTransform(k, 0, 0, k, ox, oy);
    sctx.drawImage(img, 0, 0, IW, IH);

    // 1. Lueur des incendies
    sctx.globalCompositeOperation = 'lighter';
    fires.forEach((f, i) => {
      const fl = .55 + .25 * Math.sin(t / 7 + i * 2) + .15 * Math.sin(t / 3.1 + i);
      const R = 140 * f.s;
      const gl = sctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, R);
      gl.addColorStop(0, `rgba(255,120,30,${.35 * fl})`);
      gl.addColorStop(1, 'rgba(255,80,10,0)');
      sctx.fillStyle = gl;
      sctx.fillRect(f.x - R, f.y - R, R * 2, R * 2);
      if (!still && Math.random() < .6) flames.push(newFlame(f));
    });

    // 2. Flammes
    for (let i = flames.length - 1; i >= 0; i--) {
      const p = flames[i];
      p.life++; p.y += p.vy; p.x += Math.sin((p.life + i) / 4) * .6;
      const a = 1 - p.life / p.max;
      const r = p.r * (0.6 + a * .6);
      const gf = sctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      gf.addColorStop(0, `rgba(255,230,150,${.8 * a})`);
      gf.addColorStop(.4, `rgba(255,140,40,${.6 * a})`);
      gf.addColorStop(1, 'rgba(200,50,0,0)');
      sctx.fillStyle = gf;
      sctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      if (p.life >= p.max) flames.splice(i, 1);
    }

    // 3. Tirs de blaster (derrière les soldats)
    if (!still && Math.random() < .01) bolts.push(newBolt());
    bolts = bolts.filter(b => b.x > -400 && b.x < IW + 400);
    sctx.lineCap = 'round';
    bolts.forEach(b => {
      b.x += b.vx; b.y += b.vy;
      const ex = b.x - Math.sign(b.vx) * b.len, ey = b.y - b.vy * (b.len / Math.abs(b.vx));
      sctx.strokeStyle = 'rgba(60,255,100,.35)'; sctx.lineWidth = 10;
      sctx.beginPath(); sctx.moveTo(b.x, b.y); sctx.lineTo(ex, ey); sctx.stroke();
      sctx.strokeStyle = 'rgba(200,255,210,.95)'; sctx.lineWidth = 3;
      sctx.beginPath(); sctx.moveTo(b.x, b.y); sctx.lineTo(ex, ey); sctx.stroke();
    });

    // 4. Fumée qui monte vers le ciel
    sctx.globalCompositeOperation = 'source-over';
    fires.forEach(f => { if (!still && Math.random() < .09 * f.s) smoke.push(newSmoke(f)); });
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i];
      if (!still) { p.life++; p.x += p.vx; p.y += p.vy; p.r += p.grow; p.rot += p.vr; }
      const q = p.life / p.max;
      const a = Math.min(1, q * 6) * (1 - q);
      sctx.globalAlpha = a * .5;
      sctx.save();
      sctx.translate(p.x, p.y); sctx.rotate(p.rot);
      sctx.drawImage(puff, -p.r, -p.r, p.r * 2, p.r * 2);
      sctx.restore();
      if (p.life >= p.max || p.y + p.r < -50) smoke.splice(i, 1);
    }
    sctx.globalAlpha = 1;

    // 5. Les soldats repassent devant
    sctx.drawImage(front, 0, 0);
  };

  const drawEmbers = () => {
    fctx.clearRect(0, 0, fw, fh);
    fctx.globalCompositeOperation = 'lighter';
    embers.forEach((e, i) => {
      e.life++; e.y -= e.vy; e.x += e.vx + Math.sin(e.life / 40) * .3;
      const a = Math.sin(Math.PI * e.life / e.max);
      fctx.beginPath();
      fctx.fillStyle = `hsla(${e.hue},100%,60%,${a})`;
      fctx.shadowColor = `hsla(${e.hue},100%,55%,1)`;
      fctx.shadowBlur = 8;
      fctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      fctx.fill();
      if (e.life > e.max || e.y < -10) embers[i] = newEmber();
    });
  };

  const loop = () => { drawScene(); drawEmbers(); requestAnimationFrame(loop); };
  img.onload = () => {
    buildFront();
    if (still) { drawScene(); addEventListener('resize', drawScene); }
    else loop();
  };
}
