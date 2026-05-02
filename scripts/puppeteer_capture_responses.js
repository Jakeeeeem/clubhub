const puppeteer = require('puppeteer');

(async ()=>{
  const url = process.argv[2] || 'http://127.0.0.1:53822/coach-chat.html';
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  page.on('response', async (res) => {
    try {
      const rurl = res.url();
      const headers = res.headers();
      const ct = headers['content-type'] || headers['Content-Type'] || '';
      let text = null;
      try { text = await res.text(); } catch(e) {}
      if (ct.includes('text/html') || (text && text.trim().startsWith('<'))) {
        console.log('HTML RESPONSE DETECTED for', rurl, 'content-type:', ct, 'snippet:', (text? text.slice(0,400): '<no-body>'));
      } else {
        console.log('OK response', rurl, 'content-type:', ct);
      }
    } catch (e) { console.error('resp error', e) }
  });
  page.on('pageerror', (err) => {
    console.log('PAGE ERROR:', err && err.stack ? err.stack : String(err));
  });

    // Inject a document-level error collector before any scripts run
    await page.evaluateOnNewDocument(() => {
      try {
        window.__pageErrors = [];
        window.addEventListener('error', (e) => {
          try {
            window.__pageErrors.push({ message: e && e.message, filename: e && e.filename, lineno: e && e.lineno, colno: e && e.colno, stack: (e && e.error && e.error.stack) || (new Error().stack) });
          } catch (err) {}
        });
        window.addEventListener('unhandledrejection', (e) => {
          try { window.__pageErrors.push({ message: (e && e.reason && e.reason.message) || String(e && e.reason), stack: (e && e.reason && e.reason.stack) || (new Error().stack) }); } catch (err) {}
        });
      } catch (err) {}
    });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 }).catch(()=>{});
  await new Promise(r => setTimeout(r, 2500));
  try {
    const errs = await page.evaluate(() => (window.__pageErrors || []));
    if (Array.isArray(errs) && errs.length) console.log('COLLECTED_PAGE_ERRORS:', JSON.stringify(errs, null, 2));
  } catch (e) { console.error('collect err failed', e) }
  await browser.close();
})();