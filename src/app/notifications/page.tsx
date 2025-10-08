"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers/supabase-provider";
import { fetchNotifications, markAsRead, markAllAsRead } from "@/lib/notifications/service";
import { Notification, NotificationType } from "@/lib/notifications/types";

function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case NotificationType.CREW_JOIN_REQUEST:
      return '👥';
    case NotificationType.CREW_JOIN_APPROVED:
      return '✅';
    case NotificationType.CREW_JOIN_REJECTED:
      return '❌';
    case NotificationType.CREW_NEW_MEMBER:
      return '🎉';
    case NotificationType.MISSION_CREATED:
      return '🎯';
    case NotificationType.RECORD_LIKED:
      return '❤️';
    case NotificationType.RECORD_COMMENTED:
      return '💬';
    case NotificationType.RANKING_TOP3:
      return '🏆';
    default:
      return '📢';
  }
}

function formatRelativeTime(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return '방금 전';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`;

  return new Intl.DateTimeFormat('ko', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, client } = useSupabase();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const loadNotifications = async () => {
      const { data } = await fetchNotifications(client, user.id, { limit: 50 });
      setNotifications(data);
      setLoading(false);
    };

    loadNotifications();
  }, [user, client, router]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(client, notification.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      );
    }

    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;

    await markAllAsRead(client, user.id);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    );
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-center text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-muted/40 pb-16">
      <header className="border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">읽지 않은 알림 {unreadCount}개</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:underline"
              >
                모두 읽음 처리
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {notifications.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-background p-12 text-center">
            <p className="text-muted-foreground">알림이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full rounded-xl border p-4 text-left transition hover:bg-muted/50 ${
                  notification.isRead
                    ? 'border-border/40 bg-background'
                    : 'border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20'
                }`}
              >
                <div className="flex gap-3">
                  <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{notification.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
