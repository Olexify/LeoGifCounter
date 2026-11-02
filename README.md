<h1 align="center">Leonote GIF Counter</h1>

<p align="center">
  <i>A self-hosted, animated visitor counter for your GitHub profile or website.</i><br/>
  Leo the lion cub holds up your visit count on a sticky note.
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Olexify/LeoGifCounter/main/LeoPack/0.gif" width="72" alt="0" />
  <img src="https://raw.githubusercontent.com/Olexify/LeoGifCounter/main/LeoPack/1.gif" width="72" alt="1" />
  <img src="https://raw.githubusercontent.com/Olexify/LeoGifCounter/main/LeoPack/2.gif" width="72" alt="2" />
  <img src="https://raw.githubusercontent.com/Olexify/LeoGifCounter/main/LeoPack/3.gif" width="72" alt="3" />
  <img src="https://raw.githubusercontent.com/Olexify/LeoGifCounter/main/LeoPack/4.gif" width="72" alt="4" />
  <img src="https://raw.githubusercontent.com/Olexify/LeoGifCounter/main/LeoPack/5.gif" width="72" alt="5" />
  <img src="https://raw.githubusercontent.com/Olexify/LeoGifCounter/main/LeoPack/6.gif" width="72" alt="6" />
  <img src="https://raw.githubusercontent.com/Olexify/LeoGifCounter/main/LeoPack/7.gif" width="72" alt="7" />
  <img src="https://raw.githubusercontent.com/Olexify/LeoGifCounter/main/LeoPack/8.gif" width="72" alt="8" />
  <img src="https://raw.githubusercontent.com/Olexify/LeoGifCounter/main/LeoPack/9.gif" width="72" alt="9" />
</p>
<p align="center">
  <sub>The ten animated digits, each with its own idle animation</sub>
</p>

---

## What is this?

**Leonote** is a lightweight, local-first notes and tasks app. Leo is its mascot: a tiny lion cub with a sticky note for every digit.

You host it yourself on Vercel, keep the count in Upstash Redis (both free tiers), and tweak it from `counter.config.json`.

- **Ten animated digits** (0-9), 90x100 px GIFs with transparent backgrounds, in `LeoPack/`.
- **Four timing variants per digit** (`3.gif`, `3_1.gif`, `3_2.gif`, `3_3.gif`: different loop start and speed), so neighbouring digits never move in unison.
- Idle animation: ears and the tail tuft swing about their joints, Leo blinks (on the digits with open eyes), a light band sweeps across each note, and the little sparkles, action lines and "zzz" twinkle. Every digit has its own timing.
- Counting modes: `strict` (+1 per request), `unique` (+1 per IP per cooldown window), `aggressive` (+N per request).
- Palette: sticky-note yellow, mint, sakura pink, ocean blue, white and dark grey (the app themes).

## Setup

1. **Upstash Redis:** create a free database at [upstash.com](https://upstash.com) and copy its REST URL and token.
2. **Vercel:** import this repo, set the **Framework Preset to Other**, and add two environment variables: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. Open `https://<your-project>.vercel.app/api/counter` to test it, then embed it:

```html
<img src="https://<your-project>.vercel.app/api/counter" width="480" />
```

## Configuration (`counter.config.json`)

| Key | What it does |
|---|---|
| `counterKey` | the Redis key that stores the count (keep it to keep your number) |
| `digits` | how many digits to show (zero-padded) |
| `assetsDir` | folder with `0.gif` ... `9.gif` |
| `variants` | how many timing variants per digit exist (position *i* uses variant *i* mod *variants*) |
| `cell` | size of one digit cell in SVG units; must match the GIFs' aspect ratio (90x100) |
| `style` | opacity, brightness, contrast, saturation, scale, spacing, drop shadow, background plate |
| `counting` | `strict`, `unique` or `aggressive` |

GitHub caches images, so the number can lag on your profile page. Open the endpoint directly to see the real count.

## Credits

Sprites generated with ChatGPT image generation, then cut, painted with numbers and animated with custom tools. Based on the [Cute Foxes GIF Counter](https://github.com/Olexify/CuteFoxesGIFCounter).
