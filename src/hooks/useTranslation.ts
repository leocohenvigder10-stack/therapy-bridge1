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
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourceRef = useRef(sourceLanguageCode);
  const targetRef = useRef(targetLanguageCode);
  sourceRef.current = sourceLanguageCode;
  targetRef.current = targetLanguageCode;

  const getCtx = useCallback(() => {
    if (!playbackCtxRef.current || playbackCtxRef.current.state === 'closed') {
      playbackCtxRef.current = new AudioContext();
      nextStartTimeRef.current = 0;
    }
    return playbackCtxRef.current;
  }, []);

  // Stream TTS and schedule audio chunks as they decode
  const streamAndPlayTTS = useCallback(async (text: string, voice: string) => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') await ctx.resume();

    const ttsRes = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });
    if (!ttsRes.ok) throw new Error(`TTS ${ttsRes.status}`);

    // Read the full buffer but use it immediately — opus is small and fast
    const audioData = await ttsRes.arrayBuffer();
    const ctx2 = getCtx();
    if (ctx2.state === 'suspended') await ctx2.resume();
    const audioBuf = await ctx2.decodeAudioData(audioData);
    const src = ctx2.createBufferSource();
    src.buffer = audioBuf;
    src.connect(ctx2.destination);
    const now = ctx2.currentTime;
    const startAt = Math.max(now, nextStartTimeRef.current);
    src.start(startAt);
    nextStartTimeRef.current = startAt + audioBuf.duration;
  }, [getCtx]);

  const translateChunk = useCallback(async (audioBlob: Blob) => {
    const sourceLang = getLanguageByCode(sourceRef.current);
    const targetLang = getLanguageByCode(targetRef.current);
    if (!sourceLang || !targetLang) return;

    activeRef.current++;
    setIsTranslating(true);
    try {
      // Step 1: STT
      const formData = new FormData();
      formData.append('audio', audioBlob, 'speech.wav');
      formData.append('language', sourceLang.whisperCode);
      const sttRes = await fetch('/api/transcribe', { method: 'POST', body: formData });
      if (!sttRes.ok) throw new Error(`STT ${sttRes.status}`);
      const { text } = await sttRes.json();
      if (!text?.trim()) return;

      // Step 2: Translate
      const tlRes = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceLang: sourceLang.deeplSource,
          targetLang: targetLang.deeplTarget,
        }),
      });
      if (!tlRes.ok) throw new Error(`Translate ${tlRes.status}`);
      const { translatedText } = await tlRes.json();
      if (!translatedText) return;

      // Step 3: TTS (streams and schedules immediately)
      await streamAndPlayTTS(translatedText, targetLang.ttsVoice);
    } catch (err) {
      console.error('[Translation] Pipeline error:', err);
    } finally {
      activeRef.current--;
      if (activeRef.current === 0) setIsTranslating(false);
    }
  }, [streamAndPlayTTS]);

  useEffect(() => {
    if (!remoteAudioTrack) return;
    let destroyed = false;
    let ctx: AudioContext;
    try {
      const msTrack = remoteAudioTrack.getMediaStreamTrack();
      if (!msTrack) return;
      ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(new MediaStream([msTrack]));

      const gain = ctx.createGain();
      gain.gain.value = ORIGINAL_AUDIO_GAIN;
      source.connect(gain);
      gain.connect(ctx.destination);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      const processor = ctx.createScriptProcessor(2048, 1, 1);
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
          if (!isSpeaking) {
            isSpeaking = true;
            speechBuf = [];
          }
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
              // Min 0.3s of speech
              if (concat.length > ctx.sampleRate * 0.3) {
                translateChunk(float32ToWav(concat, ctx.sampleRate));
              }
            }
            speechBuf = [];
          }
        }
      };
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
