import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function HomeNotificationFeed() {
    const [currentSession, setCurrentSession] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    // Get logged-in session directly from Supabase
    useEffect(() => {
        const getCurrentSession = async () => {
            const { data, error } = await supabase.auth.getSession();

            if (error) {
                console.error('Get session error:', error.message);
                setCurrentSession(null);
            } else {
                setCurrentSession(data.session);
            }
        };

        getCurrentSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setCurrentSession(session);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!currentSession?.user?.id) {
            setLoading(false);
            return;
        }

        const userId = currentSession.user.id;

        const fetchNotifications = async () => {
            try {
                setLoading(true);

                const { data, error } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (error) throw error;

                setNotifications(data || []);
            } catch (error) {
                console.error('Home notification fetch error:', error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();

        const channel = supabase
            .channel(`home-notifications-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setNotifications((prev) => [payload.new, ...prev].slice(0, 10));
                    }

                    if (payload.eventType === 'UPDATE') {
                        setNotifications((prev) =>
                            prev.map((item) =>
                                item.id === payload.new.id ? payload.new : item
                            )
                        );
                    }

                    if (payload.eventType === 'DELETE') {
                        setNotifications((prev) =>
                            prev.filter((item) => item.id !== payload.old.id)
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentSession?.user?.id]);

    const slideItems = useMemo(() => {
        if (notifications.length <= 3) return notifications;
        return [...notifications, ...notifications];
    }, [notifications]);

    const formatDate = (dateValue) => {
        if (!dateValue) return { day: '--', month: '---' };

        const date = new Date(dateValue);

        return {
            day: date.getDate(),
            month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
        };
    };

    return (
        <div className="overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-xl">
            <style>
                {`
          @keyframes notificationSlideUp {
            0% {
              transform: translateY(0);
            }
            100% {
              transform: translateY(-50%);
            }
          }
        `}
            </style>

            <div className="p-6 pb-4">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-black text-[#18004d]">Latest Updates</h3>

                    {notifications.length > 0 && (
                        <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-black text-[#18004d]">
                            {notifications.length}
                        </span>
                    )}
                </div>
            </div>

            <div className={`relative overflow-hidden px-4 pb-5 ${loading || notifications.length > 3 ? 'h-[410px]' : ''}`}>
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((item) => (
                            <div
                                key={item}
                                className="h-24 animate-pulse rounded-2xl bg-blue-50"
                            />
                        ))}
                    </div>
                ) : !currentSession?.user?.id ? (
                    <div className="rounded-2xl bg-blue-50 p-5 text-sm font-bold text-slate-600">
                        Login to see your latest notifications.
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="rounded-2xl bg-blue-50 p-5 text-sm font-bold text-slate-600">
                        No notifications yet.
                    </div>
                ) : (
                    <div
                        className={`space-y-3 ${notifications.length > 3
                                ? 'animate-[notificationSlideUp_18s_linear_infinite] hover:[animation-play-state:paused]'
                                : ''
                            }`}
                    >
                        {slideItems.map((notif, index) => {
                            const date = formatDate(notif.created_at);

                            return (
                                <div
                                    key={`${notif.id}-${index}`}
                                    className="flex items-center gap-4 rounded-2xl bg-blue-50 p-4 shadow-sm transition hover:bg-yellow-50"
                                >
                                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-yellow-400 text-center text-[#18004d]">
                                        <span className="leading-none">
                                            <strong className="block text-sm font-black">
                                                {date.day}
                                            </strong>
                                            <small className="block text-[9px] font-black">
                                                {date.month}
                                            </small>
                                        </span>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h4 className="line-clamp-1 text-sm font-black text-[#18004d]">
                                            {notif.title || 'Notification'}
                                        </h4>

                                        <p className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-[#18004d]">
                                            {notif.message || 'New update available.'}
                                        </p>
                                    </div>

                                    {!notif.is_read && (
                                        <span className="h-3 w-3 shrink-0 rounded-full bg-red-500" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {notifications.length > 3 && (
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
                )}
            </div>
        </div>
    );
}
