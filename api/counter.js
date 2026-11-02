import { Redis } from '@upstash/redis';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Digit sprites live in the repo, e.g. <assetsDir>/0.gif ... 9.gif (+ optional timing variants 3_1.gif ...).
// Set "assetsDir" and "cell" in counter.config.json.
// A missing GIF falls back to a drawn placeholder digit, so the counter works before the art is ready.

const DEFAULTS = {
  counterKey: 'counter:Olexify',
  digits: 7,
  assetsDir: 'FoxgirlsPack',
  cell: { w: 45, h: 100 }, // size of one digit cell in SVG units; must match the sprites' aspect ratio
  variants: 1, // timing variants per digit: <d>.gif, <d>_1.gif, ... position i uses variant i % variants, so neighbours never animate in unison
  style: {
    opacity: 1,
    brightness: 1,
    contrast: 1,
    saturate: 1,
    scale: 1,
    spacing: 0,
    offsetY: 0,
    shadowOpacity: 0,
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    bgOpacity: 0,
    rounded: 0,
    bgColor: '#000000',
  },
  counting: {
    mode: 'strict',
    cooldownSeconds: 0,
    bump: 1,
  },
};

const digitCache = new Map();

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

// Like Number(v) || fallback, but keeps a legit 0 (the old opacity bug)
function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function loadConfig() {
  let fileCfg = {};
  try {
    fileCfg = JSON.parse(readFileSync(join(process.cwd(), 'counter.config.json'), 'utf8'));
  } catch {}
  return {
    ...DEFAULTS,
    ...fileCfg,
    cell: { ...DEFAULTS.cell, ...(fileCfg.cell || {}) },
    style: { ...DEFAULTS.style, ...(fileCfg.style || {}) },
    counting: { ...DEFAULTS.counting, ...(fileCfg.counting || {}) },
  };
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}

async function getCount(req, cfg) {
  const key = cfg.counterKey;
  const { mode, cooldownSeconds, bump } = cfg.counting;

  if (mode === 'unique') {
    const cooldown = Math.max(0, num(cooldownSeconds, 0));
    if (cooldown === 0) return await redis.incr(key);
    // SET NX: only the first hit per IP inside the window counts
    const fresh = await redis.set(`seen:${key}:${getClientIp(req)}`, '1', { nx: true, ex: cooldown });
    if (fresh) return await redis.incr(key);
    return num(await redis.get(key), 0);
  }

  if (mode === 'aggressive') {
    return await redis.incrby(key, Math.max(1, num(bump, 1)));
  }

  return await redis.incr(key);
}

function loadDigit(dir, d, v = 0) {
  const cacheKey = `${dir}/${d}/${v}`;
  if (digitCache.has(cacheKey)) return digitCache.get(cacheKey);

  let href = null;
  // variant file first (e.g. 3_2.gif), then the plain digit file as a fallback
  for (const name of v > 0 ? [`${d}_${v}`, `${d}`] : [`${d}`]) {
    for (const ext of ['gif', 'webp', 'png']) {
      const file = join(process.cwd(), dir, `${name}.${ext}`);
      if (existsSync(file)) {
        const mime = ext === 'gif' ? 'image/gif' : `image/${ext}`;
        href = `data:${mime};base64,${readFileSync(file).toString('base64')}`;
        break;
      }
    }
    if (href) break;
  }
  digitCache.set(cacheKey, href);
  return href;
}

function placeholderDigit(d, x, y, W, H) {
  return `<g transform="translate(${x} ${y})">
    <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="${W / 6}" fill="#f4e6c8" stroke="#6b4a2a" stroke-width="2" />
    <text x="${W / 2}" y="${H * 0.66}" text-anchor="middle" font-family="Verdana, sans-serif" font-weight="bold" font-size="${H * 0.5}" fill="#4a3322">${d}</text>
  </g>`;
}

export default async function handler(req, res) {
  const cfg = loadConfig();
  const s = cfg.style;

  try {
    const count = await getCount(req, cfg);
    const digits = clamp(Math.round(num(cfg.digits, 7)), 1, 20);
    const chars = String(count).padStart(digits, '0').slice(-digits).split('');

    const scale = clamp(num(s.scale, 1), 0.2, 5);
    const W = Math.round(cfg.cell.w * scale);
    const H = Math.round(cfg.cell.h * scale);
    const spacing = num(s.spacing, 0);
    const offsetY = num(s.offsetY, 0);

    const totalWidth = chars.length * W + Math.max(0, chars.length - 1) * spacing;
    const totalHeight = H + Math.abs(offsetY) + 4;

    const opacity = clamp(num(s.opacity, 1), 0, 1);
    const brightness = clamp(num(s.brightness, 1), 0, 3);
    const contrast = clamp(num(s.contrast, 1), 0, 3);
    const saturate = clamp(num(s.saturate, 1), 0, 3);
    const shadowOpacity = clamp(num(s.shadowOpacity, 0), 0, 1);
    const shadowBlur = Math.max(0, num(s.shadowBlur, 0));
    const bgOpacity = clamp(num(s.bgOpacity, 0), 0, 1);
    const rounded = Math.max(0, num(s.rounded, 0));
    const bgColor = /^#[0-9a-fA-F]{3,8}$/.test(s.bgColor) ? s.bgColor : '#000000';

    const defs = `<defs>
    <filter id="fox-filter" color-interpolation-filters="sRGB">
      <feComponentTransfer>
        <feFuncR type="linear" slope="${brightness}" />
        <feFuncG type="linear" slope="${brightness}" />
        <feFuncB type="linear" slope="${brightness}" />
      </feComponentTransfer>
      <feColorMatrix type="saturate" values="${saturate}" />
      <feComponentTransfer>
        <feFuncR type="linear" slope="${contrast}" intercept="${(1 - contrast) / 2}" />
        <feFuncG type="linear" slope="${contrast}" intercept="${(1 - contrast) / 2}" />
        <feFuncB type="linear" slope="${contrast}" intercept="${(1 - contrast) / 2}" />
      </feComponentTransfer>
    </filter>
    <filter id="fox-shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="${num(s.shadowOffsetX, 0)}" dy="${num(s.shadowOffsetY, 0)}" stdDeviation="${shadowBlur}" flood-color="#000000" flood-opacity="${shadowOpacity}" />
    </filter>
  </defs>`;

    const y = Math.max(0, offsetY);
    const images = chars.map((d, i) => {
      const x = i * (W + spacing);
      const href = loadDigit(cfg.assetsDir, d, i % Math.max(1, Math.round(num(cfg.variants, 1))));
      const body = href
        ? `<image x="${x}" y="${y}" width="${W}" height="${H}" href="${href}" filter="url(#fox-filter)" />`
        : placeholderDigit(d, x, y, W, H);
      return body;
    });

    const bgRect = bgOpacity > 0
      ? `<rect width="${totalWidth}" height="${totalHeight}" rx="${rounded}" ry="${rounded}" fill="${bgColor}" opacity="${bgOpacity}" />`
      : '';

    // Opacity + shadow on a wrapping group: applying opacity per-<image> alongside filters was ignored by some renderers
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">
  ${defs}
  ${bgRect}
  <g opacity="${opacity}" filter="url(#fox-shadow)">
  ${images.join('\n  ')}
  </g>
</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.status(200).send(svg);
  } catch (err) {
    const msg = String(err?.message || err).replace(/[<>&"]/g, '');
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).send(
      `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40">
  <rect width="100%" height="100%" fill="#fff" />
  <text x="10" y="25" font-size="14" fill="red">counter error: ${msg}</text>
</svg>`
    );
  }
}
