'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { IRemoteAudioTrack } from 'agora-rtc-sdk-ng';
import { getLanguageByCode } from '@/lib/languages';
import { ORIGINAL_AUDIO_GAIN, VAD_SILENCE_THRESHOLD_MS, VAD_ENERGY_THRESHOLD } from '@/lib/constants';
import { float32ToWav, concatFloat32Arrays } from '@/lib/audio-utils';

export function useTranslation(
  remoteAudioTrack: IRemoteAudioTrack | null,
  sourceLanguageCode: string,
  targetLanguageCode: string,
) {
  const [isTranslating, setIsTranslating] = useState(false);
  const activeRef = useRef(0);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef(sourceLanguageCode);
  const targetRef = useRef(targetLanguageCode);
  sourceRef.current = sourceLanguageCode;
  targetRef.current = targetLanguageCode;

  const playNext = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;
    const buf = audioQueueRef.current.shift()!;
    try {
      if (!playbackCtxRef.current || playbackCtxRef.current.state === 'closed') {
        playbackCtxRef.current = new AudioContext();
      }
      const ctx = playbackCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      const audioBuf = await ctx.decodeAudioData(buf);
      const src = ctx.createBufferSource();
      src.buffer = audioBuf;
      src.connect(ctx.destination);
      src.onended = () => { isPlayingRef.current = false; playNext(); };
      src.start();
    } catch (err) {
      console.error('[Translation] Playback error:', err);
      isPlayingRef.current = false;
      playNext();
    }
  }, []);

  const enqueueAudio = useCallback((data: ArrayBuffer) => {
    audioQueueRef.current.push(data);
    if (!isPlayingRef.current) playNext();
  }, [playNext]);

  const translateChunk = useCallback(async (audioBlob: Blob) => {
    const sourceLang = getLanguageByCode(sourceRef.current);
    const targetLang = getLanguageByCode(targetRef.current);
    if (!sourceLang || !targetLang) return;

    activeRef.current++;
    setIsTranslating(true);
    console.log('[Translation] Processing chunk...');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'speech.wav');
      formData.append('language', sourceLang.whisperCode);
      const sttRes = await fetch('/api/transcribe', { method: 'POST', body: formData });
      if (!sttRes.ok) throw new Error(`STT ${sttRes.status}`);
      const { text } = await sttRes.json();
      if (!text?.trim()) return;
      console.log('[Translation] STT:', text);

      const tlRes = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLang: sourceLang.deeplSource, targetLang: targetLang.deeplTarget }),
      });
      if (!tlRes.ok) throw new Error(`Translate ${tlRes.status}`);
      const { translatedText } = await tlRes.json();
      if (!translatedText) return;
      console.log('[Translation] Translated:', translatedText);

      const ttsRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: translatedText, voice: targetLang.ttsVoice }),
      });
      if (!ttsRes.ok) throw new Error(`TTS ${ttsRes.status}`);
      const audioData = await ttsRes.arrayBuffer();
      enqueueAudio(audioData);
    } catch (err) {
      console.error('[Translation] Pipeline error:', err);
    } finally {
      activeRef.current--;
      if (activeRef.current === 0) setIsTranslating(false);
    }
  }, [enqueueAudio]);

  // Main effect: audio routing + inline VAD (fixes the ref bug)
  useEffect(() => {
    if (!remoteAudioTrack) return;

    console.log('[Translation] Setting up audio capture + VAD');
    let destroyed = false;
    let ctx: AudioContext;

    try {
      const msTrack = remoteAudioTrack.getMediaStreamTrack();
      if (!msTrack) {
        console.warn('[Translation] No MediaStreamTrack from remote audio');
        return;
      }

      ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(new MediaStream([msTrack]));

      // Low-volume original audio
      const gain = ctx.createGain();
      gain.gain.value = ORIGINAL_AUDIO_GAIN;
      source.connect(gain);
      gain.connect(ctx.destination);

      // Inline VAD
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      source.connect(analyser);
      analyser.connect(processor);
      const silent = ctx.createGain();
      silent.gain.value = 0;
      processor.connect(silent);
      silent.connect(ctx.destination);

      const dataArray = new Float32Array(analyser.fftSize);
      let isSpeaking = false;
      let silenceStart = 0;
      let speechBuf: Float32Array[] = [];

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (destroyed) return;
        analyser.getFloatTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
        const rms = Math.sqrt(sum / dataArray.length);
        const now = Date.now();

        if (rms > VAD_ENERGY_THRESHOLD) {
          if (!isSpeaking) { isSpeaking = true; speechBuf = []; }
          silenceStart = 0;
          speechBuf.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        } else if (isSpeaking) {
          speechBuf.push(new Float32Array(e.inputBuffer.getChannelData(0)));
          if (!silenceStart) {
            silenceStart = now;
          } else if (now - silenceStart > VAD_SILENCE_THRESHOLD_MS) {
            isSpeaking = false;
            silenceStart = 0;
            if (speechBuf.length > 0) {
              const concat = concatFloat32Arrays(speechBuf);
              if (concat.length > ctx.sampleRate * 0.5) {
                translateChunk(float32ToWav(concat, ctx.sampleRate));
              }
            }
            speechBuf = [];
          }
        }
      };

      console.log('[Translation] Pipeline ready');
    } catch (err) {
      console.error('[Translation] Setup error:', err);
      return;
    }

    return () => {
      destroyed = true;
      if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
    };
  }, [remoteAudioTrack, translateChunk]);

  return { isTranslating };
}
