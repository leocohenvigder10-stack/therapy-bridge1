'use client';

import { useState, useCallback, useEffect } from 'react';
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
  insights,
  isAnalyzing,
  onClose,
  sessionElapsed,
  onGenerateSummary,
  summaryLoading,
}: Props) {
  const { speak, stop, isPlaying, isFetching } = useElevenLabsTTS();
  const [playingInsightId, setPlayingInsightId] = useState<string | null>(null);
  // Local copy so we can clear isNew after a delay without mutating hook state
  const [displayedInsights, setDisplayedInsights] = useState<AssistantInsight[]>([]);

  // Sync incoming insights into local state, then auto-clear isNew after 4s
  useEffect(() => {
    setDisplayedInsights(insights);
    if (insights.some(i => i.isNew)) {
      const timer = setTimeout(() => {
        setDisplayedInsights(prev => prev.map(i => ({ ...i, isNew: false })));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [insights]);

  const handleSpeak = useCallback((insight: AssistantInsight) => {
    if (playingInsightId === insight.id && isPlaying) {
      stop();
      setPlayingInsightId(null);
    } else {
      setPlayingInsightId(insight.id);
      speak(`${insight.title}. ${insight.content}`);
    }
  }, [playingInsightId, isPlaying, speak, stop]);

  const cultural   = displayedInsights.filter(i => i.category === 'cultural');
  const techniques = displayedInsights.filter(i => i.category === 'technique');
  const flags      = displayedInsights.filter(i => i.category === 'flag');
  const notes      = displayedInsights.filter(i => i.category === 'note');

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
      width: '320px', height: '100%', background: 'var(--color-sidebar-bg)',
      borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>AI Assistant</h2>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', margin: 0 }}>
            Cultural &amp; therapeutic insights
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="session-timer">{sessionElapsed}</span>
          {isAnalyzing && (
            <span style={{
              fontSize: '0.65rem', color: 'var(--color-primary)',
              fontWeight: 500, animation: 'none',
            }}>Analyzing...</span>
          )}
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-light)', fontSize: '1rem', padding: '2px',
          }}>›</button>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
        {displayedInsights.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-light)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🎧</div>
            <p style={{ fontSize: '0.85rem', fontWeight: 500, margin: '0 0 0.25rem' }}>
              Listening to the conversation...
            </p>
            <p style={{ fontSize: '0.75rem', margin: 0 }}>
              Insights will appear automatically as the session progresses.
            </p>
          </div>
        ) : (
          <>
            <Section title="Flags" items={flags} icon="⚠️" />
            <Section title="Cultural Context" items={cultural} icon="🌐" />
            <Section title="Techniques" items={techniques} icon="💡" />
            <Section title="Notes" items={notes} icon="📝" />
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={onGenerateSummary}
          disabled={summaryLoading || displayedInsights.length === 0}
          className="btn-primary"
          style={{ width: '100%', fontSize: '0.8rem', padding: '0.6rem' }}
        >
          {summaryLoading ? 'Generating Summary...' : 'Generate Session Summary'}
        </button>
      </div>
    </div>
  );
}
