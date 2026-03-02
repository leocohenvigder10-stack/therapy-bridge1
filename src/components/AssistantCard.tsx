'use client';

import { useEffect, useRef } from 'react';
import type { AssistantInsight } from '@/lib/types';

const CATEGORY_STYLES: Record<string, { borderColor: string; icon: string; label: string }> = {
  cultural:  { borderColor: 'var(--color-primary)',      icon: '🌐', label: 'Cultural' },
  technique: { borderColor: 'var(--color-accent)',       icon: '💡', label: 'Technique' },
  flag:      { borderColor: 'var(--color-warning)',      icon: '⚠️', label: 'Flag' },
  note:      { borderColor: 'var(--color-text-light)',   icon: '📝', label: 'Note' },
};

interface Props {
  insight: AssistantInsight;
  onSpeak: () => void;
  isSpeaking: boolean;
  isLoadingVoice: boolean;
}

export default function AssistantCard({ insight, onSpeak, isSpeaking, isLoadingVoice }: Props) {
  const style = CATEGORY_STYLES[insight.category] || CATEGORY_STYLES.note;
  // Only animate when first mounted (isNew). Use a ref so the class
  // is never re-applied on subsequent re-renders caused by new insights.
  const animClass = useRef(insight.isNew ? 'animate-fade-in' : '').current;

  return (
    <div
      className={animClass}
      style={{
        background: 'white',
        borderRadius: 'var(--radius-md)',
        borderLeft: `4px solid ${style.borderColor}`,
        padding: '0.75rem 0.85rem',
        marginBottom: '0.5rem',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
        <span style={{
          width: '20px', height: '20px', borderRadius: '50%',
          background: style.borderColor, color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
        }}>
          {insight.category === 'cultural' ? 'C' : insight.category === 'technique' ? 'T' : insight.category === 'flag' ? '!' : 'N'}
        </span>
        <span style={{ fontWeight: 600, fontSize: '0.8rem', flex: 1 }}>
          {insight.title}
        </span>
        {/* NEW dot — only shows for truly new insights, no infinite pulse on old ones */}
        {insight.isNew && (
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: 'var(--color-accent)', flexShrink: 0,
            display: 'inline-block',
          }} />
        )}
        {/* Speak button */}
        <button
          onClick={onSpeak}
          title={isSpeaking ? 'Stop' : 'Read aloud'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: isSpeaking ? 'var(--color-accent)' : 'var(--color-text-light)',
            fontSize: '0.8rem', padding: '2px 4px', flexShrink: 0,
            opacity: isLoadingVoice ? 0.5 : 1,
          }}
        >
          {isLoadingVoice ? '...' : isSpeaking ? '⏹' : '🔊'}
        </button>
      </div>
      {/* Content */}
      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', margin: 0, lineHeight: 1.5 }}>
        {insight.content}
      </p>
    </div>
  );
}
