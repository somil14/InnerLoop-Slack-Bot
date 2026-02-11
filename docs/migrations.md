# Migrations Policy

This repo uses **SQL-first migrations**.

Rules:
- Use raw SQL migration files in `prisma/migrations`.
- Do **not** run `prisma migrate dev` to generate schema changes.
- Prisma is used as **client only** (types + query API), not as the source of truth.

How to apply migrations:
- Run SQL against the database with `psql`.
- Then mark the migration in Prisma with `npx prisma migrate resolve --applied <migration_name>`.

Rationale:
- Analytics schemas evolve in controlled, explicit SQL.
- Prevents accidental drift and unsafe automatic migrations.
