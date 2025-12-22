import { useEffect, useMemo } from 'react';
import { useTaskStore } from '../stores/taskStore';
import TaskCard from './TaskCard';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainerUltraFast, fadeInUpSmall, fadeIn, delayedFadeIn } from '../constants/animations';
import './Dashboard.css';

export default function Dashboard() {
    const {
        tasks,
        focusQueue,
        loadFocusQueue,
        setFocusQueue,
        isAnalyzing,
        activeCategory,
    } = useTaskStore();

    // Load Focus Queue on mount and subscribe to updates
    useEffect(() => {
        loadFocusQueue();

        // Listen for focus queue updates from main process
        const unsubscribe = window.drift.focusQueue.onUpdated((queue) => {
            setFocusQueue(queue);
        });

        return () => unsubscribe();
    }, [loadFocusQueue, setFocusQueue]);

    // Filter tasks for the dashboard
    const { focusTasks, otherTodayTasks } = useMemo(() => {
        const now = new Date();

        // Filter by category first if active
        const relevantTasks = activeCategory
            ? tasks.filter(t => t.category === activeCategory)
            : tasks;

        // Today = active + (no dueDate OR dueDate <= now)
        const todayTasks = relevantTasks.filter(t =>
            t.status === 'active' &&
            (!t.dueDate || new Date(t.dueDate) <= now)
        );

        if (focusQueue?.focusedTaskIds) {
            // Focused tasks come from ALL active tasks (AI may pick future tasks)
            // But we should also check if they match the category filter if we want strict filtering,
            // though usually Focus Queue is "what I must do irrespective of category".
            // However, user asked for "smart today view filtered by category chips".
            // So we will filter focused tasks by category as well.
            const focused = focusQueue.focusedTaskIds
                .map(id => relevantTasks.find(t => t.id === id && t.status === 'active'))
                .filter((t): t is typeof t & {} => !!t);

            const focusedIds = new Set(focused.map(t => t.id));
            // "Others" are remaining today-eligible tasks not in focus
            const others = todayTasks.filter(t => !focusedIds.has(t.id));

            return { focusTasks: focused, otherTodayTasks: others };
        }

        return { focusTasks: [], otherTodayTasks: todayTasks };
    }, [tasks, focusQueue, activeCategory]);

    // Progress Calculation — based on all today tasks
    const completedToday = useTaskStore(s => s.completedTodayCount());
    const totalToday = focusTasks.length + otherTodayTasks.length + completedToday;
    const progress = totalToday === 0 ? 100 : (completedToday / totalToday) * 100;

    return (
        <motion.div
            className="dashboard"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
        >
            {/* Loading state while generating Focus Queue */}
            {isAnalyzing && (
                <motion.div
                    className="plan-cta"
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                >
                    <span className="plan-button-text">Generating Focus Queue...</span>
                </motion.div>
            )}

            {/* Task Lists */}
            <div className="dashboard-content">
                {focusTasks.length > 0 && (
                    <section className="task-section focus-section">
                        <motion.div
                            className="task-grid"
                            variants={staggerContainerUltraFast}
                            initial="hidden"
                            animate="visible"
                        >
                            {focusTasks.map((task, index) => (
                                <motion.div
                                    key={task.id}
                                    variants={fadeInUpSmall}
                                    className="task-card-wrapper"
                                >
                                    <TaskCard task={task} />
                                </motion.div>
                            ))}
                        </motion.div>
                    </section>
                )}

                {otherTodayTasks.length > 0 && (
                    <section className="task-section">
                        <h2 className="section-title">
                            {focusTasks.length > 0 ? 'Up Next' : 'Today'}
                        </h2>
                        <motion.div
                            className="task-grid"
                            variants={staggerContainerUltraFast}
                            initial="hidden"
                            animate="visible"
                        >
                            {otherTodayTasks.map((task) => (
                                <motion.div
                                    key={task.id}
                                    variants={fadeInUpSmall}
                                    className="task-card-wrapper"
                                >
                                    <TaskCard task={task} />
                                </motion.div>
                            ))}
                        </motion.div>
                    </section>
                )}
            </div>

            {/* Empty State — Clean, minimal */}
            {focusTasks.length === 0 && otherTodayTasks.length === 0 && (
                <motion.div
                    className="dashboard-empty"
                    initial="hidden"
                    animate="visible"
                    transition={delayedFadeIn}
                >
                    <div className="empty-check">✓</div>
                    <p>Nothing on the agenda</p>
                </motion.div>
            )}
        </motion.div>
    );
}
