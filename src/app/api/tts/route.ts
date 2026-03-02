import { NextRequest } from 'next/server';
import OpenAI from 'openai';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export async function POST(req: NextRequest) {
  try {
    const { text, voice } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: 'Missing text' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await getOpenAI().audio.speech.create({
      model: 'tts-1',
      voice: voice || 'nova',
      input: text,
      response_format: 'opus',
    });

    // Stream the audio back
    return new Response(response.body as ReadableStream, {
      headers: {
        'Content-Type': 'audio/opus',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('TTS error:', err);
    return new Response(JSON.stringify({ error: 'TTS failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
