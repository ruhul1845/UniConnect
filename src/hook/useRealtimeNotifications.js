import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

// Tables to watch for notifications
const watchedTables = [
    { table: 'resources', label: 'Resource update' },
    { table: 'products', label: 'Marketplace update' },
    { table: 'product_images', label: 'Marketplace image update' },
    { table: 'conversations', label: 'Conversation update' },
    { table: 'messages', label: 'New message' },
    { table: 'cr', label: 'CR role update' },
    { table: 'sos_events', label: 'Safety update' },
];

export default function useRealtimeNotifications(session) {
    const [notifications, setNotifications] = useState([]);

    const buildNotification = useCallback((label, table, payload) => {
        const eventName = payload.eventType || 'UPDATE';
        let title = label;
        let description = `${eventName} on ${table}`;

        // Custom descriptions per table
        switch (table) {
            case 'messages':
                if (eventName === 'INSERT') {
                    title = 'New message';
                    description = 'A new chat message was added.';
                }
                break;
            case 'resources':
                title = 'Resource update';
                description = 'Academic resources were updated.';
                break;
            case 'products':
                title = 'Marketplace update';
                description = 'A marketplace listing was updated.';
                break;
            case 'cr':
                title = 'CR role update';
                description = 'CR assignment data changed.';
                break;
            case 'sos_events':
                title = 'Safety alert update';
                description = 'SOS event data changed.';
                break;
            default:
                break;
        }

        return {
            id: `${table}-${Date.now()}-${Math.random()}`,
            title,
            description,
            table,
            eventName,
            read: false,
            createdAt: new Date().toISOString(),
        };
    }, []);

    useEffect(() => {
        if (!session?.user?.id) return;

        const channel = supabase.channel('uniconnect-navbar-db-notifications');

        watchedTables.forEach(({ table, label }) => {
            channel.on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table,
                },
                (payload) => {
                    const notification = buildNotification(label, table, payload);
                    setNotifications((prev) => [notification, ...prev].slice(0, 15)); // keep last 15
                }
            );
        });

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id, buildNotification]);

    const markAllRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const clearAll = () => setNotifications([]);

    return {
        notifications,
        markAllRead,
        clearAll,
    };
}