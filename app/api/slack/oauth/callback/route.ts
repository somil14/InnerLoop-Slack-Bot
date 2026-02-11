import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json(
      { error: 'Missing OAuth code' },
      { status: 400 }
    );
  }

  const redirectUri =
    process.env.SLACK_REDIRECT_URI ||
    'https://innerloop-bot.vercel.app/api/slack/oauth/callback';

  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      redirect_uri: redirectUri,
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    console.error('Slack OAuth error:', data);
    return NextResponse.json(
      { error: 'OAuth failed' },
      { status: 500 }
    );
  }

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token ?? null;
  const accessPrefix = accessToken ? accessToken.slice(0, 5) : null;
  const refreshPrefix = refreshToken ? refreshToken.slice(0, 5) : null;
  const authedUserPrefix = data.authed_user?.access_token
    ? data.authed_user.access_token.slice(0, 5)
    : null;

  console.log('Slack OAuth response summary', {
    ok: data.ok,
    teamId: data.team?.id,
    accessPrefix,
    refreshPrefix,
    authedUserPrefix,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  });

  if (!accessToken || !accessToken.startsWith('xoxb-')) {
    console.error('Expected xoxb bot token, received:', accessPrefix);
    return NextResponse.json(
      { error: 'Bot token not issued. Reinstall the app.' },
      { status: 500 }
    );
  }

  await prisma.tenant.upsert({
    where: { slackTeamId: data.team.id },
    update: {
      botToken: accessToken,
      botRefreshToken: refreshToken ?? undefined,
      botTokenExpiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : undefined,
    },
    create: {
      name: data.team.id,
      slackTeamId: data.team.id,
      botToken: accessToken,
      botRefreshToken: refreshToken,
      botTokenExpiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : null,
    },
  });


  return NextResponse.redirect(
    'https://innerloop-bot.vercel.app/success'
  );
}
