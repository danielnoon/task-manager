import { motion } from 'framer-motion';
import { fadeIn } from '../constants/animations';
import './LoadingState.css';

interface LoadingStateProps {
    count?: number;
    height?: number;
    variant?: 'default' | 'compact';
}

/**
 * Reusable loading skeleton component with shimmer effect.
 * Used to display loading placeholders while data is being fetched.
 */
export default function LoadingState({ count = 3, height = 72, variant = 'default' }: LoadingStateProps) {
    return (
        <motion.div
            className={`loading-state ${variant}`}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
        >
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="loading-skeleton shimmer"
                    style={{ height: `${height}px` }}
                />
            ))}
        </motion.div>
    );
}
