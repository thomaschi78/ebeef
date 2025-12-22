/**
 * Prisma Client Singleton
 * Ensures only one instance of PrismaClient is created
 * Configured with connection pooling for production
 */

const { PrismaClient } = require('../generated/prisma');

// For Prisma 7+, we need to use adapter or accelerateUrl
// Using pg adapter for direct PostgreSQL connection
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Connection pool configuration
// In production, tune these based on your database and server capacity
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Maximum number of connections in the pool
  max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
  // Minimum number of connections to keep open
  min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
  // Connection idle timeout in milliseconds
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 30000,
  // Connection timeout in milliseconds
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT, 10) || 5000,
};

const pool = new Pool(poolConfig);

// Log pool errors
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  await pool.end();
});

module.exports = prisma;
