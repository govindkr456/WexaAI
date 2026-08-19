const neo4j = require('neo4j-driver');
require('dotenv').config();

const { DB_URI, DB_USER, DB_PASSWORD } = process.env;

if (!DB_URI || !DB_USER || !DB_PASSWORD) {
  console.error('Missing DB_URI, DB_USER, or DB_PASSWORD in environment. Check your .env file.');
} else console.log('Database connection environment variables loaded successfully.');

const driver = neo4j.driver(
  DB_URI,
  neo4j.auth.basic(DB_USER, DB_PASSWORD),
  { disableLosslessIntegers: true }
);

// Verify connectivity at startup so failures are visible immediately, not on first request.
async function verifyConnection() {
  try {
    await driver.verifyConnectivity();
    console.log('Connected to graph database.');
    return true;
  } catch (err) {
    console.error('Could not connect to graph database:', err.message);
    return false;
  }
}

// Helper to run a single Cypher query in its own session, always closing the session.
// Use for all route handlers instead of managing sessions manually everywhere.
async function runQuery(cypher, params = {}) {
  const session = driver.session();
  try {
    const result = await session.run(cypher, params);
    return result.records;
  } finally {
    await session.close();
  }
}

module.exports = { driver, verifyConnection, runQuery };
