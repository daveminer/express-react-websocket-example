# Database Migrations

This project now uses **db-migrate** for database schema management instead of plain SQL. This provides better version control, rollback capabilities, and team collaboration.

## What Changed

### Before (Plain SQL)
- Database tables were created using raw SQL in `database.ts`
- No version control for schema changes
- No rollback capabilities
- Manual schema management

### After (Migrations)
- Schema changes are tracked in migration files
- Version controlled database changes
- Easy rollback and forward migration
- Automated schema management

## Migration Files

- **`20241201000001-create-users-table.js`** - Creates the users table
- **`20241201000002-create-messages-table.js`** - Creates the messages table with foreign key to users

## Configuration

### `database.json`
Contains environment-specific database configurations:
- **`dev`** - Local development (localhost)
- **`docker`** - Docker environment (postgres container)
- **`prod`** - Production environment (environment variables)

## Available Commands

### NPM Scripts
```bash
# Run all pending migrations
npm run migrate

# Rollback the last migration
npm run migrate:down

# Create a new migration file
npm run migrate:create -- --name migration-name

# Reset database (rollback all migrations)
npm run migrate:reset
```

### Manual Commands
```bash
# Run migrations for specific environment
NODE_ENV=docker db-migrate up

# Check migration status
NODE_ENV=docker db-migrate status

# Rollback specific migration
NODE_ENV=docker db-migrate down
```

## How It Works

### 1. Automatic Migration on Startup
When the backend starts, it automatically:
- Checks for pending migrations
- Runs any new migrations
- Ensures database schema is up to date

### 2. Environment Detection
The system automatically detects the environment:
- **Docker**: When `DB_HOST=postgres`
- **Production**: When `NODE_ENV=production`
- **Development**: Default for local development

### 3. Migration Tracking
- Migrations are tracked in a `migrations` table
- Each migration has a unique timestamp
- Only unapplied migrations are run

## Creating New Migrations

### 1. Create Migration File
```bash
npm run migrate:create -- --name add-user-avatar
```

This creates a file like: `20241201120000-add-user-avatar.js`

### 2. Edit the Migration File
```javascript
exports.up = function(db) {
  return db.addColumn('users', 'avatar_url', {
    type: 'string',
    length: 255,
    notNull: false
  });
};

exports.down = function(db) {
  return db.removeColumn('users', 'avatar_url');
};
```

### 3. Run the Migration
```bash
npm run migrate
```

## Example Migration Types

### Add Column
```javascript
exports.up = function(db) {
  return db.addColumn('users', 'last_login', {
    type: 'timestamp',
    notNull: false
  });
};

exports.down = function(db) {
  return db.removeColumn('users', 'last_login');
};
```

### Create Index
```javascript
exports.up = function(db) {
  return db.addIndex('messages', 'idx_messages_created_at', ['created_at']);
};

exports.down = function(db) {
  return db.removeIndex('messages', 'idx_messages_created_at');
};
```

### Modify Column
```javascript
exports.up = function(db) {
  return db.changeColumn('users', 'username', {
    type: 'string',
    length: 100, // Changed from 50 to 100
    notNull: true
  });
};

exports.down = function(db) {
  return db.changeColumn('users', 'username', {
    type: 'string',
    length: 50, // Revert to original
    notNull: true
  });
};
```

## Best Practices

1. **Always write rollback logic** - Every `up` migration should have a corresponding `down`
2. **Test migrations** - Test both up and down migrations before deploying
3. **Use descriptive names** - Migration names should clearly describe what they do
4. **Don't edit existing migrations** - Create new migrations instead of modifying old ones
5. **Backup before major changes** - Always backup production data before running major migrations

## Troubleshooting

### Migration Fails
```bash
# Check migration status
npm run migrate:status

# Rollback problematic migration
npm run migrate:down

# Fix the migration file and try again
npm run migrate
```

### Reset Everything
```bash
# Nuclear option - removes all data and tables
npm run migrate:reset
```

## Docker Integration

When running in Docker, migrations are automatically handled:
1. Backend container starts
2. Connects to PostgreSQL
3. Runs any pending migrations
4. Starts the application

No manual intervention needed!
