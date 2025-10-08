/**
 * Notification Service Layer
 * Handles creating, fetching, and updating notifications
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Notification, CreateNotificationParams } from './types';
import { reportSupabaseError } from '@/lib/error-reporter';

/**
 * Create a new notification
 */
export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
): Promise<{ data: Notification | null; error: Error | null }> {
  try {
    // Debug: Log current user and auth state
    const { data: { user } } = await supabase.auth.getUser();
    console.log('[Notification Debug] Current user:', {
      userId: user?.id,
      role: user?.role,
      isAuthenticated: !!user,
    });
    console.log('[Notification Debug] Attempting to create notification:', {
      recipientId: params.recipientId,
      type: params.type,
      currentUserId: user?.id,
      isSelfNotification: user?.id === params.recipientId,
    });

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: params.recipientId,
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data || {},
        link: params.link || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Notification Debug] Insert failed:');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      console.error('Full error:', error);

      // Report to Slack
      await reportSupabaseError(error, 'Create Notification Failed', {
        metadata: {
          recipientId: params.recipientId,
          type: params.type,
          title: params.title,
          currentUserId: user?.id,
        },
      });

      throw error;
    }

    console.log('[Notification Debug] Notification created successfully:', data?.id);

    return {
      data: data ? mapNotification(data) : null,
      error: null,
    };
  } catch (error) {
    console.error('[Notification Debug] Exception caught:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Create multiple notifications (bulk insert)
 */
export async function createNotifications(
  supabase: SupabaseClient,
  notifications: CreateNotificationParams[]
): Promise<{ count: number; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert(
        notifications.map((n) => ({
          recipient_id: n.recipientId,
          type: n.type,
          title: n.title,
          message: n.message,
          data: n.data || {},
          link: n.link || null,
        }))
      )
      .select('id');

    if (error) throw error;

    return {
      count: data?.length || 0,
      error: null,
    };
  } catch (error) {
    console.error('Failed to create notifications:', error);
    return {
      count: 0,
      error: error as Error,
    };
  }
}

/**
 * Fetch user notifications
 */
export async function fetchNotifications(
  supabase: SupabaseClient,
  userId: string,
  options?: {
    limit?: number;
    onlyUnread?: boolean;
  }
): Promise<{ data: Notification[]; error: Error | null }> {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });

    if (options?.onlyUnread) {
      query = query.eq('is_read', false);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      data: (data || []).map(mapNotification),
      error: null,
    };
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return {
      data: [],
      error: error as Error,
    };
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string
): Promise<{ count: number; error: Error | null }> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    return {
      count: count || 0,
      error: null,
    };
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return {
      count: 0,
      error: error as Error,
    };
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(
  supabase: SupabaseClient,
  notificationId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  supabase: SupabaseClient,
  notificationId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Map database row to Notification type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNotification(row: any): Notification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    type: row.type,
    title: row.title,
    message: row.message,
    data: row.data || {},
    link: row.link,
    isRead: row.is_read,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}
