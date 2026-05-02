const puppeteer = require('puppeteer');

(async ()=>{
  const url = process.argv[2] || 'http://127.0.0.1:53822/coach-chat.html';
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(()=>{});
  // give app some time to run fetches
  await new Promise(r => setTimeout(r, 1500));
  const last = await page.evaluate(()=>{
    try { return window.localStorage.getItem('last_json_error') } catch(e) { return null }
  });
  console.log('LAST_JSON_ERROR:', last);
  await browser.close();
})();