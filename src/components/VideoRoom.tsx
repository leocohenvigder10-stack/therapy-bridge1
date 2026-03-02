'use client';

import { useEffect, useState } from 'react';
import { useRoom } from '@/context/RoomContext';
import { useAgora } from '@/hooks/useAgora';
import { useTranslation } from '@/hooks/useTranslation';
import { useAssistant } from '@/hooks/useAssistant';
import VideoPlayer from './VideoPlayer';
import RoomControls from './RoomControls';
import AIAssistant from './AIAssistant';
import { useRouter } from 'next/navigation';
import { getLanguageByCode } from '@/lib/languages';

export default function VideoRoom() {
  const router = useRouter();
  const { roomId, role, language, userName, remoteLanguage, remoteUserName, setRemoteInfo } = useRoom();

  const {
    localVideoTrack, remoteVideoTrack, remoteAudioTrack,
    localAudioTrack,
    isConnected, isConnecting, error,
    micEnabled, camEnabled,
    toggleMic, toggleCam, leave,
    stopRemoteAudio, playRemoteAudio,
    screenTrack, isScreenSharing, toggleScreenShare,
  } = useAgora(roomId, language, userName, setRemoteInfo);

  const needsTranslation = remoteLanguage !== null && remoteLanguage !== language;

  // When translation kicks in, stop Agora's direct playback (translation hook handles audio)
  useEffect(() => {
    if (needsTranslation && remoteAudioTrack) {
      console.log('[Room] Translation active, stopping direct audio');
      stopRemoteAudio();
    } else if (!needsTranslation && remoteAudioTrack) {
      playRemoteAudio();
    }
  }, [needsTranslation, remoteAudioTrack, stopRemoteAudio, playRemoteAudio]);

  const { isTranslating } = useTranslation(
    needsTranslation ? remoteAudioTrack : null,
    remoteLanguage || '',
    language,
  );

  const { insights, isAnalyzing, generateSummary, summaryLoading } = useAssistant(
    role === 'therapist' ? localAudioTrack : null,
    role === 'therapist' ? remoteAudioTrack : null,
    language,
    remoteLanguage,
  );

  // Session timer
  const [sessionStart] = useState(() => Date.now());
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [isAssistantOpen, setIsAssistantOpen] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      setElapsedTime(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStart]);

  async function handleLeave() {
    await leave();
    router.push('/');
  }

  // Fatal error = not connected and has error
  const isFatalError = error && !isConnected;
  // Device warning = connected but has error (e.g. camera/mic denied)
  const deviceWarning = error && isConnected ? error : null;

  if (isFatalError) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: '1rem', padding: '2rem',
      }}>
        <div style={{ color: 'var(--color-danger)', fontSize: '1.2rem', fontWeight: 600 }}>
          Connection Failed
        </div>
        <div style={{
          background: '#fff3f3', padding: '1rem', borderRadius: 'var(--radius-md)',
          maxWidth: '500px', textAlign: 'center', fontSize: '0.9rem',
        }}>
          {error}
        </div>
        <p style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', textAlign: 'center', maxWidth: '400px' }}>
          Check that your Agora App ID is correct and the project has &quot;App ID&quot; authentication mode enabled (not token mode) in the Agora Console.
        </p>
        <button className="btn-primary" onClick={() => router.push('/')}>Back to Lobby</button>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: '1rem',
      }}>
        <div className="spinner" />
        <p style={{ color: 'var(--color-text-light)' }}>Connecting to room {roomId}...</p>
        <p style={{ color: 'var(--color-text-light)', fontSize: '0.8rem' }}>
          Allow camera & microphone access when prompted
        </p>
      </div>
    );
  }

  const localLang = getLanguageByCode(language);
  const remoteLang = remoteLanguage ? getLanguageByCode(remoteLanguage) : null;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--color-surface)', position: 'relative' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Device warning banner */}
        {deviceWarning && (
          <div style={{
            padding: '0.4rem 1rem', background: '#fff8e1', borderBottom: '1px solid #ffe082',
            fontSize: '0.75rem', color: '#795548', textAlign: 'center',
          }}>
            {deviceWarning}
          </div>
        )}

        {/* Status bar */}
        <div className="status-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: isConnected ? 'var(--color-success)' : 'var(--color-danger)',
              flexShrink: 0,
            }} />
            <span style={{ fontWeight: 600 }}>Room: {roomId}</span>
            <span style={{ color: 'var(--color-text-light)', fontSize: '0.75rem' }}>
              {role === 'therapist' ? 'Therapist' : 'Client'}
            </span>
            <span className="session-timer">{elapsedTime}</span>
            <span className="recording-indicator">
              <span className="recording-dot" /> REC
            </span>
          </div>
          <div style={{ color: 'var(--color-text-light)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
            {needsTranslation && (
              <>
                <span>{remoteLang?.name} &#8596; {localLang?.name}</span>
                {isTranslating && <span className="pulse-dot" style={{
                  width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block',
                }} />}
              </>
            )}
            {remoteLanguage && !needsTranslation && <span>Same language — direct audio</span>}
            {!remoteLanguage && remoteAudioTrack && <span>Detecting language...</span>}
            {!remoteLanguage && !remoteAudioTrack && <span>Waiting for participant...</span>}
          </div>
        </div>

        {/* Video area — dark background, Zoom-like PiP */}
        <div style={{
          flex: 1, position: 'relative',
          background: 'var(--color-surface-dark)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1.5rem',
          overflow: 'hidden',
        }}>
          {/* Main remote video (large, centered) */}
          <div style={{ width: '100%', maxWidth: '960px' }}>
            <VideoPlayer
              videoTrack={remoteVideoTrack}
              label={remoteUserName || 'Waiting for participant...'}
              languageBadge={remoteLang?.code.toUpperCase()}
            />
          </div>

          {/* Local video — PiP overlay bottom-right */}
          <div style={{
            position: 'absolute', bottom: '1.25rem', right: '1.25rem',
            width: '200px', zIndex: 10,
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            border: '2px solid rgba(255,255,255,0.15)',
            overflow: 'hidden',
          }}>
            <VideoPlayer
              videoTrack={isScreenSharing ? screenTrack : localVideoTrack}
              label={isScreenSharing ? 'Screen Share' : `${userName} (You)`}
              languageBadge={isScreenSharing ? undefined : localLang?.code.toUpperCase()}
              isLocal={!isScreenSharing}
            />
          </div>
        </div>

        {/* Controls bar */}
        <RoomControls
          micEnabled={micEnabled}
          camEnabled={camEnabled}
          onToggleMic={toggleMic}
          onToggleCam={toggleCam}
          onLeave={handleLeave}
          isScreenSharing={isScreenSharing}
          onToggleScreenShare={toggleScreenShare}
        />
      </div>

      {/* AI Assistant sidebar — therapist only */}
      {role === 'therapist' && (
        <>
          {!isAssistantOpen && (
            <button
              className="sidebar-toggle"
              onClick={() => setIsAssistantOpen(true)}
              aria-label="Open AI Assistant"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          {isAssistantOpen && (
            <AIAssistant
              insights={insights}
              isAnalyzing={isAnalyzing}
              onClose={() => setIsAssistantOpen(false)}
              sessionElapsed={elapsedTime}
              onGenerateSummary={generateSummary}
              summaryLoading={summaryLoading}
            />
          )}
        </>
      )}
    </div>
  );
}
