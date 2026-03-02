'use client';

import { useState, useCallback } from 'react';
import type { AssistantInsight } from '@/lib/types';
import { useElevenLabsTTS } from '@/hooks/useElevenLabsTTS';
import AssistantCard from './AssistantCard';

interface Props {
  insights: AssistantInsight[];
  isAnalyzing: boolean;
  onClose: () => void;
  sessionElapsed: string;
  onGenerateSummary?: () => void;
  summaryLoading?: boolean;
}

export default function AIAssistant({
  insights, isAnalyzing, onClose, sessionElapsed,
  onGenerateSummary, summaryLoading,
}: Props) {
  const { speak, stop, isPlaying, isFetching } = useElevenLabsTTS();
  const [playingInsightId, setPlayingInsightId] = useState<string | null>(null);

  const handleSpeak = useCallback((insight: AssistantInsight) => {
    if (playingInsightId === insight.id && isPlaying) {
      stop();
      setPlayingInsightId(null);
    } else {
      setPlayingInsightId(insight.id);
      speak(`${insight.title}. ${insight.content}`);
    }
  }, [playingInsightId, isPlaying, speak, stop]);

  const cultural = insights.filter(i => i.category === 'cultural');
  const techniques = insights.filter(i => i.category === 'technique');
  const flags = insights.filter(i => i.category === 'flag');
  const notes = insights.filter(i => i.category === 'note');

  const Section = ({ title, items, icon }: { title: string; items: AssistantInsight[]; icon: string }) => {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{
          fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.05em', color: 'var(--color-text-light)',
          marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem',
        }}>
          <span>{icon}</span> {title}
        </h3>
        {items.map(item => (
          <AssistantCard
            key={item.id}
            insight={item}
            onSpeak={() => handleSpeak(item)}
            isSpeaking={playingInsightId === item.id && isPlaying}
            isLoadingVoice={playingInsightId === item.id && isFetching}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{
      width: '340px',
      height: '100%',
      background: 'var(--color-sidebar-bg)',
      borderLeft: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '0.65rem 1rem',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'white',
      }}>
        <div>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>AI Assistant</h2>
          <p style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', margin: 0 }}>
            Cultural & therapeutic insights
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="session-timer">{sessionElapsed}</span>
          {isAnalyzing && <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />}
          <button
            onClick={onClose}
            aria-label="Close assistant"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0.2rem', color: 'var(--color-text-light)',
              transition: 'color var(--transition-fast)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0.75rem 0.75rem',
      }}>
        {insights.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '2.5rem 0.75rem',
            color: 'var(--color-text-light)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 0.75rem', opacity: 0.4 }}>
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
            <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>
              Listening to the conversation...
            </p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.4rem' }}>
              Insights will appear automatically as the session progresses.
            </p>
          </div>
        ) : (
          <>
            <Section title="Miscommunication Alerts" items={flags} icon="!" />
            <Section title="Cultural Context" items={cultural} icon="C" />
            <Section title="Suggested Techniques" items={techniques} icon="T" />
            <Section title="Session Notes" items={notes} icon="N" />
          </>
        )}
      </div>

      {/* Footer with summary button */}
      <div style={{
        padding: '0.6rem 0.75rem',
        borderTop: '1px solid var(--color-border)',
        background: 'white',
      }}>
        <button
          className="btn-primary"
          style={{ width: '100%', fontSize: '0.8rem', padding: '0.55rem' }}
          onClick={onGenerateSummary}
          disabled={summaryLoading || insights.length === 0}
        >
          {summaryLoading ? 'Generating Summary...' : 'Generate Session Summary'}
        </button>
      </div>
    </div>
  );
}
