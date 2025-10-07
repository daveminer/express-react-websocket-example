import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface MigrationResult {
    success: boolean;
    output: string;
    error?: string;
}

/**
 * Run database migrations
 */
export async function runMigrations(environment: string = 'docker'): Promise<MigrationResult> {
    try {
        console.log(`Running migrations for environment: ${environment}`);

        // Set the environment variable for db-migrate
        process.env.NODE_ENV = environment;

        const { stdout, stderr } = await execAsync('npm run migrate', {
            cwd: process.cwd(),
            env: {
                ...process.env,
                NODE_ENV: environment,
                // Ensure db-migrate uses the same DB connection as the app
                DB_HOST: process.env.DB_HOST || 'postgres',
                DB_PORT: process.env.DB_PORT || '5432',
                DB_NAME: process.env.DB_NAME || 'board_app',
                DB_USER: process.env.DB_USER || 'postgres',
                DB_PASSWORD: process.env.DB_PASSWORD || 'postgres'
            }
        });

        console.log('Migration output:', stdout);
        if (stderr) {
            console.warn('Migration warnings:', stderr);
        }

        return {
            success: true,
            output: stdout
        };
    } catch (error) {
        console.error('Migration failed:', error);
        return {
            success: false,
            output: '',
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Check if migrations are needed - simplified approach
 */
export async function checkMigrationsStatus(environment: string = 'docker'): Promise<boolean> {
    // Always return true to run migrations - they'll only run if needed
    // This avoids connection issues with db-migrate check
    return true;
}

/**
 * Rollback the last migration
 */
export async function rollbackMigration(environment: string = 'docker'): Promise<MigrationResult> {
    try {
        console.log(`Rolling back migration for environment: ${environment}`);

        process.env.NODE_ENV = environment;

        const { stdout, stderr } = await execAsync('npm run migrate:down', {
            cwd: process.cwd(),
            env: { ...process.env, NODE_ENV: environment }
        });

        console.log('Rollback output:', stdout);
        if (stderr) {
            console.warn('Rollback warnings:', stderr);
        }

        return {
            success: true,
            output: stdout
        };
    } catch (error) {
        console.error('Rollback failed:', error);
        return {
            success: false,
            output: '',
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
