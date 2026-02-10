'use client';

/**
 * Presence Indicators Component
 * Feature: PB-029
 *
 * Shows active collaborators with real-time cursor positions
 */

import { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Session } from '@/lib/collaboration';
import { createClient } from '@/lib/supabase/client';

interface PresenceIndicatorsProps {
  projectId: string;
  currentUserId: string;
}

export function PresenceIndicators({ projectId, currentUserId }: PresenceIndicatorsProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchSessions();

    // Subscribe to real-time presence updates
    const channel = supabase
      .channel(`presence:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photo_book_sessions',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`/api/photo-book/projects/${projectId}/presence`);
      if (!response.ok) throw new Error('Failed to fetch presence');
      const data = await response.json();
      setSessions((data.sessions || []).filter((s: Session) => s.userId !== currentUserId));
    } catch (error) {
      console.error('Error fetching presence:', error);
    }
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (userId: string) => {
    // Generate consistent color based on userId
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-cyan-500',
    ];
    const index = userId.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        {sessions.map((session) => (
          <Tooltip key={session.id}>
            <TooltipTrigger>
              <div className="relative">
                <Avatar className={`h-8 w-8 border-2 border-white ${getAvatarColor(session.userId)}`}>
                  <AvatarFallback className="text-white text-xs">
                    {getInitials(session.email || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">{session.email || 'Anonymous'}</p>
              <p className="text-xs text-muted-foreground">Currently editing</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}

/**
 * Cursor Component - Shows other users' cursors on the canvas
 */
interface CursorProps {
  session: Session;
  containerRef: React.RefObject<HTMLElement>;
}

export function Cursor({ session, containerRef }: CursorProps) {
  if (!session.cursorPosition || !containerRef.current) {
    return null;
  }

  const { x, y } = session.cursorPosition;
  const rect = containerRef.current.getBoundingClientRect();

  const style = {
    position: 'absolute' as const,
    left: `${x * rect.width}px`,
    top: `${y * rect.height}px`,
    pointerEvents: 'none' as const,
    zIndex: 1000,
  };

  const getColor = (userId: string) => {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const index = userId.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const color = getColor(session.userId);

  return (
    <div style={style}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5 3L19 12L12 13L9 20L5 3Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
      <div
        className="ml-6 -mt-4 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {session.email?.split('@')[0] || 'Anonymous'}
      </div>
    </div>
  );
}
