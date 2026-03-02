'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateRoomCode } from '@/lib/agora';
import { getLanguageByCode } from '@/lib/languages';
import type { Role } from '@/lib/types';
import LanguageSelector from './LanguageSelector';

export default function Lobby() {
  const router = useRouter();

  // Create room state
  const [createName, setCreateName] = useState('');
  const [createRole, setCreateRole] = useState<Role>('therapist');
  const [createLang, setCreateLang] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Join room state
  const [joinName, setJoinName] = useState('');
  const [joinRole, setJoinRole] = useState<Role>('client');
  const [joinLang, setJoinLang] = useState('');
  const [joinCode, setJoinCode] = useState('');

  function handleGenerate() {
    setGeneratedCode(generateRoomCode());
  }

  function handleCopy() {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCreate() {
    if (!createName || !createLang || !generatedCode) return;
    const params = new URLSearchParams({ role: createRole, language: createLang, name: createName });
    router.push(`/room/${generatedCode}?${params.toString()}`);
  }

  function handleJoin() {
    if (!joinName || !joinLang || !joinCode) return;
    const params = new URLSearchParams({ role: joinRole, language: joinLang, name: joinName });
    router.push(`/room/${joinCode.toUpperCase()}?${params.toString()}`);
  }

  const RoleToggle = ({ value, onChange }: { value: Role; onChange: (r: Role) => void }) => (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      {(['therapist', 'client'] as Role[]).map(role => (
        <button
          key={role}
          onClick={() => onChange(role)}
          style={{
            flex: 1, padding: '0.55rem', borderRadius: 'var(--radius-md)',
            border: `2px solid ${value === role ? 'var(--color-primary)' : 'var(--color-border)'}`,
            background: value === role ? 'var(--color-primary)' : 'white',
            color: value === role ? 'white' : 'var(--color-text)',
            fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
            textTransform: 'capitalize', fontSize: '0.9rem',
          }}
        >
          {role}
        </button>
      ))}
    </div>
  );

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--color-text-light)' }}>
      {children}
    </label>
  );

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 1rem' }}>
      {/* Header with branding + trust badges */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-text)' }}>
          Therapy Bridge
        </h1>
        <p style={{ color: 'var(--color-text-light)', fontSize: '1rem', marginBottom: '1.25rem' }}>
          Cross-language therapy sessions with real-time speech translation
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.72rem', color: 'var(--color-text-light)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            End-to-End Encrypted
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            HIPAA Compliant
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            16 Languages
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Create Room */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1.25rem' }}>Create Room</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <Label>Your Name</Label>
              <input className="input-field" placeholder="Enter your name" value={createName} onChange={e => setCreateName(e.target.value)} />
            </div>

            <div>
              <Label>Your Role</Label>
              <RoleToggle value={createRole} onChange={setCreateRole} />
            </div>

            <LanguageSelector label="Your Language" value={createLang} onChange={setCreateLang} />

            {!generatedCode ? (
              <button className="btn-primary" onClick={handleGenerate} style={{ width: '100%' }}>
                Generate Room Code
              </button>
            ) : (
              <>
                {/* Room code display with copy */}
                <div style={{
                  textAlign: 'center', padding: '1rem',
                  background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
                  border: '2px dashed var(--color-primary)',
                }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>
                    Room Code
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                    <span style={{
                      fontSize: '2rem', fontWeight: 700, letterSpacing: '0.2em',
                      color: 'var(--color-primary)', fontFamily: 'var(--font-mono)',
                    }}>
                      {generatedCode}
                    </span>
                    <button
                      onClick={handleCopy}
                      aria-label="Copy room code"
                      style={{
                        background: 'var(--color-primary)', color: 'white',
                        border: 'none', borderRadius: 'var(--radius-sm)',
                        padding: '0.3rem 0.55rem', cursor: 'pointer', fontSize: '0.7rem',
                        fontWeight: 500, transition: 'all 0.2s',
                      }}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginTop: '0.3rem' }}>
                    Share this code with your participant
                  </div>
                </div>

                {/* Session preview */}
                {createName && createLang && (
                  <div style={{
                    padding: '0.6rem 0.8rem', background: 'var(--color-surface-alt)',
                    borderRadius: 'var(--radius-md)', fontSize: '0.78rem',
                    border: '1px solid var(--color-border)',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.15rem', fontSize: '0.72rem' }}>Session Preview</div>
                    <div style={{ color: 'var(--color-text-light)' }}>
                      Joining as <strong>{createName}</strong> ({createRole}) — {getLanguageByCode(createLang)?.name}
                    </div>
                  </div>
                )}

                <button className="btn-primary" onClick={handleCreate} disabled={!createName || !createLang} style={{ width: '100%' }}>
                  Create & Join Room
                </button>
              </>
            )}
          </div>
        </div>

        {/* Join Room */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1.25rem' }}>Join Room</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <Label>Room Code</Label>
              <input
                className="input-field"
                placeholder="Enter 6-character code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <Label>Your Name</Label>
              <input className="input-field" placeholder="Enter your name" value={joinName} onChange={e => setJoinName(e.target.value)} />
            </div>

            <div>
              <Label>Your Role</Label>
              <RoleToggle value={joinRole} onChange={setJoinRole} />
            </div>

            <LanguageSelector label="Your Language" value={joinLang} onChange={setJoinLang} />

            {/* Session preview for join */}
            {joinName && joinLang && joinCode.length === 6 && (
              <div style={{
                padding: '0.6rem 0.8rem', background: 'var(--color-surface-alt)',
                borderRadius: 'var(--radius-md)', fontSize: '0.78rem',
                border: '1px solid var(--color-border)',
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.15rem', fontSize: '0.72rem' }}>Session Preview</div>
                <div style={{ color: 'var(--color-text-light)' }}>
                  Joining room <strong style={{ fontFamily: 'var(--font-mono)' }}>{joinCode}</strong> as <strong>{joinName}</strong> ({joinRole}) — {getLanguageByCode(joinLang)?.name}
                </div>
              </div>
            )}

            <button
              className="btn-primary"
              onClick={handleJoin}
              disabled={!joinName || !joinLang || joinCode.length < 6}
              style={{ width: '100%' }}
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
