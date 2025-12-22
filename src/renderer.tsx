import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import QuickEntryApp from './components/QuickEntryApp';
import './index.css';

const root = document.getElementById('root');

if (root) {
    const isQuickEntry = window.location.hash === '#quick-entry';
    if (isQuickEntry) {
        document.body.classList.add('quick-entry-mode');
        document.documentElement.classList.add('quick-entry-mode');
    }

    // Detect platform for platform-specific styles
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) {
        document.body.classList.add('windows');
    } else if (userAgent.includes('mac')) {
        document.body.classList.add('macos');
    } else if (userAgent.includes('linux')) {
        document.body.classList.add('linux');
    }

    createRoot(root).render(
        <StrictMode>
            {isQuickEntry ? <QuickEntryApp /> : <App />}
        </StrictMode>
    );
}
