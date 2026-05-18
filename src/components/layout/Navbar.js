import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { FaUserCircle } from "react-icons/fa";
import useNotifications from '../../hook/useNotifications';
import { NotificationPanel, NotificationCenter } from '../NotificationComponents';

const navItems = [
    { to: '/', label: 'Home' },
    { to: '/resources', label: 'Resources' },
    { to: '/marketplace', label: 'Marketplace' },
    { to: '/housing', label: 'Housing & To-Let' },
    { to: '/safety', label: 'Safety' },
];

export default function Navbar({ session }) {
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);

    const mountedRef = useRef(true);

    const { notifications, unreadCount, isInitialized, markAllRead, clearAll } = useNotifications(session);
    const [toastNotifications, setToastNotifications] = useState([]);
    const previousNotificationIdsRef = useRef(new Set());
    const didLoadInitialNotificationsRef = useRef(false);

    // Show toast only for new realtime notifications, not for old rows loaded from DB.
    useEffect(() => {
        if (!isInitialized) return;

        const currentIds = new Set(notifications.map((notif) => notif.id));

        if (!didLoadInitialNotificationsRef.current) {
            previousNotificationIdsRef.current = currentIds;
            didLoadInitialNotificationsRef.current = true;
            return;
        }

        const newNotifs = notifications.filter(
            (notif) => !previousNotificationIdsRef.current.has(notif.id)
        );

        if (newNotifs.length > 0) {
            setToastNotifications((prev) => [...newNotifs, ...prev].slice(0, 5));
        }

        previousNotificationIdsRef.current = currentIds;
    }, [isInitialized, notifications]);

    const dismissToast = useCallback((notifId) => {
        setToastNotifications((prev) => prev.filter((n) => n.id !== notifId));
    }, []);

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

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-blue-100 bg-white/95 shadow-sm backdrop-blur">
                <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
                    {/* Mobile menu button - left side only on sm */}
                    <button
                        type="button"
                        onClick={() => setMobileOpen((prev) => !prev)}
                        className="grid h-11 w-11 place-items-center rounded-full border border-blue-100 bg-white text-xl text-[#18004d] md:hidden"
                    >
                        ☰
                    </button>

                    {/* Logo - hidden on sm, visible md+ */}
                    <Link to="/" className="hidden md:flex items-center gap-3 no-underline">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#18004d] text-sm font-black text-yellow-400 shadow-lg">
                            UC
                        </span>
                        <span className="leading-tight">
                            <strong className="block text-lg font-black text-[#18004d]">UniConnect</strong>
                            <small className="text-xs font-semibold text-slate-500">CSE Departmental Hub</small>
                        </span>
                    </Link>

                    {/* Desktop nav links */}
                    <div className="hidden items-center gap-1 lg:flex">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `px-4 py-2 text-sm font-bold transition ${isActive
                                        ? 'border-b-2 border-[#18004d] text-[#18004d]'
                                        : 'text-slate-700 hover:bg-blue-50 hover:text-[#18004d]'
                                    }`
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </div>

                    {/* Right side: notification + profile + md menu */}
                    <div className="flex items-center gap-3">
                        {/* Notifications Button */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setNotificationsOpen((prev) => !prev);
                                    setProfileOpen(false);
                                    markAllRead();
                                }}
                                className="relative grid h-11 w-11 place-items-center text-[#18004d] hover:bg-blue-50 rounded-full transition"
                                title="Notifications"
                            >
                                🔔
                                {unreadCount > 0 && (
                                    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white animate-pulse">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            <NotificationPanel
                                notifications={notifications}
                                unreadCount={unreadCount}
                                onMarkAllRead={markAllRead}
                                onClearAll={clearAll}
                                isOpen={notificationsOpen}
                                onClose={() => setNotificationsOpen(false)}
                            />
                        </div>

                        {/* Profile Button */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setProfileOpen((prev) => !prev);
                                    setNotificationsOpen(false);
                                }}
                                className="grid h-11 w-11 place-items-center rounded-full text-[#18004d] shadow-sm transition hover:bg-blue-50"
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
                                        <h3 className="mt-3 font-black">{displayName}</h3>
                                        <p className="mt-1 break-all text-xs text-blue-100">{universityEmail}</p>
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

                        {/* Tablet menu button - md only, hidden lg */}
                        <button
                            type="button"
                            onClick={() => setMobileOpen((prev) => !prev)}
                            className="hidden h-11 w-11 place-items-center rounded-full border border-blue-100 bg-white text-xl text-[#18004d] md:grid lg:hidden"
                        >
                            ☰
                        </button>
                    </div>
                </nav>

                {/* Mobile nav */}
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
            {/* Floating Toast Notifications */}
            <NotificationCenter
                notifications={toastNotifications}
                onDismiss={dismissToast}
            />
        </>
    );
}