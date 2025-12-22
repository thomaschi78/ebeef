/**
 * Health Check Endpoint Tests
 */

const request = require('supertest');

// Create a minimal express app for testing
const express = require('express');
const app = express();

// Mock health endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'test',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req, res) => {
  res.json({ ready: true });
});

app.get('/live', (req, res) => {
  res.json({ live: true });
});

describe('Health Check Endpoints', () => {
  describe('GET /health', () => {
    it('should return status ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.mode).toBe('test');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /ready', () => {
    it('should return ready true', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body.ready).toBe(true);
    });
  });

  describe('GET /live', () => {
    it('should return live true', async () => {
      const response = await request(app).get('/live');

      expect(response.status).toBe(200);
      expect(response.body.live).toBe(true);
    });
  });
});
