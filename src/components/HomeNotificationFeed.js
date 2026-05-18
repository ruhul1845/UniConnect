import { useEffect, useState, useRef } from 'react';
import useNotifications from '../hook/useNotifications';

/**
 * HomeNotificationFeed - Displays 15 latest notifications with auto-scroll animation
 */
export function HomeNotificationFeed({ session }) {
    const { notifications, isInitialized, error } = useNotifications(session);
    const scrollContainerRef = useRef(null);
    const [displayedNotifs, setDisplayedNotifs] = useState([]);

    // Update displayed notifications
    useEffect(() => {
        setDisplayedNotifs(notifications.slice(0, 15));
    }, [notifications]);

    // Auto-scroll effect - notifications slide up
    useEffect(() => {
        if (displayedNotifs.length === 0 || !scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        let scrollInterval;
        let direction = 1; // 1 for down, -1 for up

        const scroll = () => {
            const maxScroll = container.scrollHeight - container.clientHeight;
            const currentScroll = container.scrollTop;

            // Change direction at edges
            if (currentScroll >= maxScroll - 10) {
                direction = -1; // scroll up
            } else if (currentScroll <= 10) {
                direction = 1; // scroll down
            }

            container.scrollTop += direction * 2;
        };

        // Start auto-scroll
        scrollInterval = setInterval(scroll, 50);

        // Pause on hover
        const pauseScroll = () => clearInterval(scrollInterval);
        const resumeScroll = () => {
            scrollInterval = setInterval(scroll, 50);
        };

        container.addEventListener('mouseenter', pauseScroll);
        container.addEventListener('mouseleave', resumeScroll);

        return () => {
            clearInterval(scrollInterval);
            container.removeEventListener('mouseenter', pauseScroll);
            container.removeEventListener('mouseleave', resumeScroll);
        };
    }, [displayedNotifs]);

    const colorMap = {
        blue: 'border-blue-200 bg-blue-50 text-blue-900',
        purple: 'border-purple-200 bg-purple-50 text-purple-900',
        green: 'border-green-200 bg-green-50 text-green-900',
        red: 'border-red-200 bg-red-50 text-red-900',
    };

    return (
        <section className="uc-section">
            <div className="uc-section-head">
                <div>
                    <p className="uc-eyebrow">Real-time Updates</p>
                    <h2>Latest Activity</h2>
                </div>
                <p className="text-sm text-slate-600">
                    {error
                        ? 'Notification error'
                        : isInitialized
                            ? `${displayedNotifs.length} recent update${displayedNotifs.length !== 1 ? 's' : ''}`
                            : 'Loading...'}
                </p>
            </div>

            {error ? (
                <div className="rounded-3xl border border-red-100 bg-red-50 p-8 text-center">
                    <p className="text-sm font-semibold text-red-700">Could not load notifications.</p>
                </div>
            ) : !isInitialized ? (
                <div className="rounded-3xl border border-blue-100 bg-blue-50 p-8 text-center">
                    <p className="text-sm font-semibold text-slate-600">Initializing notifications...</p>
                </div>
            ) : displayedNotifs.length === 0 ? (
                <div className="rounded-3xl border border-blue-100 bg-blue-50 p-8 text-center">
                    <p className="text-4xl">🔔</p>
                    <p className="mt-3 text-sm text-slate-600">
                        No activity yet. Check back soon!
                    </p>
                </div>
            ) : (
                <div
                    ref={scrollContainerRef}
                    className="max-h-96 overflow-y-auto rounded-3xl border border-blue-100 bg-white shadow-lg space-y-2 p-4 hover:overflow-y-auto"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {displayedNotifs.map((notif) => {
                        const colorClass = colorMap[notif.color] || colorMap.blue;
                        return (
                            <div
                                key={notif.id}
                                className={`border rounded-2xl p-4 transform transition-all duration-300 hover:scale-105 ${colorClass}`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-3xl flex-shrink-0">{notif.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-sm truncate">{notif.title}</p>
                                        <p className="mt-1 text-xs leading-relaxed">{notif.description}</p>
                                        <p className="mt-2 text-[10px] opacity-60">
                                            {new Date(notif.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 text-lg">📌</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default HomeNotificationFeed;
