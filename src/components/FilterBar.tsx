import { useTaskStore } from '../stores/taskStore';
import { ViewFilter } from '../lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { springTransition, collapseExpand, hoverScale } from '../constants/animations';
import './FilterBar.css';

const filters: { key: ViewFilter; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'all', label: 'All' },
    { key: 'completed', label: 'Done' },
];

export default function FilterBar() {
    const {
        activeFilter,
        setFilter,
        tasks,
        activeCategory,
        setCategoryFilter,
        uniqueCategories
    } = useTaskStore();

    const categories = uniqueCategories();

    const getCount = (filter: ViewFilter): number => {
        switch (filter) {
            case 'today':
                return tasks.filter(t => t.status === 'active' && (!t.dueDate || new Date(t.dueDate) <= new Date())).length;
            case 'upcoming':
                return tasks.filter(t => t.status === 'active' && t.dueDate && new Date(t.dueDate) > new Date()).length;
            case 'completed':
                return tasks.filter(t => t.status === 'completed').length;
            case 'all':
                return tasks.filter(t => t.status === 'active').length;
            default:
                return 0;
        }
    };

    return (
        <div className="filter-bar-container">
            {/* View filters */}
            <div className="filter-bar">
                {filters.map(({ key, label }) => (
                    <button
                        key={key}
                        className={`filter-btn ${activeFilter === key ? 'active' : ''}`}
                        onClick={() => setFilter(key)}
                    >
                        {label}
                        <span className="filter-count">({getCount(key)})</span>
                        {activeFilter === key && (
                            <motion.div
                                className="filter-indicator"
                                layoutId="filterIndicator"
                                transition={springTransition}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Category chips - only show if there are categories */}
            <AnimatePresence>
                {categories.length > 0 && (
                    <motion.div
                        className="category-chips"
                        variants={collapseExpand}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                    >
                        <motion.button
                            className={`category-chip ${activeCategory === null ? 'active' : ''}`}
                            onClick={() => setCategoryFilter(null)}
                            {...hoverScale}
                        >
                            All
                        </motion.button>
                        {categories.map((category, index) => (
                            <motion.button
                                key={category}
                                className={`category-chip ${activeCategory === category ? 'active' : ''}`}
                                onClick={() => setCategoryFilter(category)}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                {...hoverScale}
                            >
                                {category}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
