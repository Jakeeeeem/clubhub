const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async function(){
  const base = process.env.BASE_URL || 'http://127.0.0.1:53822';
  const outDir = path.join(__dirname, 'screenshots');
  if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const pages = [
    { name: 'admin-staff', url: '/admin-staff.html' },
    { name: 'admin-teams', url: '/admin-teams.html' },
    { name: 'admin-finances', url: '/admin-finances.html' },
    { name: 'coach-teams', url: '/coach-teams.html' },
    { name: 'coach-chat', url: '/coach-chat.html' },
    { name: 'player-dashboard', url: '/player-dashboard.html' },
    { name: 'player-shop', url: '/player-shop.html' },
    { name: 'dashboard-new', url: '/dashboard-new.html' }
  ];

  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try{
    for(const p of pages){
      const page = await browser.newPage();
      await page.setViewport({ width: 375, height: 812, isMobile: true });
      const url = new URL(p.url, base).toString();
      console.log('Loading', url);
      try{
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      }catch(e){
        console.warn('Failed to load', url, e.message);
      }
      // wait a bit for JS conversions
      await new Promise(r => setTimeout(r, 800));
      const file = path.join(outDir, `${p.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log('Saved', file);
      await page.close();
    }
  }finally{
    await browser.close();
    console.log('Done. Screenshots saved to', outDir);
  }
})();
