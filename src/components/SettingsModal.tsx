import { useState, useEffect } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { Modal, Toggle, Button, Input } from './ui';
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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Settings"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </>
            }
        >
            <div className="settings-modal-content">
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
                            <Input
                                id="apiKey"
                                type="password"
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
                            <Toggle
                                checked={notificationsEnabled}
                                onChange={setNotificationsEnabled}
                                label="Enable Notifications"
                            />
                        </div>

                        {notificationsEnabled && (
                            <>
                                <div className="form-group">
                                    <label htmlFor="morningTime">Morning Check-in</label>
                                    <Input
                                        id="morningTime"
                                        type="time"
                                        className="time-input"
                                        value={morningTime}
                                        onChange={(e) => setMorningTime(e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="middayTime">Mid-day Check-in</label>
                                    <Input
                                        id="middayTime"
                                        type="time"
                                        className="time-input"
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
                            <Button
                                variant={settings?.theme === 'dark' ? 'primary' : 'secondary'}
                                className="theme-option"
                                onClick={() => updateSettings({ theme: 'dark' })}
                            >
                                🌙 Dark
                            </Button>
                            <Button
                                variant={settings?.theme === 'light' ? 'primary' : 'secondary'}
                                className="theme-option"
                                onClick={() => updateSettings({ theme: 'light' })}
                            >
                                ☀️ Light
                            </Button>
                        </div>
                    </div>
                </div>
        </Modal>
    );
}

