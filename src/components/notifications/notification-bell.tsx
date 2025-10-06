"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSupabase } from "@/components/providers/supabase-provider";
import { getUnreadCount } from "@/lib/notifications/service";

export function NotificationBell() {
  const { user, client } = useSupabase();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Fetch initial unread count
    const fetchCount = async () => {
      const { count } = await getUnreadCount(client, user.id);
      setUnreadCount(count);
    };

    fetchCount();

    // Set up realtime subscription for new notifications
    const channel = client
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          // Increment count when new notification arrives
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          // Refetch count when notification is updated (marked as read)
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, client]);

  if (!user) return null;

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center justify-center"
      title="알림"
    >
      <svg
        className="h-6 w-6 text-foreground transition hover:text-orange-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
