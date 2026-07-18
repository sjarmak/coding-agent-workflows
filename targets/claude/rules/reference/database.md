# Database & SQL

Principles for relational databases (PostgreSQL-leaning; most carry to any
engine). The `database-reviewer` agent applies these in depth; this is the
condensed always-available rule.

## Access safety

- **Parameterized queries only.** Bind every value; never concatenate or
  interpolate untrusted input into SQL. This is the SQL-injection boundary and it
  is non-negotiable — an ORM or query builder that binds parameters is fine, a
  format-string that builds SQL is not.
- **Least privilege.** Application users get exactly the grants they need; never
  `GRANT ALL`. Revoke default public-schema permissions.
- **Validate at the boundary too.** Constraints in the schema are the last line,
  not the only one — reject bad input before it reaches the query.

## Schema

- **Right types:** `bigint` for surrogate keys, `text` over `varchar(n)` unless a
  limit is a real rule, `timestamptz` (never bare `timestamp`), `numeric` for
  money, `boolean` for flags. `int` IDs overflow; fix it at design time.
- **Constraints are documentation the database enforces:** PK on every table, FK
  with an explicit `ON DELETE`, `NOT NULL` wherever absence is meaningless,
  `CHECK` for invariants. A constraint caught at write time beats a bug found in
  reporting.
- **Consistent identifiers:** `lowercase_snake_case`, no quoted mixed-case names.

## Indexes & query performance

- **Index foreign keys and every WHERE/JOIN column.** Unindexed FKs are the most
  common avoidable table scan.
- **Composite index order:** equality columns first, range/sort columns last.
- **Verify, don't guess:** run `EXPLAIN ANALYZE` on non-trivial queries and look
  for sequential scans on large tables. Partial indexes (`WHERE deleted_at IS
  NULL`) and covering indexes (`INCLUDE (col)`) earn their keep on hot paths.
- **Avoid N+1:** one join or batched query beats a query per row in a loop.
- **Paginate by cursor** (`WHERE id > $last`) on large tables; `OFFSET` degrades
  linearly.

## Migrations

- **Additive, then backfill, then constrain.** To add a required column without
  downtime: add it nullable, backfill in batches, then set `NOT NULL`. One-shot
  `ALTER` on a hot table takes a lock that stalls writers.
- **Lock-aware:** build indexes `CONCURRENTLY`; avoid a table rewrite on a live
  hot table; keep the migration's transaction short.
- **Reversible or explicit:** ship a down path, or state plainly why the change is
  one-way. Test the migration against a production-sized copy before shipping.

## Transactions & concurrency

- **Keep transactions short** and never hold a lock across an external API call.
- **Order locks consistently** (`ORDER BY id ... FOR UPDATE`) to avoid deadlocks.
- **`SKIP LOCKED`** turns a table into a work queue without contention.
