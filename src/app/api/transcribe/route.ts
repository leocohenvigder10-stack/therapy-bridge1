import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const transcription = await getOpenAI().audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: language || undefined,
    });

    return NextResponse.json({ text: transcription.text });
  } catch (err) {
    console.error('Transcription error:', err);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
