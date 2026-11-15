// Little Things scatter background — renders an array of items into an <svg>.
// item = [kind, fill, x, y, size, color, rotationDeg]
const SH = {
  circle: s => `<circle r="${s}"/>`,
  heart:  s => `<path d="M0,${.95*s} C${-1.45*s},${.05*s} ${-.85*s},${-s} 0,${-.4*s} C${.85*s},${-s} ${1.45*s},${.05*s} 0,${.95*s}Z"/>`,
  daisy:  s => [0,60,120,180,240,300].map(a => `<ellipse cx="0" cy="${-.62*s}" rx="${.3*s}" ry="${.47*s}" transform="rotate(${a})"/>`).join(''),
  semi:   s => `<path d="M${-s},${.5*s} A${s},${s} 0 0 1 ${s},${.5*s}Z"/>`,
  drop:   s => `<path d="M0,${-1.1*s} C${.35*s},${-.5*s} ${.9*s},${-.1*s} ${.9*s},${.4*s} A${.9*s},${.9*s} 0 0 1 ${-.9*s},${.4*s} C${-.9*s},${-.1*s} ${-.35*s},${-.5*s} 0,${-1.1*s}Z"/>`,
  spark:  s => `<path d="M0,${-s} Q${.14*s},${-.14*s} ${s},0 Q${.14*s},${.14*s} 0,${s} Q${-.14*s},${.14*s} ${-s},0 Q${-.14*s},${-.14*s} 0,${-s}Z"/>`,
  capsule:s => { const h = Math.max(9, s*.34); return `<rect x="${-s/2}" y="${-h/2}" width="${s}" height="${h}" rx="${h/2}"/>`; },
  candy:  s => `<path d="M${-.6*s},0 L${-1.25*s},${-.55*s} Q${-1.05*s},0 ${-1.25*s},${.55*s}Z M${.6*s},0 L${1.25*s},${-.55*s} Q${1.05*s},0 ${1.25*s},${.55*s}Z"/><ellipse rx="${.68*s}" ry="${.46*s}"/>`,
  lolli:  s => `<rect x="${-.09*s}" y="${.2*s}" width="${.18*s}" height="${1.25*s}" rx="${.09*s}"/><circle cy="${-.35*s}" r="${.8*s}"/>`,
  moon:   s => `<path d="M${.5776*s},${-.8164*s} A${s},${s} 0 1 0 ${.5776*s},${.8164*s} A${.82*s},${.82*s} 0 1 1 ${.5776*s},${-.8164*s}Z"/>`,
  star:   s => { const p = []; for (let i = 0; i < 10; i++) { const r = s*(i%2 ? .52 : 1), a = -Math.PI/2 + i*Math.PI/5; p.push(`${(r*Math.cos(a)).toFixed(1)},${(r*Math.sin(a)).toFixed(1)}`); } return `<path d="M${p.join(' L')}Z"/>`; },
};
let uid = 0;
function item([k, fill, x, y, s, col, rot]) {
  const T = `translate(${x},${y}) rotate(${rot})`;
  if (fill === 'solid') {
    const st = k === 'star' ? ` stroke="${col}" stroke-width="${.32*s}" stroke-linejoin="round"` : '';
    return `<g transform="${T}" fill="${col}"${st}>${SH[k](s)}</g>`;
  }
  const id = 'cp' + (++uid), ext = s*1.45, g = Math.max(6.5, s/3.4);
  let pat = '';
  if (fill === 'dots') {
    for (let yy = -ext, row = 0; yy <= ext; yy += g*.866, row++)
      for (let xx = -ext + (row%2 ? g/2 : 0); xx <= ext; xx += g)
        pat += `<circle cx="${xx.toFixed(1)}" cy="${yy.toFixed(1)}" r="${(g*(.16 + .17*(xx+ext)/(2*ext))).toFixed(2)}"/>`;
  } else {
    for (let j = 0; j < Math.floor(ext*3/(g*.9)) + 2; j++)
      pat += `<rect x="${-ext*1.5}" y="${j*g*.9 - ext*1.5}" width="${ext*3}" height="${g*.42}" transform="rotate(-35)"/>`;
  }
  return `<clipPath id="${id}">${SH[k](s)}</clipPath><g transform="${T}"><g clip-path="url(#${id})" fill="${col}">${pat}</g></g>`;
}
function scatterSVG(w, h, items) {
  uid = 0;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="page-scatter" aria-hidden="true">${items.map(item).join('')}</svg>`;
}

const PHONE = [["daisy", "solid", 240, 34, 19, "#dff06c", 25], ["star", "dots", 12, 175, 12, "#4a5a1e", 0], ["lolli", "solid", 378, 285, 15, "#b5d233", -30], ["spark", "solid", 12, 420, 14, "#f4a8bd", -15], ["heart", "stripes", 378, 540, 17, "#9bb8f8", 25], ["semi", "solid", 12, 585, 20, "#dff06c", 25], ["capsule", "solid", 88, 785, 34, "#dff06c", 0], ["drop", "dots", 300, 800, 13, "#4a5a1e", 0]];
const DESKTOP = [["star", "solid", 1183, 400, 15, "#dff06c", 0], ["semi", "stripes", 236, 440, 20, "#f4a8bd", -30], ["daisy", "solid", 116, 696, 17, "#b5d233", 0], ["circle", "dots", 888, 36, 14, "#4a5a1e", 12], ["capsule", "solid", 1257, 830, 38, "#9bb8f8", -15], ["drop", "solid", 243, 208, 12, "#dff06c", 40], ["heart", "stripes", 1075, 609, 19, "#f6c07a", 12], ["moon", "solid", 1, 180, 13, "#dff06c", 25], ["lolli", "dots", 389, 761, 15, "#4a5a1e", 25], ["candy", "solid", 735, 745, 16, "#b5d233", 40], ["spark", "solid", 539, 89, 17, "#f4a8bd", -30], ["star", "stripes", 932, 334, 13, "#9bb8f8", -15], ["semi", "solid", 1184, 111, 22, "#dff06c", 25], ["daisy", "dots", 949, 852, 15, "#4a5a1e", 25], ["circle", "solid", 1, 468, 18, "#dff06c", 40]];

export function mountPageScatter() {
  function render() {
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    const phone = width < 640;
    const [designWidth, designHeight, layout] = phone ? [390, 844, PHONE] : [1280, 860, DESKTOP];
    const items = layout.map(([kind, fill, x, y, size, color, rotation]) =>
      [kind, fill, x * width / designWidth, y * height / designHeight, size, color, rotation]);
    document.querySelector('.page-scatter')?.remove();
    document.body.insertAdjacentHTML('afterbegin', scatterSVG(width, height, items));
  }

  function updateHeader() {
    document.body.classList.toggle('page-scrolled', window.scrollY > 0);
  }

  render();
  updateHeader();
  window.addEventListener('resize', render);
  window.addEventListener('scroll', updateHeader, { passive: true });
}
