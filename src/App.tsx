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
import LoadingState from './components/LoadingState';
import { staggerContainer, fadeInUp, fadeIn } from './constants/animations';
import './App.css';

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
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Welcome nudge or status */}
                    <motion.div variants={fadeInUp}>
                        <Nudge
                            todayCount={todayCount}
                            completedCount={completedCount}
                            activeNudge={activeNudge}
                            onDismiss={dismissNudge}
                        />
                    </motion.div>

                    {/* Quick task input */}
                    <motion.div variants={fadeInUp}>
                        <TaskInput />
                    </motion.div>

                    {/* Filter tabs */}
                    <motion.div variants={fadeInUp}>
                        <FilterBar />
                    </motion.div>

                    {/* Task list */}
                    <motion.div variants={fadeInUp}>
                        <AnimatePresence mode="wait" initial={false}>
                            {isLoading ? (
                                <LoadingState key="loading" count={3} height={72} />
                            ) : (
                                <motion.div
                                    key={activeFilter}
                                    variants={fadeIn}
                                    initial="hidden"
                                    animate="visible"
                                    exit="hidden"
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
