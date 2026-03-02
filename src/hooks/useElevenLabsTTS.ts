'use client';

import { useRef, useCallback, useState } from 'react';

export function useElevenLabsTTS() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const getContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const stop = useCallback(() => {
    if (currentSourceRef.current) {
      try { currentSourceRef.current.stop(); } catch { /* ignore */ }
      currentSourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;

    stop();
    setIsFetching(true);

    try {
      const res = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error(`ElevenLabs TTS ${res.status}`);

      const audioData = await res.arrayBuffer();
      const ctx = getContext();
      const audioBuffer = await ctx.decodeAudioData(audioData);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      currentSourceRef.current = source;
      setIsPlaying(true);
      setIsFetching(false);

      source.onended = () => {
        currentSourceRef.current = null;
        setIsPlaying(false);
      };

      source.start();
    } catch (err) {
      console.error('[ElevenLabs] Playback error:', err);
      setIsFetching(false);
      setIsPlaying(false);
    }
  }, [getContext, stop]);

  return { speak, stop, isPlaying, isFetching };
}
