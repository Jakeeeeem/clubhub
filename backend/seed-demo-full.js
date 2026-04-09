const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const envFiles = [".env", "clubhub-dev.env", ".env.local"];
for (const file of envFiles) {
  const envPath = path.join(__dirname, file);
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
    break;
  }
}

const { pool } = require("./config/database");

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const HASH = bcrypt.hashSync("password123", 10);

const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Winger", "Striker", "Centre-Back", "Full-Back"];
const NATIONALITIES = ["English", "Scottish", "Welsh", "Irish", "French", "Spanish", "Brazilian", "Nigerian", "Jamaican", "German"];

const FIRST_NAMES = [
  "James", "Oliver", "Harry", "Jack", "George", "Noah", "Charlie", "Jacob", "Alfie", "Freddie",
  "Marcus", "Leon", "Tyler", "Darnell", "Kieron", "Ryan", "Connor", "Liam", "Ethan", "Mason",
  "Lucas", "Dylan", "Theo", "Archie", "Jake", "Callum", "Aaron", "Kyle", "Reece", "Danny",
  "Matt", "Tom", "Sam", "Ben", "Joe", "Will", "Alex", "Dan", "Chris", "Rob"
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Wilson", "Taylor", "Anderson", "Thomas",
  "Jackson", "White", "Harris", "Martin", "Garcia", "Martinez", "Robinson", "Clark", "Lewis", "Lee",
  "Walker", "Hall", "Allen", "Young", "Green", "Baker", "Adams", "Campbell", "Mitchell", "Carter",
  "Phillips", "Evans", "Turner", "Torres", "Parker", "Collins", "Edwards", "Stewart", "Flores", "Morris"
];

// ─── MAIN ──────────────────────────────────────────────────────────────────────

async function seedDemoFull() {
  console.log("🌱 STARTING FULL DEMO SEED (Players, Leagues, Tournaments, Matches, Stats)...");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ── CLEANUP ──────────────────────────────────────────────────────────────
    console.log("🧹 Cleaning previous demo data...");
    await client.query("DELETE FROM event_bookings").catch(() => {});
    await client.query("DELETE FROM events").catch(() => {});
    await client.query("DELETE FROM team_players").catch(() => {});
    await client.query("DELETE FROM payments").catch(() => {});
    await client.query("DELETE FROM players").catch(() => {});
    await client.query("DELETE FROM staff").catch(() => {});
    
    // Clean tournament/league tables if they exist
    for (const t of ["tournament_matches","tournament_teams","tournament_groups","tournaments","league_matches","league_standings","league_teams","leagues"]) {
      await client.query(`DELETE FROM ${t}`).catch(() => console.log(`  ⚠️  Table ${t} not found, skipping.`));
    }

    // Reset teams but keep orgs
    await client.query("DELETE FROM teams").catch(() => {});

    // ── ADMIN USER ───────────────────────────────────────────────────────────
    console.log("👤 Setting up Admin user...");
    const ownerEmail = "demo-admin@clubhub.com";
    let ownerId;
    const ownerRes = await client.query("SELECT id FROM users WHERE email = $1", [ownerEmail]);
    if (ownerRes.rows.length === 0) {
      const r = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, account_type, org_types)
         VALUES ($1,$2,'Demo','Admin','organization','{"club"}') RETURNING id`,
        [ownerEmail, HASH]
      );
      ownerId = r.rows[0].id;
    } else {
      ownerId = ownerRes.rows[0].id;
    }
    console.log(`  ✅ Admin: ${ownerId}`);

    // ── HELPER: Get or Create Org ─────────────────────────────────────────────
    const getOrCreateOrg = async (name, slug, desc, sport, type) => {
      const res = await client.query("SELECT id FROM organizations WHERE slug = $1", [slug]);
      if (res.rows.length > 0) {
        await client.query(
          `UPDATE organizations SET name=$1, description=$2 WHERE slug=$3`,
          [name, desc, slug]
        );
        return res.rows[0].id;
      }
      console.log(`  🏢 Creating org: ${name}`);
      const newOrg = await client.query(
        `INSERT INTO organizations (name, slug, description, location, sport, owner_id)
         VALUES ($1,$2,$3,'London, UK',$4,$5) RETURNING id`,
        [name, slug, desc, sport, ownerId]
      );
      const orgId = newOrg.rows[0].id;
      await client.query(
        `INSERT INTO clubs (id, name, description, location, sport, owner_id, types)
         VALUES ($1,$2,$3,'London, UK',$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [orgId, name, desc, sport, ownerId, [type]]
      );
      await client.query(
        `INSERT INTO organization_members (user_id, organization_id, role, status)
         VALUES ($1,$2,'owner','active') ON CONFLICT DO NOTHING`,
        [ownerId, orgId]
      );
      return orgId;
    };

    // ── HELPER: Create Player ────────────────────────────────────────────────
    const createPlayer = async (clubId, firstName, lastName, index) => {
      const email = `player.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${index}@demo.com`;
      
      // Get or create user
      let userId;
      const uRes = await client.query("SELECT id FROM users WHERE email = $1", [email]);
      if (uRes.rows.length > 0) {
        userId = uRes.rows[0].id;
      } else {
        const nu = await client.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, account_type)
           VALUES ($1,$2,$3,$4,'adult') RETURNING id`,
          [email, HASH, firstName, lastName]
        );
        userId = nu.rows[0].id;
      }

      const dob = `${rand(2000, 2012)}-${String(rand(1,12)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')}`;
      const pos = pick(POSITIONS);
      const payStatus = pick(["paid", "paid", "paid", "pending", "overdue"]);
      const attendance = rand(55, 100);

      const pRes = await client.query(
        `INSERT INTO players (user_id, club_id, first_name, last_name, email, position, payment_status, date_of_birth, attendance_rate, nationality, height, weight, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true) RETURNING id`,
        [userId, clubId, firstName, lastName, email, pos, payStatus, dob, attendance,
         pick(NATIONALITIES), rand(165, 195), rand(65, 90)]
      );
      return { playerId: pRes.rows[0].id, userId };
    };

    // ── HELPER: Create Player Stats ──────────────────────────────────────────
    const createPlayerStats = async (playerId, clubId) => {
      await client.query(
        `INSERT INTO player_stats (player_id, club_id, season, goals, assists, appearances, yellow_cards, red_cards, minutes_played, clean_sheets, pass_accuracy, rating)
         VALUES ($1,$2,'2024/25',$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT DO NOTHING`,
        [playerId, clubId, rand(0,22), rand(0,15), rand(5,38), rand(0,6), rand(0,2),
         rand(450,3420), rand(0,18), rand(62,94), (rand(55,95)/10).toFixed(1)]
      ).catch(() => {}); // Skip if table doesn't support this schema
    };

    // ── HELPER: Create Payments ──────────────────────────────────────────────
    const createPayments = async (playerId, clubId, months = 3) => {
      for (let i = 0; i < months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        await client.query(
          `INSERT INTO payments (player_id, club_id, amount, payment_status, payment_type, due_date, description, created_at)
           VALUES ($1,$2,$3,$4,'monthly_fee',$5,$6,NOW())`,
          [playerId, clubId, rand(30,150), i === 0 ? pick(["pending","paid"]) : "paid",
           date, `Membership - ${date.toLocaleString("default",{month:"long",year:"numeric"})}`]
        );
      }
    };

    // ── HELPER: Create Events ────────────────────────────────────────────────
    const createEvents = async (clubId, clubName) => {
      const eventDefs = [
        { title: `Pre-Season Training - ${clubName}`, type: "training", daysOffset: -14, time: "10:00" },
        { title: `Fitness Assessment - ${clubName}`, type: "training", daysOffset: -7, time: "09:30" },
        { title: `U12 Training`, type: "training", daysOffset: 3, time: "17:30" },
        { title: `U14 Training`, type: "training", daysOffset: 4, time: "18:00" },
        { title: `First Team Training`, type: "training", daysOffset: 5, time: "19:00" },
        { title: `League Match: ${clubName} vs City FC`, type: "match", daysOffset: 7, time: "14:00" },
        { title: `League Match: ${clubName} vs United`, type: "match", daysOffset: 14, time: "15:00" },
        { title: `Cup Match: ${clubName} vs Rovers`, type: "match", daysOffset: 21, time: "14:00" },
        { title: `Team Awards Dinner`, type: "social", daysOffset: 30, time: "19:00" },
        { title: `Summer Tournament - Day 1`, type: "tournament", daysOffset: 45, time: "09:00" },
        { title: `Summer Tournament - Day 2`, type: "tournament", daysOffset: 46, time: "09:00" },
        { title: `Open Trial Day`, type: "training", daysOffset: 60, time: "10:00" },
      ];

      for (const e of eventDefs) {
        const date = new Date();
        date.setDate(date.getDate() + e.daysOffset);
        await client.query(
          `INSERT INTO events (club_id, title, event_type, event_date, event_time, location, description, created_by, max_capacity)
           VALUES ($1,$2,$3,$4,$5,'Main Ground',$6,$7,100)`,
          [clubId, e.title, e.type, date, e.time, `${e.type} session for ${clubName}`, ownerId]
        ).catch(() => {
          // Try without max_capacity if column doesn't exist
          return client.query(
            `INSERT INTO events (club_id, title, event_type, event_date, event_time, location, description, created_by)
             VALUES ($1,$2,$3,$4,$5,'Main Ground',$6,$7)`,
            [clubId, e.title, e.type, date, e.time, `${e.type} session for ${clubName}`, ownerId]
          );
        });
      }
    };

    // ── HELPER: Create Teams ────────────────────────────────────────────────
    const createTeams = async (clubId, prefix) => {
      const teamDefs = [
        { name: `${prefix} U10s`, age: "U10" },
        { name: `${prefix} U12s`, age: "U12" },
        { name: `${prefix} U14s`, age: "U14" },
        { name: `${prefix} U16s`, age: "U16" },
        { name: `${prefix} U18s`, age: "U18" },
        { name: `${prefix} First Team`, age: "Senior" },
        { name: `${prefix} Reserves`, age: "Senior" },
      ];
      const ids = [];
      for (const t of teamDefs) {
        const r = await client.query(
          `INSERT INTO teams (club_id, name, sport, age_group, description, created_at)
           VALUES ($1,$2,'Football',$3,$4,NOW()) RETURNING id`,
          [clubId, t.name, t.age, `${t.age} squad for ${prefix}`]
        );
        ids.push({ id: r.rows[0].id, name: t.name, age: t.age });
      }
      return ids;
    };

    // ── HELPER: Create Staff ────────────────────────────────────────────────
    const createStaff = async (clubId) => {
      const staffDefs = [
        { first: "Mike", last: "Henderson", role: "head-coach" },
        { first: "Sarah", last: "Collins", role: "assistant-coach" },
        { first: "Tony", last: "Briggs", role: "coach" },
        { first: "Laura", last: "Marsh", role: "physio" },
        { first: "Graham", last: "Owens", role: "manager" },
        { first: "Claire", last: "Pearce", role: "secretary" },
      ];
      for (const s of staffDefs) {
        const email = `${s.first.toLowerCase()}.${s.last.toLowerCase()}.staff.${clubId.substring(0,6)}@demo.com`;
        let userId;
        const uRes = await client.query("SELECT id FROM users WHERE email = $1", [email]);
        if (uRes.rows.length > 0) {
          userId = uRes.rows[0].id;
        } else {
          const nu = await client.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, account_type)
             VALUES ($1,$2,$3,$4,'adult') RETURNING id`,
            [email, HASH, s.first, s.last]
          );
          userId = nu.rows[0].id;
        }
        await client.query(
          `INSERT INTO staff (user_id, club_id, first_name, last_name, role, email, phone)
           VALUES ($1,$2,$3,$4,$5,$6,'07700900000') ON CONFLICT DO NOTHING`,
          [userId, clubId, s.first, s.last, s.role, email]
        );
        await client.query(
          `INSERT INTO organization_members (user_id, organization_id, role, status)
           VALUES ($1,$2,'staff','active') ON CONFLICT DO NOTHING`,
          [userId, clubId]
        );
      }
    };

    // ── HELPER: Create Products ──────────────────────────────────────────────
    const createProducts = async (clubId, prefix) => {
      const products = [
        { name: `${prefix} Home Kit 2024/25`, price: 54.99, cat: "kit", color: "000000/FFF" },
        { name: `${prefix} Away Kit 2024/25`, price: 54.99, cat: "kit", color: "cccccc/000" },
        { name: `${prefix} Third Kit`, price: 54.99, cat: "kit", color: "FF0000/FFF" },
        { name: `${prefix} Training Top`, price: 29.99, cat: "training", color: "0000FF/FFF" },
        { name: `${prefix} Training Shorts`, price: 19.99, cat: "training", color: "333/FFF" },
        { name: `${prefix} Hoodie`, price: 44.99, cat: "merch", color: "222/FFF" },
        { name: `${prefix} Polo Shirt`, price: 34.99, cat: "merch", color: "006400/FFF" },
        { name: `${prefix} Scarf`, price: 16.99, cat: "merch", color: "800000/FFF" },
        { name: `${prefix} Water Bottle`, price: 11.99, cat: "equipment", color: "FFFF00/000" },
        { name: `${prefix} Kitbag`, price: 39.99, cat: "equipment", color: "000080/FFF" },
        { name: `${prefix} Shin Pads`, price: 14.99, cat: "equipment", color: "FF8C00/FFF" },
        { name: `${prefix} Personalised Shirt`, price: 69.99, cat: "kit", color: "8B0000/FFF" },
      ];
      for (const p of products) {
        await client.query(
          `INSERT INTO products (club_id, name, description, price, category, image_url, stock_quantity, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
          [clubId, p.name, `Official ${p.name} from ${prefix}`, p.price, p.cat,
           `https://placehold.co/400x400/${p.color}?text=${encodeURIComponent(p.name.split(' ').slice(-2).join('+'))}`, rand(10,200)]
        ).catch(() => {});
      }
    };

    // ── HELPER: Create Plans ─────────────────────────────────────────────────
    const createPlans = async (clubId) => {
      const plans = [
        { name: "Platinum", price: 200, desc: "Full access — training, matches, kit allowance" },
        { name: "Gold", price: 150, desc: "Training + match access" },
        { name: "Silver", price: 90, desc: "Training only" },
        { name: "Junior", price: 60, desc: "Under 16s membership" },
        { name: "Pay As You Go", price: 12, desc: "Per-session pricing" },
      ];
      for (const p of plans) {
        await client.query(
          `INSERT INTO plans (club_id, name, price, interval, description, active)
           VALUES ($1,$2,$3,'month',$4,true) ON CONFLICT DO NOTHING`,
          [clubId, p.name, p.price, p.desc]
        ).catch(() => {});
      }
    };

    // ── HELPER: Create Listings ───────────────────────────────────────────────
    const createListings = async (clubId, clubName) => {
      const listings = [
        { title: "First Team Centre-Forward", pos: "Striker", type: "recruitment" },
        { title: "U18 Goalkeeper", pos: "Goalkeeper", type: "recruitment" },
        { title: "Head Coach – First Team", pos: "Head Coach", type: "recruitment" },
        { title: "U14 Assistant Coach", pos: "Assistant Coach", type: "recruitment" },
        { title: "Club Physiotherapist", pos: "Physio", type: "recruitment" },
        { title: "Sponsorship Partner Opportunity", pos: "N/A", type: "sponsorship" },
      ];
      for (const l of listings) {
        await client.query(
          `INSERT INTO listings (club_id, title, listing_type, position, description, is_active, created_at)
           VALUES ($1,$2,$3,$4,$5,true,NOW())`,
          [clubId, l.title, l.type, l.pos, `${clubName} is looking for a ${l.title}. Apply today.`]
        ).catch(() => {});
      }
    };

    // ── HELPER: Create Tournament ─────────────────────────────────────────────
    const createTournament = async (clubId, clubName, teamIds) => {
      console.log(`  🏆 Creating Tournament for ${clubName}...`);
      
      const tRes = await client.query(
        `INSERT INTO tournaments (club_id, name, description, sport, start_date, end_date, status, max_teams, prize_pool, location, created_by)
         VALUES ($1,$2,$3,'Football',$4,$5,'active',$6,$7,'Main Ground',$8) RETURNING id`,
        [clubId, `${clubName} Summer Cup 2025`,
         `Annual knockout tournament hosted by ${clubName}`,
         new Date(Date.now() + 45*86400000),
         new Date(Date.now() + 46*86400000),
         8, 500.00, ownerId]
      ).catch(async () => {
        // Try without some fields
        return client.query(
          `INSERT INTO tournaments (club_id, name, description, sport, start_date, end_date, status, created_by)
           VALUES ($1,$2,$3,'Football',$4,$5,'active',$6) RETURNING id`,
          [clubId, `${clubName} Summer Cup 2025`,
           `Annual knockout tournament`, new Date(Date.now() + 45*86400000),
           new Date(Date.now() + 46*86400000), ownerId]
        ).catch(() => null);
      });

      if (!tRes || !tRes.rows || tRes.rows.length === 0) {
        console.log("  ⚠️  Tournaments table not available, skipping.");
        return null;
      }

      const tournamentId = tRes.rows[0].id;

      // Add teams to tournament
      for (const t of teamIds.slice(0, 6)) {
        await client.query(
          `INSERT INTO tournament_teams (tournament_id, team_id, status) VALUES ($1,$2,'confirmed')`,
          [tournamentId, t.id]
        ).catch(() => {});
      }

      // Create some matches
      const matchPairs = [[0,1],[2,3],[4,5],[0,2],[1,3],[0,3]];
      for (const [i, [a, b]] of matchPairs.entries()) {
        if (!teamIds[a] || !teamIds[b]) continue;
        const matchDate = new Date(Date.now() + (45 + i) * 86400000);
        const played = i < 3;
        await client.query(
          `INSERT INTO tournament_matches (tournament_id, home_team_id, away_team_id, match_date, home_score, away_score, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [tournamentId, teamIds[a].id, teamIds[b].id, matchDate,
           played ? rand(0,4) : null, played ? rand(0,3) : null,
           played ? "completed" : "scheduled"]
        ).catch(() => {});
      }

      return tournamentId;
    };

    // ── HELPER: Create League ─────────────────────────────────────────────────
    const createLeague = async (clubId, clubName, teamIds) => {
      console.log(`  🏅 Creating League for ${clubName}...`);
      
      const lRes = await client.query(
        `INSERT INTO leagues (club_id, name, description, season, sport, status, created_by)
         VALUES ($1,$2,$3,'2024/25','Football','active',$4) RETURNING id`,
        [clubId, `${clubName} Internal League`, `Competitive internal league for ${clubName}`, ownerId]
      ).catch(() => null);

      if (!lRes || !lRes.rows || lRes.rows.length === 0) {
        console.log("  ⚠️  Leagues table not available, skipping.");
        return null;
      }

      const leagueId = lRes.rows[0].id;

      // Register teams
      for (const t of teamIds) {
        await client.query(
          `INSERT INTO league_teams (league_id, team_id, status) VALUES ($1,$2,'active')`,
          [leagueId, t.id]
        ).catch(() => {});
      }

      // Create standings
      for (const t of teamIds) {
        const played = rand(8, 22);
        const won = rand(2, played);
        const drawn = rand(0, played - won);
        const lost = played - won - drawn;
        await client.query(
          `INSERT INTO league_standings (league_id, team_id, played, won, drawn, lost, goals_for, goals_against, goal_difference, points)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [leagueId, t.id, played, won, drawn, lost,
           rand(won*2, won*4), rand(lost * 1, lost * 3 + 5),
           0, won * 3 + drawn]
        ).catch(() => {});
      }

      // Create league matches
      for (let i = 0; i < 10; i++) {
        const a = rand(0, teamIds.length - 1);
        let b = rand(0, teamIds.length - 1);
        while (b === a) b = rand(0, teamIds.length - 1);
        const matchDate = new Date(Date.now() + (rand(-60, 60)) * 86400000);
        const played = matchDate < new Date();
        await client.query(
          `INSERT INTO league_matches (league_id, home_team_id, away_team_id, match_date, home_score, away_score, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [leagueId, teamIds[a].id, teamIds[b].id, matchDate,
           played ? rand(0, 5) : null, played ? rand(0, 4) : null,
           played ? "completed" : "scheduled"]
        ).catch(() => {});
      }

      return leagueId;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // MAIN DATA CREATION
    // ─────────────────────────────────────────────────────────────────────────

    // ORG A: Elite Pro Academy (MAIN - fully populated)
    console.log("\n🏟️  Building Elite Pro Academy...");
    const orgA = await getOrCreateOrg("Elite Pro Academy", "elite-pro-academy", "Premier youth & adult football development", "Football", "club");

    await client.query(
      `INSERT INTO organization_members (user_id, organization_id, role, status)
       VALUES ($1,$2,'owner','active') ON CONFLICT (user_id, organization_id) DO UPDATE SET role='owner'`,
      [ownerId, orgA]
    );

    const teamsA = await createTeams(orgA, "Elite");
    await createEvents(orgA, "Elite Pro Academy");
    await createProducts(orgA, "Elite");
    await createPlans(orgA);
    await createStaff(orgA);
    await createListings(orgA, "Elite Pro Academy");

    // Create 35 players for Elite Pro
    console.log("  👥 Creating 35 players for Elite Pro Academy...");
    const elitePlayers = [];
    const namePool = [...FIRST_NAMES].slice(0, 35).map((fn, i) => ({ fn, ln: LAST_NAMES[i] }));

    for (let i = 0; i < namePool.length; i++) {
      const { fn, ln } = namePool[i];
      const { playerId } = await createPlayer(orgA, fn, ln, i);
      await createPlayerStats(playerId, orgA);
      await createPayments(playerId, orgA, rand(2, 6));
      // Assign to a team
      const team = teamsA[i % teamsA.length];
      await client.query(
        `INSERT INTO team_players (team_id, player_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [team.id, playerId]
      ).catch(() => {});
      elitePlayers.push(playerId);
    }

    // Tournament & League for Elite
    await createTournament(orgA, "Elite Pro Academy", teamsA);
    await createLeague(orgA, "Elite Pro Academy", teamsA);

    // ORG B: Sunday League FC
    console.log("\n⚽  Building Sunday League FC...");
    const orgB = await getOrCreateOrg("Sunday League FC", "sunday-league-fc", "Casual community football", "Football", "club");

    await client.query(
      `INSERT INTO organization_members (user_id, organization_id, role, status)
       VALUES ($1,$2,'owner','active') ON CONFLICT (user_id, organization_id) DO UPDATE SET role='owner'`,
      [ownerId, orgB]
    );

    const teamsB = await createTeams(orgB, "Sunday");
    await createEvents(orgB, "Sunday League FC");
    await createProducts(orgB, "Sunday");
    await createPlans(orgB);
    await createStaff(orgB);
    await createListings(orgB, "Sunday League FC");

    // Create 20 players for Sunday League
    console.log("  👥 Creating 20 players for Sunday League FC...");
    const sundayPlayers = [];
    const namePoolB = [...FIRST_NAMES].slice(5, 25).map((fn, i) => ({ fn, ln: LAST_NAMES[i + 10] }));
    for (let i = 0; i < namePoolB.length; i++) {
      const { fn, ln } = namePoolB[i];
      const { playerId } = await createPlayer(orgB, fn, ln, i + 100);
      await createPlayerStats(playerId, orgB);
      await createPayments(playerId, orgB, rand(1, 4));
      const team = teamsB[i % teamsB.length];
      await client.query(
        `INSERT INTO team_players (team_id, player_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [team.id, playerId]
      ).catch(() => {});
      sundayPlayers.push(playerId);
    }

    await createLeague(orgB, "Sunday League FC", teamsB);

    // ── MULTI-ROLE USER ───────────────────────────────────────────────────────
    console.log("\n👤 Creating multi-role demo user (multi@demo.com)...");
    const multiEmail = "multi@demo.com";
    let multiId;
    const mRes = await client.query("SELECT id FROM users WHERE email = $1", [multiEmail]);
    if (mRes.rows.length === 0) {
      const nu = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, account_type)
         VALUES ($1,$2,'Multi','User','adult') RETURNING id`,
        [multiEmail, HASH]
      );
      multiId = nu.rows[0].id;
    } else {
      multiId = mRes.rows[0].id;
    }
    // Coach in Elite Pro
    await client.query(
      `INSERT INTO staff (user_id, club_id, first_name, last_name, role, email)
       VALUES ($1,$2,'Multi','User','coach',$3) ON CONFLICT DO NOTHING`,
      [multiId, orgA, multiEmail]
    );
    await client.query(
      `INSERT INTO organization_members (user_id, organization_id, role, status)
       VALUES ($1,$2,'coach','active') ON CONFLICT (user_id, organization_id) DO UPDATE SET role='coach'`,
      [multiId, orgA]
    );
    // Player in Sunday League
    const mpRes = await client.query(
      `INSERT INTO players (user_id, club_id, first_name, last_name, email, position, payment_status, date_of_birth)
       VALUES ($1,$2,'Multi','User',$3,'Midfielder','paid','1993-06-15') RETURNING id`,
      [multiId, orgB, multiEmail]
    );
    await client.query(
      `INSERT INTO organization_members (user_id, organization_id, role, status)
       VALUES ($1,$2,'player','active') ON CONFLICT (user_id, organization_id) DO UPDATE SET role='player'`,
      [multiId, orgB]
    );
    await client.query(
      `INSERT INTO team_players (team_id, player_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [teamsB[5].id, mpRes.rows[0].id]
    ).catch(() => {});

    // ── DEMO ADMIN AS PLAYER ──────────────────────────────────────────────────
    console.log("👤 Adding Demo Admin as player in both clubs...");

    const adminPlayerA = await client.query(
      `INSERT INTO players (user_id, club_id, first_name, last_name, email, position, payment_status, date_of_birth, attendance_rate)
       VALUES ($1,$2,'Demo','Admin',$3,'Striker','paid','1990-01-01',92) RETURNING id`,
      [ownerId, orgA, ownerEmail]
    );
    await client.query(
      `INSERT INTO team_players (team_id, player_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [teamsA[5].id, adminPlayerA.rows[0].id]
    ).catch(() => {});
    await createPlayerStats(adminPlayerA.rows[0].id, orgA);
    await createPayments(adminPlayerA.rows[0].id, orgA, 6);

    const adminPlayerB = await client.query(
      `INSERT INTO players (user_id, club_id, first_name, last_name, email, position, payment_status, date_of_birth, attendance_rate)
       VALUES ($1,$2,'Demo','Admin',$3,'Goalkeeper','paid','1990-01-01',88) RETURNING id`,
      [ownerId, orgB, ownerEmail]
    );
    await client.query(
      `INSERT INTO team_players (team_id, player_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [teamsB[5].id, adminPlayerB.rows[0].id]
    ).catch(() => {});

    // ── CHILD PROFILES ────────────────────────────────────────────────────────
    console.log("👶 Adding child profiles...");

    const leoRes = await client.query(
      `INSERT INTO players (user_id, club_id, first_name, last_name, email, position, payment_status, date_of_birth, attendance_rate)
       VALUES ($1,$2,'Leo','Admin','leo@demo.com','Forward','paid','2012-05-15',85) RETURNING id`,
      [ownerId, orgA]
    );
    await client.query(
      `INSERT INTO team_players (team_id, player_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [teamsA[1].id, leoRes.rows[0].id]
    ).catch(() => {});
    await createPlayerStats(leoRes.rows[0].id, orgA);
    await createPayments(leoRes.rows[0].id, orgA, 5);

    const miaRes = await client.query(
      `INSERT INTO players (user_id, club_id, first_name, last_name, email, position, payment_status, date_of_birth, attendance_rate)
       VALUES ($1,$2,'Mia','Admin','mia@demo.com','Midfielder','paid','2014-08-20',90) RETURNING id`,
      [ownerId, orgB]
    );
    await client.query(
      `INSERT INTO team_players (team_id, player_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [teamsB[2].id, miaRes.rows[0].id]
    ).catch(() => {});
    await createPayments(miaRes.rows[0].id, orgB, 3);

    await client.query("COMMIT");

    console.log(`
╔══════════════════════════════════════════════════════╗
║           ✅  FULL DEMO SEED COMPLETE!               ║
╠══════════════════════════════════════════════════════╣
║  👤 Logins (password123):                            ║
║     demo-admin@clubhub.com  → Admin / Owner          ║
║     multi@demo.com          → Coach + Player         ║
║                                                      ║
║  🏟️  Orgs:                                           ║
║     • Elite Pro Academy  (35 players, full data)     ║
║     • Sunday League FC   (20 players)                ║
║                                                      ║
║  📊  Seeded:                                         ║
║     • 55+ Players with stats & payments              ║
║     • 7 Teams per club                               ║
║     • 12 Events per club                             ║
║     • Tournaments & Leagues with matches             ║
║     • 12 Products per club                           ║
║     • 6 Staff per club                               ║
║     • 5 Payment plans per club                       ║
║     • 6 Job listings per club                        ║
╚══════════════════════════════════════════════════════╝
    `);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ SEED FAILED:", err.message);
    console.error(err.stack);
  } finally {
    client.release();
    if (require.main === module) {
      pool.end();
      process.exit();
    }
  }
}

if (require.main === module) seedDemoFull();
module.exports = { seedDemoFull };
