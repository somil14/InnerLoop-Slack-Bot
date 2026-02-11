import { pool } from "./db.js";

function isExpired(expiresAt) {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= Date.now();
}

async function refreshToken(refreshToken) {
  if (!refreshToken) {
    throw new Error("Missing Slack refresh token");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.SLACK_CLIENT_ID ?? "",
    client_secret: process.env.SLACK_CLIENT_SECRET ?? "",
  });

  if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_CLIENT_SECRET) {
    throw new Error("Missing SLACK_CLIENT_ID/SLACK_CLIENT_SECRET for token refresh");
  }

  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Slack token refresh failed: ${data.error}`);
  }

  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : null;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt,
  };
}

export async function getValidBotToken(tenant) {
  if (!tenant) {
    throw new Error("Missing tenant for token refresh");
  }

  if (tenant.botToken && !isExpired(tenant.botTokenExpiresAt)) {
    return tenant.botToken;
  }

  const tenantId = tenant.id || tenant.tenantId;
  if (!tenantId) {
    throw new Error("Missing tenant id for token refresh");
  }

  const refreshed = await refreshToken(tenant.botRefreshToken);

  await pool.query(
    `
      UPDATE "Tenant"
      SET "botToken" = $1,
          "botRefreshToken" = $2,
          "botTokenExpiresAt" = $3
      WHERE "id" = $4
    `,
    [
      refreshed.accessToken,
      refreshed.refreshToken,
      refreshed.expiresAt,
      tenantId,
    ]
  );

  return refreshed.accessToken;
}
