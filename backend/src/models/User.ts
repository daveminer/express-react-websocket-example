import { pool } from '../database';

export interface User {
    id: number;
    username: string;
    email: string;
    created_at: Date;
    updated_at: Date;
}

export interface CreateUserData {
    username: string;
    email: string;
}

export class UserModel {
    // Create a new user
    static async create(userData: CreateUserData): Promise<User> {
        const client = await pool.connect();
        try {
            const result = await client.query(
                'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
                [userData.username, userData.email]
            );
            return result.rows[0];
        } finally {
            client.release();
        }
    }

    // Get user by ID
    static async findById(id: number): Promise<User | null> {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    // Get user by username
    static async findByUsername(username: string): Promise<User | null> {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    // Get all users
    static async findAll(): Promise<User[]> {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT * FROM users ORDER BY created_at DESC');
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Update user
    static async update(id: number, userData: Partial<CreateUserData>): Promise<User | null> {
        const client = await pool.connect();
        try {
            const setClause = Object.keys(userData)
                .map((key, index) => `${key} = $${index + 2}`)
                .join(', ');

            const values = [id, ...Object.values(userData)];

            const result = await client.query(
                `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
                values
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    }

    // Delete user
    static async delete(id: number): Promise<boolean> {
        const client = await pool.connect();
        try {
            const result = await client.query('DELETE FROM users WHERE id = $1', [id]);
            return result.rowCount ? result.rowCount > 0 : false;
        } finally {
            client.release();
        }
    }
}
