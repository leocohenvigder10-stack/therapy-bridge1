'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAgoraRTC, generateUID } from '@/lib/agora';
import { LANGUAGE_BROADCAST_INTERVAL_MS } from '@/lib/constants';
import type {
  IAgoraRTCClient,
  ILocalAudioTrack,
  ILocalVideoTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
  IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';

interface UseAgoraReturn {
  localAudioTrack: ILocalAudioTrack | null;
  localVideoTrack: ILocalVideoTrack | null;
  remoteVideoTrack: IRemoteVideoTrack | null;
  remoteAudioTrack: IRemoteAudioTrack | null;
  remoteUid: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  micEnabled: boolean;
  camEnabled: boolean;
  toggleMic: () => void;
  toggleCam: () => void;
  leave: () => Promise<void>;
  stopRemoteAudio: () => void;
  playRemoteAudio: () => void;
  screenTrack: ILocalVideoTrack | null;
  isScreenSharing: boolean;
  toggleScreenShare: () => Promise<void>;
}

export function useAgora(
  channelName: string,
  language: string,
  userName: string,
  onRemoteInfo: (language: string, name: string) => void,
): UseAgoraReturn {
  const [localAudioTrack, setLocalAudioTrack] = useState<ILocalAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<IRemoteVideoTrack | null>(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState<IRemoteAudioTrack | null>(null);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [screenTrack, setScreenTrack] = useState<ILocalVideoTrack | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remoteAudioPlayingRef = useRef(false);
  const onRemoteInfoRef = useRef(onRemoteInfo);
  onRemoteInfoRef.current = onRemoteInfo;
  const cleanupDoneRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    cleanupDoneRef.current = false;

    async function init() {
      try {
        console.log('[Agora] Loading SDK...');
        const AgoraRTC = await getAgoraRTC();
        AgoraRTC.setLogLevel(1);

        if (cancelled) return;

        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        clientRef.current = client;
        const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;

        if (!appId) {
          setError('Missing NEXT_PUBLIC_AGORA_APP_ID');
          setIsConnecting(false);
          return;
        }

        console.log('[Agora] App ID:', appId.substring(0, 8) + '...');

        // Remote user events
        client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
          if (cancelled) return;
          console.log('[Agora] user-published:', user.uid, mediaType);
          try {
            await client.subscribe(user, mediaType);
            if (mediaType === 'video') {
              setRemoteVideoTrack(user.videoTrack || null);
              setRemoteUid(user.uid as number);
            }
            if (mediaType === 'audio') {
              const track = user.audioTrack || null;
              setRemoteAudioTrack(track);
              if (track) {
                track.play();
                remoteAudioPlayingRef.current = true;
                console.log('[Agora] Remote audio playing');
              }
            }
          } catch (err) {
            console.error('[Agora] Subscribe error:', err);
          }
        });

        client.on('user-unpublished', (_u: IAgoraRTCRemoteUser, mt: 'audio' | 'video') => {
          if (mt === 'video') setRemoteVideoTrack(null);
          if (mt === 'audio') { setRemoteAudioTrack(null); remoteAudioPlayingRef.current = false; }
        });

        client.on('user-left', () => {
          console.log('[Agora] Remote user left');
          setRemoteVideoTrack(null);
          setRemoteAudioTrack(null);
          setRemoteUid(null);
          remoteAudioPlayingRef.current = false;
        });

        client.on('user-joined', (u: IAgoraRTCRemoteUser) => {
          console.log('[Agora] Remote user joined:', u.uid);
        });

        // Data channel for language exchange
        client.on('stream-message', (_uid: number, data: Uint8Array) => {
          try {
            const msg = JSON.parse(new TextDecoder().decode(data));
            if (msg.type === 'identity') {
              console.log('[Agora] Got remote identity:', msg);
              onRemoteInfoRef.current(msg.language, msg.name);
            }
          } catch { /* ignore */ }
        });

        // Generate a fresh UID per init to avoid UID_CONFLICT on StrictMode re-run
        const uid = generateUID();

        // Join
        console.log('[Agora] Joining channel:', channelName, 'uid:', uid);
        await client.join(appId, channelName, null, uid);
        console.log('[Agora] Joined successfully');

        if (cancelled) {
          console.log('[Agora] Cancelled after join, leaving...');
          await client.leave().catch(() => {});
          return;
        }

        // Data stream: Web SDK has no createDataStream — sendStreamMessage is called directly
        console.log('[Agora] Data channel ready (sendStreamMessage)');

        // Create local tracks — each wrapped individually so partial failure is OK
        let audioTrack: ILocalAudioTrack | null = null;
        let videoTrack: ILocalVideoTrack | null = null;

        try {
          console.log('[Agora] Creating microphone track...');
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          console.log('[Agora] Microphone track created');
        } catch (err) {
          console.warn('[Agora] Microphone unavailable:', err);
        }

        try {
          console.log('[Agora] Creating camera track...');
          videoTrack = await AgoraRTC.createCameraVideoTrack();
          console.log('[Agora] Camera track created');
        } catch (err) {
          console.warn('[Agora] Camera unavailable:', err);
        }

        if (cancelled) {
          audioTrack?.close();
          videoTrack?.close();
          await client.leave().catch(() => {});
          return;
        }

        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);

        // Publish whatever tracks we got
        const tracksToPublish = [audioTrack, videoTrack].filter(Boolean) as (ILocalAudioTrack | ILocalVideoTrack)[];
        if (tracksToPublish.length > 0) {
          await client.publish(tracksToPublish);
          console.log('[Agora] Published', tracksToPublish.length, 'tracks');
        } else {
          console.warn('[Agora] No local tracks to publish (camera + mic both unavailable)');
        }

        // Broadcast identity via data channel
        const broadcast = () => {
          try {
            const msg = JSON.stringify({ type: 'identity', language, name: userName });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (client as any).sendStreamMessage(new TextEncoder().encode(msg));
          } catch { /* ignore */ }
        };

        setTimeout(broadcast, 500);
        intervalRef.current = setInterval(broadcast, LANGUAGE_BROADCAST_INTERVAL_MS);

        setIsConnected(true);
        setIsConnecting(false);

        if (!audioTrack && !videoTrack) {
          setError('Camera and microphone unavailable — you can still see/hear the remote participant');
        } else if (!audioTrack) {
          setError('Microphone unavailable — video only');
        } else if (!videoTrack) {
          setError('Camera unavailable — audio only');
        }
      } catch (err) {
        console.error('[Agora] Init error:', err);
        if (!cancelled) {
          setError(String(err));
          setIsConnecting(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (cleanupDoneRef.current) return;
      cleanupDoneRef.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      const c = clientRef.current;
      if (c) {
        c.localTracks.forEach(t => t.close());
        c.leave().catch(() => {});
        clientRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);

  const playRemoteAudio = useCallback(() => {
    if (remoteAudioTrack && !remoteAudioPlayingRef.current) {
      remoteAudioTrack.play();
      remoteAudioPlayingRef.current = true;
    }
  }, [remoteAudioTrack]);

  const stopRemoteAudio = useCallback(() => {
    if (remoteAudioTrack && remoteAudioPlayingRef.current) {
      remoteAudioTrack.stop();
      remoteAudioPlayingRef.current = false;
    }
  }, [remoteAudioTrack]);

  const toggleMic = useCallback(() => {
    if (localAudioTrack) {
      const next = !micEnabled;
      localAudioTrack.setEnabled(next);
      setMicEnabled(next);
    }
  }, [localAudioTrack, micEnabled]);

  const toggleCam = useCallback(() => {
    if (localVideoTrack) {
      const next = !camEnabled;
      localVideoTrack.setEnabled(next);
      setCamEnabled(next);
    }
  }, [localVideoTrack, camEnabled]);

  const toggleScreenShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;

    if (isScreenSharing && screenTrack) {
      // Stop screen share
      await client.unpublish(screenTrack).catch(() => {});
      screenTrack.close();
      setScreenTrack(null);
      setIsScreenSharing(false);
      // Re-publish camera if available
      if (localVideoTrack) {
        await client.publish(localVideoTrack).catch(() => {});
      }
    } else {
      // Start screen share
      try {
        const AgoraRTC = await getAgoraRTC();
        const screen = await AgoraRTC.createScreenVideoTrack({}, 'disable');
        const videoTrack = Array.isArray(screen) ? screen[0] : screen;

        // Unpublish camera
        if (localVideoTrack) {
          await client.unpublish(localVideoTrack).catch(() => {});
        }

        await client.publish(videoTrack);
        setScreenTrack(videoTrack);
        setIsScreenSharing(true);

        // Handle browser "Stop sharing" button
        videoTrack.on('track-ended', async () => {
          await client.unpublish(videoTrack).catch(() => {});
          videoTrack.close();
          setScreenTrack(null);
          setIsScreenSharing(false);
          if (localVideoTrack) {
            await client.publish(localVideoTrack).catch(() => {});
          }
        });
      } catch (err) {
        console.warn('[Agora] Screen share cancelled or failed:', err);
      }
    }
  }, [isScreenSharing, screenTrack, localVideoTrack]);

  const leave = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (screenTrack) screenTrack.close();
    const c = clientRef.current;
    if (c) {
      c.localTracks.forEach(t => t.close());
      await c.leave();
    }
    setIsConnected(false);
    setLocalAudioTrack(null);
    setLocalVideoTrack(null);
    setRemoteVideoTrack(null);
    setRemoteAudioTrack(null);
    setScreenTrack(null);
    setIsScreenSharing(false);
  }, [screenTrack]);

  return {
    localAudioTrack, localVideoTrack,
    remoteVideoTrack, remoteAudioTrack, remoteUid,
    isConnected, isConnecting, error,
    micEnabled, camEnabled,
    toggleMic, toggleCam, leave,
    playRemoteAudio, stopRemoteAudio,
    screenTrack, isScreenSharing, toggleScreenShare,
  };
}
