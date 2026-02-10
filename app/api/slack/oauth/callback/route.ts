import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json(
      { error: 'Missing OAuth code' },
      { status: 400 }
    );
  }

  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
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

  // TODO: persist securely
  // data.access_token (xoxb-...)
  // data.team.id
  // data.enterprise?.id
  // data.scope

  return NextResponse.redirect(
    'https://innerloop-bot.vercel.app/success'
  );
}
