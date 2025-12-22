import { CSSProperties, useState, useRef } from 'react';
import { Task } from '../lib/types';
import { useTaskStore } from '../stores/taskStore';
import { formatDistanceToNow, isToday, isPast, format } from 'date-fns';
import DatePicker from './DatePicker';
import './TaskCard.css';

interface TaskCardProps {
    task: Task;
    style?: CSSProperties;
}

export default function TaskCard({ task, style }: TaskCardProps) {
    const { toggleComplete, deleteTask, updateTask } = useTaskStore();
    const isCompleted = task.status === 'completed';
    const [showNotes, setShowNotes] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const toggleDatePicker = () => {
        setShowDatePicker(!showDatePicker);
    };

    const formatDueDate = (date: Date | null): { text: string; className: string } | null => {
        if (!date) return null;

        const dueDate = new Date(date);

        if (isToday(dueDate)) {
            return { text: 'Today', className: 'today' };
        }

        if (isPast(dueDate)) {
            return {
                text: formatDistanceToNow(dueDate, { addSuffix: true }),
                className: 'overdue'
            };
        }

        return {
            text: format(dueDate, 'MMM d'),
            className: ''
        };
    };

    const handleSetDueDate = (date: Date | null) => {
        updateTask(task.id, { dueDate: date });
    };

    const dueInfo = formatDueDate(task.dueDate);
    const hasNotes = task.notes && task.notes.trim().length > 0;

    return (
        <div
            className={`task-card ${isCompleted ? 'completed' : ''} ${task.priority ? `priority-${task.priority}` : ''} ${hasNotes ? 'has-notes' : ''}`}
            style={style}
        >
            <button
                className={`task-checkbox ${isCompleted ? 'checked' : ''}`}
                onClick={() => toggleComplete(task.id)}
                aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            </button>

            <div className="task-body">
                <p className="task-content">{task.content}</p>

                <div className="task-meta">
                    {task.category && (
                        <span className="task-category">{task.category}</span>
                    )}

                    {/* Due date with picker */}
                    <div className="due-date-wrapper">
                        <button
                            ref={buttonRef}
                            className={`due-date-btn ${dueInfo?.className || ''} ${!dueInfo ? 'no-date' : ''}`}
                            onClick={toggleDatePicker}
                        >
                            📅 {dueInfo ? dueInfo.text : 'Set date'}
                        </button>

                        {showDatePicker && (
                            <DatePicker
                                value={task.dueDate}
                                onChange={handleSetDueDate}
                                showTime={true}
                                showRecurrence={true}
                                dueTime={task.dueTime}
                                recurrence={task.recurrence}
                                recurrenceDays={task.recurrenceDays}
                                onTimeChange={(time) => updateTask(task.id, { dueTime: time })}
                                onRecurrenceChange={(recurrence) => updateTask(task.id, { recurrence: recurrence as any })}
                                onRecurrenceDaysChange={(days) => updateTask(task.id, { recurrenceDays: days })}
                                onClose={() => setShowDatePicker(false)}
                                buttonRef={buttonRef}
                            />
                        )}
                    </div>

                    {hasNotes && (
                        <button
                            className={`notes-toggle ${showNotes ? 'expanded' : ''}`}
                            onClick={() => setShowNotes(!showNotes)}
                        >
                            📝 {showNotes ? 'Hide' : 'Notes'}
                        </button>
                    )}
                </div>

                {/* Notes section */}
                {hasNotes && showNotes && (
                    <div className="task-notes">
                        <pre className="notes-content">{task.notes}</pre>
                    </div>
                )}
            </div>

            <div className="task-actions">
                <button
                    className="task-action-btn delete"
                    onClick={() => deleteTask(task.id)}
                    aria-label="Delete task"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                </button>
            </div>
        </div>
    );
}


