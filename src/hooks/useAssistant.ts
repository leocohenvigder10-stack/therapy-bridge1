'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ILocalAudioTrack, IRemoteAudioTrack } from 'agora-rtc-sdk-ng';
import type { AssistantInsight, AssistantResponse } from '@/lib/types';
import { ASSISTANT_INTERVAL_MS, ASSISTANT_MIN_NEW_WORDS, VAD_SILENCE_THRESHOLD_MS, VAD_ENERGY_THRESHOLD } from '@/lib/constants';
import { float32ToWav, concatFloat32Arrays } from '@/lib/audio-utils';

interface TranscriptEntry {
  speaker: 'therapist' | 'client';
  text: string;
  timestamp: number;
}

// Helper: set up VAD + transcription on an audio track
function setupTrackCapture(
  track: { getMediaStreamTrack: () => MediaStreamTrack },
  speaker: 'therapist' | 'client',
  langCode: string,
  transcript: TranscriptEntry[],
): (() => void) | null {
  try {
    const msTrack = track.getMediaStreamTrack();
    if (!msTrack) return null;

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(new MediaStream([msTrack]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    source.connect(analyser);
    analyser.connect(processor);
    const silent = ctx.createGain();
    silent.gain.value = 0;
    processor.connect(silent);
    silent.connect(ctx.destination);

    let destroyed = false;
    let isSpeaking = false;
    let silenceStart = 0;
    let speechBuf: Float32Array[] = [];
    const dataArray = new Float32Array(analyser.fftSize);

    const transcribeChunk = async (blob: Blob) => {
      try {
        const fd = new FormData();
        fd.append('audio', blob, 'speech.wav');
        fd.append('language', langCode);
        const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
        if (!res.ok) return;
        const { text } = await res.json();
        if (text?.trim()) {
          transcript.push({ speaker, text: text.trim(), timestamp: Date.now() });
          console.log(`[Assistant] ${speaker}:`, text.trim());
        }
      } catch (err) {
        console.error(`[Assistant] Transcribe error (${speaker}):`, err);
      }
    };

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
              transcribeChunk(float32ToWav(concat, ctx.sampleRate));
            }
          }
          speechBuf = [];
        }
      }
    };

    return () => {
      destroyed = true;
      processor.disconnect();
      if (ctx.state !== 'closed') ctx.close().catch(() => {});
    };
  } catch (err) {
    console.error(`[Assistant] Setup error (${speaker}):`, err);
    return null;
  }
}

export function useAssistant(
  localAudioTrack: ILocalAudioTrack | null,
  remoteAudioTrack: IRemoteAudioTrack | null,
  therapistLanguage: string,
  clientLanguage: string | null,
) {
  const [insights, setInsights] = useState<AssistantInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const lastAnalyzedRef = useRef(0);
  const counterRef = useRef(0);

  // Set up local (therapist) track capture
  useEffect(() => {
    if (!localAudioTrack) return;
    console.log('[Assistant] Setting up therapist audio capture');
    const cleanup = setupTrackCapture(localAudioTrack, 'therapist', therapistLanguage, transcriptRef.current);
    return () => { if (cleanup) cleanup(); };
  }, [localAudioTrack, therapistLanguage]);

  // Set up remote (client) track capture
  useEffect(() => {
    if (!remoteAudioTrack || !clientLanguage) return;
    console.log('[Assistant] Setting up client audio capture');
    const cleanup = setupTrackCapture(remoteAudioTrack, 'client', clientLanguage, transcriptRef.current);
    return () => { if (cleanup) cleanup(); };
  }, [remoteAudioTrack, clientLanguage]);

  // Periodic Claude analysis
  const analyze = useCallback(async () => {
    const entries = transcriptRef.current;
    const newEntries = entries.slice(lastAnalyzedRef.current);
    const newWords = newEntries.reduce((s, e) => s + e.text.split(' ').length, 0);
    if (newWords < ASSISTANT_MIN_NEW_WORDS) return;

    setIsAnalyzing(true);
    lastAnalyzedRef.current = entries.length;

    const startTime = entries[0]?.timestamp || Date.now();
    const transcript = entries.map(e => {
      const elapsed = Math.floor((e.timestamp - startTime) / 1000);
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      return `[${m}:${s}] ${e.speaker.toUpperCase()}: ${e.text}`;
    }).join('\n');

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, therapistLanguage, clientLanguage: clientLanguage || 'unknown' }),
      });
      if (!res.ok) throw new Error(`Assistant ${res.status}`);
      const data: AssistantResponse = await res.json();
      const batch = counterRef.current++;
      const newInsights: AssistantInsight[] = [];

      data.cultural?.forEach((item, i) => newInsights.push({
        id: `c-${batch}-${i}`, category: 'cultural', title: item.title, content: item.content, isNew: true, timestamp: Date.now(),
      }));
      data.techniques?.forEach((item, i) => newInsights.push({
        id: `t-${batch}-${i}`, category: 'technique', title: item.title,
        content: `${item.content}${item.approach ? ` (${item.approach})` : ''}`, isNew: true, timestamp: Date.now(),
      }));
      data.flags?.forEach((item, i) => newInsights.push({
        id: `f-${batch}-${i}`, category: 'flag', title: item.title, content: item.content, isNew: true, timestamp: Date.now(),
      }));
      data.notes?.forEach((item, i) => newInsights.push({
        id: `n-${batch}-${i}`, category: 'note', title: item.title, content: item.content, isNew: true, timestamp: Date.now(),
      }));

      if (newInsights.length > 0) {
        setInsights(prev => [...newInsights, ...prev.map(i => ({ ...i, isNew: false }))]);
      }
      console.log('[Assistant] Analysis complete:', newInsights.length, 'insights');
    } catch (err) {
      console.error('[Assistant] Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [therapistLanguage, clientLanguage]);

  useEffect(() => {
    if (!localAudioTrack) return;
    const timer = setInterval(analyze, ASSISTANT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [localAudioTrack, analyze]);

  // On-demand session summary
  const generateSummary = useCallback(async () => {
    const entries = transcriptRef.current;
    if (entries.length === 0) return;

    setSummaryLoading(true);
    const startTime = entries[0]?.timestamp || Date.now();
    const transcript = entries.map(e => {
      const elapsed = Math.floor((e.timestamp - startTime) / 1000);
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      return `[${m}:${s}] ${e.speaker.toUpperCase()}: ${e.text}`;
    }).join('\n');

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          therapistLanguage,
          clientLanguage: clientLanguage || 'unknown',
          generateSummary: true,
        }),
      });
      if (!res.ok) throw new Error(`Summary ${res.status}`);
      const data = await res.json();
      const summaryInsight: AssistantInsight = {
        id: `summary-${Date.now()}`,
        category: 'note',
        title: 'Session Summary',
        content: data.summary || 'Summary generated.',
        isNew: true,
        timestamp: Date.now(),
      };
      setInsights(prev => [summaryInsight, ...prev.map(i => ({ ...i, isNew: false }))]);
      console.log('[Assistant] Summary generated');
    } catch (err) {
      console.error('[Assistant] Summary error:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [therapistLanguage, clientLanguage]);

  return { insights, isAnalyzing, generateSummary, summaryLoading };
}
