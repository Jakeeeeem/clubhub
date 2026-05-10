const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const categories = {
    'admin': ['admin-academy-tv.html', 'admin-bibs.html', 'admin-chat.html', 'admin-dashboard.html', 'admin-email-test.html', 'admin-events.html', 'admin-finances.html', 'admin-members.html', 'admin-scout-approvals.html', 'admin-shop.html', 'admin-staff.html', 'admin-tactical-board.html', 'admin-teams.html', 'admin-tournament-manager.html', 'admin-venues.html'],
    'super-admin': ['super-admin-dashboard.html'],
    'coach': ['coach-chat.html', 'coach-dashboard.html', 'coach-events.html', 'coach-players.html', 'coach-tactical-board.html', 'coach-teams.html', 'coach-tournament-manager.html'],
    'player': ['player-academy-tv.html', 'player-chat.html', 'player-dashboard.html', 'player-finances.html', 'player-performance.html', 'player-schedule.html', 'player-shop.html'],
    'scout': ['scout-dashboard.html', 'scouting.html'],
    'public': ['index.html', 'login.html', 'signup.html', 'forgot-password.html', 'terms.html', 'privacy.html', 'contact.html', 'apply.html', 'coming-soon.html'],
    'discovery': ['club-finder.html', 'event-finder.html', 'team-finder.html', 'tournament-finder.html', 'venue-finder.html', 'club-detail.html'],
    'management': ['camp-manager.html', 'form-builder.html', 'league-management.html', 'training-manager.html', 'venue-booking.html', 'tactical-board.html', 'tournaments-admin.html', 'camp-admin.html'],
    'group': ['group-dashboard.html', 'group-event.html', 'group-members.html', 'create-group.html'],
    'auth': ['invitation-accept.html', 'invite-page.html', 'invite.html', 'parent-approval.html', 'talent-registration.html', 'test-direct-login.html', 'test-login.html', 'test-signup-flow.html'],
    'others': ['dashboard-new.html', 'email-campaigns.html', 'event-qr.html', 'public-form.html', 'qr-checkin.html', 'qr-scanner.html', 'settings.html', 'stripe-onboarding-sim.html']
};

const categoryCredentials = {
    'admin':      { email: 'demo-admin@clubhub.com',  pass: process.env.DEMO_PASS || 'changeme' },
    'super-admin':{ email: 'superadmin@clubhub.com',  pass: process.env.SUPER_PASS || 'changeme' },
    'coach':      { email: 'demo-coach@clubhub.com',  pass: process.env.DEMO_PASS || 'changeme' },
    'player':     { email: 'demo-player@clubhub.com', pass: process.env.DEMO_PASS || 'changeme' },
    'scout':      { email: 'demo-admin@clubhub.com',  pass: process.env.DEMO_PASS || 'changeme' },
    'management': { email: 'demo-admin@clubhub.com',  pass: process.env.DEMO_PASS || 'changeme' },
    'group':      { email: 'demo-admin@clubhub.com',  pass: process.env.DEMO_PASS || 'changeme' },
    'others':     { email: 'demo-admin@clubhub.com',  pass: process.env.DEMO_PASS || 'changeme' },
    'public': null,
    'auth': null,
    'discovery': null
};

const BASE_URL = 'https://clubhubsports.io/';
const OUTPUT_DIR = path.join(__dirname, 'review_screenshots');

async function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function doLogin(page, creds) {
    console.log(`  -> Logging in as ${creds.email}...`);
    await page.goto(BASE_URL + 'test-direct-login.html', { waitUntil: 'load', timeout: 30000 });
    
    await page.evaluate(({ email, pass }) => {
        const demoToggle = document.getElementById('demoModeToggle');
        if (demoToggle) demoToggle.checked = true;
        if (typeof toggleDemoMode === 'function') toggleDemoMode();
        login(email, pass);
    }, creds);

    // Wait a couple of seconds for redirect
    await new Promise(r => setTimeout(r, 2000));
}

async function run() {
    console.log('Starting Puppeteer with login automation...');
    
    // Keep existing screenshots
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    let currentCreds = null;

    for (const [category, files] of Object.entries(categories)) {
        const categoryDir = path.join(OUTPUT_DIR, category);
        await ensureDir(categoryDir);

        const targetCreds = categoryCredentials[category];
        
        // If the category requires login, and it's different from current, log in again
        if (targetCreds) {
            if (!currentCreds || currentCreds.email !== targetCreds.email) {
                // clear cookies to ensure clean login
                const client = await page.target().createCDPSession();
                await client.send('Network.clearBrowserCookies');
                await page.goto(BASE_URL, { waitUntil: 'load' });
                await page.evaluate(() => { try { localStorage.clear(); } catch(e){} });
                
                await doLogin(page, targetCreds);
                currentCreds = targetCreds;
            }
        } else if (currentCreds !== null) {
            // Need to clear login for public pages
            const client = await page.target().createCDPSession();
            await client.send('Network.clearBrowserCookies');
            await page.goto(BASE_URL);
            await page.evaluate(() => { try { localStorage.clear(); } catch(e){} });
            currentCreds = null;
        }

        for (const file of files) {
            const desktopFile = path.join(categoryDir, `Desktop - ${file.replace('.html', '')}.png`);
            const mobileFile = path.join(categoryDir, `Mobile - ${file.replace('.html', '')}.png`);

            if (fs.existsSync(desktopFile) && fs.existsSync(mobileFile)) {
                console.log(`Skipping ${category} / ${file} (already captured)`);
                continue;
            }

            console.log(`Processing ${category} / ${file}...`);
            const url = BASE_URL + file;
            
            try {
                // Desktop
                await page.setViewport({ width: 1440, height: 900 });
                await page.goto(url, { waitUntil: 'load', timeout: 30000 });
                await new Promise(r => setTimeout(r, 2000)); // wait for animations
                await page.screenshot({ path: desktopFile, fullPage: true });

                // Mobile
                await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
                await new Promise(r => setTimeout(r, 1000)); // wait for responsive adjust
                await page.screenshot({ path: mobileFile, fullPage: true });

                console.log(`  ✓ Captured ${file}`);
            } catch (err) {
                console.error(`  x Failed to capture ${file}:`, err.message);
                try {
                    if (page.isClosed()) {
                        page = await browser.newPage();
                        currentCreds = null; // force re-login
                    }
                } catch(e) {}
            }
        }
    }

    await browser.close();
    console.log('Done organizing screenshots.');
}

run().catch(console.error);
