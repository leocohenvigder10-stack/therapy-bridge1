'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import type { Role } from '@/lib/types';

interface RoomContextValue {
  roomId: string;
  role: Role;
  language: string;
  userName: string;
  remoteLanguage: string | null;
  remoteUserName: string | null;
  setRemoteInfo: (language: string, name: string) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({
  roomId,
  role,
  language,
  userName,
  children,
}: {
  roomId: string;
  role: Role;
  language: string;
  userName: string;
  children: React.ReactNode;
}) {
  const [remoteLanguage, setRemoteLanguage] = useState<string | null>(null);
  const [remoteUserName, setRemoteUserName] = useState<string | null>(null);

  const setRemoteInfo = useCallback((lang: string, name: string) => {
    setRemoteLanguage(lang);
    setRemoteUserName(name);
  }, []);

  return (
    <RoomContext.Provider value={{
      roomId, role, language, userName,
      remoteLanguage, remoteUserName, setRemoteInfo,
    }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be inside RoomProvider');
  return ctx;
}
