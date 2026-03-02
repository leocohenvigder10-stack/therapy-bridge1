import type AgoraRTC_Type from 'agora-rtc-sdk-ng';

let agoraModule: typeof AgoraRTC_Type | null = null;

export async function getAgoraRTC(): Promise<typeof AgoraRTC_Type> {
  if (agoraModule) return agoraModule;
  const mod = await import('agora-rtc-sdk-ng');
  agoraModule = mod.default;
  return agoraModule;
}

export function generateUID(): number {
  return Math.floor(Math.random() * 100000);
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
