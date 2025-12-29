const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../index'); // Adjust path as needed
const { expect } = chai;

chai.use(chaiHttp);

describe('Cart API Tests', () => {
  let agent;
  let sessionId;

  beforeEach(() => {
    agent = chai.request.agent(app);
  });

  describe('GET /api/cart', () => {
    it('should return empty cart for new session', async () => {
      const res = await agent.get('/api/cart');

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body.cart).to.have.property('items').that.is.an('array').with.length(0);
      expect(res.body.cart).to.have.property('totalItems', 0);
      expect(res.body.cart).to.have.property('totalPrice', 0);
    });
  });

  describe('POST /api/cart/items', () => {
    it('should validate required fields', async () => {
      const res = await agent
        .post('/api/cart/items')
        .send({});

      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
      expect(res.body).to.have.property('message');
      expect(res.body).to.have.property('errors').that.is.an('array');
    });

    it('should validate quantity limits', async () => {
      const res = await agent
        .post('/api/cart/items')
        .send({
          product: '507f1f77bcf86cd799439011',
          variant: '507f1f77bcf86cd799439012',
          size: 'M',
          quantity: 150 // Exceeds max limit
        });

      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });

    it('should validate MongoDB ObjectId format', async () => {
      const res = await agent
        .post('/api/cart/items')
        .send({
          product: 'invalid-id',
          variant: '507f1f77bcf86cd799439012',
          size: 'M',
          quantity: 1
        });

      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async function() {
      this.timeout(10000); // Increase timeout for rate limit test

      // Make multiple requests quickly
      const promises = [];
      for (let i = 0; i < 35; i++) {
        promises.push(
          agent.post('/api/cart/items').send({
            product: '507f1f77bcf86cd799439011',
            variant: '507f1f77bcf86cd799439012',
            size: 'M',
            quantity: 1
          })
        );
      }

      const results = await Promise.allSettled(promises);
      const rejectedCount = results.filter(r => r.status === 'rejected' || r.value.status === 429).length;

      expect(rejectedCount).to.be.greaterThan(0);
    });
  });

  // Add more comprehensive tests as needed
  describe('Error Handling', () => {
    it('should handle non-existent products gracefully', async () => {
      const res = await agent
        .post('/api/cart/items')
        .send({
          product: '507f1f77bcf86cd799439011', // Non-existent ID
          variant: '507f1f77bcf86cd799439012',
          size: 'M',
          quantity: 1
        });

      expect(res).to.have.status(404);
      expect(res.body).to.have.property('success', false);
    });
  });
});
