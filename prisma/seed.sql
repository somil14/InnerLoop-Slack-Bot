INSERT INTO "Tenant" ("id", "name", "slackTeamId", "plan", "createdAt")
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Default Tenant', 'T_DEFAULT', 'free', now());

INSERT INTO "RevenueDaily" ("tenantId", "date", "total")
VALUES
  ('11111111-1111-1111-1111-111111111111', now()::date - 6, 1200.00),
  ('11111111-1111-1111-1111-111111111111', now()::date - 5, 3400.00),
  ('11111111-1111-1111-1111-111111111111', now()::date - 4, 560.00),
  ('11111111-1111-1111-1111-111111111111', now()::date - 3, 890.00),
  ('11111111-1111-1111-1111-111111111111', now()::date - 2, 6400.00);
