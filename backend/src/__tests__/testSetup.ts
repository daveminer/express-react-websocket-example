import { pool } from '../database';

/**
 * Setup test database by cleaning all tables
 */
export async function setupTestDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS boards (
        id SERIAL PRIMARY KEY,
        parent_id INTEGER REFERENCES boards(id) ON DELETE CASCADE,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Clean all data
    await client.query('TRUNCATE TABLE boards RESTART IDENTITY CASCADE');
    await client.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
  } finally {
    client.release();
  }
}

/**
 * Teardown test database
 */
export async function teardownTestDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('TRUNCATE TABLE boards RESTART IDENTITY CASCADE');
    await client.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
  } finally {
    client.release();
  }
}

/**
 * Create a test user
 */
export async function createTestUser(username: string = 'testuser', email: string = 'test@example.com'): Promise<number> {
  const result = await pool.query(
    'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id',
    [username, email]
  );
  return result.rows[0].id;
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  await pool.end();
}

