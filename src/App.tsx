import { useEffect, useState } from 'react';
import { useTaskStore } from './stores/taskStore';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import Dashboard from './components/Dashboard';
import FilterBar from './components/FilterBar';
import Nudge from './components/Nudge';
import SettingsModal from './components/SettingsModal';
import './App.css';

// Animation variants for staggered entrance
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.06,
            delayChildren: 0.05
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 16 },
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

export default function App() {
    const {
        loadTasks,
        loadSettings,
        loadActiveNudge,
        isLoading,
        filteredTasks,
        todayTaskCount,
        completedTodayCount,
        activeNudge,
        dismissNudge,
        activeFilter
    } = useTaskStore();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        loadTasks();
        loadSettings();
        loadActiveNudge();

        // Listen for refreshes (e.g. from Quick Entry)
        const unsubscribe = window.drift.events?.onRefreshTasks?.(() => {
            loadTasks();
            // Also refresh stats/nudges
            loadActiveNudge();
        }) || (() => { });

        return () => unsubscribe();
    }, [loadTasks, loadSettings, loadActiveNudge]);

    const tasks = filteredTasks();
    const todayCount = todayTaskCount();
    const completedCount = completedTodayCount();

    return (
        <div className="app">
            <Header onSettingsClick={() => setIsSettingsOpen(true)} />

            <main className="main-content">
                <motion.div
                    className="content-container"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Welcome nudge or status */}
                    <motion.div variants={itemVariants}>
                        <Nudge
                            todayCount={todayCount}
                            completedCount={completedCount}
                            activeNudge={activeNudge}
                            onDismiss={dismissNudge}
                        />
                    </motion.div>

                    {/* Quick task input */}
                    <motion.div variants={itemVariants}>
                        <TaskInput />
                    </motion.div>

                    {/* Filter tabs */}
                    <motion.div variants={itemVariants}>
                        <FilterBar />
                    </motion.div>

                    {/* Task list */}
                    <motion.div variants={itemVariants}>
                        <AnimatePresence mode="wait" initial={false}>
                            {isLoading ? (
                                <motion.div
                                    key="loading"
                                    className="loading-state"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.1 }}
                                >
                                    <div className="loading-skeleton shimmer" />
                                    <div className="loading-skeleton shimmer" />
                                    <div className="loading-skeleton shimmer" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key={activeFilter}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.1 }}
                                >
                                    {activeFilter === 'today' ? (
                                        <Dashboard />
                                    ) : (
                                        <TaskList tasks={tasks} filter={activeFilter} />
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            </main>

            {/* Settings Modal */}
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
}
