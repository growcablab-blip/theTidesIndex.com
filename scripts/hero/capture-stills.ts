/**
 * Render the hero's stills (`public/hero/still-*.jpg`) and the section stills
 * composed from the same scene (`public/scenes/*.jpg`, see `hero-shots.ts`).
 *
 *   npm run dev            (in another terminal)
 *   npm run hero:stills
 *
 * The stills are frames of the live scene in its fully resolved state, read
 * straight off the WebGL canvas (so no page copy is baked in). They are the
 * whole hero visual for reduced motion and for devices without WebGL2.
 * Re-run whenever the scene changes. Needs Chrome or Edge installed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser } from 'playwright-core';
import { SHOTS } from '../../src/components/showcase/hero/hero-shots';

const BASE = process.env.HERO_BASE_URL ?? 'http://localhost:3000';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The hero's own stills, then one still per art-directed shot (for the lower sections). */
const CAPTURES = [
  { file: 'hero/still-desktop.jpg', query: 'hero=poster', width: 1440, height: 810, dpr: 2400 / 1440 },
  { file: 'hero/still-mobile.jpg', query: 'hero=poster', width: 390, height: 844, dpr: 3 },
  ...Object.entries(SHOTS).map(([name, shot]) => ({
    file: `scenes/${name}.jpg`,
    query: `hero=shot&name=${name}`,
    width: shot.size[0] / 2,
    height: shot.size[1] / 2,
    dpr: 2,
  })),
];
const only = process.argv[2];

async function launch(): Promise<Browser> {
  for (const channel of ['chrome', 'msedge'] as const) {
    try {
      return await chromium.launch({ channel, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
    } catch {
      /* try the next */
    }
  }
  throw new Error('Chrome or Edge is required');
}

const browser = await launch();
for (const shot of CAPTURES.filter((c) => !only || c.file.includes(only))) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: shot.dpr,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/?${shot.query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => (window as Window & { __heroPosterReady?: boolean }).__heroPosterReady === true, null, {
    timeout: 90_000,
  });
  // A few more frames so the shell and the story have both arrived.
  await page.waitForTimeout(3000);
  const dataUrl = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas.sx-hero-gl');
    if (!canvas) throw new Error('hero canvas not found');
    return canvas.toDataURL('image/jpeg', 0.88);
  });
  const out = join(root, 'public', shot.file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.from(dataUrl.split(',')[1] ?? '', 'base64'));
  const size = await page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('canvas.sx-hero-gl');
    return c ? `${String(c.width)}×${String(c.height)}` : '?';
  });
  console.log(`wrote public/${shot.file} (${size})`);
  await context.close();
}
await browser.close();
