const puppeteer = require('puppeteer');

const PAGES = [
  '/admin-scout-approvals.html',
  '/league-management.html',
  '/training-manager.html',
  '/admin-teams.html',
  '/coach-players.html'
];

(async () => {
  const urlBase = process.env.TARGET_URL || 'http://127.0.0.1:53822';
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    const args = msg.args();
    Promise.all(args.map(a => a.jsonValue())).then(vals => {
      console.log('PAGE LOG:', msg.type(), ...vals);
    }).catch(() => console.log('PAGE LOG:', msg.text()));
  });

  for (const p of PAGES) {
    const full = urlBase.replace(/\/$/, '') + p;
    console.log('Visiting', full);
    try {
      await page.goto(full, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(1200);
      console.log('Captured logs for', p);
    } catch (e) {
      console.error('Failed to load', full, e && e.message);
    }
  }

  await browser.close();
})();
