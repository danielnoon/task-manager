import { useState, KeyboardEvent, useMemo, useRef, useEffect } from 'react';
import { useTaskStore } from '../stores/taskStore';
import './TaskInput.css';

export default function TaskInput({
    onAfterSubmit,
    placeholder = "What conversation? or @task to update/add notes"
}: {
    onAfterSubmit?: () => void,
    placeholder?: string
} = {}) {
    const [value, setValue] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { addTask, appendNote, isAnalyzing, tasks, findTaskByContent } = useTaskStore();

    // Check if input starts with @ for task mention
    const mentionMatch = useMemo(() => {
        const match = value.match(/^@(.+?)\s+([\s\S]+)$/);
        if (match) {
            return { taskSearch: match[1], noteContent: match[2] };
        }
        // Just @, or @ with search text
        const partialMatch = value.match(/^@(.*)$/);
        if (partialMatch) {
            return { taskSearch: partialMatch[1], noteContent: null };
        }
        return null;
    }, [value]);

    /* Reset selection when search changes */
    useMemo(() => {
        setSelectedIndex(0);
    }, [mentionMatch?.taskSearch]);

    // Find matching tasks for autocomplete
    const suggestions = useMemo(() => {
        if (!mentionMatch || mentionMatch.noteContent !== null) return [];
        const search = mentionMatch.taskSearch.toLowerCase();

        // Return recent tasks if search is empty
        if (!search) {
            return tasks
                .filter(t => t.status === 'active')
                .slice(0, 5);
        }

        return tasks
            .filter(t => t.status === 'active' && t.content.toLowerCase().includes(search))
            .slice(0, 5);
    }, [mentionMatch, tasks]);

    // Matched task for the current mention
    const matchedTask = useMemo(() => {
        if (!mentionMatch?.taskSearch) return null;
        return findTaskByContent(mentionMatch.taskSearch);
    }, [mentionMatch, findTaskByContent]);

    const inputRef = useRef<HTMLInputElement>(null);
    const isSubmittingRef = useRef(false);

    // Auto-focus input on mount and window focus
    useEffect(() => {
        const focusInput = () => {
            // Small timeout prevents fighting with other focus events
            setTimeout(() => {
                inputRef.current?.focus();
            }, 10);
        };

        focusInput();
        window.addEventListener('focus', focusInput);
        return () => window.removeEventListener('focus', focusInput);
    }, []);

    const handleSubmit = async () => {
        const content = value.trim();
        if (!content || isAnalyzing || isSubmittingRef.current) return;

        isSubmittingRef.current = true;
        try {
            // Send everything to addTask - it handles both creation and commands
            const result = await addTask(content);

            // Handle the result using discriminated union
            if (result.type === 'task_created') {
                // Task was successfully created
                setValue('');
                onAfterSubmit?.();
            } else if (result.type === 'command_executed') {
                // Command was successfully executed
                console.log(result.message);
                setValue('');
                onAfterSubmit?.();
            }
        } catch (error: any) {
            console.error('Failed to add task:', error);
        } finally {
            isSubmittingRef.current = false;
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        // Handle suggestions navigation
        if (suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => (i + 1) % suggestions.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => (i - 1 + suggestions.length) % suggestions.length);
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const selected = suggestions[selectedIndex];
                if (selected) {
                    handleSuggestionClick(selected.content);
                }
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleSuggestionClick = (taskContent: string) => {
        setValue(`@${taskContent} `);
        // Refocus input
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const isCommand = mentionMatch !== null;

    return (
        <div className="task-input-wrapper">
            <input
                ref={inputRef}
                type="text"
                className={`task-input ${isCommand ? 'is-command' : ''}`}
                placeholder={placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isAnalyzing}
                autoFocus
            />

            {/* Hint text */}
            {!isAnalyzing && value.length === 0 && (
                <span className="input-hint">Press Enter to add • @task to update</span>
            )}
            {isAnalyzing && (
                <span className="input-hint">✨ Processing...</span>
            )}
            {/* Hide command hint if analyzing to prevent overlap */}
            {!isAnalyzing && isCommand && matchedTask && (
                <span className="input-hint command-hint">
                    🤖 Updating "{matchedTask.content.slice(0, 30)}{matchedTask.content.length > 30 ? '...' : ''}"
                </span>
            )}
            {!isAnalyzing && mentionMatch && !matchedTask && mentionMatch.taskSearch.length > 0 && (
                <span className="input-hint no-match">
                    No task found matching "{mentionMatch.taskSearch}"
                </span>
            )}

            {/* Autocomplete suggestions */}
            {suggestions.length > 0 && (
                <div className="mention-suggestions">
                    {suggestions.map((task, index) => (
                        <button
                            key={task.id}
                            className={`mention-suggestion ${index === selectedIndex ? 'selected' : ''}`}
                            onClick={() => handleSuggestionClick(task.content)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <span className="suggestion-content">{task.content}</span>
                            {task.category && (
                                <span className="suggestion-category">{task.category}</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

