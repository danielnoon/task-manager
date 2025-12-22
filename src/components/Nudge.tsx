import { Nudge as NudgeType } from '../lib/types';

interface NudgeProps {
    todayCount: number;
    completedCount: number;
    activeNudge: NudgeType | null;
    onDismiss: () => void;
}

export default function Nudge({
    todayCount,
    completedCount,
    activeNudge,
    onDismiss
}: NudgeProps) {
    const getGreeting = (): string => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning!';
        if (hour < 17) return 'Good afternoon!';
        return 'Good evening!';
    };

    const getMessage = (): string => {
        if (activeNudge) {
            return activeNudge.message;
        }

        if (todayCount === 0 && completedCount === 0) {
            return "Your slate is clean. Add something to keep track of, or just enjoy the peace. ✨";
        }

        if (todayCount === 0 && completedCount > 0) {
            return `All caught up! You've knocked out ${completedCount} ${completedCount === 1 ? 'thing' : 'things'} today. Nice work! 🎯`;
        }

        if (completedCount > 0) {
            const remaining = todayCount;
            return `${completedCount} down, ${remaining} to go. You're making progress! 💪`;
        }

        if (todayCount === 1) {
            return "Just one thing on your plate. You've got this! 🌟";
        }

        if (todayCount <= 3) {
            return `${todayCount} things to tackle — a very doable day ahead.`;
        }

        if (todayCount <= 5) {
            return `${todayCount} things waiting for you. Pick one to start — the rest will follow.`;
        }

        return `${todayCount} things on your mind. Want to pick the most important one to focus on first?`;
    };

    // Progress calculation
    const total = todayCount + completedCount;
    const progress = total === 0 ? 100 : (completedCount / total) * 100;

    return (
        <div className={`nudge ${activeNudge ? 'is-ai' : ''}`}>
            <div className="nudge-content">
                <div className="nudge-orb" />
                <div className="nudge-text">
                    <p className="nudge-message">
                        {!activeNudge && <strong>{getGreeting()}</strong>} {getMessage()}
                    </p>
                    {!activeNudge && (todayCount > 0 || completedCount > 0) && (
                        <p className="nudge-stats">
                            <span className="nudge-stat-highlight">{completedCount}</span> completed
                            {todayCount > 0 && (
                                <>
                                    {' · '}
                                    <span className="nudge-stat-highlight">{todayCount}</span> remaining
                                </>
                            )}
                        </p>
                    )}
                </div>

                {/* Progress Ring */}
                <div className="nudge-progress">
                    <svg width="44" height="44" viewBox="0 0 44 44">
                        <circle className="nudge-progress-bg" cx="22" cy="22" r="18" />
                        <circle
                            className="nudge-progress-fill"
                            cx="22" cy="22" r="18"
                            strokeDasharray={2 * Math.PI * 18}
                            strokeDashoffset={2 * Math.PI * 18 * (1 - progress / 100)}
                        />
                    </svg>
                    <span className="nudge-progress-value">{Math.round(progress)}%</span>
                </div>
            </div>

            {/* Dismiss button for active nudge */}
            {activeNudge && (
                <button
                    className="nudge-dismiss"
                    onClick={onDismiss}
                    title="Dismiss"
                >
                    ✕
                </button>
            )}
        </div>
    );
}
