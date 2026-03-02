'use client';

import React from 'react';

interface Props {
  micEnabled: boolean;
  camEnabled: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onLeave: () => void;
  isScreenSharing?: boolean;
  onToggleScreenShare?: () => void;
}

function ControlButton({ active, onClick, icon, label, danger }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`control-btn ${danger ? 'control-btn--danger' : active ? 'control-btn--active' : ''}`}
      aria-label={label}
      title={label}
    >
      {icon}
      <span className="control-btn__label">{label}</span>
    </button>
  );
}

export default function RoomControls({
  micEnabled, camEnabled, onToggleMic, onToggleCam, onLeave,
  isScreenSharing, onToggleScreenShare,
}: Props) {
  return (
    <div className="controls-bar" role="toolbar" aria-label="Meeting controls">
      <ControlButton
        active={micEnabled}
        onClick={onToggleMic}
        label={micEnabled ? 'Mute' : 'Unmute'}
        icon={micEnabled ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .28-.02.56-.06.84" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      />

      <ControlButton
        active={camEnabled}
        onClick={onToggleCam}
        label={camEnabled ? 'Stop Video' : 'Start Video'}
        icon={camEnabled ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        )}
      />

      {onToggleScreenShare && (
        <ControlButton
          active={!isScreenSharing}
          onClick={onToggleScreenShare}
          label={isScreenSharing ? 'Stop Share' : 'Share Screen'}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          }
        />
      )}

      {/* Separator */}
      <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.15)', margin: '0 0.25rem' }} />

      <ControlButton
        active={false}
        onClick={onLeave}
        label="Leave"
        danger
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        }
      />
    </div>
  );
}
