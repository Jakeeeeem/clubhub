const puppeteer = require('puppeteer');

(async ()=>{
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.stack || err.toString()));

  const url = process.env.TARGET_URL || 'http://127.0.0.1:53822/player-shop.html';
  console.log('Test URL:', url);

  await page.goto('about:blank');
  await page.evaluate(() => {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
      }
      if (window.caches && caches.keys) {
        caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
      }
    } catch(e){}
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Set demo player localStorage before scripts run — if already loaded, set and reload
  await page.evaluate(() => {
    try {
      localStorage.setItem('isDemoSession', 'true');
      localStorage.setItem('authToken', 'demo-token');
      localStorage.setItem('currentUser', JSON.stringify({ id: 'demo-player-id', first_name: 'Demo', last_name: 'Player', userType: 'player', account_type: 'player' }));
    } catch(e) { }
  });

  // Reload to ensure messenger mounts with demo user
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  try {
    await page.waitForSelector('#player-messenger-mount', { timeout: 10000 });
  } catch (e) {
    console.log('Messenger mount not found');
    await browser.close();
    return;
  }

  console.log('Messenger mount present — invoking mount if necessary');

  // Ensure SquadMessenger is mounted
  await page.evaluate(() => {
    try {
      if (window.SquadMessenger && document.getElementById('player-messenger-mount') && !document.querySelector('#player-messenger-mount .sq-messenger')) {
        SquadMessenger.mount('player-messenger-mount');
      }
    } catch(e) { console.log('mount error', e && e.message); }
  });

  // Wait for contacts to load and render
  await page.waitForSelector('#sq-contact-picker div', { timeout: 10000 });
  console.log('Contact picker populated');

  // Open New Message modal
  await page.evaluate(() => {
    try { SquadMessenger.openNewMessageModal(); } catch (e) { console.log('open modal err', e && e.message); }
  });

  await page.waitForSelector('#sq-contact-picker > div:not(:empty)', { timeout: 5000 });
  console.log('Selecting first contact');

  // Inspect contacts/state before picking
  const pre = await page.evaluate(() => {
    try { return { count: window.SquadMessenger.state.allContacts.length, contacts: (window.SquadMessenger.state.allContacts||[]).slice(0,3).map(c=>({id:c.id||c.user_id, name:c.first_name||c.name||''})) , active: window.SquadMessenger.state.activeUserId || null }; } catch(e) { return { error: String(e) }; }
  });
  console.log('Pre-pick state:', JSON.stringify(pre));

  // Ensure contacts are fetched into state, then pick the first one
  await page.evaluate(async () => {
    try {
      if (window.SquadMessenger && typeof window.SquadMessenger._fetchContacts === 'function') {
        await window.SquadMessenger._fetchContacts();
      }
    } catch(e) { console.log('fetchContacts err', e && e.message); }
  });

  // After fetch, attempt pick
  await page.evaluate(() => {
    try {
      const contacts = window.SquadMessenger && window.SquadMessenger.state ? window.SquadMessenger.state.allContacts : null;
      if (contacts && contacts.length) {
        const c = contacts[0];
        const id = c.id || c.user_id;
        const name = (c.first_name || c.last_name) ? `${c.first_name||''} ${c.last_name||''}`.trim() : (c.name || 'Contact');
        SquadMessenger._pickContact(id, name);
      } else {
        console.log('No contacts available after fetch');
      }
    } catch(e) { console.log('pick contact err', e && e.message); }
  });

  const post = await page.evaluate(() => {
    try { return { active: window.SquadMessenger.state.activeUserId || null, totalContacts: window.SquadMessenger.state.allContacts.length }; } catch(e) { return { error: String(e) }; }
  });
  console.log('Post-pick state:', JSON.stringify(post));

  // Wait for conversation to open
  await page.waitForSelector('#sq-input', { timeout: 5000 });
  console.log('Conversation opened — typing message');

  // Type a message and send
  await page.type('#sq-input', 'Hello from automated test');
  // Invoke apiService directly to inspect result (and bypass UI send wrapper)
  const apiResult = await page.evaluate(async () => {
    try {
      const rid = window.SquadMessenger && window.SquadMessenger.state ? window.SquadMessenger.state.activeUserId : null;
      const content = document.getElementById('sq-input')?.value || 'Hello from automated test';
      if (!rid) return { error: 'no activeUserId' };
      try {
        const res = await apiService.makeRequest('/messages', { method: 'POST', body: JSON.stringify({ receiverId: rid, content }) });
        return { ok: true, res };
      } catch (e) {
        return { ok: false, error: String(e) };
      }
    } catch (e) { return { error: String(e) }; }
  });
  console.log('Direct apiService POST result:', JSON.stringify(apiResult));

  // Wait a moment for message to appear in thread
  await new Promise(r => setTimeout(r, 1000));

  const state = await page.evaluate(() => {
    try {
      const s = window.SquadMessenger && window.SquadMessenger.state ? window.SquadMessenger.state : null;
      const last = s && Array.isArray(s.allMessages) && s.allMessages.length ? s.allMessages[s.allMessages.length-1] : null;
      return { total: s ? s.allMessages.length : 0, last };
    } catch (e) { return { error: String(e) }; }
  });

  console.log('Messenger state after send:', JSON.stringify(state, null, 2));

  await browser.close();
})();
