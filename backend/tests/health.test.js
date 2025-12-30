const request = require('supertest');
const app = require('../server');

// Mock the database queries
jest.mock('../config/database', () => ({
  query: jest.fn(),
  pool: {
    end: jest.fn()
  },
  connectDB: jest.fn().mockResolvedValue(true)
}));

describe('Health Endpoints', () => {
  test('GET /health should return 200 OK', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });

  test('GET /api/health should return 200 healthy', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });
});
