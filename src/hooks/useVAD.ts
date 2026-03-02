'use client';

import { useRef, useEffect, useCallback } from 'react';
import { VAD_SILENCE_THRESHOLD_MS, VAD_ENERGY_THRESHOLD } from '@/lib/constants';
import { float32ToWav, concatFloat32Arrays } from '@/lib/audio-utils';

interface UseVADOptions {
  onSpeechEnd: (audioBlob: Blob) => void;
}

export function useVAD(
  mediaStream: MediaStream | null,
  { onSpeechEnd }: UseVADOptions,
) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isSpeakingRef = useRef(false);
  const silenceStartRef = useRef<number>(0);
  const speechBufferRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef(16000);
  const rafRef = useRef<number>(0);
  const onSpeechEndRef = useRef(onSpeechEnd);
  onSpeechEndRef.current = onSpeechEnd;

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    speechBufferRef.current = [];
    isSpeakingRef.current = false;
  }, []);

  useEffect(() => {
    if (!mediaStream) {
      cleanup();
      return;
    }

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    sampleRateRef.current = audioContext.sampleRate;

    const source = audioContext.createMediaStreamSource(mediaStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;

    // Use ScriptProcessor to capture raw audio data for WAV encoding
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    source.connect(analyser);
    analyser.connect(processor);
    processor.connect(audioContext.destination);

    const dataArray = new Float32Array(analyser.fftSize);

    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      analyser.getFloatTimeDomainData(dataArray);

      // Calculate RMS energy
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);

      const now = Date.now();

      if (rms > VAD_ENERGY_THRESHOLD) {
        // Speech detected
        if (!isSpeakingRef.current) {
          isSpeakingRef.current = true;
          speechBufferRef.current = [];
        }
        silenceStartRef.current = 0;
        // Buffer the audio data
        const inputData = e.inputBuffer.getChannelData(0);
        speechBufferRef.current.push(new Float32Array(inputData));
      } else if (isSpeakingRef.current) {
        // Still buffer during silence within speech
        const inputData = e.inputBuffer.getChannelData(0);
        speechBufferRef.current.push(new Float32Array(inputData));

        if (silenceStartRef.current === 0) {
          silenceStartRef.current = now;
        } else if (now - silenceStartRef.current > VAD_SILENCE_THRESHOLD_MS) {
          // Silence threshold exceeded — speech segment ended
          isSpeakingRef.current = false;
          silenceStartRef.current = 0;

          if (speechBufferRef.current.length > 0) {
            const concatenated = concatFloat32Arrays(speechBufferRef.current);
            // Only process if we have at least ~0.5 seconds of audio
            const minSamples = sampleRateRef.current * 0.5;
            if (concatenated.length > minSamples) {
              const wavBlob = float32ToWav(concatenated, sampleRateRef.current);
              onSpeechEndRef.current(wavBlob);
            }
          }
          speechBufferRef.current = [];
        }
      }
    };

    return cleanup;
  }, [mediaStream, cleanup]);
}
