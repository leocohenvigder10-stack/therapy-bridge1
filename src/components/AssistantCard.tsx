'use client';

import type { AssistantInsight } from '@/lib/types';

const CATEGORY_STYLES: Record<string, { borderColor: string; icon: string }> = {
  cultural: { borderColor: 'var(--color-primary)', icon: 'C' },
  technique: { borderColor: 'var(--color-accent)', icon: 'T' },
  flag: { borderColor: 'var(--color-warning)', icon: '!' },
  note: { borderColor: 'var(--color-text-light)', icon: 'N' },
};

interface Props {
  insight: AssistantInsight;
  onSpeak: () => void;
  isSpeaking: boolean;
  isLoadingVoice: boolean;
}

export default function AssistantCard({ insight, onSpeak, isSpeaking, isLoadingVoice }: Props) {
  const style = CATEGORY_STYLES[insight.category] || CATEGORY_STYLES.note;

  return (
    <div
      className="animate-fade-in"
      style={{
        background: 'white',
        borderRadius: 'var(--radius-md)',
        borderLeft: `4px solid ${style.borderColor}`,
        padding: '0.75rem 0.85rem',
        marginBottom: '0.5rem',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
        <span style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: style.borderColor,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.6rem',
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {style.icon}
        </span>
        <span style={{ fontWeight: 600, fontSize: '0.8rem', flex: 1 }}>
          {insight.title}
        </span>
        {insight.isNew && (
          <span className="pulse-dot" style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: 'var(--color-accent)', flexShrink: 0,
          }} />
        )}
        {/* Voice playback button */}
        <button
          onClick={onSpeak}
          aria-label={isSpeaking ? 'Stop speaking' : 'Read aloud'}
          title={isSpeaking ? 'Stop' : 'Read aloud'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0.15rem', flexShrink: 0,
            color: isSpeaking ? 'var(--color-primary)' : 'var(--color-text-light)',
            transition: 'color var(--transition-fast)',
          }}
        >
          {isLoadingVoice ? (
            <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
          ) : isSpeaking ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </div>
      <p style={{
        fontSize: '0.78rem',
        color: 'var(--color-text-light)',
        margin: 0,
        lineHeight: 1.5,
      }}>
        {insight.content}
      </p>
    </div>
  );
}
