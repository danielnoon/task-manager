import { useRef, useState } from 'react';
import { format, addDays, nextMonday } from 'date-fns';
import { useClickOutside } from '../hooks/useClickOutside';
import './DatePicker.css';

interface DatePickerProps {
    value: Date | null;
    onChange: (date: Date | null) => void;
    showTime?: boolean;
    showRecurrence?: boolean;
    dueTime?: string | null;
    recurrence?: string;
    recurrenceDays?: string | null;
    onTimeChange?: (time: string | null) => void;
    onRecurrenceChange?: (recurrence: string) => void;
    onRecurrenceDaysChange?: (days: string | null) => void;
    onClose?: () => void;
    buttonRef?: React.RefObject<HTMLButtonElement>;
}

/**
 * Reusable date picker component with presets, custom date, time, and recurrence options.
 * Extracted from TaskCard.tsx to be used across the application.
 */
export default function DatePicker({
    value,
    onChange,
    showTime = true,
    showRecurrence = true,
    dueTime,
    recurrence = 'none',
    recurrenceDays,
    onTimeChange,
    onRecurrenceChange,
    onRecurrenceDaysChange,
    onClose,
    buttonRef,
}: DatePickerProps) {
    const [dropUp, setDropUp] = useState(false);
    const datePickerRef = useRef<HTMLDivElement>(null);

    // Close date picker when clicking outside
    useClickOutside(datePickerRef, () => {
        if (onClose) onClose();
    });

    // Check if dropdown should drop up based on available space
    const checkDropDirection = () => {
        if (buttonRef?.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const dropdownHeight = 250; // Approximate dropdown height
            setDropUp(spaceBelow < dropdownHeight);
        }
    };

    // Check drop direction on mount
    useState(() => {
        checkDropDirection();
    });

    const datePresets = [
        { label: 'Today', date: new Date() },
        { label: 'Tomorrow', date: addDays(new Date(), 1) },
        { label: 'Next Week', date: nextMonday(new Date()) },
        { label: 'In 3 days', date: addDays(new Date(), 3) },
        { label: 'No date', date: null },
    ];

    const handleSetDueDate = (date: Date | null) => {
        onChange(date);
        if (onClose) onClose();
    };

    const handleTimeChange = (time: string) => {
        if (onTimeChange) {
            onTimeChange(time || null);
        }
    };

    const handleRecurrenceChange = (rec: string) => {
        if (onRecurrenceChange) {
            onRecurrenceChange(rec);
        }
    };

    const handleDayToggle = (dayIndex: number) => {
        if (!onRecurrenceDaysChange) return;

        const selectedDays = recurrenceDays?.split(',').map(Number) || [];
        const isSelected = selectedDays.includes(dayIndex);

        const newDays = isSelected
            ? selectedDays.filter(d => d !== dayIndex)
            : [...selectedDays, dayIndex];

        onRecurrenceDaysChange(
            newDays.length > 0
                ? newDays.sort((a, b) => a - b).join(',')
                : null
        );
    };

    return (
        <div className={`date-picker-dropdown ${dropUp ? 'drop-up' : ''}`} ref={datePickerRef}>
            {/* Date presets */}
            {datePresets.map(({ label, date }) => (
                <button
                    key={label}
                    className={`date-preset ${date === null && !value ? 'active' : ''}`}
                    onClick={() => handleSetDueDate(date)}
                >
                    {label}
                </button>
            ))}

            {/* Divider */}
            <div className="date-picker-divider" />

            {/* Custom date input */}
            <input
                type="date"
                className="custom-date-input"
                value={value ? format(new Date(value), 'yyyy-MM-dd') : ''}
                onChange={(e) => handleSetDueDate(e.target.value ? new Date(e.target.value) : null)}
            />

            {/* Time picker */}
            {showTime && (
                <div className="date-picker-row">
                    <label>⏰ Time</label>
                    <input
                        type="time"
                        className="time-input-small"
                        value={dueTime || ''}
                        onChange={(e) => handleTimeChange(e.target.value)}
                    />
                </div>
            )}

            {/* Recurrence */}
            {showRecurrence && (
                <>
                    <div className="date-picker-row">
                        <label>🔄 Repeat</label>
                        <select
                            className="recurrence-select"
                            value={recurrence}
                            onChange={(e) => handleRecurrenceChange(e.target.value)}
                        >
                            <option value="none">Never</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>

                    {/* Weekly day selection */}
                    {recurrence === 'weekly' && (
                        <div className="weekly-days">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => {
                                const selectedDays = recurrenceDays?.split(',').map(Number) || [];
                                const isSelected = selectedDays.includes(index);
                                return (
                                    <button
                                        key={index}
                                        className={`day-btn ${isSelected ? 'active' : ''}`}
                                        onClick={() => handleDayToggle(index)}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
