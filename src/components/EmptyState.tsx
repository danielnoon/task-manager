import { motion } from 'framer-motion';
import { fadeInScale, iconBounceIn } from '../constants/animations';
import './EmptyState.css';

interface EmptyStateProps {
    icon: string;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

/**
 * Reusable empty state component for lists and grids.
 * Displays an icon, title, optional description, and optional action button.
 */
export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <motion.div
            className="empty-state"
            variants={fadeInScale}
            initial="hidden"
            animate="visible"
            exit="hidden"
        >
            <motion.div
                className="empty-state-icon"
                variants={iconBounceIn}
                initial="hidden"
                animate="visible"
            >
                {icon}
            </motion.div>
            <p className="empty-state-title">{title}</p>
            {description && (
                <p className="empty-state-description">{description}</p>
            )}
            {action && (
                <button
                    className="empty-state-action"
                    onClick={action.onClick}
                >
                    {action.label}
                </button>
            )}
        </motion.div>
    );
}
