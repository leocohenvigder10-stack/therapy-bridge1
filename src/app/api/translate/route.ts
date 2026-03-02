import { NextRequest, NextResponse } from 'next/server';
import * as deepl from 'deepl-node';

let _translator: deepl.Translator | null = null;
function getTranslator() {
  if (!_translator) _translator = new deepl.Translator(process.env.DEEPL_API_KEY!);
  return _translator;
}

export async function POST(req: NextRequest) {
  try {
    const { text, sourceLang, targetLang } = await req.json();

    if (!text || !targetLang) {
      return NextResponse.json({ error: 'Missing text or targetLang' }, { status: 400 });
    }

    const result = await getTranslator().translateText(
      text,
      sourceLang as deepl.SourceLanguageCode || null,
      targetLang as deepl.TargetLanguageCode,
    );

    const translatedText = Array.isArray(result) ? result[0].text : result.text;
    return NextResponse.json({ translatedText });
  } catch (err) {
    console.error('Translation error:', err);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
