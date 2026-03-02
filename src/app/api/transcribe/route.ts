import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// Whisper hallucination phrases to reject — these appear when fed silence or noise
const HALLUCINATION_PHRASES = [
  'thank you', 'thanks for watching', 'please subscribe', 'you',
  'bye', 'goodbye', 'see you', 'subtitles by', 'transcribed by',
  'www.', '.com', 'caption', 'subtitle',
];

function isHallucination(text: string): boolean {
  const lower = text.toLowerCase().trim();
  // Too short to be real speech (less than 3 meaningful words)
  const words = lower.split(/\s+/).filter(w => w.length > 1);
  if (words.length < 2) return true;
  // Known Whisper hallucination phrases
  if (HALLUCINATION_PHRASES.some(p => lower === p || lower === p + '.')) return true;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Minimum size guard: reject blobs that are too small to contain real speech
    // A 0.5s chunk at 16kHz 16-bit mono = ~16000 bytes. Anything under ~8KB is noise.
    if (audioFile.size < 8000) {
      return NextResponse.json({ text: '' });
    }

    const transcription = await getOpenAI().audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: language || undefined,
      response_format: 'verbose_json',
      temperature: 0,
    }) as any;

    // Filter out segments where Whisper itself signals low speech probability
    const segments: any[] = transcription.segments || [];
    const realSegments = segments.filter((seg: any) => {
      // no_speech_prob > 0.6 means Whisper thinks this is silence/noise
      if (seg.no_speech_prob !== undefined && seg.no_speech_prob > 0.6) return false;
      return true;
    });

    // If all segments were noise, return empty
    let text: string;
    if (segments.length > 0 && realSegments.length === 0) {
      text = '';
    } else {
      text = realSegments.length > 0
        ? realSegments.map((s: any) => s.text).join(' ').trim()
        : (transcription.text || '').trim();
    }

    // Final hallucination check
    if (isHallucination(text)) {
      return NextResponse.json({ text: '' });
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error('Transcription error:', err);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
