import { useEffect, useState } from 'react';

/**
 * NotificationToast - Shows individual notifications with auto-slide animation
 */
export function NotificationToast({ notification, onDismiss, autoSlideIn = true }) {
    const [isVisible, setIsVisible] = useState(!autoSlideIn);

    useEffect(() => {
        if (autoSlideIn) {
            const timer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(timer);
        }
    }, [autoSlideIn]);

    useEffect(() => {
        // Auto-dismiss after 5 seconds
        const timer = setTimeout(() => {
            setIsVisible(false);
            const dismissTimer = setTimeout(onDismiss, 300);
            return () => clearTimeout(dismissTimer);
        }, 5000);

        return () => clearTimeout(timer);
    }, [onDismiss]);

    const colorClasses = {
        blue: 'border-blue-200 bg-blue-50 text-blue-900',
        purple: 'border-purple-200 bg-purple-50 text-purple-900',
        green: 'border-green-200 bg-green-50 text-green-900',
        red: 'border-red-200 bg-red-50 text-red-900',
    };

    const color = notification.color || 'blue';

    return (
        <div
            className={`transform transition-all duration-300 ${isVisible
                    ? 'translate-x-0 opacity-100'
                    : 'translate-x-full opacity-0'
                }`}
        >
            <div className={`border rounded-2xl p-4 shadow-lg ${colorClasses[color]}`}>
                <div className="flex items-start gap-3">
                    <span className="text-2xl">{notification.icon}</span>
                    <div className="flex-1">
                        <p className="font-black text-sm">{notification.title}</p>
                        <p className="mt-1 text-xs">{notification.description}</p>
                        <p className="mt-2 text-[10px] opacity-60">
                            {new Date(notification.createdAt).toLocaleTimeString()}
                        </p>
                    </div>
                    <button
                        onClick={onDismiss}
                        className="text-lg opacity-50 hover:opacity-100"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * NotificationCenter - Displays sliding notifications in fixed position
 */
export function NotificationCenter({ notifications, onDismiss }) {
    const [displayedNotifs, setDisplayedNotifs] = useState(notifications);

    useEffect(() => {
        setDisplayedNotifs(notifications);
    }, [notifications]);

    return (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 max-w-md pointer-events-none">
            {displayedNotifs.map((notif) => (
                <div key={notif.id} className="pointer-events-auto">
                    <NotificationToast
                        notification={notif}
                        onDismiss={() => onDismiss(notif.id)}
                        autoSlideIn
                    />
                </div>
            ))}
        </div>
    );
}

/**
 * NotificationPanel - Shows all notifications in a dropdown/modal
 */
export function NotificationPanel({
    notifications,
    unreadCount,
    onMarkAllRead,
    onMarkRead,
    onClearAll,
    isOpen,
    onClose,
}) {
    if (!isOpen) return null;

    return (
        <div className="absolute right-0 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-white">
                <div>
                    <h3 className="font-black text-[#18004d]">Notifications</h3>
                    {unreadCount > 0 && (
                        <p className="text-xs text-slate-600">
                            {unreadCount} new notification{unreadCount !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
                {notifications.length > 0 && (
                    <div className="flex gap-2">
                        <button
                            onClick={onMarkAllRead}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-100 transition"
                        >
                            Mark all read
                        </button>
                        <button
                            onClick={onClearAll}
                            className="text-xs font-bold text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-100 transition"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-4xl">🔔</p>
                        <p className="mt-3 text-sm text-slate-500">No notifications yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-blue-100">
                        {notifications.map((notif) => (
                            <button
                                type="button"
                                onClick={() => !notif.read && onMarkRead?.(notif.id)}
                                key={notif.id}
                                className={`w-full p-4 text-left transition ${notif.read ? 'bg-white hover:bg-slate-50' : 'bg-[#f4f7fb] hover:bg-blue-50'}`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">{notif.icon}</span>
                                    <div className="flex-1">
                                        <p className="font-black text-sm text-[#18004d]">
                                            {notif.title}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-600">
                                            {notif.description}
                                        </p>
                                        {notif.itemTitle && (
                                            <p className="mt-1 text-[11px] font-bold text-slate-500">
                                                Item: {notif.itemTitle}
                                            </p>
                                        )}
                                        <p className="mt-2 text-[11px] text-slate-400">
                                            {new Date(notif.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    {!notif.read && (
                                        <div className="h-2 w-2 rounded-full bg-blue-600 mt-1" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
