const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { withTransaction } = require("../config/database");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

function uuidv4() {
  return crypto.randomUUID();
}

async function seedMasterDemo() {
  console.log("🌱 STARTING MASSIVE MASTER DEMO SEEDING...");

  try {
    await withTransaction(async (client) => {
      // 1. Password Hash
      const hashedPass = await bcrypt.hash("Demo@123", 10);

      // --- 3. ORGANIZATIONS ---
      console.log("🏫 Creating 6 Organizations...");
      const orgIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4()];
      await client.query(`
                INSERT INTO organizations (id, name, slug, types, location, sport, is_active)
                VALUES 
                ($1, 'Elite Pro Academy', 'elite-pro', '{"academy"}', 'London, UK', 'Football', true),
                ($2, 'London United Sunday League', 'london-united', '{"league"}', 'London, UK', 'Football', true),
                ($3, 'St. Georges Park Venue', 'st-georges', '{"venue"}', 'Burton, UK', 'Football', true),
                ($4, 'Global Scouting Network', 'gsn', '{"scouting"}', 'Manchester, UK', 'Football', true),
                ($5, 'Premier Youth League', 'pyl', '{"league"}', 'Birmingham, UK', 'Football', true),
                ($6, 'Manchester Talent Hub', 'mth', '{"academy"}', 'Manchester, UK', 'Football', true)
                ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
            `, orgIds);
      
      const eliteAcademyId = orgIds[0];
      const sundayLeagueId = orgIds[1];
      const scoutingOrgId = orgIds[3];

      // --- 4. USERS ---
      console.log("👤 Creating 10+ Demo Users...");
      const usersData = [
        { email: 'admin@demo.com', role: 'admin', fname: 'Master', lname: 'Admin' },
        { email: 'scout@demo.com', role: 'scout', fname: 'Lead', lname: 'Scout' },
        { email: 'scout2@demo.com', role: 'scout', fname: 'Regional', lname: 'Scout' },
        { email: 'coach@demo.com', role: 'coach', fname: 'Elite', lname: 'Coach' },
        { email: 'coach2@demo.com', role: 'coach', fname: 'Academy', lname: 'Lead' },
        { email: 'parent@demo.com', role: 'player', fname: 'Supportive', lname: 'Parent' },
        { email: 'referee@demo.com', role: 'referee', fname: 'Senior', lname: 'Official' }
      ];

      const userMap = {};
      for (const u of usersData) {
        const res = await client.query(`
                    INSERT INTO users (email, password_hash, first_name, last_name, account_type, is_active, is_verified_scout)
                    VALUES ($1, $2, $3, $4, $5, true, $6)
                    ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name
                    RETURNING id
                `, [u.email, hashedPass, u.fname, u.lname, u.role, u.role === 'scout']);
        userMap[u.email] = res.rows[0].id;
      }

      // --- 6. TEAMS ---
      console.log("⚽ Creating 50 Teams...");
      const teamIds = [];
      const prefixes = ['London', 'Manchester', 'Midland', 'Southern', 'Northern', 'Elite', 'Premier', 'City'];
      const suffixes = ['Academy', 'United', 'Rovers', 'FC', 'Warriors', 'Stars', 'Blues', 'Reds'];
      
      for (let i = 0; i < 50; i++) {
          const name = `${prefixes[i % prefixes.length]} ${suffixes[i % suffixes.length]} ${i+1}`;
          const age = i < 15 ? 'U16' : (i < 30 ? 'U14' : 'U12');
          const res = await client.query(`
            INSERT INTO teams (id, name, age_group, club_id, coach_id, sport)
            VALUES ($1, $2, $3, $4, $5, 'Football')
            RETURNING id
          `, [uuidv4(), name, age, eliteAcademyId, i % 5 === 0 ? userMap['coach@demo.com'] : userMap['coach2@demo.com']]);
          teamIds.push(res.rows[0].id);
      }

      // --- 7. PLAYERS ---
      console.log("🏃 Seeding 100+ Players...");
      const positions = ['GK', 'CB', 'LB', 'RB', 'CM', 'LW', 'RW', 'ST', 'DM', 'AM'];
      for (let i = 1; i <= 120; i++) {
        const fname = `Player_${i}`;
        const lname = `Talent_${i}`;
        const pos = positions[i % positions.length];
        const teamId = teamIds[i % teamIds.length];
        
        await client.query(`
                    INSERT INTO players (
                        first_name, last_name, email, date_of_birth, position, team_id, club_id, 
                        medical_info, emergency_contact, parent_id
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    fname, lname, `player${i}@demo.com`, 
                    '2009-06-15', pos, teamId, eliteAcademyId,
                    JSON.stringify({ allergies: i % 10 === 0 ? 'Polen' : 'None', asthma: i % 5 === 0 }),
                    JSON.stringify({ name: 'Emergency Contact', phone: '07700 900' + (100+i) }),
                    userMap['parent@demo.com']
                ]);
      }

      // --- 8. SCOUT WATCHLIST & REPORTS ---
      console.log("🔍 Creating Loads of Scouting Data...");
      const playersRes = await client.query("SELECT id FROM players LIMIT 40");
      const playerIds = playersRes.rows.map(r => r.id);

      for (const pid of playerIds) {
        await client.query(`
                    INSERT INTO scout_watchlist (scout_id, player_id, rating, notes)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT DO NOTHING
                `, [userMap['scout@demo.com'], pid, (pid.length % 5) + 1, 'Top prospect from periodic assessment.']);
        
        await client.query(`
                    INSERT INTO scout_reports (scout_id, player_id, report_type, data)
                    VALUES ($1, $2, 'player', $3)
                `, [userMap['scout@demo.com'], pid, JSON.stringify({ 
                    technical: (pid.length % 5) + 1, 
                    tactical: (pid.length % 4) + 1, 
                    mental: 5, 
                    physical: 4,
                    pace: 88,
                    dribbling: 75
                })]);
      }

      // --- 9. TOURNAMENTS & MATCHES ---
      console.log("🏆 Creating 6 Tournaments...");
      const tourTitles = [
          'Elite Pro Spring Cup', 'Summer Nations Trophy', 'Youth League Challenge',
          'FA Grassroots Shield', 'Manchester Invitational', 'Winter Solidarity cup'
      ];
      
      for (let t = 0; t < 6; t++) {
          const status = t === 0 ? 'active' : (t < 3 ? 'upcoming' : 'completed');
          const tournamentRes = await client.query(`
            INSERT INTO events (title, event_type, event_date, event_time, club_id, status, created_by)
            VALUES ($1, 'tournament', CURRENT_DATE + $2, '10:00', $3, $4, $5)
            RETURNING id
          `, [tourTitles[t], (t-2) * 15, eliteAcademyId, status, userMap['admin@demo.com']]);
          const tournamentId = tournamentRes.rows[0].id;

          // Pitches
          const pitchIds = [];
          for (let p = 1; p <= 4; p++) {
              const res = await client.query(`
                INSERT INTO tournament_pitches (event_id, name, pitch_type, pitch_size)
                VALUES ($1, $2, '4G', '9v9')
                RETURNING id
              `, [tournamentId, `Pitch ${p}`]);
              pitchIds.push(res.rows[0].id);
          }

          // Register 12 teams for each tournament
          const tournamentTeamIds = [];
          for (let i = 0; i < 12; i++) {
              const teamIdx = (t * 12 + i) % teamIds.length;
              const res = await client.query(`
                INSERT INTO tournament_teams (event_id, team_name, internal_team_id, status)
                VALUES ($1, $2, $3, 'approved')
                RETURNING id
              `, [tournamentId, `Team ${t*12+i}`, teamIds[teamIdx]]);
              tournamentTeamIds.push(res.rows[0].id);
          }

          // Stages and Matches
          const stageRes = await client.query(`
            INSERT INTO tournament_stages (event_id, name, type, sequence)
            VALUES ($1, 'Group Stage', 'league', 1)
            RETURNING id
          `, [tournamentId]);
          const stageId = stageRes.rows[0].id;

          // Add 5 matches for each tournament
          for (let m = 0; m < 5; m++) {
              await client.query(`
                INSERT INTO tournament_matches (event_id, stage_id, home_team_id, away_team_id, round_number, match_number, pitch_id, status, home_score, away_score)
                VALUES ($1, $2, $3, $4, 1, $5, $6, $7, $8, $9)
              `, [
                  tournamentId, stageId, 
                  tournamentTeamIds[m % 6], tournamentTeamIds[(m + 1) % 6],
                  m + 1, pitchIds[m % pitchIds.length],
                  status === 'completed' ? 'completed' : 'scheduled',
                  status === 'completed' ? Math.floor(Math.random() * 5) : null,
                  status === 'completed' ? Math.floor(Math.random() * 5) : null
              ]);
          }
      }

      // --- 10. TACTICS ---
      console.log("📋 Creating Tactical Formations for all coaches...");
      const formations = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '4-1-4-1'];
      const coaches = [userMap['coach@demo.com'], userMap['coach2@demo.com']];
      
      for (const coach of coaches) {
          for (let f = 0; f < 3; f++) {
              await client.query(`
                INSERT INTO tactical_formations (organization_id, team_id, coach_id, name, formation, lineup, is_default)
                VALUES ($1, $2, $3, $4, $5, '{}', $6)
              `, [
                  eliteAcademyId, 
                  teamIds[Math.floor(Math.random() * teamIds.length)], 
                  coach, 
                  `Coach Selection ${f+1}`, 
                  formations[f % formations.length], 
                  f === 0
              ]);
          }
      }

      console.log("✅ MASSIVE MASTER DEMO SEEDING COMPLETED SUCCESSFULLY!");
    });
  } catch (err) {
    console.error("❌ MASTER DEMO SEEDING FAILED:", err);
    throw err;
  }
}

if (require.main === module) {
  seedMasterDemo()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedMasterDemo };
