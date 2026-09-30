/**
 * Render the hero's stills: `public/hero/still-desktop.jpg` and `still-mobile.jpg`.
 *
 *   npm run dev            (in another terminal)
 *   npm run hero:stills
 *
 * The stills are frames of the live scene in its fully resolved state, read
 * straight off the WebGL canvas (so no page copy is baked in). They are the
 * whole hero visual for reduced motion and for devices without WebGL2.
 * Re-run whenever the scene changes. Needs Chrome or Edge installed.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser } from 'playwright-core';

const BASE = process.env.HERO_BASE_URL ?? 'http://localhost:3000';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const SHOTS = [
  { file: 'still-desktop.jpg', width: 1440, height: 810, dpr: 2400 / 1440 },
  { file: 'still-mobile.jpg', width: 390, height: 844, dpr: 3 },
] as const;

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
for (const shot of SHOTS) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: shot.dpr,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/?hero=poster`, { waitUntil: 'load' });
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
  const out = join(root, 'public', 'hero', shot.file);
  writeFileSync(out, Buffer.from(dataUrl.split(',')[1] ?? '', 'base64'));
  const size = await page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('canvas.sx-hero-gl');
    return c ? `${String(c.width)}×${String(c.height)}` : '?';
  });
  console.log(`wrote public/hero/${shot.file} (${size})`);
  await context.close();
}
await browser.close();
