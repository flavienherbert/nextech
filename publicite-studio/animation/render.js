// Enregistre l'animation image par image. Usage : node render.js <dossier_images> [debut] [fin]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2], FPS = 30, a = parseFloat(process.argv[3] || '0'), b = parseFloat(process.argv[4] || '22');
  const br = await chromium.launch();
  const p = await br.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, 'film.html'));
  await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.querySelectorAll('video')].map(v => v.readyState >= 2 ? 1 : new Promise(ok => v.addEventListener('loadeddata', ok, { once: true })))); });
  let n = 0;
  for (let f = Math.round(a * FPS); f < Math.round(b * FPS); f++) {
    await p.evaluate(t => window.render(t), f / FPS);
    await p.screenshot({ path: `${out}/f${String(n++).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 93 });
  }
  console.log('images:', n, 'erreurs:', JSON.stringify(errs.slice(0, 3)));
  await br.close();
})();
