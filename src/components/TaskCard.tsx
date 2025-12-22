import { CSSProperties, useState, useRef, useEffect } from 'react';
import { Task } from '../lib/types';
import { useTaskStore } from '../stores/taskStore';
import { formatDistanceToNow, isToday, isPast, format, addDays, nextMonday } from 'date-fns';
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
    const [dropUp, setDropUp] = useState(false);
    const datePickerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close date picker when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setShowDatePicker(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Check if dropdown should drop up based on available space
    const toggleDatePicker = () => {
        if (!showDatePicker && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const dropdownHeight = 250; // Approximate dropdown height
            setDropUp(spaceBelow < dropdownHeight);
        }
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
        setShowDatePicker(false);
    };

    const datePresets = [
        { label: 'Today', date: new Date() },
        { label: 'Tomorrow', date: addDays(new Date(), 1) },
        { label: 'Next Week', date: nextMonday(new Date()) },
        { label: 'In 3 days', date: addDays(new Date(), 3) },
        { label: 'No date', date: null },
    ];

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
                    <div className="due-date-wrapper" ref={datePickerRef}>
                        <button
                            ref={buttonRef}
                            className={`due-date-btn ${dueInfo?.className || ''} ${!dueInfo ? 'no-date' : ''}`}
                            onClick={toggleDatePicker}
                        >
                            📅 {dueInfo ? dueInfo.text : 'Set date'}
                        </button>

                        {showDatePicker && (
                            <div className={`date-picker-dropdown ${dropUp ? 'drop-up' : ''}`}>
                                {datePresets.map(({ label, date }) => (
                                    <button
                                        key={label}
                                        className={`date-preset ${date === null && !task.dueDate ? 'active' : ''}`}
                                        onClick={() => handleSetDueDate(date)}
                                    >
                                        {label}
                                    </button>
                                ))}
                                <div className="date-picker-divider" />
                                <input
                                    type="date"
                                    className="custom-date-input"
                                    value={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
                                    onChange={(e) => handleSetDueDate(e.target.value ? new Date(e.target.value) : null)}
                                />
                                {/* Time picker */}
                                <div className="date-picker-row">
                                    <label>⏰ Time</label>
                                    <input
                                        type="time"
                                        className="time-input-small"
                                        value={task.dueTime || ''}
                                        onChange={(e) => updateTask(task.id, { dueTime: e.target.value || null })}
                                    />
                                </div>
                                {/* Recurrence */}
                                <div className="date-picker-row">
                                    <label>🔄 Repeat</label>
                                    <select
                                        className="recurrence-select"
                                        value={task.recurrence}
                                        onChange={(e) => updateTask(task.id, { recurrence: e.target.value as any })}
                                    >
                                        <option value="none">Never</option>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                                {/* Weekly day selection */}
                                {task.recurrence === 'weekly' && (
                                    <div className="weekly-days">
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                                            const selectedDays = task.recurrenceDays?.split(',').map(Number) || [];
                                            const isSelected = selectedDays.includes(index);
                                            return (
                                                <button
                                                    key={index}
                                                    className={`day-btn ${isSelected ? 'active' : ''}`}
                                                    onClick={() => {
                                                        const newDays = isSelected
                                                            ? selectedDays.filter(d => d !== index)
                                                            : [...selectedDays, index];
                                                        updateTask(task.id, {
                                                            recurrenceDays: newDays.length > 0
                                                                ? newDays.sort((a, b) => a - b).join(',')
                                                                : null
                                                        });
                                                    }}
                                                >
                                                    {day}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
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


