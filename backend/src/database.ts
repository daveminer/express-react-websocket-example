import { Pool, PoolClient } from 'pg';
import { runMigrations, checkMigrationsStatus } from './migrations';



// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'board_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create a connection pool
export const pool = new Pool(dbConfig);

// Test database connection with retry logic
export async function testConnection(maxRetries: number = 10): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let client: PoolClient | null = null;
        try {
            console.log(`Database connection attempt ${attempt}/${maxRetries}...`);
            client = await pool.connect();
            const result = await client.query('SELECT NOW()');
            console.log('Database connected successfully:', result.rows[0]);
            return true;
        } catch (error) {
            console.error(`Database connection attempt ${attempt} failed:`, error);
            if (attempt === maxRetries) {
                console.error('All database connection attempts failed');
                return false;
            }
            // Wait 2 seconds before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
        } finally {
            if (client) {
                client.release();
            }
        }
    }
    return false;
}

// Initialize database by creating tables directly
export async function initializeDatabase(): Promise<void> {
    try {
        console.log('Initializing database tables...');

        const client = await pool.connect();

        try {
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

            console.log('Database tables initialized successfully');
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}

// Graceful shutdown
export async function closePool(): Promise<void> {
    await pool.end();
}
