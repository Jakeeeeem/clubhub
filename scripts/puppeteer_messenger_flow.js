const puppeteer = require('puppeteer');

(async ()=>{
  const url = process.argv[2] || 'http://127.0.0.1:53822/coach-chat.html';
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto(url, { waitUntil: 'networkidle2' }).catch(()=>{});
  // Wait briefly for messenger to mount
  await new Promise(r => setTimeout(r, 1200));

  // Ensure messenger section is visible: click Quick Actions -> Message Squad
  const messengerQuick = await page.$('button[onclick*="showCoachSection(\'messenger\')"]');
  if (messengerQuick) {
    await page.evaluate(el => el.click(), messengerQuick);
    await new Promise(r => setTimeout(r, 400));
  }

  // Click the New button (matches onclick handler)
  const newBtn = await page.$('button[onclick*="openNewMessageModal"]');
  if (!newBtn) { console.log('New button not found'); await browser.close(); process.exit(2); }
  await page.evaluate(el => el.click(), newBtn);
  await page.waitForSelector('#sq-new-modal', { visible: true });
  console.log('New Message modal opened');

  // Wait for contacts to render and pick first contact
  await page.waitForSelector('#sq-contact-picker > *', { visible: true });
  const first = await page.$('#sq-contact-picker > *');
  if (!first) { console.log('No contacts found'); await browser.close(); process.exit(3); }
  await first.click();
  console.log('Picked first contact');

  // Wait for input to appear and send a message
  await page.waitForSelector('#sq-input', { visible: true });
  await page.type('#sq-input', 'Hello from puppeteer');
  const sendBtn = await page.$('button[onclick*="SquadMessenger.send"]');
  if (!sendBtn) { console.log('Send button not found'); await browser.close(); process.exit(4); }
  await sendBtn.click();
  console.log('Clicked send');

  // Wait a moment and check messages area
  await new Promise(r => setTimeout(r, 800));
  const msgs = await page.$$eval('#sq-messages div', nodes => nodes.map(n => n.innerText).filter(Boolean));
  console.log('Messages snippets:', msgs.slice(-5));

  await browser.close();
})();
