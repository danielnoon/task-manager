import { useEffect, useMemo } from 'react';
import { useTaskStore } from '../stores/taskStore';
import TaskCard from './TaskCard';
import { motion, AnimatePresence } from 'framer-motion';

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

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
                delayChildren: 0.02
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 12 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: 'spring' as const,
                stiffness: 500,
                damping: 35
            }
        }
    };

    return (
        <motion.div
            className="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            {/* Loading state while generating Focus Queue */}
            {isAnalyzing && (
                <motion.div
                    className="plan-cta"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <span className="plan-button-text">Generating Focus Queue...</span>
                </motion.div>
            )}

            {/* Task Lists */}
            <div className="dashboard-content">
                {focusTasks.length > 0 && (
                    <section className="task-section focus-section">
                        <h2 className="section-title">
                            <span className="section-icon">🎯</span>
                            Focus Queue
                        </h2>
                        <motion.div
                            className="task-grid"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            {focusTasks.map((task, index) => (
                                <motion.div
                                    key={task.id}
                                    variants={itemVariants}
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
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            {otherTodayTasks.map((task) => (
                                <motion.div
                                    key={task.id}
                                    variants={itemVariants}
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="empty-check">✓</div>
                    <p>Nothing on the agenda</p>
                </motion.div>
            )}
        </motion.div>
    );
}
