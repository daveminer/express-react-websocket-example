## How to run

The application is built into the docker compose environment, including the postgrest database.

To run, enter this into the console: `docker compose -f docker-compose.dev.yml up --build`

From there, visit http://localhost:3000 to use the app.

## Design decisions

The main design decision is to use a self-referential table (with recursive CTE for handling depth) for the boards. The self-referential approach models the board functionality well, preserving descendant relationships through moves and handling deletion of child boards to the database. The recursive CTE provides a depth count which is used by the backend to enforce the depth limit.

The frontend uses mainstream tools (redux, react-query) for development speed and simplicity.

## Trade-offs

There are other approaches for modeling the board relationships that could be more efficient (such as a materialized path via `ltree` or a closure table with precomputed ancestors), but they required too much time to implement.

The concept of users was skipped for time. The application is open, unsecured, and has no user functionality.

## Future improvements

Some fields, like the depth limit, belong in environment variables but are currently hardcoded.

A simple serial is used for database ids, but a uuidv4 could be more appropriate.

A B-Tree index on the Board#parent_id field is appropriate and will make the recursive CTE faster.

