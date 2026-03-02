'use client';

import { useRef, useCallback } from 'react';

export function useAudioPlayback() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  const getContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playNext = useCallback(async () => {
    if (isPlayingRef.current || queueRef.current.length === 0) return;

    isPlayingRef.current = true;
    const buffer = queueRef.current.shift()!;

    try {
      const ctx = getContext();
      const audioBuffer = await ctx.decodeAudioData(buffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        isPlayingRef.current = false;
        playNext(); // Play next in queue
      };
      source.start();
    } catch (err) {
      console.error('Audio playback error:', err);
      isPlayingRef.current = false;
      playNext(); // Try next even on error
    }
  }, [getContext]);

  const enqueue = useCallback(async (audioData: ArrayBuffer) => {
    queueRef.current.push(audioData);
    if (!isPlayingRef.current) {
      playNext();
    }
  }, [playNext]);

  return { enqueue };
}
