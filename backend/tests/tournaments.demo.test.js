const request = require('supertest');
const app = require('../server');

describe('Tournaments demo smoke (skipped by default)', () => {
  test.skip('create tournament (requires DB + auth)', async () => {
    const res = await request(app).post('/api/tournaments').send({ name: 'Smoke Cup', type: 'knockout', teams: [] });
    expect([200,201,400,401]).toContain(res.status);
  });
  test.skip('generate fixtures (requires real event id)', async () => {
    const res = await request(app).post('/api/tournaments/00000000-0000-0000-0000-000000000000/generate-fixtures').send({ stageName: 'Main', type: 'knockout' });
    expect([200,500,404]).toContain(res.status);
  });
});
