export interface Language {
  code: string;
  name: string;
  nativeName: string;
  whisperCode: string;
  deeplSource: string;
  deeplTarget: string;
  ttsVoice: string;
}

// Languages supported by Whisper + DeepL + OpenAI TTS
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', whisperCode: 'en', deeplSource: 'EN', deeplTarget: 'EN-US', ttsVoice: 'nova' },
  { code: 'es', name: 'Spanish', nativeName: 'Espanol', whisperCode: 'es', deeplSource: 'ES', deeplTarget: 'ES', ttsVoice: 'nova' },
  { code: 'fr', name: 'French', nativeName: 'Francais', whisperCode: 'fr', deeplSource: 'FR', deeplTarget: 'FR', ttsVoice: 'nova' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', whisperCode: 'de', deeplSource: 'DE', deeplTarget: 'DE', ttsVoice: 'nova' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', whisperCode: 'it', deeplSource: 'IT', deeplTarget: 'IT', ttsVoice: 'nova' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugues', whisperCode: 'pt', deeplSource: 'PT', deeplTarget: 'PT-PT', ttsVoice: 'nova' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', whisperCode: 'nl', deeplSource: 'NL', deeplTarget: 'NL', ttsVoice: 'nova' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', whisperCode: 'pl', deeplSource: 'PL', deeplTarget: 'PL', ttsVoice: 'nova' },
  { code: 'ru', name: 'Russian', nativeName: 'Russkij', whisperCode: 'ru', deeplSource: 'RU', deeplTarget: 'RU', ttsVoice: 'nova' },
  { code: 'ja', name: 'Japanese', nativeName: 'Nihongo', whisperCode: 'ja', deeplSource: 'JA', deeplTarget: 'JA', ttsVoice: 'nova' },
  { code: 'ko', name: 'Korean', nativeName: 'Hangugeo', whisperCode: 'ko', deeplSource: 'KO', deeplTarget: 'KO', ttsVoice: 'nova' },
  { code: 'zh', name: 'Chinese', nativeName: 'Zhongwen', whisperCode: 'zh', deeplSource: 'ZH', deeplTarget: 'ZH-HANS', ttsVoice: 'nova' },
  { code: 'tr', name: 'Turkish', nativeName: 'Turkce', whisperCode: 'tr', deeplSource: 'TR', deeplTarget: 'TR', ttsVoice: 'nova' },
  { code: 'ar', name: 'Arabic', nativeName: 'Al-Arabiyyah', whisperCode: 'ar', deeplSource: 'AR', deeplTarget: 'AR', ttsVoice: 'nova' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', whisperCode: 'sv', deeplSource: 'SV', deeplTarget: 'SV', ttsVoice: 'nova' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', whisperCode: 'da', deeplSource: 'DA', deeplTarget: 'DA', ttsVoice: 'nova' },
];

export function getLanguageByCode(code: string): Language | undefined {
  return LANGUAGES.find(l => l.code === code);
}
