import { NextRequest, NextResponse } from 'next/server';

// For prototype: Agora testing mode uses App ID only (no token needed)
// This endpoint exists as a placeholder for production token generation
export async function POST(req: NextRequest) {
  try {
    const { channelName, uid } = await req.json();

    // In testing mode, return null token (Agora accepts it with App ID auth)
    return NextResponse.json({
      token: null,
      appId: process.env.NEXT_PUBLIC_AGORA_APP_ID,
      channelName,
      uid,
    });
  } catch (err) {
    console.error('Token generation error:', err);
    return NextResponse.json({ error: 'Token generation failed' }, { status: 500 });
  }
}
