const puppeteer = require('puppeteer');
const path = require('path');

(async function(){
  const base = process.env.BASE_URL || 'http://127.0.0.1:53822';
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

  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try{
    for(const p of pages){
      const page = await browser.newPage();
      await page.setViewport({ width: 375, height: 812, isMobile: true });
      const url = new URL(p.url, base).toString();
      console.log('Checking', url);
      try{ await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }); }catch(e){ console.warn('Load failed', e.message); }
      await new Promise(r => setTimeout(r, 500));
      const res = await page.evaluate(() => {
        const mobileCards = document.querySelectorAll('.mobile-card').length;
        const mobileCardLists = document.querySelectorAll('.mobile-card-list').length;
        const tableResponsive = document.querySelectorAll('.table-responsive').length;
        const tableResponsiveWithCards = Array.from(document.querySelectorAll('.table-responsive')).filter(el=>el.querySelector('.mobile-card-list')).length;
        const tablesRemaining = document.querySelectorAll('.table-responsive table').length;
        return { mobileCards, mobileCardLists, tableResponsive, tableResponsiveWithCards, tablesRemaining };
      });
      console.log(p.name, JSON.stringify(res));
      await page.close();
    }
  }finally{
    await browser.close();
  }
})();
