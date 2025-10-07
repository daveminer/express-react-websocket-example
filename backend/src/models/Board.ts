import { pool } from '../database';

export interface Board {
    id: number;
    parent_id: number | null;
    title: string;
    description: string | null;
    created_by: number | null;
    created_at: Date;
    updated_at: Date;
}

export interface CreateBoardData {
    parent_id?: number | null;
    title: string;
    description?: string;
    created_by?: number;
}

export interface UpdateBoardData {
    parent_id?: number | null;
    title?: string;
    description?: string;
}

export class BoardModel {
    /**
     * Find all boards
     */
    static async findAll(): Promise<Board[]> {
        const result = await pool.query(`
            SELECT b.*, u.username as created_by_username
            FROM boards b
            LEFT JOIN users u ON b.created_by = u.id
            ORDER BY b.created_at DESC
        `);
        return result.rows;
    }

    /**
     * Find board by ID
     */
    static async findById(id: number): Promise<Board | null> {
        const result = await pool.query(`
      SELECT b.*, u.username as created_by_username
      FROM boards b
      LEFT JOIN users u ON b.created_by = u.id
      WHERE b.id = $1
    `, [id]);

        return result.rows[0] || null;
    }

    /**
     * Find boards by parent ID (for hierarchical structure)
     */
    static async findByParentId(parentId: number | null): Promise<Board[]> {
        let query: string;
        let params: any[];

        if (parentId === null) {
            query = `
                SELECT b.*, u.username as created_by_username
                FROM boards b
                LEFT JOIN users u ON b.created_by = u.id
                WHERE b.parent_id IS NULL
                ORDER BY b.created_at DESC
            `;
            params = [];
        } else {
            query = `
                SELECT b.*, u.username as created_by_username
                FROM boards b
                LEFT JOIN users u ON b.created_by = u.id
                WHERE b.parent_id = $1
                ORDER BY b.created_at DESC
            `;
            params = [parentId];
        }

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Find root boards (no parent)
     */
    static async findRootBoards(): Promise<Board[]> {
        return this.findByParentId(null);
    }

    /**
     * Create a new board
     */
    static async create(data: CreateBoardData): Promise<Board> {
        const { parent_id, title, description, created_by } = data;

        const result = await pool.query(`
      INSERT INTO boards (parent_id, title, description, created_by, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *
    `, [parent_id || null, title, description || null, created_by || null]);

        return result.rows[0];
    }

    /**
     * Update a board
     */
    static async update(id: number, data: UpdateBoardData): Promise<Board | null> {
        const { parent_id, title, description } = data;

        const result = await pool.query(`
      UPDATE boards 
      SET 
        parent_id = COALESCE($2, parent_id),
        title = COALESCE($3, title),
        description = COALESCE($4, description),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, parent_id, title, description]);

        return result.rows[0] || null;
    }

    /**
     * Delete a board
     */
    static async delete(id: number): Promise<boolean> {
        const result = await pool.query('DELETE FROM boards WHERE id = $1', [id]);
        return result.rowCount ? result.rowCount > 0 : false;
    }

    /**
     * Get board hierarchy (parent and all children)
     */
    static async getHierarchy(boardId: number): Promise<Board[]> {
        const result = await pool.query(`
      WITH RECURSIVE board_hierarchy AS (
        -- Base case: the board itself
        SELECT b.*, u.username as created_by_username, 0 as level
        FROM boards b
        LEFT JOIN users u ON b.created_by = u.id
        WHERE b.id = $1
        
        UNION ALL
        
        -- Recursive case: child boards
        SELECT b.*, u.username as created_by_username, bh.level + 1
        FROM boards b
        LEFT JOIN users u ON b.created_by = u.id
        INNER JOIN board_hierarchy bh ON b.parent_id = bh.id
      )
      SELECT * FROM board_hierarchy ORDER BY level, created_at
    `, [boardId]);

        return result.rows;
    }

    /**
     * Get a board's depth in the hierarchy
     */
    static async getDepth(boardId: number): Promise<number> {
        const result = await pool.query(`
             WITH RECURSIVE depth_calc AS (
                 -- Base case: start from the target board
                 SELECT id, parent_id, 0 as depth
                 FROM boards
                 WHERE id = $1
                 
                 UNION ALL
                 
                 -- Recursive case: go up to parent
                 SELECT b.id, b.parent_id, dc.depth + 1
                 FROM boards b
                 INNER JOIN depth_calc dc ON b.id = dc.parent_id
             )
             SELECT MAX(depth) as depth
             FROM depth_calc
         `, [boardId]);

        return result.rows[0]?.depth || 0;
    }

    /**
     * Get board statistics
     */
    static async getStats(boardId: number): Promise<{
        total_children: number;
        direct_children: number;
    }> {
        const result = await pool.query(`
            WITH RECURSIVE children_count AS (
                SELECT id, 0 as level
                FROM boards
                WHERE id = $1
                
                UNION ALL
                
                SELECT b.id, cc.level + 1
                FROM boards b
                INNER JOIN children_count cc ON b.parent_id = cc.id
            ),
            direct_children AS (
                SELECT COUNT(*) as count
                FROM boards
                WHERE parent_id = $1
            )
            SELECT 
                (SELECT COUNT(*) FROM children_count WHERE level > 0) as total_children,
                (SELECT count FROM direct_children) as direct_children
        `, [boardId]);

        return result.rows[0];
    }
}
