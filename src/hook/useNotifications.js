import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  deleteAllNotifications,
  fetchNotifications,
  formatNotification,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NOTIFICATION_LIMIT,
} from '../services/notificationService';

export default function useNotifications(session) {
  const userId = session?.user?.id;
  const channelRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setIsInitialized(false);
      return;
    }

    try {
      setError(null);
      const rows = await fetchNotifications(userId, NOTIFICATION_LIMIT);
      setNotifications(rows);
    } catch (err) {
      console.error('Notification fetch error:', err.message);
      setError(err.message);
    } finally {
      setIsInitialized(true);
    }
  }, [userId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) return undefined;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = formatNotification(payload.new);
          setNotifications((prev) => [notification, ...prev].slice(0, NOTIFICATION_LIMIT));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = formatNotification(payload.new);
          setNotifications((prev) =>
            prev.map((item) => (item.id === notification.id ? notification : item))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => prev.filter((item) => item.id !== payload.old.id));
        }
      );

    channelRef.current = channel;

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsInitialized(true);
      }
    });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId]);

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!userId) return;

      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
      );

      try {
        await markNotificationAsRead(notificationId, userId);
      } catch (err) {
        console.error('Mark notification read error:', err.message);
      }
    },
    [userId]
  );

  const markAllRead = useCallback(async () => {
    if (!userId) return;

    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));

    try {
      await markAllNotificationsAsRead(userId);
    } catch (err) {
      console.error('Mark all notifications read error:', err.message);
    }
  }, [userId]);

  const clearAll = useCallback(async () => {
    if (!userId) return;

    const oldNotifications = notifications;
    setNotifications([]);

    try {
      await deleteAllNotifications(userId);
    } catch (err) {
      console.error('Clear notifications error:', err.message);
      setNotifications(oldNotifications);
    }
  }, [notifications, userId]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    isInitialized,
    error,
    markAsRead,
    markAllRead,
    clearAll,
    refresh: loadNotifications,
  };
}
