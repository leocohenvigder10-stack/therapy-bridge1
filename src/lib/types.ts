export type Role = 'client' | 'therapist';

export interface RoomState {
  roomId: string;
  role: Role;
  language: string;
  userName: string;
  remoteLanguage: string | null;
  remoteUserName: string | null;
}

export interface AssistantInsight {
  id: string;
  category: 'cultural' | 'technique' | 'flag' | 'note';
  title: string;
  content: string;
  isNew: boolean;
  timestamp: number;
}

export interface AssistantResponse {
  cultural: Array<{ title: string; content: string }>;
  techniques: Array<{ title: string; content: string; approach: string }>;
  flags: Array<{ title: string; content: string; severity: string }>;
  notes: Array<{ title: string; content: string }>;
    summary?: string;
}

export interface TranslationChunk {
  id: string;
  status: 'transcribing' | 'translating' | 'synthesizing' | 'complete' | 'error';
}

export interface SessionSummary {
  summary: string;
  themes: string[];
  keyMoments: string[];
  recommendations: string[];
}
