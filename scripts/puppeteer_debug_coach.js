const puppeteer = require('puppeteer');

(async ()=>{
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.stack || err.toString()));
  page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure() && req.failure().errorText));
  page.on('request', req => console.log('REQUEST:', req.method(), req.url()));
  page.on('response', async res => {
    try {
      const status = res.status();
      const ct = res.headers()['content-type'] || '';
      if(status >= 400) console.log('BAD RESPONSE', res.url(), status);
      const text = await res.text();
      if (ct.includes('javascript') || ct.includes('text/html') || ct.includes('application/json') ) {
        if (text && text.trim().startsWith('<')) {
          console.log('RESPONSE STARTS WITH < for', res.url());
          console.log(text.slice(0,200));
        }
      }
    } catch(e) {
      console.log('RESP READ ERR', e && e.message);
    }
  });

  const url = process.env.TARGET_URL || 'http://127.0.0.1:53822/coach-chat.html';
  console.log('Cleaning service workers and caches before visiting', url);
  await page.goto('about:blank');
  await page.evaluate(async () => {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
      if (window.caches && caches.keys) {
        const keys = await caches.keys();
        for (const k of keys) await caches.delete(k);
      }
    } catch (e) {
      // ignore
    }
  });
  // Rewrite same-origin /api/* requests to the backend to avoid static-server 404 HTML responses
  await page.evaluateOnNewDocument(() => {
    try {
      const originalFetch = window.fetch;
      window.fetch = function(input, init) {
        try {
          let url = input;
          let req = input;
          if (typeof input !== 'string') {
            url = input && input.url ? input.url : '';
            req = input;
          }
          if (typeof url === 'string' && url.startsWith('/api/')) {
            const newUrl = 'http://localhost:3000' + url;
            if (typeof input === 'string') input = newUrl;
            else input = new Request(newUrl, input);
          }
        } catch (e) {}
        return originalFetch.apply(this, [input, init]);
      };
    } catch (e) {}
  });
  console.log('Visiting', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(e=>console.log('GOTO ERR', e && e.message));
  // wait a bit for dynamic loads
  await new Promise(r => setTimeout(r, 2000));
  console.log('Finished — capturing page content head:');
  const scripts = await page.$$eval('script[src]', s => s.map(x => x.getAttribute('src')));
  console.log('Scripts referenced:', scripts);
  await browser.close();
})();
