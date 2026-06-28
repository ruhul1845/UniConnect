import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { FaUserCircle } from 'react-icons/fa';
import { FiLogOut } from 'react-icons/fi';
import useNotifications from '../../hook/useNotifications';
import { NotificationPanel, NotificationCenter } from '../NotificationComponents';

const navItems = [
    { to: '/', label: 'Home' },
    { to: '/resources', label: 'Resources' },
    { to: '/marketplace', label: 'Marketplace' },
    { to: '/housing', label: 'Housing & To-Let' },
    { to: '/safety', label: 'Safety' },
];

export default function Navbar({ session, profile }) {
    const navigate = useNavigate();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);

    const { notifications, unreadCount, isInitialized, markAsRead, markAllRead, clearAll } = useNotifications(session);
    const [toastNotifications, setToastNotifications] = useState([]);
    const previousNotificationIdsRef = useRef(new Set());
    const didLoadInitialNotificationsRef = useRef(false);

    useEffect(() => {
        if (!isInitialized || !session?.user?.id) return;

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
    }, [isInitialized, notifications, session?.user?.id]);

    const dismissToast = useCallback((notifId) => {
        setToastNotifications((prev) => prev.filter((n) => n.id !== notifId));
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        setProfileOpen(false);
        setNotificationsOpen(false);
        navigate('/');
    };

    const isAdmin = profile?.is_admin === true || String(profile?.role || '').toLowerCase() === 'admin';

    const visibleNavItems = isAdmin
        ? [...navItems, { to: '/admin', label: 'Admin' }]
        : navItems;

    const displayName =
        profile?.full_name ||
        profile?.name ||
        session?.user?.email?.split('@')[0] ||
        'User';

    const universityEmail =
        profile?.university_email ||
        profile?.mail ||
        session?.user?.email ||
        'No email';

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-blue-100 bg-white/95 shadow-sm backdrop-blur">
                <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
                    <button
                        type="button"
                        onClick={() => setMobileOpen((prev) => !prev)}
                        className="grid h-11 w-11 place-items-center rounded-full border border-blue-100 bg-white text-xl text-[#18004d] md:hidden"
                    >
                        ☰
                    </button>

                    <Link to="/" className="hidden md:flex items-center gap-3 no-underline">
                        <img src="/logonav.png" alt="UniConnect" className="h-12 w-12 rounded-xl object-contain shadow-md" />
                        <span className="leading-tight">
                            <strong className="block text-lg font-black text-[#18004d]">UniConnect</strong>
                            <small className="text-xs font-semibold text-slate-500">CSE Departmental Hub</small>
                        </span>
                    </Link>

                    <div className="hidden items-center gap-1 lg:flex">
                        {visibleNavItems.map((item) => (
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

                    <div className="flex items-center gap-3">
                        {!session ? (
                            <>
                                <Link
                                    to="/login"
                                    className="rounded-full px-4 py-2 text-sm font-black text-[#18004d] hover:bg-blue-50"
                                >
                                    Login
                                </Link>

                                <Link
                                    to="/signup"
                                    className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-black text-[#18004d] hover:bg-yellow-300"
                                >
                                    Create Account
                                </Link>
                            </>
                        ) : (
                            <>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNotificationsOpen((prev) => !prev);
                                            setProfileOpen(false);
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
                                        onMarkRead={markAsRead}
                                        onClearAll={clearAll}
                                        isOpen={notificationsOpen}
                                        onClose={() => setNotificationsOpen(false)}
                                    />
                                </div>

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
                                        {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <FaUserCircle className="text-3xl" />}
                                    </button>

                                    {profileOpen && (
                                        <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl">
                                            <div className="bg-gradient-to-r from-[#061A40] via-[#123C69] to-[#1E88E5] p-5 text-white">
                                                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-yellow-400 text-[#18004d]">
                                                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-2xl object-cover" /> : <FaUserCircle className="text-4xl" />}
                                                </div>
                                                <h3 className="mt-3 font-black">{displayName}</h3>
                                                <p className="mt-1 break-all text-xs text-blue-100">{universityEmail}</p>
                                            </div>

                                            <div className="p-3">
                                                <button
                                                    type="button"
                                                    onClick={() => { setProfileOpen(false); navigate('/dashboard'); }}
                                                    className="w-full rounded-2xl px-4 py-3 text-left text-sm font-bold text-[#18004d] hover:bg-blue-50"
                                                >
                                                    My Dashboard
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setProfileOpen(false); navigate('/dashboard?view=profile'); }}
                                                    className="w-full rounded-2xl px-4 py-3 text-left text-sm font-bold text-[#18004d] hover:bg-blue-50"
                                                >
                                                    My Profile
                                                </button>
                                                {isAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setProfileOpen(false);
                                                            navigate('/admin');
                                                        }}
                                                        className="w-full rounded-2xl px-4 py-3 text-left text-sm font-bold text-[#18004d] hover:bg-blue-50"
                                                    >
                                                        Admin Dashboard
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={logout}
                                                    className="mt-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-[#18004d] hover:bg-blue-50"
                                                >
                                                    <FiLogOut className="text-lg" /> Logout
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={() => setMobileOpen((prev) => !prev)}
                            className="hidden h-11 w-11 place-items-center rounded-full border border-blue-100 bg-white text-xl text-[#18004d] md:grid lg:hidden"
                        >
                            ☰
                        </button>
                    </div>
                </nav>

                {mobileOpen && (
                    <div className="border-t border-blue-100 bg-white px-6 py-4 lg:hidden">
                        <div className="mx-auto flex max-w-7xl flex-col gap-2">
                            {visibleNavItems.map((item) => (
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

            {session && (
                <NotificationCenter
                    notifications={toastNotifications}
                    onDismiss={dismissToast}
                />
            )}
        </>
    );
}
