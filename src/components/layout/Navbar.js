import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { FaUserCircle } from "react-icons/fa";

const navItems = [
    { to: '/', label: 'Home' },
    { to: '/resources', label: 'Resources' },
    { to: '/marketplace', label: 'Marketplace' },
    { to: '/housing', label: 'Housing & To-Let' },
    { to: '/safety', label: 'Safety' },
    { to: '/conversations', label: 'Chat' },
];

const watchedTables = [
    { table: 'resources', label: 'Resource update' },
    { table: 'products', label: 'Marketplace update' },
    { table: 'product_images', label: 'Marketplace image update' },
    { table: 'conversations', label: 'Conversation update' },
    { table: 'messages', label: 'New message' },
    { table: 'cr', label: 'CR role update' },
    { table: 'sos_events', label: 'Safety update' },
];

export default function Navbar({ session }) {
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);

    const mountedRef = useRef(true);

    const unreadCount = useMemo(() => {
        return notifications.filter((item) => !item.read).length;
    }, [notifications]);

    const fetchProfile = useCallback(async () => {
        if (!session?.user?.id) return;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

            if (error) throw error;

            if (mountedRef.current) {
                setProfile(data);
            }
        } catch (error) {
            console.error('Navbar profile fetch error:', error.message);
        }
    }, [session?.user?.id]);

    useEffect(() => {
        mountedRef.current = true;
        fetchProfile();

        return () => {
            mountedRef.current = false;
        };
    }, [fetchProfile]);

    const buildNotification = useCallback((label, table, payload) => {
        const eventName = payload.eventType || 'UPDATE';

        let title = label;
        let description = `${eventName} on ${table}`;

        if (table === 'messages' && eventName === 'INSERT') {
            title = 'New message';
            description = 'A new chat message was added.';
        }

        if (table === 'resources') {
            title = 'Resource update';
            description = 'Academic resources were updated.';
        }

        if (table === 'products') {
            title = 'Marketplace update';
            description = 'A marketplace listing was updated.';
        }

        if (table === 'cr') {
            title = 'CR role update';
            description = 'CR assignment data changed.';
        }

        if (table === 'sos_events') {
            title = 'Safety alert update';
            description = 'SOS event data changed.';
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
        if (!session?.user?.id) return undefined;

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

                    setNotifications((prev) => [notification, ...prev].slice(0, 20));
                }
            );
        });

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id, buildNotification]);

    const markNotificationsRead = () => {
        setNotifications((prev) =>
            prev.map((item) => ({
                ...item,
                read: true,
            }))
        );
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setProfileOpen(false);
        navigate('/login');
    };

    const displayName =
        profile?.full_name ||
        profile?.name ||
        session?.user?.email?.split('@')[0] ||
        'User';

    const universityEmail =
        profile?.university_email ||
        session?.user?.email ||
        'No email';

    // const initials = displayName
    //     .split(' ')
    //     .filter(Boolean)
    //     .map((item) => item[0])
    //     .join('')
    //     .slice(0, 2)
    //     .toUpperCase();

    return (
        <header className="sticky top-0 z-50 border-b border-blue-100 bg-white/95 shadow-sm backdrop-blur">
            <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
                <Link to="/" className="flex items-center gap-3 no-underline">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#18004d] text-sm font-black text-yellow-400 shadow-lg">
                        UC
                    </span>

                    <span className="leading-tight">
                        <strong className="block text-lg font-black text-[#18004d]">
                            UniConnect
                        </strong>
                        <small className="text-xs font-semibold text-slate-500">
                            CSE Departmental Hub
                        </small>
                    </span>
                </Link>

                <div className="hidden items-center gap-1 lg:flex">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `rounded-full px-4 py-2 text-sm font-bold transition ${isActive
                                    ? 'bg-[#18004d] text-white'
                                    : 'text-slate-700 hover:bg-blue-50 hover:text-[#18004d]'
                                }`
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </div>

                <div className="flex items-center gap-3">

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setProfileOpen((prev) => !prev);
                                setNotificationsOpen(false);
                            }}
                            className="grid h-11 w-11 place-items-center rounded-full border border-blue-100 bg-white text-[#18004d] shadow-sm transition hover:bg-blue-50"
                            title="Profile"
                        >
                            <FaUserCircle className="text-3xl" />
                        </button>

                        {profileOpen && (
                            <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl">
                                <div className="bg-gradient-to-r from-[#061A40] via-[#123C69] to-[#1E88E5] p-5 text-white">
                                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-yellow-400 text-[#18004d]">
                                        <FaUserCircle className="text-4xl" />
                                    </div>

                                    <h3 className="mt-3 font-black">
                                        {displayName}
                                    </h3>

                                    <p className="mt-1 break-all text-xs text-blue-100">
                                        {universityEmail}
                                    </p>
                                </div>

                                <div className="p-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProfileOpen(false);
                                            navigate('/my-listings');
                                        }}
                                        className="w-full rounded-2xl px-4 py-3 text-left text-sm font-bold text-[#18004d] hover:bg-blue-50"
                                    >
                                        My Listings
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProfileOpen(false);
                                            navigate('/conversations');
                                        }}
                                        className="w-full rounded-2xl px-4 py-3 text-left text-sm font-bold text-[#18004d] hover:bg-blue-50"
                                    >
                                        My Chats
                                    </button>

                                    <button
                                        type="button"
                                        onClick={logout}
                                        className="mt-2 w-full rounded-2xl bg-yellow-400 px-4 py-3 text-left text-sm font-black text-[#18004d] hover:bg-yellow-300"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                setNotificationsOpen((prev) => !prev);
                                setProfileOpen(false);
                                markNotificationsRead();
                            }}
                            className="relative grid h-11 w-11 place-items-center rounded-full border border-blue-100 bg-white text-lg text-[#18004d] shadow-sm hover:bg-blue-50"
                            title="Notifications"
                        >
                            🔔

                            {unreadCount > 0 && (
                                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {notificationsOpen && (
                            <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl">
                                <div className="flex items-center justify-between border-b border-blue-100 px-4 py-3">
                                    <h3 className="font-black text-[#18004d]">
                                        Notifications
                                    </h3>

                                    {notifications.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={clearNotifications}
                                            className="text-xs font-bold text-red-600 hover:text-red-700"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>

                                <div className="max-h-96 overflow-y-auto p-3">
                                    {notifications.length === 0 ? (
                                        <p className="py-8 text-center text-sm text-slate-500">
                                            No notifications yet.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {notifications.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="rounded-2xl bg-blue-50 p-3"
                                                >
                                                    <p className="text-sm font-black text-[#18004d]">
                                                        {item.title}
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-600">
                                                        {item.description}
                                                    </p>

                                                    <p className="mt-2 text-[11px] font-semibold text-slate-400">
                                                        {new Date(item.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>



                    <button
                        type="button"
                        onClick={() => setMobileOpen((prev) => !prev)}
                        className="grid h-11 w-11 place-items-center rounded-full border border-blue-100 bg-white text-xl text-[#18004d] lg:hidden"
                    >
                        ☰
                    </button>
                </div>
            </nav>

            {mobileOpen && (
                <div className="border-t border-blue-100 bg-white px-6 py-4 lg:hidden">
                    <div className="mx-auto flex max-w-7xl flex-col gap-2">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                onClick={() => setMobileOpen(false)}
                                className={({ isActive }) =>
                                    `rounded-2xl px-4 py-3 text-sm font-bold ${isActive
                                        ? 'bg-[#18004d] text-white'
                                        : 'text-slate-700 hover:bg-blue-50 hover:text-[#18004d]'
                                    }`
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </div>
                </div>
            )}
        </header>
    );
}