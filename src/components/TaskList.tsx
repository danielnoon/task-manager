import { Task } from '../lib/types';
import { ViewFilter } from '../lib/types';
import TaskCard from './TaskCard';
import { useTaskStore } from '../stores/taskStore';
import { motion, AnimatePresence } from 'framer-motion';
import './TaskList.css';

interface TaskListProps {
    tasks: Task[];
    filter: ViewFilter;
}

export default function TaskList({ tasks, filter }: TaskListProps) {
    const { todayTaskCount, clearCompleted } = useTaskStore();

    // Use the passed filter prop instead of activeFilter from store
    // This ensures exiting components maintain their original state
    const isSmartView = filter === 'today' && todayTaskCount() === 0 && tasks.length > 0;
    const showClearButton = filter === 'completed' && tasks.length > 0;

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.04,
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

    // Empty state
    if (tasks.length === 0) {
        return (
            <motion.div
                className="task-list-empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
            >
                <motion.div
                    className="task-list-empty-icon"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring' as const, stiffness: 400, damping: 20 }}
                >
                    {filter === 'completed' ? '🎉' : '✨'}
                </motion.div>
                <p className="task-list-empty-text">
                    {filter === 'completed'
                        ? "No completed tasks yet"
                        : filter === 'upcoming'
                            ? "Nothing scheduled ahead"
                            : "Your mind is clear!"}
                </p>
                <p className="task-list-empty-hint">
                    {filter === 'completed'
                        ? "Complete some tasks to see them here"
                        : "Add a task above to get started"}
                </p>
            </motion.div>
        );
    }

    return (
        <div className="task-list">
            {/* Smart view header */}
            <AnimatePresence>
                {isSmartView && (
                    <motion.div
                        className="smart-view-header"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <span className="smart-view-icon">✨</span>
                        <span className="smart-view-text">You're all caught up! Here's what's next:</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Clear completed button */}
            <AnimatePresence>
                {showClearButton && (
                    <motion.div
                        className="list-actions"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}
                    >
                        <button
                            onClick={clearCompleted}
                            className="btn-text danger"
                        >
                            Clear Completed
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Task cards */}
            <motion.div
                className="task-grid"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {tasks.map((task) => (
                    <motion.div
                        key={task.id}
                        variants={itemVariants}
                    >
                        <TaskCard task={task} />
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}
