import { useEffect } from 'react';
import TaskInput from './TaskInput';
import '../App.css';
import './QuickEntryApp.css';
import { useTaskStore } from '../stores/taskStore';

export default function QuickEntryApp() {
    const loadTasks = useTaskStore(state => state.loadTasks);

    // Initialize tasks for suggestions
    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                window.drift.events?.closeQuickEntry?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="quick-entry-container">
            <div className="quick-entry-box">
                <TaskInput
                    placeholder="Type a task..."
                    onAfterSubmit={() => window.drift.events?.closeQuickEntry?.(true)}
                />
            </div>
            <div className="quick-entry-instructions">
                <span>Esc to close</span>
                <span>Enter to save</span>
            </div>
        </div>
    );
}
