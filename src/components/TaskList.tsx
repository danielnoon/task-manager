import { Task } from '../lib/types';
import { ViewFilter } from '../lib/types';
import TaskCard from './TaskCard';
import { useTaskStore } from '../stores/taskStore';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainerFast, fadeInUpSmall, fadeInScale, iconBounceIn, slideUp, slideInRight } from '../constants/animations';
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

    // Empty state
    if (tasks.length === 0) {
        return (
            <motion.div
                className="task-list-empty"
                variants={fadeInScale}
                initial="hidden"
                animate="visible"
                exit="hidden"
            >
                <motion.div
                    className="task-list-empty-icon"
                    variants={iconBounceIn}
                    initial="hidden"
                    animate="visible"
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
                        variants={slideUp}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
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
                        variants={slideInRight}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
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
                variants={staggerContainerFast}
                initial="hidden"
                animate="visible"
            >
                {tasks.map((task) => (
                    <motion.div
                        key={task.id}
                        variants={fadeInUpSmall}
                    >
                        <TaskCard task={task} />
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}
