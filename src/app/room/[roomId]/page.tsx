'use client';

import { useSearchParams, useParams } from 'next/navigation';
import { RoomProvider } from '@/context/RoomContext';
import VideoRoom from '@/components/VideoRoom';
import type { Role } from '@/lib/types';
import { Suspense } from 'react';

function RoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const roomId = params.roomId as string;
  const role = (searchParams.get('role') || 'client') as Role;
  const language = searchParams.get('language') || 'en';
  const userName = searchParams.get('name') || 'Anonymous';

  return (
    <RoomProvider roomId={roomId} role={role} language={language} userName={userName}>
      <VideoRoom />
    </RoomProvider>
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: '1rem',
      }}>
        <div className="spinner" />
        <p style={{ color: 'var(--color-text-light)' }}>Loading room...</p>
      </div>
    }>
      <RoomContent />
    </Suspense>
  );
}
