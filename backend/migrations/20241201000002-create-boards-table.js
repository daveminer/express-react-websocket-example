'use strict';

var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
    dbm = options.dbmigrate;
    type = dbm.dataType;
    seed = seedLink;
};

exports.up = async function (db) {
    const sql = `
  -- Extensions
  CREATE EXTENSION IF NOT EXISTS ltree;
  CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- for gen_random_uuid()

  -- Table
  CREATE TABLE boards (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id   UUID NULL REFERENCES boards(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,

    -- Safe segment for ltree: 'n' + uuid without hyphens (letters+digits only)
    label       TEXT GENERATED ALWAYS AS ('n' || replace(id::text, '-', '')) STORED,

    path        LTREE NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Depth guard: change 30 -> 10 if you want the challenge’s base limit
    CHECK (nlevel(path) <= 30)
  );

  -- Indexes for path queries
  CREATE INDEX boards_path_gist_idx  ON boards USING GIST (path);
  CREATE INDEX boards_parent_idx     ON boards (parent_id);

  -- Keep updated_at fresh
  CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS trigger AS $$
  BEGIN
    NEW.updated_at := now();
    RETURN NEW;
  END
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER boards_set_updated_at
  BEFORE UPDATE ON boards
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

  -- Compute path on INSERT (root or child). We do NOT update subtree here.
  CREATE OR REPLACE FUNCTION boards_set_path_on_insert() RETURNS trigger AS $$
  DECLARE
    parent_path ltree;
  BEGIN
    IF NEW.parent_id IS NULL THEN
      NEW.path := text2ltree(NEW.label);
    ELSE
      SELECT path INTO parent_path
      FROM boards
      WHERE id = NEW.parent_id
      FOR UPDATE;

      IF parent_path IS NULL THEN
        RAISE EXCEPTION 'Parent % not found', NEW.parent_id;
      END IF;

      NEW.path := parent_path || text2ltree(NEW.label);
    END IF;

    IF nlevel(NEW.path) > 30 THEN
      RAISE EXCEPTION 'Max depth (30) exceeded';
    END IF;

    RETURN NEW;
  END
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER boards_set_path_before_insert
  BEFORE INSERT ON boards
  FOR EACH ROW EXECUTE FUNCTION boards_set_path_on_insert();

  -- Forbid direct parent_id updates; moves must go through move_board().
  CREATE OR REPLACE FUNCTION forbid_parent_update() RETURNS trigger AS $$
  BEGIN
    IF NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
      RAISE EXCEPTION 'Update parent via move_board(x_id, new_parent_id)';
    END IF;
    RETURN NEW;
  END
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER boards_forbid_parent_update
  BEFORE UPDATE OF parent_id ON boards
  FOR EACH ROW EXECUTE FUNCTION forbid_parent_update();

  -- Move function: atomic, checks cycles and max-depth, updates subtree paths.
  CREATE OR REPLACE FUNCTION move_board(x_id UUID, new_parent_id UUID) RETURNS VOID AS $$
  DECLARE
    x_path   ltree;
    x_n      int;
    p_path   ltree;
    p_n      int;
    max_new_depth int;
  BEGIN
    IF x_id IS NULL OR new_parent_id IS NULL THEN
      RAISE EXCEPTION 'move_board requires x_id and new_parent_id';
    END IF;
    IF x_id = new_parent_id THEN
      RAISE EXCEPTION 'Cannot move a node under itself';
    END IF;

    -- Lock the moving root and the new parent
    SELECT path, nlevel(path) INTO x_path, x_n FROM boards WHERE id = x_id FOR UPDATE;
    IF x_path IS NULL THEN RAISE EXCEPTION 'Node % not found', x_id; END IF;

    SELECT path, nlevel(path) INTO p_path, p_n FROM boards WHERE id = new_parent_id FOR UPDATE;
    IF p_path IS NULL THEN RAISE EXCEPTION 'Parent % not found', new_parent_id; END IF;

    -- Prevent cycles: new_parent cannot be inside x subtree
    IF p_path <@ x_path THEN
      RAISE EXCEPTION 'Cannot move a node into its own descendant';
    END IF;

    -- Compute resulting max depth of the moved subtree
    SELECT max(p_n + 1 + (nlevel(b.path) - x_n))
      INTO max_new_depth
      FROM boards b
      WHERE b.path <@ x_path;

    IF max_new_depth > 30 THEN
      RAISE EXCEPTION 'Move would exceed max depth (30)';
    END IF;

    -- Apply the move: splice new parent prefix + tail of each subtree path
    UPDATE boards b
    SET path = p_path || subpath(b.path, x_n)
    WHERE b.path <@ x_path;

    -- Update the immediate parent pointer of x (children are implied by path)
    UPDATE boards SET parent_id = new_parent_id WHERE id = x_id;
  END
  $$ LANGUAGE plpgsql;

  -- Convenience: delete a node + entire subtree by id (optional; delete-by-id also cascades via FK)
  CREATE OR REPLACE FUNCTION delete_board_and_subtree(x_id UUID) RETURNS VOID AS $$
  DECLARE
    t_path ltree;
  BEGIN
    SELECT path INTO t_path FROM boards WHERE id = x_id;
    IF t_path IS NULL THEN
      -- nothing to do
      RETURN;
    END IF;
    DELETE FROM boards WHERE path <@ t_path;
  END
  $$ LANGUAGE plpgsql;
  `;

    return db.runSql(sql);
};

exports.down = async function (db) {
    const sql = `
    DROP FUNCTION IF EXISTS delete_board_and_subtree(UUID);
    DROP FUNCTION IF EXISTS move_board(UUID, UUID);
    DROP TRIGGER IF EXISTS boards_forbid_parent_update ON boards;
    DROP FUNCTION IF EXISTS forbid_parent_update();
    DROP TRIGGER IF EXISTS boards_set_path_before_insert ON boards;
    DROP FUNCTION IF EXISTS boards_set_path_on_insert();
    DROP TRIGGER IF EXISTS boards_set_updated_at ON boards;
    DROP FUNCTION IF EXISTS trg_set_updated_at();
    DROP INDEX IF EXISTS boards_path_gist_idx;
    DROP INDEX IF EXISTS boards_parent_idx;
    DROP TABLE IF EXISTS boards;
    -- (You can keep extensions installed; dropping them is optional and global)
    -- DROP EXTENSION IF EXISTS ltree;
    -- DROP EXTENSION IF EXISTS pgcrypto;
  `;
    return db.runSql(sql);
};

exports._meta = {
    "version": 1
};