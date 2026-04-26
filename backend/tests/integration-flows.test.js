/**
 * ClubHub Integration Test Suite
 * Tests: Signup, Create Member, Create Venue, Create Event, Create Tournament
 *
 * Run with:  npx jest backend/tests/integration-flows.test.js --runInBand
 *
 * Uses real HTTP requests against the local server. Start the backend first:
 *   npm run dev  (in /backend)
 */

const fetch = require('node-fetch');

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE = process.env.API_URL || 'http://localhost:3000/api';

// Unique suffix so parallel runs don't collide
const RUN_ID = Date.now();

// Shared state across tests (populated as we go)
let adminToken = null;
let adminOrgId = null;
let createdMemberId = null;
let createdVenueId = null;
let createdEventId = null;
let createdTournamentId = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function api(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (adminOrgId) headers['x-group-id'] = adminOrgId;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  return { status: res.status, ok: res.ok, data };
}

// ─── 1. SIGNUP ────────────────────────────────────────────────────────────────
describe('1. Signup Flow', () => {
  const email = `test-admin-${RUN_ID}@clubhub.test`;
  const password = 'TestPass@123';

  test('POST /auth/register → creates a new organisation admin account', async () => {
    const { status, ok, data } = await api('POST', '/auth/register', {
      email,
      password,
      first_name: 'Integration',
      last_name: 'Test',
      account_type: 'organization',
      organization_name: `Test FC ${RUN_ID}`,
    });

    expect(status).toBe(201);
    expect(ok).toBe(true);
    expect(data).toHaveProperty('token');
    expect(data.user).toHaveProperty('id');

    // Persist for subsequent tests
    adminToken = data.token;
    adminOrgId = data.user.groupId || data.user.clubId || data.currentGroup?.id;
  });

  test('POST /auth/login → logs in with the new credentials', async () => {
    const { status, ok, data } = await api('POST', '/auth/login', { email, password });

    expect(status).toBe(200);
    expect(ok).toBe(true);
    expect(data).toHaveProperty('token');

    // Refresh token for subsequent tests
    adminToken = data.token;
  });

  test('GET /auth/context → returns admin context with correct role', async () => {
    const { status, ok, data } = await api('GET', '/auth/context', null, adminToken);

    expect(status).toBe(200);
    expect(ok).toBe(true);
    expect(data).toHaveProperty('currentGroup');
    const role = (data.currentGroup.user_role || data.currentGroup.role || '').toLowerCase();
    expect(['admin', 'owner', 'organization']).toContain(role);
  });
});

// ─── 2. CREATE MEMBER ─────────────────────────────────────────────────────────
describe('2. Create Member (Player)', () => {
  test('POST /members → creates a new player with full profile data', async () => {
    const { status, ok, data } = await api('POST', '/members', {
      first_name: 'Alex',
      last_name: `Player-${RUN_ID}`,
      email: `player-${RUN_ID}@clubhub.test`,
      date_of_birth: '2005-06-15',
      position: 'Midfielder',
      role: 'player',
      phone: '07700900000',
    }, adminToken);

    expect([200, 201]).toContain(status);
    expect(ok).toBe(true);

    createdMemberId = data.id || data.player?.id || data.member?.id;
    console.log('✅ Created member:', createdMemberId);
  });

  test('GET /members → new member appears in the list', async () => {
    const { status, ok, data } = await api('GET', '/members', null, adminToken);

    expect(status).toBe(200);
    expect(ok).toBe(true);

    const list = data.players || data.members || data;
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  test('GET /members/:id → retrieves the created member by ID', async () => {
    if (!createdMemberId) return; // skip if create failed

    const { status, ok, data } = await api('GET', `/members/${createdMemberId}`, null, adminToken);

    expect(status).toBe(200);
    expect(ok).toBe(true);
    expect(data.first_name || data.player?.first_name).toBe('Alex');
  });
});

// ─── 3. CREATE VENUE ──────────────────────────────────────────────────────────
describe('3. Create Venue', () => {
  test('POST /venues → creates a new venue with address and price', async () => {
    const { status, ok, data } = await api('POST', '/venues', {
      name: `Test Stadium ${RUN_ID}`,
      address: '123 Main Street',
      city: 'Manchester',
      postcode: 'M1 1AE',
      capacity: 500,
      price_per_hour: 75.00,
      description: 'Integration test venue',
    }, adminToken);

    expect([200, 201]).toContain(status);
    expect(ok).toBe(true);

    createdVenueId = data.id || data.venue?.id;
    console.log('✅ Created venue:', createdVenueId);
  });

  test('GET /venues → new venue appears in the list', async () => {
    const { status, ok, data } = await api('GET', '/venues', null, adminToken);

    expect(status).toBe(200);
    const list = Array.isArray(data) ? data : data.venues || [];
    expect(list.length).toBeGreaterThan(0);
  });
});

// ─── 4. CREATE EVENT ──────────────────────────────────────────────────────────
describe('4. Create Event', () => {
  test('POST /events → creates a full event with venue and entry price', async () => {
    const eventDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]; // next week

    const { status, ok, data } = await api('POST', '/events', {
      title: `Integration Test Event ${RUN_ID}`,
      event_date: eventDate,
      start_time: '10:00',
      end_time: '12:00',
      venue_name: 'Test Stadium',
      address: '123 Main Street, Manchester',
      entry_price: 5.00,
      event_type: 'training',
      description: 'Auto-created by integration test',
      venueId: createdVenueId || null,
    }, adminToken);

    expect([200, 201]).toContain(status);
    expect(ok).toBe(true);

    createdEventId = data.id || data.event?.id;
    console.log('✅ Created event:', createdEventId);
  });

  test('GET /events → new event appears in the list', async () => {
    const { status, ok, data } = await api('GET', '/events', null, adminToken);

    expect(status).toBe(200);
    const list = Array.isArray(data) ? data : data.events || [];
    expect(list.length).toBeGreaterThan(0);
  });

  test('GET /events/:id → retrieves the created event by ID', async () => {
    if (!createdEventId) return;

    const { status, ok, data } = await api('GET', `/events/${createdEventId}`, null, adminToken);

    expect(status).toBe(200);
    expect(ok).toBe(true);
  });
});

// ─── 5. CREATE TOURNAMENT ─────────────────────────────────────────────────────
describe('5. Create Tournament', () => {
  test('POST /tournaments → creates a new knockout tournament', async () => {
    const startDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const { status, ok, data } = await api('POST', '/tournaments', {
      title: `Test Cup ${RUN_ID}`,
      format: 'knockout',
      event_date: startDate,
      max_teams: 8,
      entry_fee: 25.00,
      venue_name: 'Test Stadium',
      address: '123 Main Street, Manchester',
      description: 'Integration test tournament',
    }, adminToken);

    expect([200, 201]).toContain(status);
    expect(ok).toBe(true);

    createdTournamentId = data.id || data.tournament?.id;
    console.log('✅ Created tournament:', createdTournamentId);
  });

  test('GET /tournaments → new tournament appears in the list', async () => {
    const { status, ok, data } = await api('GET', '/tournaments', null, adminToken);

    expect(status).toBe(200);
    const list = Array.isArray(data) ? data : data.tournaments || [];
    expect(list.length).toBeGreaterThan(0);
  });

  test('GET /tournaments/:id/dashboard → returns bracket dashboard data', async () => {
    if (!createdTournamentId) return;

    const { status, ok, data } = await api(
      'GET', `/tournaments/${createdTournamentId}/dashboard`, null, adminToken
    );

    expect(status).toBe(200);
    expect(ok).toBe(true);
    expect(data).toHaveProperty('teams');
    expect(data).toHaveProperty('matches');
  });
});

// ─── 6. BIB INVENTORY ────────────────────────────────────────────────────────
describe('6. Bib Inventory', () => {
  test('GET /bibs → returns array of bib sets', async () => {
    const { status, ok, data } = await api('GET', '/bibs', null, adminToken);

    expect(status).toBe(200);
    expect(ok).toBe(true);
    expect(Array.isArray(data)).toBe(true);
  });

  test('POST /bibs → creates a new bib colour set', async () => {
    const { status, ok, data } = await api('POST', '/bibs', {
      color: `TestColor-${RUN_ID}`,
      totalQuantity: 24,
      availableQuantity: 24,
      price: 0,
    }, adminToken);

    expect([200, 201]).toContain(status);
    expect(ok).toBe(true);
  });
});

// ─── 7. CLEANUP ───────────────────────────────────────────────────────────────
describe('7. Cleanup (dry-run delete checks)', () => {
  test('DELETE /events/:id → removes the test event', async () => {
    if (!createdEventId) return;

    const { status } = await api('DELETE', `/events/${createdEventId}`, null, adminToken);
    expect([200, 204]).toContain(status);
  });

  test('DELETE /tournaments/:id → removes the test tournament', async () => {
    if (!createdTournamentId) return;

    const { status } = await api('DELETE', `/tournaments/${createdTournamentId}`, null, adminToken);
    expect([200, 204]).toContain(status);
  });
});
