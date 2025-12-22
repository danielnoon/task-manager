import { useState, useEffect } from 'react';
import { useTaskStore } from '../stores/taskStore';
import './SettingsModal.css';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { settings, updateSettings, loadSettings } = useTaskStore();
    const [apiKey, setApiKey] = useState('');
    const [morningTime, setMorningTime] = useState('09:00');
    const [middayTime, setMiddayTime] = useState('13:00');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && settings) {
            setApiKey(settings.apiKey || '');
            setMorningTime(settings.morningCheckinTime || '09:00');
            setMiddayTime(settings.middayCheckinTime || '13:00');
            setNotificationsEnabled(settings.notificationsEnabled ?? true);
        }
    }, [isOpen, settings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateSettings({
                apiKey: apiKey.trim() || null,
                morningCheckinTime: morningTime,
                middayCheckinTime: middayTime,
                notificationsEnabled,
            });
            onClose();
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Settings</h2>
                    <button className="modal-close" onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    <div className="settings-section">
                        <h3>AI Configuration</h3>
                        <p className="settings-description">
                            Enter your Anthropic API key to enable AI-powered task analysis.
                            Get your key from{' '}
                            <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">
                                console.anthropic.com
                            </a>
                        </p>

                        <div className="form-group">
                            <label htmlFor="apiKey">Anthropic API Key</label>
                            <input
                                id="apiKey"
                                type="password"
                                className="input"
                                placeholder="sk-ant-..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                            {apiKey && (
                                <p className="input-hint-text">
                                    {apiKey.startsWith('sk-ant-') ? '✓ Looks like a valid key' : '⚠ Key should start with sk-ant-'}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="settings-section">
                        <h3>Notifications</h3>
                        <p className="settings-description">
                            Get friendly check-in reminders to stay on track with your tasks.
                        </p>

                        <div className="form-group">
                            <label className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={notificationsEnabled}
                                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                                />
                                <span className="toggle-switch"></span>
                                Enable Notifications
                            </label>
                        </div>

                        {notificationsEnabled && (
                            <>
                                <div className="form-group">
                                    <label htmlFor="morningTime">Morning Check-in</label>
                                    <input
                                        id="morningTime"
                                        type="time"
                                        className="input time-input"
                                        value={morningTime}
                                        onChange={(e) => setMorningTime(e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="middayTime">Mid-day Check-in</label>
                                    <input
                                        id="middayTime"
                                        type="time"
                                        className="input time-input"
                                        value={middayTime}
                                        onChange={(e) => setMiddayTime(e.target.value)}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="settings-section">
                        <h3>Theme</h3>
                        <div className="theme-options">
                            <button
                                className={`theme-option ${settings?.theme === 'dark' ? 'active' : ''}`}
                                onClick={() => updateSettings({ theme: 'dark' })}
                            >
                                🌙 Dark
                            </button>
                            <button
                                className={`theme-option ${settings?.theme === 'light' ? 'active' : ''}`}
                                onClick={() => updateSettings({ theme: 'light' })}
                            >
                                ☀️ Light
                            </button>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}

