// Genera los SVG del perfil de Tomás — estilo arcade retro / placa electrónica.
// Uso: npm run build
import { writeFile, mkdir } from 'node:fs/promises';
import opentype from 'opentype.js';

const OUT = new URL('../assets/', import.meta.url);

// Paleta: PCB verde-negro + neón.
const C = {
  bg: '#07100b',
  bg2: '#0a1a10',
  panel: '#0b1710',
  line: '#15351f',
  neon: '#36e27a',       // verde neón primario
  neonSoft: '#7ef0a8',   // texto verde claro
  amber: '#ffc44d',      // acento "PRESS START"
  cyan: '#38dbe6',       // acento secundario
  magenta: '#ff6ec7',    // topo
  ink: '#d8f5e4',        // texto casi blanco verdoso
  mute: '#5f8a70',       // texto apagado
};

const FAMILY = "'TJ','JetBrains Mono','Consolas','Courier New',monospace";
const REDUCED = '@media (prefers-reduced-motion: reduce){*{animation:none!important}}';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------- fuentes (JetBrains Mono, subconjunto embebido) ----------
async function loadFonts(textsByWeight) {
  const fonts = {};
  for (const [weight, texts] of Object.entries(textsByWeight)) {
    const chars = [...new Set(texts.join('') + ' ')].join('');
    const url = `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@${weight}&text=${encodeURIComponent(chars)}`;
    const css = await (await fetch(url)).text();
    const src = css.match(/url\((.+?)\)/)?.[1];
    if (!src) throw new Error(`Sin fuente peso ${weight}: ${css.slice(0, 160)}`);
    const buf = Buffer.from(await (await fetch(src)).arrayBuffer());
    const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    fonts[weight] = { b64: buf.toString('base64'), font };
  }
  return fonts;
}
const faces = (fonts) =>
  Object.entries(fonts)
    .map(([w, f]) => `@font-face{font-family:'TJ';font-weight:${w};src:url(data:font/ttf;base64,${f.b64}) format('truetype')}`)
    .join('');
const measure = (fonts, w, t, s, sp = 0) => fonts[w].font.getAdvanceWidth(t, s, { kerning: true }) + sp * t.length;
function wrap(fonts, w, text, size, maxW) {
  const out = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(fonts, w, next, size) > maxW) { out.push(line); line = word; } else line = next;
  }
  if (line) out.push(line);
  return out;
}

// Traza de circuito en ángulos rectos, con esquinas suaves.
function trace(pts, r = 8) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [px, py] = pts[i - 1];
    const [nx, ny] = pts[i + 1];
    const v1 = [Math.sign(x - px), Math.sign(y - py)];
    const v2 = [Math.sign(nx - x), Math.sign(ny - y)];
    d += ` L${x - v1[0] * r} ${y - v1[1] * r} Q${x} ${y} ${x + v2[0] * r} ${y + v2[1] * r}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  d += ` L${lx} ${ly}`;
  return d;
}

// ---------- banner ----------
async function header() {
  const W = 1200, H = 320;
  const eyebrow = '// PROGRAMACIÓN · ELECTRÓNICA';
  const name = 'Tomás Marcos';
  const role = 'Arduino  ·  C++  ·  C#';
  const start = '> PRESS START';
  const fonts = await loadFonts({ 700: [name], 600: [eyebrow, start], 500: [role] });

  const traces = [
    { pts: [[-20, 70], [140, 70], [190, 120], [320, 120]], c: C.neon, dur: 3.2 },
    { pts: [[-20, 250], [90, 250], [150, 190], [300, 190]], c: C.cyan, dur: 4.1 },
    { pts: [[1220, 60], [1060, 60], [1010, 110], [900, 110]], c: C.neon, dur: 3.6 },
    { pts: [[1220, 270], [1080, 270], [1030, 220], [930, 220]], c: C.amber, dur: 4.6 },
    { pts: [[1220, 160], [1120, 160], [1090, 190], [980, 190]], c: C.magenta, dur: 5.2 },
  ];
  const nodes = [[320, 120], [300, 190], [900, 110], [930, 220], [980, 190], [140, 70]];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(name)} · ${esc(role)}">
<title>${esc(name)} · ${esc(role)}</title>
<style>${faces(fonts)}
text{font-family:${FAMILY}}
.in{animation:in .9s cubic-bezier(.2,.7,.2,1) both}.d1{animation-delay:.1s}.d2{animation-delay:.3s}.d3{animation-delay:.5s}.d4{animation-delay:.72s}
@keyframes in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.blink{animation:blink 1s steps(1) infinite}@keyframes blink{50%{opacity:.15}}
.caret{animation:blink 1.05s steps(1) infinite}
${traces.map((t, i) => `.dash${i}{stroke-dasharray:26 400;animation:dash${i} ${t.dur}s linear infinite}@keyframes dash${i}{from{stroke-dashoffset:426}to{stroke-dashoffset:0}}`).join('\n')}
.pulse{animation:pulse 2.4s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:.35}50%{opacity:1}}
.scan{animation:scan 7s linear infinite}@keyframes scan{from{transform:translateY(-20px)}to{transform:translateY(340px)}}
${REDUCED}</style>
<defs>
  <clipPath id="clip"><rect width="${W}" height="${H}" rx="20"/></clipPath>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.bg2}"/><stop offset="1" stop-color="${C.bg}"/></linearGradient>
  <radialGradient id="glow"><stop offset="0" stop-color="${C.neon}" stop-opacity=".22"/><stop offset="1" stop-color="${C.neon}" stop-opacity="0"/></radialGradient>
  <pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="${C.neon}" stroke-opacity=".06"/><circle cx="0" cy="0" r="1.3" fill="${C.neon}" fill-opacity=".14"/></pattern>
  <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3"/></filter>
</defs>
<g clip-path="url(#clip)">
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <circle class="pulse" cx="150" cy="300" r="340" fill="url(#glow)"/>
  <circle class="pulse" cx="1050" cy="20" r="300" fill="url(#glow)" style="animation-delay:1.2s"/>
  ${traces.map((t, i) => `<path d="${trace(t.pts)}" fill="none" stroke="${t.c}" stroke-opacity=".18" stroke-width="2.5"/><path class="dash${i}" d="${trace(t.pts)}" fill="none" stroke="${t.c}" stroke-width="2.5" stroke-linecap="round"/>`).join('\n  ')}
  ${nodes.map((n, i) => `<circle class="pulse" cx="${n[0]}" cy="${n[1]}" r="4.5" fill="${C.neon}" style="animation-delay:${(i * 0.3).toFixed(1)}s"/>`).join('\n  ')}
  <rect class="scan" width="${W}" height="2" fill="${C.neon}" fill-opacity=".05"/>

  <text class="in d1" x="72" y="104" font-size="15" font-weight="600" letter-spacing="3" fill="${C.cyan}">${esc(eyebrow)}</text>
  <text x="70" y="176" font-size="62" font-weight="700" letter-spacing="-1" fill="${C.neon}" filter="url(#soft)" opacity=".55">${esc(name)}</text>
  <text class="in d2" x="70" y="176" font-size="62" font-weight="700" letter-spacing="-1" fill="${C.ink}">${esc(name)}</text>
  <text class="in d3" x="72" y="218" font-size="22" font-weight="500" letter-spacing="1" fill="${C.neonSoft}">${esc(role)}</text>

  <g class="in d4">
    <text x="72" y="268" font-size="17" font-weight="600" letter-spacing="2" fill="${C.amber}">${esc(start)}</text>
    <rect class="blink" x="${(72 + measure(fonts, 600, start, 17, 2) + 6).toFixed(1)}" y="253" width="11" height="18" fill="${C.amber}"/>
  </g>

  <g class="in d4" transform="translate(${W - 190} 50)">
    <rect width="126" height="34" rx="6" fill="${C.neon}" fill-opacity=".08" stroke="${C.neon}" stroke-opacity=".4"/>
    <circle class="blink" cx="20" cy="17" r="5" fill="${C.neon}"/>
    <text x="34" y="22" font-size="13" font-weight="600" letter-spacing="1" fill="${C.neonSoft}">ONLINE</text>
  </g>
</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="19.5" fill="none" stroke="${C.neon}" stroke-opacity=".18"/>
</svg>`;
  await writeFile(new URL('header.svg', OUT), svg);
}

// ---------- pie ----------
async function footer() {
  const W = 1200, H = 120;
  const msg = 'GAME OVER?  INSERT COIN  ·  Gracias por pasar';
  const fonts = await loadFonts({ 600: [msg] });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(msg)}">
<style>${faces(fonts)}text{font-family:${FAMILY}}
.b{animation:b 1.1s steps(1) infinite}@keyframes b{50%{opacity:.2}}
.m{animation:m 6s linear infinite}@keyframes m{from{transform:translateX(-30px)}to{transform:translateX(1230px)}}
${REDUCED}</style>
<defs><clipPath id="c"><rect width="${W}" height="${H}" rx="20"/></clipPath>
<pattern id="g" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="${C.neon}" stroke-opacity=".06"/></pattern></defs>
<g clip-path="url(#c)">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect y="0" width="${W}" height="2" fill="${C.neon}" fill-opacity=".3"/>
  <g class="m"><rect x="0" y="0" width="60" height="2" fill="${C.neon}"/></g>
  <text class="b" x="${W / 2}" y="${H / 2 + 6}" text-anchor="middle" font-size="16" font-weight="600" letter-spacing="2" fill="${C.mute}">${esc(msg)}</text>
</g></svg>`;
  await writeFile(new URL('footer.svg', OUT), svg);
}

// ---------- botones ----------
const ICONS = {
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 10.5V17M8 7.4v.1M12 17v-6.5M12 13.4c0-1.7 1.1-2.9 2.6-2.9S17 11.5 17 13.2V17"/>',
  repo: '<path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M4 17a2 2 0 0 1 2-2h13"/>',
};
async function buttons() {
  const list = [
    { file: 'btn-repos', label: 'REPOSITORIOS', icon: 'repo', accent: C.neon },
    { file: 'btn-linkedin', label: 'LINKEDIN', icon: 'linkedin', accent: C.cyan },
  ];
  const fonts = await loadFonts({ 600: list.map((b) => b.label) });
  for (const b of list) {
    const H = 44, size = 14;
    const W = Math.round(measure(fonts, 600, b.label, size, 1) + 76);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${b.label}">
<style>${faces(fonts)}text{font-family:${FAMILY}}</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="7" fill="${C.panel}" stroke="${b.accent}" stroke-opacity=".6"/>
<g transform="translate(20 11) scale(.92)" fill="none" stroke="${b.accent}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[b.icon]}</g>
<text x="52" y="28" font-size="${size}" font-weight="600" letter-spacing="1" fill="${C.ink}">${b.label}</text>
</svg>`;
    await writeFile(new URL(`${b.file}.svg`, OUT), svg);
  }
}

// ---------- tarjetas ----------
const PROJECTS = [
  {
    file: 'topo', accent: C.neon, tag: 'ARDUINO · JUEGO ARCADE', title: 'Atrapa al Topo',
    desc: 'Versión electrónica del clásico: 3 rondas, topos detectados por sensor ultrasónico, pantalla OLED, servos y botones con LED.',
    chips: ['Arduino UNO', 'C++', 'OLED', 'Servo SG90', 'HC-SR04'],
  },
  {
    file: 'figuras', accent: C.cyan, tag: 'C# · PROGRAMACIÓN ORIENTADA A OBJETOS', title: 'Figuras y métodos virtuales',
    desc: 'Jerarquía de figuras que se dibujan en una ventana WinForms usando herencia y métodos virtuales (polimorfismo).',
    chips: ['C#', '.NET', 'WinForms', 'POO'],
  },
  {
    file: 'pylatro', accent: C.amber, tag: 'PYTHON · JUEGO DE CARTAS · EN EQUIPO', title: 'Pylatro',
    desc: 'Adaptación en Python de Balatro, el juego de cartas roguelike. Manejo de baraja, manos de póker y puntajes.',
    chips: ['Python', 'Roguelike', 'En equipo'],
  },
  {
    file: 'assembler', accent: C.magenta, tag: 'ASSEMBLY · MECANOGRAFÍA · EN EQUIPO', title: 'Typing en Assembler',
    desc: 'Juego de mecanografía en Assembler (TASM): menú, dificultades, detección de velocidad y de errores, y puntaje.',
    chips: ['Assembly', 'TASM', 'x86', 'En equipo'],
  },
];
async function cards() {
  const W = 540, H = 236, X = 30, MAXW = W - X * 2;
  const all = PROJECTS.flatMap((p) => [p.tag, p.title, p.desc, ...p.chips]);
  const fonts = await loadFonts({ 400: all, 600: all, 700: all });
  for (const [i, p] of PROJECTS.entries()) {
    const descLines = wrap(fonts, 400, p.desc, 15, MAXW).slice(0, 3);
    const titleSize = measure(fonts, 700, p.title, 27) > MAXW - 20 ? 22 : 27;
    let cx = X;
    const chips = p.chips.map((c) => {
      const w = measure(fonts, 600, c, 11.5, 0.5) + 22;
      const out = `<rect x="${cx.toFixed(1)}" y="${H - 50}" width="${w.toFixed(1)}" height="25" rx="5" fill="${p.accent}" fill-opacity=".12" stroke="${p.accent}" stroke-opacity=".45"/><text x="${(cx + 11).toFixed(1)}" y="${H - 33}" font-size="11.5" font-weight="600" letter-spacing=".5" fill="${p.accent}">${esc(c)}</text>`;
      cx += w + 7;
      return out;
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.title)}: ${esc(p.desc)}">
<title>${esc(p.title)}</title>
<style>${faces(fonts)}text{font-family:${FAMILY}}
.scan{animation:scan 4.5s linear ${(i * .5).toFixed(1)}s infinite}@keyframes scan{from{transform:translateX(-140px)}55%,100%{transform:translateX(${W + 40}px)}}
.g{animation:g 5s ease-in-out ${(i * .7).toFixed(1)}s infinite alternate}@keyframes g{from{opacity:.4}to{opacity:.9}}
${REDUCED}</style>
<defs><clipPath id="c"><rect width="${W}" height="${H}" rx="14"/></clipPath>
<radialGradient id="gl"><stop offset="0" stop-color="${p.accent}" stop-opacity=".35"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>
<linearGradient id="s" x1="0" x2="1"><stop offset="0" stop-color="${p.accent}" stop-opacity="0"/><stop offset=".5" stop-color="${p.accent}"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></linearGradient>
<pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="${p.accent}" stroke-opacity=".05"/></pattern></defs>
<g clip-path="url(#c)">
  <rect width="${W}" height="${H}" fill="${C.panel}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <circle class="g" cx="${W - 10}" cy="-10" r="190" fill="url(#gl)"/>
  <rect width="${W}" height="3" fill="${p.accent}"/>
  <rect class="scan" width="130" height="3" fill="url(#s)"/>
  <text x="${X}" y="46" font-size="11.5" font-weight="600" letter-spacing="2" fill="${p.accent}">${esc(p.tag)}</text>
  <path d="M${W - 44} 48 L${W - 30} 34 M${W - 41} 34 H${W - 30} V45" fill="none" stroke="${C.mute}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="${X - 1}" y="88" font-size="${titleSize}" font-weight="700" letter-spacing="-.3" fill="${C.ink}">${esc(p.title)}</text>
  ${descLines.map((l, k) => `<text x="${X}" y="${120 + k * 22}" font-size="15" font-weight="400" fill="${C.neonSoft}">${esc(l)}</text>`).join('\n  ')}
  ${chips.join('\n  ')}
</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="13.5" fill="none" stroke="${p.accent}" stroke-opacity=".25"/>
</svg>`;
    await writeFile(new URL(`cards/${p.file}.svg`, OUT), svg);
  }
}

await mkdir(new URL('cards/', OUT), { recursive: true });
await Promise.all([header(), footer(), buttons(), cards()]);
console.log('SVG generados en assets/');
