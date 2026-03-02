'use client';

import { useRef, useEffect } from 'react';
import type { ILocalVideoTrack, IRemoteVideoTrack } from 'agora-rtc-sdk-ng';

interface Props {
  videoTrack: ILocalVideoTrack | IRemoteVideoTrack | null;
  label: string;
  languageBadge?: string;
  isLocal?: boolean;
}

export default function VideoPlayer({ videoTrack, label, languageBadge, isLocal }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoTrack && containerRef.current) {
      videoTrack.play(containerRef.current);
      return () => {
        videoTrack.stop();
      };
    }
  }, [videoTrack]);

  const initials = label
    .split(/[\s()]+/)
    .filter(w => w && w !== 'You')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: '#1a202c',
        aspectRatio: '16/9',
        width: '100%',
      }}
      aria-label={`Video: ${label}`}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          transform: isLocal ? 'scaleX(-1)' : undefined,
        }}
      />

      {/* No video placeholder — avatar initials */}
      {!videoTrack && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
        }}>
          <div style={{
            width: isLocal ? '48px' : '80px',
            height: isLocal ? '48px' : '80px',
            borderRadius: '50%',
            background: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isLocal ? '1rem' : '1.75rem',
            fontWeight: 600,
            color: 'white',
          }}>
            {initials}
          </div>
        </div>
      )}

      {/* Bottom gradient for text readability */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.45))',
        pointerEvents: 'none',
      }} />

      {/* Name + language overlay */}
      <div style={{
        position: 'absolute',
        bottom: '0.5rem',
        left: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
      }}>
        <span style={{
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          padding: '0.2rem 0.6rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          fontWeight: 500,
          backdropFilter: 'blur(4px)',
        }}>
          {label}
        </span>
        {languageBadge && (
          <span style={{
            background: 'var(--color-primary)',
            color: 'white',
            padding: '0.15rem 0.4rem',
            borderRadius: '0.3rem',
            fontSize: '0.65rem',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}>
            {languageBadge}
          </span>
        )}
      </div>
    </div>
  );
}
